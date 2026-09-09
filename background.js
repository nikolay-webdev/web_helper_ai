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
      world: 'MAIN',
    });
  } catch (error) {
    console.warn('AI Puzzle Assistant could not run on this page.', error);
  }
}

chrome.action.onClicked.addListener((tab) => {
  runAssistant(tab);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'run-assistant') return;

  const tab = await getActiveTab();
  runAssistant(tab);
});
