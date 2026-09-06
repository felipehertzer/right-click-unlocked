"use strict";

function website(url) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (parsed.hostname === 'chromewebstore.google.com') return null;
    if (parsed.hostname === 'chrome.google.com' && parsed.pathname.startsWith('/webstore')) return null;
    return parsed.hostname;
  } catch {
    return null;
  }
}

async function tabState(tab) {
  const hostname = website(tab.url);
  if (!hostname) return { supported: false, enabled: false, hostname: '' };
  const key = `site:${hostname}`;
  const stored = await chrome.storage.local.get(key);
  return { supported: true, enabled: stored[key] !== false, hostname };
}

async function updateBadge(tabId, state) {
  await Promise.all([
    chrome.action.setBadgeText({ tabId, text: state.supported ? (state.enabled ? 'ON' : 'OFF') : '' }),
    chrome.action.setBadgeBackgroundColor({ tabId, color: state.enabled ? '#16745a' : '#717782' }),
    chrome.action.setTitle({ tabId, title: state.enabled ? 'Right Click Unlocked — enabled' : 'Right Click Unlocked — paused' })
  ]);
}

async function handleMessage(message, sender) {
  if (message?.type === 'SYNC_PAGE' && sender.tab && sender.documentId) {
    // Child frames use the top-level website's preference, including cross-origin frames.
    const state = await tabState(sender.tab);
    if (message.previousEnabled !== state.enabled) {
      const injection = {
        target: { tabId: sender.tab.id, documentIds: [sender.documentId] },
        files: ['selection.css'],
        origin: 'USER'
      };
      await chrome.scripting.removeCSS(injection);
      if (state.enabled) await chrome.scripting.insertCSS(injection);
    }
    if (sender.frameId === 0) await updateBadge(sender.tab.id, state);
    return state;
  }
  if (message?.type === 'GET_TAB_STATE' && sender.url === chrome.runtime.getURL('popup.html') && Number.isInteger(message.tabId)) {
    const tab = await chrome.tabs.get(message.tabId);
    const state = await tabState(tab);
    await updateBadge(tab.id, state);
    let connected = false;
    if (state.supported) {
      try {
        const reply = await chrome.tabs.sendMessage(tab.id, { type: 'PING' }, { frameId: 0 });
        connected = reply?.ready === true;
      } catch {
        // Pages already open when installed need a refresh.
      }
    }
    return { ...state, connected };
  }
  throw new Error('Unsupported extension request.');
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse, error => sendResponse({ error: error.message }));
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (change.status === 'complete' || change.url) {
    tabState(tab).then(state => updateBadge(tabId, state)).catch(() => {});
  }
});

chrome.storage.onChanged.addListener((_changes, area) => {
  if (area !== 'local') return;
  chrome.tabs.query({}).then(tabs => Promise.allSettled(tabs.map(async tab => {
    await updateBadge(tab.id, await tabState(tab));
  }))).catch(() => {});
});
