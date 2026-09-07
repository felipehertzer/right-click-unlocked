# Right Click Unlocked

Chrome Manifest V3 extension that restores common right-click, text-selection, and copy restrictions. Enabled automatically, with a saved pause switch for each hostname. No analytics, external scripts, or clipboard read/write permission.

## Managed deployment

- Extension ID: `ihnphnpbicfkhddgbnakkcngibdlkahk`
- Update URL: `https://felipehertzer.github.io/right-click-unlocked/updates.xml`
- Signed CRX3 packages and update metadata: [`docs/`](docs/)

Set Chrome's `ExtensionInstallForcelist` to include:

```text
ihnphnpbicfkhddgbnakkcngibdlkahk;https://felipehertzer.github.io/right-click-unlocked/updates.xml
```

Alternatively, merge [`mdm/ExtensionSettings.json`](mdm/ExtensionSettings.json) into your existing Chrome `ExtensionSettings` policy. This configures forced installation and explicitly uses this feed for subsequent updates. Preserve other entries when merging policies.

### macOS

Upload [`mdm/RightClickUnlocked.mobileconfig`](mdm/RightClickUnlocked.mobileconfig) as a custom configuration profile in your MDM, or use its `com.google.Chrome` payload in an existing managed Chrome profile. Assign it to a pilot group first. This is an unsigned configuration profile for MDM delivery. Avoid applying conflicting `ExtensionSettings` payloads from multiple profiles.

Chrome permits off-store forced installation on Macs managed through MDM, domain MCX, or Chrome Enterprise Core. A manually installed profile on an unmanaged Mac is not equivalent to MDM enrollment.

### Windows

Use your MDM's Google Chrome policy templates for `ExtensionInstallForcelist` or `ExtensionSettings`. Off-store forced installation requires Active Directory or Entra ID join, or enrollment in Chrome Enterprise Core; MDM enrollment alone is insufficient.

### Verify a deployment

1. Check `chrome://policy` and reload policies. The configured extension policy should appear without errors.
2. Check `chrome://extensions` for Right Click Unlocked and its matching ID.
3. Refresh existing websites and test selecting, copying, and right-clicking.
4. Check the popup's per-site pause switch on any application that uses a custom editor or context menu.

Forced installation prevents uninstalling/disabling the whole extension in Chrome; the extension's own per-site pause switch remains available.

## Manual development install

Clone the repository, open `chrome://extensions`, enable Developer mode, and choose **Load unpacked → extension/**. The included public key keeps the same ID. Refresh existing tabs.

## Publishing updates

The landing page lives in `docs/index.html`, `docs/styles.css`, and `docs/page.js`.
Preview it with `python3 -m http.server 4173 --directory docs`. It reads the current
version and signed-package URL from `docs/release.json`; packaging an extension
update preserves the page. Run `python3 scripts/build_site.py` to validate local
links and the package checksum, and stage the static page in `dist/` for hosting.

Requires Python 3, OpenSSL, and the original private signing key (kept outside this repository).

1. Make changes in `extension/` and increment `extension/manifest.json`'s version.
2. Run `python3 scripts/package.py --key /secure/location/right-click-unlocked.pem`.
3. Review and commit the resulting extension, `docs/`, and MDM files.
4. Push to `main`. GitHub Pages publishes from `/docs`.
5. Verify the live XML and CRX download before deploying broadly.

The packager verifies its RSA-SHA256 signature before writing the CRX3. Keep the original private key backed up securely: replacing it changes the extension ID. Never commit the private key. Public release files are intentionally accessible without GitHub login because Chrome's updater cannot use a GitHub login session.

## Compatibility and validation

Handles common event-based and CSS restrictions, including user-priority CSS overrides, inline handlers, and permitted embedded frames. It cannot reveal inaccessible content or make images/canvas into selectable text. Chrome internal pages, the Web Store, built-in viewers, and local file URLs are excluded. Some shadow-DOM restrictions and timer-based blockers may persist. Pause it when a site's custom controls or copy formatting are affected.

Twelve DOM/simulated-Chrome-API checks passed for the extension logic, preferences, and popup. JavaScript syntax and package signature checks passed. Full native Chrome and MDM deployment testing has not yet been completed; use a managed pilot device to verify installation and native clipboard behavior.

## References

- [Chrome force-install policy and platform requirements](https://chromeenterprise.google/policies/extension-install-forcelist/)
- [Chrome self-hosting and update manifests](https://developer.chrome.com/docs/extensions/how-to/distribute/host-on-linux)
- [Chrome extension settings on macOS](https://support.google.com/chrome/a/answer/7517624)
