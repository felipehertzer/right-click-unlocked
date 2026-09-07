#!/usr/bin/env python3
"""Build a signed CRX3 and MDM files using Python 3 and OpenSSL."""
import argparse, base64, hashlib, io, json, plistlib, struct, subprocess, tempfile, uuid, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://felipehertzer.github.io/right-click-unlocked'

def varint(n):
    result = bytearray()
    while n > 127:
        result.append((n & 127) | 128)
        n >>= 7
    result.append(n)
    return bytes(result)

def field(number, value):
    return varint(number * 8 + 2) + varint(len(value)) + value

def run(*args, data=None):
    return subprocess.run(args, input=data, check=True, capture_output=True).stdout

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--key', required=True, type=Path)
    args = parser.parse_args()
    key = args.key.resolve()
    if key.is_relative_to(ROOT):
        raise SystemExit('Keep the private signing key outside the repository.')
    public = run('openssl', 'pkey', '-in', str(key), '-pubout', '-outform', 'DER')
    identity = hashlib.sha256(public).digest()[:16]
    extension_id = ''.join(chr(97 + int(char, 16)) for char in identity.hex())
    manifest_path = ROOT / 'extension/manifest.json'
    manifest = json.loads(manifest_path.read_text())
    existing = manifest.get('key')
    if existing and existing != base64.b64encode(public).decode():
        raise SystemExit('Signing key differs from the existing extension identity.')
    manifest['key'] = base64.b64encode(public).decode()
    manifest['update_url'] = BASE + '/updates.xml'
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    version = manifest['version']
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in sorted((ROOT / 'extension').rglob('*')):
            if path.is_file() and path.name != 'README.md' and not path.name.startswith('.'):
                info = zipfile.ZipInfo(path.relative_to(ROOT / 'extension').as_posix(), (2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                z.writestr(info, path.read_bytes())
    archive = archive.getvalue()
    signed_header = field(1, identity)
    signed_data = b'CRX3 SignedData\x00' + struct.pack('<I', len(signed_header)) + signed_header + archive
    signature = run('openssl', 'dgst', '-sha256', '-sign', str(key), data=signed_data)
    with tempfile.TemporaryDirectory() as temp:
        temp = Path(temp)
        (temp / 'public.pem').write_bytes(run('openssl', 'pkey', '-in', str(key), '-pubout'))
        (temp / 'signature').write_bytes(signature)
        run('openssl', 'dgst', '-sha256', '-verify', str(temp / 'public.pem'), '-signature', str(temp / 'signature'), data=signed_data)
    header = field(2, field(1, public) + field(2, signature)) + field(10000, signed_header)
    package = b'Cr24' + struct.pack('<II', 3, len(header)) + header + archive
    docs = ROOT / 'docs'
    docs.mkdir(exist_ok=True)
    filename = f'right-click-unlocked-{version}.crx'
    (docs / filename).write_bytes(package)
    (docs / '.nojekyll').touch()
    (docs / 'updates.xml').write_text(f'''<?xml version="1.0" encoding="UTF-8"?>
<gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">
  <app appid="{extension_id}">
    <updatecheck codebase="{BASE}/{filename}" version="{version}" prodversionmin="119.0.0.0" />
  </app>
</gupdate>
''')
    policy = {extension_id: {'installation_mode':'force_installed', 'update_url':BASE + '/updates.xml', 'override_update_url':True}}
    mdm = ROOT / 'mdm'
    mdm.mkdir(exist_ok=True)
    (mdm / 'ExtensionSettings.json').write_text(json.dumps(policy, indent=2) + '\n')
    (mdm / 'ExtensionInstallForcelist.txt').write_text(extension_id + ';' + BASE + '/updates.xml\n')
    profile = {
        'PayloadType':'Configuration', 'PayloadVersion':1,
        'PayloadIdentifier':'com.felipehertzer.right-click-unlocked',
        'PayloadUUID':str(uuid.uuid5(uuid.NAMESPACE_URL, BASE)),
        'PayloadDisplayName':'Chrome — Right Click Unlocked',
        'PayloadDescription':'Install and update Right Click Unlocked in managed Google Chrome.',
        'PayloadScope':'System',
        'PayloadContent':[{
            'PayloadType':'com.google.Chrome', 'PayloadVersion':1,
            'PayloadIdentifier':'com.felipehertzer.right-click-unlocked.chrome',
            'PayloadUUID':str(uuid.uuid5(uuid.NAMESPACE_URL, BASE + '/chrome')),
            'PayloadDisplayName':'Chrome extension policy', 'ExtensionSettings':policy
        }]
    }
    (mdm / 'RightClickUnlocked.mobileconfig').write_bytes(plistlib.dumps(profile))
    info = {'extension_id':extension_id, 'version':version, 'update_url':BASE + '/updates.xml', 'package_url':BASE + '/' + filename, 'sha256':hashlib.sha256(package).hexdigest()}
    (docs / 'release.json').write_text(json.dumps(info, indent=2) + '\n')
    # The landing page is maintained in docs/ and reads release.json for the version.
    # Publishing a new extension package must not replace it.
    print(json.dumps(info, indent=2))

if __name__ == '__main__':
    main()
