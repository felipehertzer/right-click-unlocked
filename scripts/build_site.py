#!/usr/bin/env python3
"""Validate the static GitHub Pages files and stage an identical Sites build."""

import hashlib
import json
import shutil
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class PageLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.ids = set()

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if "id" in attributes:
            identifier = attributes["id"]
            if identifier in self.ids:
                raise ValueError(f"Duplicate page ID: {identifier}")
            self.ids.add(identifier)
        for name in ("href", "src"):
            if name in attributes:
                self.links.append(attributes[name])


def main():
    docs = ROOT / "docs"
    page = PageLinks()
    page.feed((docs / "index.html").read_text())
    for link in page.links:
        parsed = urlsplit(link)
        if parsed.scheme or parsed.netloc:
            continue
        if parsed.path and not (docs / unquote(parsed.path)).exists():
            raise ValueError(f"Missing page asset: {link}")
        if not parsed.path and parsed.fragment and parsed.fragment not in page.ids:
            raise ValueError(f"Missing page anchor: {link}")
    release = json.loads((docs / "release.json").read_text())
    package = docs / f"right-click-unlocked-{release['version']}.crx"
    if hashlib.sha256(package.read_bytes()).hexdigest() != release["sha256"]:
        raise ValueError("The published package does not match its release checksum")
    shutil.copytree(docs, ROOT / "dist", dirs_exist_ok=True)
    print(f"Static page built in dist/; {len(page.links)} asset and navigation links checked.")


if __name__ == "__main__":
    main()
