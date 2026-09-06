# Right Click Unlocked

A small Chrome extension that restores the browser's right-click menu, text selection, copying, and Ctrl/Cmd+C and Ctrl/Cmd+A shortcuts on ordinary websites. Enabled by default, with a saved on/off switch for each hostname.

## Install

1. If using the ZIP, extract it first. Keep the `right-click-unlocked` folder somewhere permanent.
2. Open `chrome://extensions` in Google Chrome.
3. Turn on **Developer mode** at the top right.
4. Click **Load unpacked** and choose the `right-click-unlocked` folder containing `manifest.json`.
5. Refresh any websites that were already open.
6. Use Chrome's puzzle-piece menu to pin **Right Click Unlocked** if desired.

No build command, account, payment, or package installation is needed. Chrome 119 or newer is required. Chrome loads the extension from this folder, so keep it in place after installing.

## Use

Browse normally. Right-click, drag to select text, or use the usual copy shortcut. Click the extension's toolbar icon to pause or resume it for the current website. A saved choice applies to the exact hostname, across its paths and tabs, including embedded pages. Subdomains have separate settings. Changes take effect without reloading once the extension is connected.

The toolbar badge shows **ON** or **OFF**. The popup offers a refresh button for pages opened before installation or an extension reload.

## Compatibility

It handles common event-based restrictions, inline event handlers, blocked keyboard shortcuts, selection-clearing event listeners, and CSS `user-select: none`, including inline `!important` in the main document. It also runs in permitted embedded frames.

It preserves normal click events and leaves mouse/pointer handlers on links, inputs, buttons, editable regions, draggable elements, and recognizable custom controls alone. Sites with custom editors, context menus, or copy formatting may behave differently while enabled; pause the extension on those sites when needed.

It cannot change Chrome's internal pages, the Chrome Web Store, built-in PDF viewers, or other extensions. Local `file://` pages are not included. It does not turn images/canvas into selectable text, reveal content you cannot access, or guarantee success against every custom blocker. Explicit selection restrictions inside shadow DOM and sites that clear selections using timers may need another approach.

## Privacy and permissions

All code and settings stay on your device. There are no network requests, analytics, remote scripts, or clipboard read/write permissions. The extension stops page handlers from blocking native browser actions; it does not read or store clipboard contents.

- **Website access (HTTP/HTTPS):** needed to restore controls automatically on sites and their frames.
- **scripting:** inserts and removes user-priority CSS to override selection restrictions.
- **storage:** saves the enabled/paused preference for each hostname in local extension storage.
- **activeTab:** identifies the website shown in the popup when you click the toolbar icon.

Chrome may describe website access as permission to read and change site data. You can limit site access in Chrome's extension settings; it will only work on allowed pages. No page content is collected or transmitted.

## Remove or update

To remove it, open `chrome://extensions`, click **Remove**, and refresh affected pages. To update the files, replace them in the same folder, click the extension's reload button in `chrome://extensions`, then refresh websites.

## Validation

Twelve automated checks passed using a DOM test environment and simulated Chrome APIs. They cover blocked events, keyboard shortcuts, preserved control handlers, site preferences, frame settings, rapid toggles, popup behavior, and packaged files. JavaScript syntax checks also passed. Full Chrome end-to-end testing could not run because this environment prevented the isolated test browser from launching; native clipboard and selection behavior still need an in-browser check.

## Technical references

- [Chrome's unpacked extension installation instructions](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)
- [Content scripts and document-start injection](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Chrome scripting API and USER-origin CSS](https://developer.chrome.com/docs/extensions/reference/api/scripting)
