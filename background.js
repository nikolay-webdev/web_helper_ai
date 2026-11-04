'use strict';

const ASSISTANT_SCRIPT = 'ai-puzzle-assistant.snippet.js';
const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const API_KEY_STORAGE_KEY = 'webHelperAiApiKey';
const activeRequests = new Map();

async function getActiveTab() {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  return tabs[0] || null;
}

async function runAssistant(tab) {
  if (!tab?.id) return;

  try {
    await chrome.scripting.executeScript({
      target: {
        tabId: tab.id,
      },
      files: [ASSISTANT_SCRIPT],
      world: 'ISOLATED',
    });
  } catch (error) {
    console.warn('Web Helper AI konnte auf dieser Seite nicht gestartet werden.', error);
  }
}

async function captureVisibleTab(sender) {
  const windowId = sender?.tab?.windowId;
  if (Number.isInteger(windowId)) {
    return chrome.tabs.captureVisibleTab(windowId, {
      format: 'png',
    });
  }

  return chrome.tabs.captureVisibleTab({
    format: 'png',
  });
}

async function getStoredApiKey() {
  const stored = await chrome.storage.local.get(API_KEY_STORAGE_KEY);
  return typeof stored?.[API_KEY_STORAGE_KEY] === 'string' ? stored[API_KEY_STORAGE_KEY].trim() : '';
}

async function requestApi(message) {
  const apiKey = await getStoredApiKey();
  if (!apiKey) {
    const error = new Error('Kein KI-API-Schlüssel eingerichtet. Öffnen Sie die Einstellungen des Assistenten.');
    error.name = 'MissingApiKey';
    throw error;
  }

  const controller = new AbortController();
  const timeoutMs = Number(message.timeoutMs) || 60000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const requestId = String(message.requestId || '');
  if (requestId) activeRequests.set(requestId, controller);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(message.body),
      signal: controller.signal,
    });

    return {
      ok: response.ok,
      status: response.status,
      rawBody: await response.text(),
    };
  } finally {
    clearTimeout(timeoutId);
    if (requestId) activeRequests.delete(requestId);
  }
}

async function cancelApiRequest(message) {
  const requestId = String(message.requestId || '');
  const controller = activeRequests.get(requestId);
  if (controller) controller.abort();
  return { ok: true, cancelled: Boolean(controller) };
}

async function relayFrameHotkey(message, sender) {
  const tabId = sender?.tab?.id;
  if (!Number.isInteger(tabId)) {
    throw new Error('Die Registerkarte für den Tastaturbefehl konnte nicht ermittelt werden.');
  }

  return chrome.tabs.sendMessage(
    tabId,
    {
      type: 'AI_PUZZLE_RUN_ACTION',
      action: message.action,
    },
    {
      frameId: 0,
    },
  );
}

chrome.action.onClicked.addListener((tab) => {
  runAssistant(tab);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'run-assistant') return;

  const tab = await getActiveTab();
  runAssistant(tab);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'AI_PUZZLE_CAPTURE_VISIBLE_TAB') {
    captureVisibleTab(sender)
      .then((dataUrl) => sendResponse({ ok: true, dataUrl }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
    return true;
  }

  if (message?.type === 'AI_PUZZLE_GET_API_KEY_STATUS') {
    getStoredApiKey()
      .then((apiKey) => sendResponse({ ok: true, configured: Boolean(apiKey) }))
      .catch((error) => sendResponse({ ok: false, error: 'Der Status des KI-API-Schlüssels konnte nicht gelesen werden.' }));
    return true;
  }

  if (message?.type === 'AI_PUZZLE_REQUEST_API') {
    requestApi(message)
      .then((result) =>
        sendResponse({
          ok: true,
          httpOk: result.ok,
          status: result.status,
          rawBody: result.rawBody,
        }),
      )
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error?.message || String(error),
          name: error?.name || '',
        }),
      );
    return true;
  }

  if (message?.type === 'AI_PUZZLE_CANCEL_REQUEST') {
    cancelApiRequest(message)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ ok: false, error: 'Die Anfrage konnte nicht abgebrochen werden.' }));
    return true;
  }

  if (message?.type === 'AI_PUZZLE_FRAME_HOTKEY') {
    relayFrameHotkey(message, sender)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
    return true;
  }

  return false;
});
