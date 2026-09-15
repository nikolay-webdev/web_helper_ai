'use strict';

const ASSISTANT_SCRIPT = 'ai-puzzle-assistant.snippet.js';

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
    console.warn('AI Puzzle Assistant could not run on this page.', error);
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

async function requestDeepSeek(message) {
  const controller = new AbortController();
  const timeoutMs = Number(message.timeoutMs) || 60000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(message.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${message.apiKey}`,
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
  }
}

async function relayFrameHotkey(message, sender) {
  const tabId = sender?.tab?.id;
  if (!Number.isInteger(tabId)) {
    throw new Error('Не удалось определить вкладку для горячей клавиши.');
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

  if (message?.type === 'AI_PUZZLE_REQUEST_DEEPSEEK') {
    requestDeepSeek(message)
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

  if (message?.type === 'AI_PUZZLE_FRAME_HOTKEY') {
    relayFrameHotkey(message, sender)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
    return true;
  }

  return false;
});
