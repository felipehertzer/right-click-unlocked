'use strict';

const checkbox = document.querySelector('#enabled');
const status = document.querySelector('#status');
const refresh = document.querySelector('#refresh');
let tabId;
let current;

function render(state) {
  document.body.dataset.enabled = String(state.enabled);
  document.querySelector('#hostname').textContent = state.hostname || 'Unavailable on this page';
  document.querySelector('#badge').textContent = state.supported ? (state.enabled ? 'Active' : 'Paused') : 'Unavailable';
  checkbox.checked = state.enabled;
  checkbox.disabled = !state.supported;
  refresh.hidden = !state.supported || state.connected;
  status.textContent = !state.supported
    ? 'Open a regular website. Chrome settings, the Web Store, and built-in viewers cannot be changed.'
    : !state.connected
      ? 'Refresh this page to connect the extension. Chrome’s site access setting must allow this website.'
      : state.enabled
        ? 'Enabled automatically. If a site’s editor or custom controls behave differently, pause it here.'
        : 'Paused on this hostname, including its embedded pages. Your choice is saved on this device.';
}

async function load() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab.');
  tabId = tab.id;
  current = await chrome.runtime.sendMessage({ type: 'GET_TAB_STATE', tabId });
  if (current.error) throw new Error(current.error);
  render(current);
}

checkbox.addEventListener('change', async () => {
  const next = checkbox.checked;
  checkbox.disabled = true;
  try {
    await chrome.storage.local.set({ [`site:${current.hostname}`]: next });
    current = { ...current, enabled: next };
    render(current);
  } catch {
    render(current);
    status.textContent = 'Could not save the setting. Please reopen the extension and try again.';
  }
});

refresh.addEventListener('click', async () => {
  try {
    await chrome.tabs.reload(tabId);
    window.close();
  } catch {
    status.textContent = 'Could not refresh. Refresh the website manually.';
  }
});

load().catch(() => {
  checkbox.disabled = true;
  document.querySelector('#hostname').textContent = 'Could not connect';
  document.querySelector('#badge').textContent = 'Unavailable';
  status.textContent = 'Close and reopen the extension, then try again.';
});
