(() => {
  'use strict';

  // Capture listeners are installed before website scripts run. Keeping them in
  // Chrome's isolated world avoids modifying the website's JavaScript prototypes.
  let enabled = false;
  let appliedEnabled;
  let hostname = '';
  let syncing = false;
  let pending = false;
  let ready = false;

  const interactive = [
    'a[href]', 'button', 'input', 'textarea', 'select', 'option', 'label',
    'summary', 'audio', 'video', 'canvas', 'svg', 'iframe',
    '[contenteditable]:not([contenteditable="false"])',
    '[draggable="true"]', '[role]', '[tabindex]'
  ].join(',');

  function isInteractive(event) {
    return event.composedPath().some(node =>
      node instanceof Element && (node.matches(interactive) || node.closest(interactive))
    );
  }

  function protect(event) {
    if (!enabled) return;
    // Do not call preventDefault: native selection, menus, and clipboard actions
    // must still happen. Only stop website handlers from cancelling them.
    event.stopImmediatePropagation();
  }

  for (const type of ['contextmenu', 'selectstart', 'copy', 'selectionchange']) {
    window.addEventListener(type, protect, { capture: true });
  }

  function protectShortcut(event) {
    if (!enabled || (!event.ctrlKey && !event.metaKey) || event.altKey || event.shiftKey) return;
    const key = event.key.toLowerCase();
    if (key === 'c' || key === 'a') protect(event);
  }

  for (const type of ['keydown', 'keypress', 'keyup']) {
    window.addEventListener(type, protectShortcut, { capture: true });
  }

  function protectSelection(event) {
    if (!enabled) return;
    if (event.type.endsWith('move')) {
      if (event.buttons !== 1) return;
    } else if (event.button !== 0) {
      return;
    }
    if (isInteractive(event)) return;
    if ('pointerType' in event && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    protect(event);
  }

  for (const type of ['mousedown', 'mouseup', 'mousemove', 'pointerdown', 'pointerup', 'pointermove']) {
    window.addEventListener(type, protectSelection, { capture: true });
  }

  async function sync() {
    pending = true;
    if (syncing) return;
    syncing = true;
    try {
      // Serialize updates so a rapid on/off change cannot leave stale CSS behind.
      while (pending) {
        pending = false;
        const state = await chrome.runtime.sendMessage({ type: 'SYNC_PAGE', previousEnabled: appliedEnabled });
        if (!state || state.error) throw new Error(state?.error || 'No extension response.');
        hostname = state.hostname;
        appliedEnabled = state.enabled;
        enabled = state.enabled;
        ready = true;
      }
    } catch {
      ready = false;
      enabled = false;
      // The extension may have been reloaded while this page was open.
    } finally {
      syncing = false;
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message?.type === 'PING') respond({ ready, enabled });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (!hostname || Object.hasOwn(changes, `site:${hostname}`))) void sync();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) void sync();
  });
  void sync();
})();
