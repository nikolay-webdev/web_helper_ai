(() => {
  'use strict';

  const BRIDGE_KEY = '__AI_PUZZLE_ASSISTANT_STATIC_HOTKEY_BRIDGE__';
  if (window[BRIDGE_KEY]) return;

  const HOTKEYS = {
    default: {
      ctrl: false,
      shift: true,
      alt: false,
      key: 'Y',
    },
    screenshot: {
      ctrl: false,
      shift: true,
      alt: false,
      key: 'A',
    },
    area: {
      ctrl: false,
      shift: true,
      alt: false,
      key: 'R',
    },
    frame: {
      ctrl: true,
      shift: true,
      alt: false,
      key: 'R',
    },
    toggle: {
      ctrl: false,
      shift: true,
      alt: false,
      key: 'Q',
    },
  };

  function handleKeyDown(event) {
    if (event.repeat || isEditableTarget(event.target)) return;

    const action = getHotkeyAction(event);
    if (!action) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    if (runAssistantAction(action)) return;

    sendHotkey(action);
  }

  function runAssistantAction(action) {
    try {
      const assistant = window.__AI_PUZZLE_ASSISTANT__;
      if (typeof assistant?.runAction !== 'function') return false;
      if (typeof assistant.isMounted === 'function' && !assistant.isMounted()) return false;

      assistant.runAction(action);
      return true;
    } catch (error) {
      return false;
    }
  }

  function getHotkeyAction(event) {
    if (isShortcutPressed(event, HOTKEYS.toggle)) return 'toggle';
    if (isShortcutPressed(event, HOTKEYS.frame)) return 'frame';
    if (isShortcutPressed(event, HOTKEYS.area)) return 'area';
    if (isShortcutPressed(event, HOTKEYS.screenshot)) return 'screenshot';
    if (isShortcutPressed(event, HOTKEYS.default)) return 'default';
    return '';
  }

  function isShortcutPressed(event, shortcut) {
    const expectedKey = String(shortcut.key || '').toUpperCase();
    const eventKey = String(event.key || '').toUpperCase();
    const eventCode = String(event.code || '').toUpperCase();
    const keyMatches = eventKey === expectedKey || (expectedKey.length === 1 && eventCode === `KEY${expectedKey}`);
    return (
      keyMatches &&
      event.ctrlKey === Boolean(shortcut.ctrl) &&
      event.shiftKey === Boolean(shortcut.shift) &&
      event.altKey === Boolean(shortcut.alt)
    );
  }

  function isEditableTarget(target) {
    if (!target || !(target instanceof Element)) return false;
    const editable = target.closest('textarea, select, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]');
    if (editable || target.isContentEditable) return true;

    const input = target.closest('input');
    if (!input) return false;

    const nonTypingTypes = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit']);
    const inputType = String(input.getAttribute('type') || 'text').toLowerCase();
    return !nonTypingTypes.has(inputType);
  }

  function sendHotkey(action) {
    try {
      if (typeof chrome === 'undefined') return;

      const runtime = chrome.runtime;
      const sendMessage = runtime?.sendMessage;
      if (typeof sendMessage !== 'function') return;

      sendMessage.call(
        runtime,
        {
          type: 'AI_PUZZLE_FRAME_HOTKEY',
          action,
        },
        () => {
          try {
            void runtime.lastError;
          } catch (error) {
            destroyBridge();
          }
        },
      );
    } catch (error) {
      destroyBridge();
    }
  }

  function destroyBridge() {
    window.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('keydown', handleKeyDown, true);
    window[BRIDGE_KEY] = undefined;
  }

  window.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('keydown', handleKeyDown, true);
  window[BRIDGE_KEY] = {
    destroy: destroyBridge,
  };
})();
