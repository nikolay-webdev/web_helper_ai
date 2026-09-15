(() => {
  'use strict';

  const FRAME_BRIDGE_KEY = '__AI_PUZZLE_ASSISTANT_FRAME_BRIDGE__';
  const FRAME_HOTKEYS = {
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

  if (window.top !== window) {
    installFrameHotkeyBridge();
    return;
  }

  function installFrameHotkeyBridge() {
    window[FRAME_BRIDGE_KEY]?.destroy?.();

    function handleFrameKeyDown(event) {
      if (event.repeat || isFrameEditableTarget(event.target)) return;

      const action = getFrameHotkeyAction(event);
      if (!action) return;

      event.preventDefault();
      event.stopPropagation();
      sendFrameHotkey(action);
    }

    window.addEventListener('keydown', handleFrameKeyDown, true);
    document.addEventListener('keydown', handleFrameKeyDown, true);

    window[FRAME_BRIDGE_KEY] = {
      destroy() {
        window.removeEventListener('keydown', handleFrameKeyDown, true);
        document.removeEventListener('keydown', handleFrameKeyDown, true);
        window[FRAME_BRIDGE_KEY] = undefined;
      },
    };
  }

  function getFrameHotkeyAction(event) {
    const opacityAction = getOpacityHotkeyAction(event);
    if (opacityAction) return opacityAction;
    if (isFrameShortcutPressed(event, FRAME_HOTKEYS.toggle)) return 'toggle';
    if (isFrameShortcutPressed(event, FRAME_HOTKEYS.frame)) return 'frame';
    if (isFrameShortcutPressed(event, FRAME_HOTKEYS.area)) return 'area';
    if (isFrameShortcutPressed(event, FRAME_HOTKEYS.screenshot)) return 'screenshot';
    if (isFrameShortcutPressed(event, FRAME_HOTKEYS.default)) return 'default';
    return '';
  }

  function getOpacityHotkeyAction(event) {
    if (!event.shiftKey || event.ctrlKey || event.altKey) return '';

    const key = String(event.key || '').toUpperCase();
    const code = String(event.code || '').toUpperCase();

    if (key === '+' || key === '=' || key === 'ADD' || code === 'EQUAL' || code === 'NUMPADADD') return 'opacityUp';
    if (key === '-' || key === '_' || key === 'SUBTRACT' || code === 'MINUS' || code === 'NUMPADSUBTRACT') return 'opacityDown';

    return '';
  }

  function isFrameShortcutPressed(event, shortcut) {
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

  function isFrameEditableTarget(target) {
    if (!target || !(target instanceof Element)) return false;
    const editable = target.closest('textarea, select, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]');
    if (editable || target.isContentEditable) return true;

    const input = target.closest('input');
    if (!input) return false;

    const nonTypingTypes = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit']);
    const inputType = String(input.getAttribute('type') || 'text').toLowerCase();
    return !nonTypingTypes.has(inputType);
  }

  function sendFrameHotkey(action) {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;

    chrome.runtime.sendMessage({
      type: 'AI_PUZZLE_FRAME_HOTKEY',
      action,
    });
  }

  const existingAssistant = window.__AI_PUZZLE_ASSISTANT__;
  if (existingAssistant) {
    if (typeof existingAssistant.isMounted === 'function' && existingAssistant.isMounted()) {
      existingAssistant.show();
      return;
    }

    if (document.querySelector('[data-ai-puzzle-assistant-host="true"]')) {
      existingAssistant.show?.();
      return;
    }

    existingAssistant.destroy?.();
    window.__AI_PUZZLE_ASSISTANT__ = undefined;
    try {
      delete window.__AI_PUZZLE_ASSISTANT__;
    } catch (error) {
      window.__AI_PUZZLE_ASSISTANT__ = undefined;
    }
  }

  document.querySelector('[data-ai-puzzle-assistant-host="true"]')?.remove();
  document.querySelector('[data-ai-puzzle-assistant-screenshot-frame="true"]')?.remove();

  // ВНИМАНИЕ:
  // API-ключ хранится в клиентском JavaScript.
  // Не публикуйте этот файл и не передавайте его другим людям.
  const CONFIG = {
    apiKey: '[SECRET_REMOVED]', // <-- Вставьте сюда API-ключ DeepSeek.
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    visionModel: 'deepseek-v4-flash-vision-exp',
    hotkey: {
      ctrl: false,
      shift: true,
      alt: false,
      key: 'Y',
    },
    screenshotHotkey: {
      enabled: true,
      ctrl: false,
      shift: true,
      alt: false,
      key: 'A',
    },
    screenshotAreaHotkey: {
      enabled: true,
      ctrl: false,
      shift: true,
      alt: false,
      key: 'R',
    },
    screenshotFrameHotkey: {
      enabled: true,
      ctrl: true,
      shift: true,
      alt: false,
      key: 'R',
    },
    toggleHotkey: {
      enabled: true,
      ctrl: false,
      shift: true,
      alt: false,
      key: 'Q',
    },
    maxSelectedTextLength: 10000,
    maxTokens: 2000,
    temperature: 0.2,
    timeoutMs: 60000,
    screenshotFrameOpacity: 0.3,
    ignoreHotkeyInEditable: true,
    debug: false,
  };

  const STORAGE_KEY = 'aiPuzzleAssistantSettingsV1';
  const GLOBAL_KEY = '__AI_PUZZLE_ASSISTANT__';
  const MAX_Z_INDEX = 2147483647;
  const DEFAULT_WINDOW_WIDTH = 420;
  const MIN_WINDOW_WIDTH = 320;
  const MIN_WINDOW_HEIGHT = 250;
  const OPACITY_HOTKEY_STEP = 0.05;
  const PAGE_HIGHLIGHT_STYLE_ID = 'ai-puzzle-assistant-page-highlight-style';
  const PAGE_HIGHLIGHT_CLASS = 'ai-puzzle-assistant-correct-option';
  const SELECTION_STYLE_ID = 'ai-puzzle-assistant-selection-style';
  const SCREENSHOT_FRAME_STYLE_ID = 'ai-puzzle-assistant-screenshot-frame-style';
  const SCREENSHOT_FRAME_ATTRIBUTE = 'data-ai-puzzle-assistant-screenshot-frame';
  const MIN_SCREENSHOT_AREA_WIDTH = 160;
  const MIN_SCREENSHOT_AREA_HEIGHT = 90;

  const SYSTEM_PROMPT = [
    'Ты - ИИ-помощник по решению заданий.',
    'Определи правильный ответ, но не показывай ход рассуждений.',
    '',
    'Строгий формат ответа:',
    '1. Определи язык текста задания. Ответ пиши строго на языке задания.',
    '2. Сначала напиши только окончательный ответ.',
    '3. Если в задании есть варианты ответа, определи один или несколько правильных вариантов и верни точный текст каждого правильного варианта без перефразирования.',
    '4. Не повторяй окончательный ответ.',
    '5. Не добавляй пояснение, объяснение, анализ или ход рассуждений.',
  ].join('\n');

  const VERIFY_PROMPT = [
    'Ты - внимательный проверяющий ИИ.',
    'Пользователь передает исходную задачу и предыдущий ответ ИИ.',
    'Твоя задача - заново решить задачу независимо от предыдущего ответа и вернуть только проверенный итог.',
    '',
    'Строгий формат ответа:',
    '1. Определи язык текста задания. Весь ответ, включая краткое пояснение, пиши строго на языке задания.',
    '2. Не показывай ход рассуждений, анализ, сравнение или пошаговое решение.',
    '3. Сначала напиши только окончательный проверенный ответ.',
    '4. Если в задании есть варианты ответа, верни точный текст каждого правильного варианта без перефразирования.',
    '5. Не повторяй окончательный ответ.',
    '6. После ответа добавь только краткое пояснение, почему он верный.',
  ].join('\n');

  const DEFAULT_SETTINGS = {
    left: Math.max(12, window.innerWidth - 450),
    top: 80,
    width: DEFAULT_WINDOW_WIDTH,
    height: null,
    opacity: 0.3,
    collapsed: true,
    screenshotArea: getDefaultScreenshotArea(),
    screenshotFrameVisible: true,
  };

  const state = {
    isLoading: false,
    isHidden: false,
    lastSelectedText: '',
    lastSelectionRange: null,
    lastRequestMode: 'text',
    lastScreenshotArea: null,
    lastScreenshotDataUrl: '',
    lastAnswer: '',
    highlightedOptions: [],
    abortController: null,
    settings: loadSettings(),
    host: null,
    shadowRoot: null,
    elements: {},
    drag: null,
    resize: null,
    screenshotAreaDrag: null,
    screenshotAreaResize: null,
    isEditingScreenshotArea: false,
    screenshotAreaInteraction: null,
    previousBodyUserSelect: '',
  };

  function safeLog(message, details) {
    if (details !== undefined && !CONFIG.debug) return;
    if (details !== undefined) {
      console.info(`[AI Assistant] ${message}`, details);
      return;
    }
    console.info(`[AI Assistant] ${message}`);
  }

  function loadSettings() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return {
        left: getFiniteNumber(parsed.left, DEFAULT_SETTINGS.left),
        top: getFiniteNumber(parsed.top, DEFAULT_SETTINGS.top),
        width: clamp(getFiniteNumber(parsed.width, DEFAULT_SETTINGS.width), MIN_WINDOW_WIDTH, Math.max(MIN_WINDOW_WIDTH, window.innerWidth - 12)),
        height: getOptionalWindowHeight(parsed.height),
        opacity: clamp(getFiniteNumber(parsed.opacity, DEFAULT_SETTINGS.opacity), 0.01, 1),
        collapsed: true,
        screenshotArea: getScreenshotArea(parsed.screenshotArea),
        screenshotFrameVisible: parsed.screenshotFrameVisible !== false,
      };
    } catch (error) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          left: state.settings.left,
          top: state.settings.top,
          width: state.settings.width,
          height: state.settings.height,
          opacity: state.settings.opacity,
          collapsed: state.settings.collapsed,
          screenshotArea: state.settings.screenshotArea,
          screenshotFrameVisible: state.settings.screenshotFrameVisible,
        }),
      );
    } catch (error) {
      if (CONFIG.debug) safeLog('Не удалось сохранить настройки', error);
    }
  }

  function getFiniteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function getOptionalWindowHeight(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return clamp(number, MIN_WINDOW_HEIGHT, Math.max(MIN_WINDOW_HEIGHT, window.innerHeight - 12));
  }

  function getDefaultScreenshotArea() {
    const width = clamp(Math.round(window.innerWidth * 0.72), MIN_SCREENSHOT_AREA_WIDTH, Math.max(MIN_SCREENSHOT_AREA_WIDTH, window.innerWidth - 48));
    const height = clamp(Math.round(window.innerHeight * 0.42), MIN_SCREENSHOT_AREA_HEIGHT, Math.max(MIN_SCREENSHOT_AREA_HEIGHT, window.innerHeight - 96));

    return {
      left: Math.round((window.innerWidth - width) / 2),
      top: Math.max(48, Math.round((window.innerHeight - height) / 3)),
      width,
      height,
    };
  }

  function getScreenshotArea(value) {
    const fallback = getDefaultScreenshotArea();
    if (!value || typeof value !== 'object') return fallback;

    const width = clamp(
      getFiniteNumber(value.width, fallback.width),
      MIN_SCREENSHOT_AREA_WIDTH,
      Math.max(MIN_SCREENSHOT_AREA_WIDTH, window.innerWidth),
    );
    const height = clamp(
      getFiniteNumber(value.height, fallback.height),
      MIN_SCREENSHOT_AREA_HEIGHT,
      Math.max(MIN_SCREENSHOT_AREA_HEIGHT, window.innerHeight),
    );

    return {
      left: clamp(getFiniteNumber(value.left, fallback.left), 0, Math.max(0, window.innerWidth - width)),
      top: clamp(getFiniteNumber(value.top, fallback.top), 0, Math.max(0, window.innerHeight - height)),
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        color-scheme: light;
        display: block;
        position: fixed;
        width: min(420px, calc(100vw - 24px));
        min-width: ${MIN_WINDOW_WIDTH}px;
        max-height: calc(100vh - 12px);
        z-index: ${MAX_Z_INDEX};
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 14px;
        line-height: 1.45;
        letter-spacing: 0;
      }

      .assistant,
      .assistant * {
        box-sizing: border-box;
      }

      .assistant {
        position: relative;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        width: 100%;
        height: 100%;
        min-height: 250px;
        max-height: calc(100vh - 12px);
        color: #111827;
        background: #ffffff;
        border-radius: 8px;
        animation: aiAssistantIn 120ms ease-out;
      }

      .assistant.is-collapsed {
        min-height: 0;
        height: auto;
      }

      .assistant.is-collapsed .content,
      .content[hidden] {
        display: none;
      }

      .header {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 42px;
        padding: 8px 10px;
        cursor: move;
        user-select: none;
        background: #f4f7fb;
      }

      .title {
        flex: 1 1 auto;
        min-width: 88px;
        overflow: hidden;
        color: #111827;
        font-size: 13px;
        font-weight: 650;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .opacity-control {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 0 1 190px;
        min-width: 120px;
        color: #4b5563;
        font-size: 12px;
      }

      .opacity-control input {
        appearance: none;
        width: 88px;
        min-width: 72px;
        height: 18px;
        background: transparent;
        cursor: pointer;
      }

      .opacity-control input::-webkit-slider-runnable-track {
        height: 8px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 999px;
        box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.08);
      }

      .opacity-control input::-webkit-slider-thumb {
        appearance: none;
        width: 18px;
        height: 18px;
        margin-top: -6px;
        background: #ffffff;
        border: 1px solid #64748b;
        border-radius: 50%;
        box-shadow: 0 1px 4px rgba(15, 23, 42, 0.22);
      }

      .opacity-control input::-moz-range-track {
        height: 8px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 999px;
        box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.08);
      }

      .opacity-control input::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background: #ffffff;
        border: 1px solid #64748b;
        border-radius: 50%;
        box-shadow: 0 1px 4px rgba(15, 23, 42, 0.22);
      }

      .opacity-control input:focus-visible {
        outline: 2px solid #94a3b8;
        outline-offset: 2px;
        border-radius: 999px;
      }

      .icon-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: 26px;
        height: 26px;
        padding: 0;
        color: #cbd5e1;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font: inherit;
        line-height: 1;
        cursor: pointer;
      }

      .icon-button:hover {
        background: #eaf1fb;
      }

      .content {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        gap: 10px;
        min-height: 0;
        padding: 12px;
      }

      .status {
        min-height: 22px;
        color: #374151;
        font-size: 13px;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .status.success {
        color: #a6afad;
      }

      .status.error {
        color: #a6afad;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        opacity:0.3;
      }

      .button {
        min-height: 32px;
        padding: 6px 10px;
        color: #111827;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 7px;
        font: inherit;
        font-weight: 600;
        cursor: pointer;
      }

      .button.primary {
        background: #dbeafe;
        border-color: #93c5fd;
      }

      .button.danger {
        background: #fee2e2;
        border-color: #fecaca;
      }

      .button:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      .answer {
        flex: 1 1 auto;
        min-height: 130px;
        overflow: auto;
        padding: 10px;
        color: #111827;
        background: #ffffff;
        border: 1px solid #d8dee8;
        border-radius: 7px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
        font-size: 13px;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
        user-select: text;
      }

      .answer:empty::before {
        color: #94a3b8;
        content: "Ответ DeepSeek отображается здесь.";
      }

      .resize-handle {
        position: absolute;
        right: 2px;
        bottom: 2px;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        background:
          linear-gradient(135deg, transparent 0 48%, #64748b 49% 53%, transparent 54%),
          linear-gradient(135deg, transparent 0 61%, #94a3b8 62% 66%, transparent 67%),
          linear-gradient(135deg, transparent 0 74%, #cbd5e1 75% 79%, transparent 80%);
        cursor: nwse-resize;
        touch-action: none;
        opacity: 0.95;
      }

      .resize-handle::after {
        content: "↘";
        position: absolute;
        right: 5px;
        bottom: 3px;
        color: #475569;
        font-size: 13px;
        line-height: 1;
        pointer-events: none;
      }

      .resize-handle:hover {
        background-color: #eaf1fb;
        box-shadow: inset 0 0 0 1px #93c5fd;
      }

      .assistant.is-collapsed .resize-handle {
        display: none;
      }

      @keyframes aiAssistantIn {
        from {
          transform: translateY(-6px);
          opacity: 0;
        }

        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    return style;
  }

  function createInterface() {
    const host = document.createElement('div');
    host.setAttribute('data-ai-puzzle-assistant-host', 'true');
    host.style.zIndex = String(MAX_Z_INDEX);
    host.style.left = `${state.settings.left}px`;
    host.style.top = `${state.settings.top}px`;
    host.style.opacity = String(state.settings.opacity);
    applyWindowSizeToHost(host);

    const shadowRoot = host.attachShadow({ mode: 'open' });
    shadowRoot.append(createStyles());

    const panel = document.createElement('section');
    panel.className = 'assistant';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'ИИ-помощник для задач');

    const header = document.createElement('div');
    header.className = 'header';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = '';

    const opacityControl = document.createElement('label');
    opacityControl.className = 'opacity-control';
    opacityControl.setAttribute('data-no-drag', 'true');

    const opacityInput = document.createElement('input');
    opacityInput.type = 'range';
    opacityInput.min = '1';
    opacityInput.max = '100';
    opacityInput.step = '1';
    opacityInput.value = String(Math.round(state.settings.opacity * 100));
    opacityInput.title = 'Настройка окна';

    const collapseButton = document.createElement('button');
    collapseButton.type = 'button';
    collapseButton.className = 'icon-button';
    collapseButton.setAttribute('data-no-drag', 'true');
    collapseButton.title = 'Свернуть';
    collapseButton.textContent = '−';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'icon-button';
    closeButton.setAttribute('data-no-drag', 'true');
    closeButton.title = 'Закрыть';
    closeButton.textContent = '×';

    const content = document.createElement('div');
    content.className = 'content';

    const status = document.createElement('div');
    status.className = 'status';
    status.setAttribute('role', 'status');

    const actions = document.createElement('div');
    actions.className = 'actions';

    const verifyButton = document.createElement('button');
    verifyButton.type = 'button';
    verifyButton.className = 'button';
    verifyButton.textContent = 'Проверить';
    verifyButton.disabled = true;

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'button';
    clearButton.textContent = 'Очистить';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'button danger';
    cancelButton.textContent = 'Отменить';
    cancelButton.hidden = true;

    const answer = document.createElement('div');
    answer.className = 'answer';
    answer.setAttribute('aria-label', 'Ответ DeepSeek');

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    resizeHandle.setAttribute('role', 'separator');
    resizeHandle.setAttribute('aria-label', 'Изменить размер окна');
    resizeHandle.title = 'Изменить размер окна';

    opacityControl.append(opacityInput);
    header.append(title, opacityControl, collapseButton, closeButton);
    actions.append(verifyButton, clearButton, cancelButton);
    content.append(status, actions, answer);
    panel.append(header, content, resizeHandle);
    shadowRoot.append(panel);
    document.documentElement.append(host);

    state.host = host;
    state.shadowRoot = shadowRoot;
    state.elements = {
      answer,
      cancelButton,
      clearButton,
      closeButton,
      collapseButton,
      content,
      header,
      opacityInput,
      panel,
      resizeHandle,
      status,
      verifyButton,
    };

    [collapseButton, closeButton, opacityInput].forEach((element) => {
      element.addEventListener('pointerdown', stopHeaderControlEvent);
      element.addEventListener('mousedown', stopHeaderControlEvent);
    });

    collapseButton.addEventListener('click', (event) => {
      stopHeaderControlEvent(event);
      toggleCollapse();
    });
    closeButton.addEventListener('click', (event) => {
      stopHeaderControlEvent(event);
      destroy();
    });
    verifyButton.addEventListener('mousedown', (event) => event.preventDefault());
    verifyButton.addEventListener('click', verifyLastAnswer);
    clearButton.addEventListener('click', clearAnswer);
    cancelButton.addEventListener('click', cancelRequest);
    opacityInput.addEventListener('input', updateOpacity);

    makeWindowDraggable();
    makeWindowResizable();
    createScreenshotFrame();
    applyCollapsedState();
    clampWindowToViewport();
    setStatus('Готово. Shift+Y - текст, Shift+A - скрин, Shift+R - настройка, Ctrl+Shift+R - рамка.');
  }

  function makeWindowDraggable() {
    state.elements.header.addEventListener('mousedown', handleDragStart);
  }

  function makeWindowResizable() {
    state.elements.resizeHandle.addEventListener('mousedown', handleResizeStart);
  }

  function stopHeaderControlEvent(event) {
    event.stopPropagation();
  }

  function handleDragStart(event) {
    if (event.button !== 0) return;
    if (event.target.closest('[data-no-drag]')) return;

    const rect = state.host.getBoundingClientRect();
    state.drag = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    state.previousBodyUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    document.addEventListener('mousemove', handleDragMove, true);
    document.addEventListener('mouseup', handleDragEnd, true);
    event.preventDefault();
  }

  function handleDragMove(event) {
    if (!state.drag) return;

    const rect = state.host.getBoundingClientRect();
    const left = clamp(event.clientX - state.drag.offsetX, 0, Math.max(0, window.innerWidth - rect.width));
    const top = clamp(event.clientY - state.drag.offsetY, 0, Math.max(0, window.innerHeight - rect.height));
    setWindowPosition(left, top);
    event.preventDefault();
  }

  function handleDragEnd() {
    if (!state.drag) return;
    state.drag = null;
    document.body.style.userSelect = state.previousBodyUserSelect;
    document.removeEventListener('mousemove', handleDragMove, true);
    document.removeEventListener('mouseup', handleDragEnd, true);
    saveSettings();
  }

  function handleResizeStart(event) {
    if (event.button !== 0 || state.settings.collapsed) return;

    const rect = state.host.getBoundingClientRect();
    state.resize = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      startHeight: rect.height,
    };
    state.previousBodyUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    document.addEventListener('mousemove', handleResizeMove, true);
    document.addEventListener('mouseup', handleResizeEnd, true);
    event.preventDefault();
    event.stopPropagation();
  }

  function handleResizeMove(event) {
    if (!state.resize) return;

    const rect = state.host.getBoundingClientRect();
    const maxWidth = Math.max(MIN_WINDOW_WIDTH, window.innerWidth - rect.left);
    const maxHeight = Math.max(MIN_WINDOW_HEIGHT, window.innerHeight - rect.top);
    const width = clamp(state.resize.startWidth + event.clientX - state.resize.startX, MIN_WINDOW_WIDTH, maxWidth);
    const height = clamp(state.resize.startHeight + event.clientY - state.resize.startY, MIN_WINDOW_HEIGHT, maxHeight);

    setWindowSize(width, height);
    event.preventDefault();
    event.stopPropagation();
  }

  function handleResizeEnd() {
    if (!state.resize) return;
    state.resize = null;
    document.body.style.userSelect = state.previousBodyUserSelect;
    document.removeEventListener('mousemove', handleResizeMove, true);
    document.removeEventListener('mouseup', handleResizeEnd, true);
    saveSettings();
  }

  function setWindowPosition(left, top) {
    state.settings.left = Math.round(left);
    state.settings.top = Math.round(top);
    state.host.style.left = `${state.settings.left}px`;
    state.host.style.top = `${state.settings.top}px`;
  }

  function setWindowSize(width, height) {
    state.settings.width = Math.round(width);
    state.settings.height = Math.round(height);
    applyWindowSizeToHost();
  }

  function ensureScreenshotFrameStyle() {
    if (document.getElementById(SCREENSHOT_FRAME_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = SCREENSHOT_FRAME_STYLE_ID;
    style.textContent = `
      [${SCREENSHOT_FRAME_ATTRIBUTE}="true"] {
        position: fixed !important;
        z-index: ${MAX_Z_INDEX - 2} !important;
        display: block !important;
        background: rgb(59 130 246 / 18%) !important;
        border: 2px dashed #2563eb !important;
        box-shadow: 0 0 0 99999px rgb(15 23 42 / 6%) !important;
        opacity: ${CONFIG.screenshotFrameOpacity} !important;
        pointer-events: none !important;
        box-sizing: border-box !important;
      }

      [${SCREENSHOT_FRAME_ATTRIBUTE}="true"][hidden] {
        display: none !important;
      }

      [${SCREENSHOT_FRAME_ATTRIBUTE}="true"].is-editing {
        cursor: move !important;
        opacity: 0.72 !important;
        pointer-events: auto !important;
      }

      [${SCREENSHOT_FRAME_ATTRIBUTE}="true"] .ai-puzzle-assistant-screenshot-resize {
        position: absolute !important;
        right: -8px !important;
        bottom: -8px !important;
        display: none !important;
        width: 18px !important;
        height: 18px !important;
        background: #2563eb !important;
        border: 2px solid #ffffff !important;
        border-radius: 4px !important;
        box-shadow: 0 2px 8px rgb(15 23 42 / 25%) !important;
        cursor: nwse-resize !important;
        pointer-events: none !important;
      }

      [${SCREENSHOT_FRAME_ATTRIBUTE}="true"].is-editing .ai-puzzle-assistant-screenshot-resize {
        display: block !important;
        pointer-events: auto !important;
      }
    `;
    (document.head || document.documentElement).append(style);
  }

  function createScreenshotFrame() {
    ensureScreenshotFrameStyle();

    const existingFrame = document.querySelector(`[${SCREENSHOT_FRAME_ATTRIBUTE}="true"]`);
    if (existingFrame) existingFrame.remove();

    const frame = document.createElement('div');
    frame.setAttribute(SCREENSHOT_FRAME_ATTRIBUTE, 'true');
    frame.setAttribute('aria-hidden', 'true');

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'ai-puzzle-assistant-screenshot-resize';
    frame.append(resizeHandle);

    frame.addEventListener('mousedown', handleScreenshotAreaDragStart);
    resizeHandle.addEventListener('mousedown', handleScreenshotAreaResizeStart);
    document.documentElement.append(frame);

    state.elements.screenshotFrame = frame;
    updateScreenshotFrame();
  }

  function updateScreenshotFrame() {
    const frame = state.elements.screenshotFrame;
    if (!frame) return;

    state.settings.screenshotArea = getScreenshotArea(state.settings.screenshotArea);
    const area = state.settings.screenshotArea;
    frame.style.left = `${area.left}px`;
    frame.style.top = `${area.top}px`;
    frame.style.width = `${area.width}px`;
    frame.style.height = `${area.height}px`;
    frame.hidden = state.settings.screenshotFrameVisible === false;
    frame.style.setProperty('display', state.settings.screenshotFrameVisible === false ? 'none' : 'block', 'important');
    frame.classList.toggle('is-editing', state.settings.screenshotFrameVisible !== false && state.isEditingScreenshotArea);

  }

  function toggleScreenshotFrameVisibility() {
    state.settings.screenshotFrameVisible = state.settings.screenshotFrameVisible === false;
    if (!state.settings.screenshotFrameVisible) {
      state.isEditingScreenshotArea = false;
    }
    updateScreenshotFrame();
    saveSettings();
    setStatus(state.settings.screenshotFrameVisible ? 'Рамка скрина показана.' : 'Рамка скрина скрыта. Shift+A всё равно сделает скрин сохраненной области.');
  }

  function toggleScreenshotAreaEditing() {
    if (state.settings.screenshotFrameVisible === false) {
      state.settings.screenshotFrameVisible = true;
    }
    setScreenshotAreaEditing(!state.isEditingScreenshotArea);
  }

  function setScreenshotAreaEditing(isEditing) {
    state.isEditingScreenshotArea = isEditing;
    updateScreenshotFrame();
    saveSettings();
    setStatus(isEditing ? 'Настройка области скрина: перетащите рамку или угол. Shift+R - сохранить.' : 'Область скрина сохранена. Shift+A отправит скрин.');
  }

  function createScreenshotAreaInteractionShield(cursor) {
    removeScreenshotAreaInteractionShield();

    const shield = document.createElement('div');
    shield.setAttribute('data-ai-puzzle-assistant-interaction-shield', 'true');
    shield.style.position = 'fixed';
    shield.style.inset = '0';
    shield.style.zIndex = String(MAX_Z_INDEX - 3);
    shield.style.background = 'transparent';
    shield.style.cursor = cursor;
    shield.style.pointerEvents = 'auto';
    shield.style.userSelect = 'none';
    document.documentElement.append(shield);

    state.screenshotAreaInteraction = {
      shield,
      cursor,
    };

    return shield;
  }

  function removeScreenshotAreaInteractionShield() {
    state.screenshotAreaInteraction?.shield?.remove();
    state.screenshotAreaInteraction = null;
  }

  function handleScreenshotAreaDragStart(event) {
    if (!state.isEditingScreenshotArea || event.button !== 0) return;
    if (event.target.closest('.ai-puzzle-assistant-screenshot-resize')) return;

    const area = state.settings.screenshotArea;
    state.screenshotAreaDrag = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: area.left,
      startTop: area.top,
    };
    state.previousBodyUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    const shield = createScreenshotAreaInteractionShield('move');
    shield.addEventListener('mousemove', handleScreenshotAreaDragMove, true);
    shield.addEventListener('mouseup', handleScreenshotAreaDragEnd, true);
    document.addEventListener('mousemove', handleScreenshotAreaDragMove, true);
    document.addEventListener('mouseup', handleScreenshotAreaDragEnd, true);
    window.addEventListener('mousemove', handleScreenshotAreaDragMove, true);
    window.addEventListener('mouseup', handleScreenshotAreaDragEnd, true);
    window.addEventListener('blur', handleScreenshotAreaDragEnd, true);
    event.preventDefault();
    event.stopPropagation();
  }

  function handleScreenshotAreaDragMove(event) {
    if (!state.screenshotAreaDrag) return;
    if (event.buttons !== undefined && event.buttons !== 1) {
      handleScreenshotAreaDragEnd();
      return;
    }

    const area = state.settings.screenshotArea;
    const nextLeft = state.screenshotAreaDrag.startLeft + event.clientX - state.screenshotAreaDrag.startX;
    const nextTop = state.screenshotAreaDrag.startTop + event.clientY - state.screenshotAreaDrag.startY;
    state.settings.screenshotArea = getScreenshotArea({
      ...area,
      left: nextLeft,
      top: nextTop,
    });
    updateScreenshotFrame();
    event.preventDefault();
    event.stopPropagation();
  }

  function handleScreenshotAreaDragEnd() {
    if (!state.screenshotAreaDrag) return;
    state.screenshotAreaDrag = null;
    document.body.style.userSelect = state.previousBodyUserSelect;
    removeScreenshotAreaInteractionShield();
    document.removeEventListener('mousemove', handleScreenshotAreaDragMove, true);
    document.removeEventListener('mouseup', handleScreenshotAreaDragEnd, true);
    window.removeEventListener('mousemove', handleScreenshotAreaDragMove, true);
    window.removeEventListener('mouseup', handleScreenshotAreaDragEnd, true);
    window.removeEventListener('blur', handleScreenshotAreaDragEnd, true);
    saveSettings();
  }

  function handleScreenshotAreaResizeStart(event) {
    if (!state.isEditingScreenshotArea || event.button !== 0) return;

    const area = state.settings.screenshotArea;
    state.screenshotAreaResize = {
      startX: event.clientX,
      startY: event.clientY,
      startWidth: area.width,
      startHeight: area.height,
    };
    state.previousBodyUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    const shield = createScreenshotAreaInteractionShield('nwse-resize');
    shield.addEventListener('mousemove', handleScreenshotAreaResizeMove, true);
    shield.addEventListener('mouseup', handleScreenshotAreaResizeEnd, true);
    document.addEventListener('mousemove', handleScreenshotAreaResizeMove, true);
    document.addEventListener('mouseup', handleScreenshotAreaResizeEnd, true);
    window.addEventListener('mousemove', handleScreenshotAreaResizeMove, true);
    window.addEventListener('mouseup', handleScreenshotAreaResizeEnd, true);
    window.addEventListener('blur', handleScreenshotAreaResizeEnd, true);
    event.preventDefault();
    event.stopPropagation();
  }

  function handleScreenshotAreaResizeMove(event) {
    if (!state.screenshotAreaResize) return;
    if (event.buttons !== undefined && event.buttons !== 1) {
      handleScreenshotAreaResizeEnd();
      return;
    }

    const area = state.settings.screenshotArea;
    const maxWidth = Math.max(MIN_SCREENSHOT_AREA_WIDTH, window.innerWidth - area.left);
    const maxHeight = Math.max(MIN_SCREENSHOT_AREA_HEIGHT, window.innerHeight - area.top);
    state.settings.screenshotArea = getScreenshotArea({
      ...area,
      width: clamp(state.screenshotAreaResize.startWidth + event.clientX - state.screenshotAreaResize.startX, MIN_SCREENSHOT_AREA_WIDTH, maxWidth),
      height: clamp(state.screenshotAreaResize.startHeight + event.clientY - state.screenshotAreaResize.startY, MIN_SCREENSHOT_AREA_HEIGHT, maxHeight),
    });
    updateScreenshotFrame();
    event.preventDefault();
    event.stopPropagation();
  }

  function handleScreenshotAreaResizeEnd() {
    if (!state.screenshotAreaResize) return;
    state.screenshotAreaResize = null;
    document.body.style.userSelect = state.previousBodyUserSelect;
    removeScreenshotAreaInteractionShield();
    document.removeEventListener('mousemove', handleScreenshotAreaResizeMove, true);
    document.removeEventListener('mouseup', handleScreenshotAreaResizeEnd, true);
    window.removeEventListener('mousemove', handleScreenshotAreaResizeMove, true);
    window.removeEventListener('mouseup', handleScreenshotAreaResizeEnd, true);
    window.removeEventListener('blur', handleScreenshotAreaResizeEnd, true);
    saveSettings();
  }

  function applyWindowSizeToHost(targetHost = state.host) {
    if (!targetHost) return;

    const maxWidth = Math.max(MIN_WINDOW_WIDTH, window.innerWidth - 12);
    const width = clamp(getFiniteNumber(state.settings.width, DEFAULT_SETTINGS.width), MIN_WINDOW_WIDTH, maxWidth);
    state.settings.width = Math.round(width);
    targetHost.style.width = `${state.settings.width}px`;

    if (state.settings.collapsed || !Number.isFinite(Number(state.settings.height))) {
      targetHost.style.removeProperty('height');
      return;
    }

    const maxHeight = Math.max(MIN_WINDOW_HEIGHT, window.innerHeight - 12);
    const height = clamp(Number(state.settings.height), MIN_WINDOW_HEIGHT, maxHeight);
    state.settings.height = Math.round(height);
    targetHost.style.height = `${state.settings.height}px`;
  }

  function clampWindowToViewport() {
    if (!state.host) return;
    requestAnimationFrame(() => {
      if (!state.host) return;
      applyWindowSizeToHost();
      const rect = state.host.getBoundingClientRect();
      setWindowPosition(
        clamp(rect.left, 0, Math.max(0, window.innerWidth - rect.width)),
        clamp(rect.top, 0, Math.max(0, window.innerHeight - rect.height)),
      );
      updateScreenshotFrame();
      saveSettings();
    });
  }

  function updateOpacity() {
    setOpacity(Number(state.elements.opacityInput.value) / 100);
  }

  function adjustOpacity(delta) {
    setOpacity(state.settings.opacity + delta);
  }

  function setOpacity(opacity) {
    const nextOpacity = clamp(opacity, 0.01, 1);
    state.settings.opacity = nextOpacity;
    if (state.host) state.host.style.opacity = String(nextOpacity);
    if (state.elements.opacityInput) {
      state.elements.opacityInput.value = String(Math.round(nextOpacity * 100));
    }
    saveSettings();
  }

  function toggleCollapse() {
    state.settings.collapsed = !state.settings.collapsed;
    applyCollapsedState();
    saveSettings();
  }

  function applyCollapsedState() {
    const collapsed = state.settings.collapsed;
    state.elements.content.hidden = collapsed;
    state.elements.content.style.display = collapsed ? 'none' : '';
    state.elements.panel.classList.toggle('is-collapsed', collapsed);
    state.elements.collapseButton.textContent = collapsed ? '+' : '−';
    state.elements.collapseButton.title = collapsed ? 'Развернуть' : 'Свернуть';
    applyWindowSizeToHost();
    if (!collapsed) clampWindowToViewport();
  }

  function getCurrentSelection() {
    return (window.getSelection()?.toString() || '').trim();
  }

  function getCurrentSelectionRange() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !selection.toString().trim()) return null;

    try {
      return selection.getRangeAt(0).cloneRange();
    } catch (error) {
      return null;
    }
  }

  function rememberSelection() {
    const selectedText = getCurrentSelection();
    if (!selectedText) return;

    state.lastSelectedText = selectedText;
    state.lastSelectionRange = getCurrentSelectionRange();
  }

  function validateSelectedText(text) {
    if (!text) {
      return 'Выделите текст задачи перед отправкой.';
    }

    if (text.length > CONFIG.maxSelectedTextLength) {
      return `Выделенный текст слишком длинный. Максимум: ${CONFIG.maxSelectedTextLength} символов.`;
    }

    return validateApiKey();
  }

  function validateApiKey() {
    if (!CONFIG.apiKey || CONFIG.apiKey.trim() === '' || CONFIG.apiKey.trim() === 'sk-') {
      return 'Добавьте API-ключ DeepSeek в CONFIG.apiKey в начале Snippet.';
    }

    return '';
  }

  function isHotkeyPressed(event) {
    return isShortcutPressed(event, CONFIG.hotkey);
  }

  function isScreenshotHotkeyPressed(event) {
    return CONFIG.screenshotHotkey?.enabled && isShortcutPressed(event, CONFIG.screenshotHotkey);
  }

  function isScreenshotAreaHotkeyPressed(event) {
    return CONFIG.screenshotAreaHotkey?.enabled && isShortcutPressed(event, CONFIG.screenshotAreaHotkey);
  }

  function isScreenshotFrameHotkeyPressed(event) {
    return CONFIG.screenshotFrameHotkey?.enabled && isShortcutPressed(event, CONFIG.screenshotFrameHotkey);
  }

  function isToggleHotkeyPressed(event) {
    return CONFIG.toggleHotkey?.enabled && isShortcutPressed(event, CONFIG.toggleHotkey);
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

  function handleKeyDown(event) {
    if (event.repeat) return;

    const shadowActiveElement = state.shadowRoot?.activeElement || null;
    if (CONFIG.ignoreHotkeyInEditable && (isEditableTarget(event.target) || isEditableTarget(shadowActiveElement))) {
      return;
    }

    const opacityAction = getOpacityHotkeyAction(event);
    if (opacityAction) {
      event.preventDefault();
      event.stopPropagation();
      runAssistantAction(opacityAction);
      return;
    }

    if (isToggleHotkeyPressed(event)) {
      event.preventDefault();
      event.stopPropagation();
      runAssistantAction('toggle');
      return;
    }

    if (isScreenshotFrameHotkeyPressed(event)) {
      event.preventDefault();
      event.stopPropagation();
      runAssistantAction('frame');
      return;
    }

    if (isScreenshotAreaHotkeyPressed(event)) {
      event.preventDefault();
      event.stopPropagation();
      runAssistantAction('area');
      return;
    }

    if (isScreenshotHotkeyPressed(event)) {
      event.preventDefault();
      event.stopPropagation();
      runAssistantAction('screenshot');
      return;
    }

    if (!isHotkeyPressed(event)) return;

    event.preventDefault();
    event.stopPropagation();
    runAssistantAction('default');
  }

  function solveDefaultHotkeyAction() {
    solveSelectedText();
  }

  async function requestDeepSeek(text, previousAnswer = '', imageDataUrl = '') {
    state.abortController = new AbortController();
    const timeoutId = window.setTimeout(() => {
      if (state.abortController) state.abortController.abort();
    }, CONFIG.timeoutMs);

    try {
      const requestBody = {
        model: imageDataUrl ? CONFIG.visionModel : CONFIG.model,
        messages: imageDataUrl ? createImageRequestMessages(text, imageDataUrl, previousAnswer) : createRequestMessages(text, previousAnswer),
        max_tokens: CONFIG.maxTokens,
        temperature: CONFIG.temperature,
      };

      if (imageDataUrl) {
        requestBody.thinking = {
          type: 'disabled',
        };
      }

      safeLog(imageDataUrl ? 'Запрос со скрином отправлен' : 'Запрос с текстом отправлен');
      const response = await sendDeepSeekRequest(requestBody);

      if (!response.ok) {
        throw new Error(getHttpErrorMessage(response.status, response.rawBody));
      }

      const rawBody = response.rawBody;
      if (!rawBody.trim()) {
        throw new Error('DeepSeek вернул пустой ответ.');
      }

      let data;
      try {
        data = JSON.parse(rawBody);
      } catch (error) {
        throw new Error('DeepSeek вернул некорректный JSON.');
      }

      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.trim() === '') {
        throw new Error('DeepSeek вернул неожиданный формат ответа.');
      }

      safeLog('Ответ получен');
      return content.trim();
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('Время ожидания ответа истекло.');
      }

      if (isLikelyCorsOrNetworkError(error)) {
        throw new Error('Браузер заблокировал прямой запрос к DeepSeek API. Возможно, потребуется локальный сервер-посредник.');
      }

      throw error;
    } finally {
      window.clearTimeout(timeoutId);
      state.abortController = null;
    }
  }

  async function sendDeepSeekRequest(body) {
    if (canUseExtensionMessaging()) {
      const response = await sendExtensionMessage({
        type: 'AI_PUZZLE_REQUEST_DEEPSEEK',
        apiUrl: CONFIG.apiUrl,
        apiKey: CONFIG.apiKey,
        timeoutMs: CONFIG.timeoutMs,
        body,
      });

      if (!response?.ok) {
        const error = new Error(response?.error || 'Фоновый процесс расширения не смог выполнить запрос.');
        error.name = response?.name || '';
        throw error;
      }

      return {
        ok: Boolean(response.httpOk),
        status: response.status,
        rawBody: response.rawBody || '',
      };
    }

    const response = await fetch(CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONFIG.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: state.abortController.signal,
    });

    return {
      ok: response.ok,
      status: response.status,
      rawBody: await response.text(),
    };
  }

  function createRequestMessages(text, previousAnswer) {
    if (!previousAnswer) {
      return [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: text,
        },
      ];
    }

    return [
      {
        role: 'system',
        content: VERIFY_PROMPT,
      },
      {
        role: 'user',
        content: [
          'Исходная задача:',
          text,
          '',
          'Предыдущий ответ ИИ:',
          previousAnswer,
          '',
          'Определи язык текста задания. Весь ответ, включая краткое пояснение, пиши строго на языке задания.',
          'Верни только окончательный проверенный ответ и короткое пояснение. Не показывай анализ, сравнение или ход рассуждений.',
        ].join('\n'),
      },
    ];
  }

  function createImageRequestMessages(text, imageDataUrl, previousAnswer = '') {
    if (previousAnswer) {
      return [
        {
          role: 'system',
          content: VERIFY_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                text || 'Исходная задача находится на скриншоте.',
                '',
                'Предыдущий ответ ИИ:',
                previousAnswer,
                '',
                'Определи язык текста задания. Весь ответ, включая краткое пояснение, пиши строго на языке задания.',
                'Верни только окончательный проверенный ответ и короткое пояснение. Не показывай анализ, сравнение или ход рассуждений.',
              ].join('\n'),
            },
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl,
                detail: 'high',
              },
            },
          ],
        },
      ];
    }

    return [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: text || 'Реши задачу на скриншоте. Определи язык текста задания. Ответ пиши строго на языке задания. Если есть варианты ответа, верни точный текст каждого правильного варианта. Не добавляй пояснение, объяснение, анализ или ход рассуждений.',
          },
          {
            type: 'image_url',
            image_url: {
              url: imageDataUrl,
              detail: 'high',
            },
          },
        ],
      },
    ];
  }

  function canUseExtensionMessaging() {
    return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.sendMessage);
  }

  function sendExtensionMessage(message) {
    return new Promise((resolve, reject) => {
      if (!canUseExtensionMessaging()) {
        reject(new Error('Этот режим работает только в расширении Chrome.'));
        return;
      }

      const timeoutId = window.setTimeout(() => {
        const error = new Error('Время ожидания ответа фонового процесса истекло.');
        error.name = 'AbortError';
        reject(error);
      }, CONFIG.timeoutMs + 2000);

      chrome.runtime.sendMessage(message, (response) => {
        window.clearTimeout(timeoutId);
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }

        resolve(response);
      });
    });
  }

  function handleRuntimeMessage(message, sender, sendResponse) {
    if (message?.type !== 'AI_PUZZLE_RUN_ACTION') return false;

    try {
      runAssistantAction(message.action);
      sendResponse({ ok: true });
    } catch (error) {
      sendResponse({ ok: false, error: error?.message || String(error) });
    }

    return false;
  }

  function runAssistantAction(action) {
    if (action === 'opacityUp') {
      adjustOpacity(OPACITY_HOTKEY_STEP);
      return;
    }

    if (action === 'opacityDown') {
      adjustOpacity(-OPACITY_HOTKEY_STEP);
      return;
    }

    if (action === 'toggle') {
      toggleVisibility();
      return;
    }

    if (action === 'area') {
      toggleScreenshotAreaEditing();
      return;
    }

    if (action === 'frame') {
      toggleScreenshotFrameVisibility();
      return;
    }

    if (action === 'screenshot') {
      solveScreenshotArea();
      return;
    }

    solveDefaultHotkeyAction();
  }

  function getHttpErrorMessage(status, rawBody = '') {
    const apiError = getApiErrorMessage(rawBody);
    if (apiError) return `HTTP ${status}: ${apiError}`;

    const messages = {
      400: 'HTTP 400: некорректный запрос к DeepSeek API.',
      401: 'HTTP 401: неверный или отсутствующий API-ключ DeepSeek.',
      403: 'HTTP 403: доступ к DeepSeek API запрещен.',
      429: 'HTTP 429: слишком много запросов. Попробуйте позже.',
      500: 'HTTP 500: ошибка сервера DeepSeek.',
    };

    if (messages[status]) return messages[status];
    if (status >= 500) return `HTTP ${status}: ошибка сервера DeepSeek.`;
    return `HTTP ${status}: DeepSeek API вернул ошибку.`;
  }

  function getApiErrorMessage(rawBody) {
    if (!rawBody || typeof rawBody !== 'string') return '';

    try {
      const data = JSON.parse(rawBody);
      const message = data?.error?.message || data?.message;
      if (typeof message === 'string' && message.trim()) return message.trim();
    } catch (error) {
      return rawBody.slice(0, 240).trim();
    }

    return '';
  }

  function isLikelyCorsOrNetworkError(error) {
    const message = String(error?.message || '').toLowerCase();
    return error instanceof TypeError || message.includes('failed to fetch') || message.includes('networkerror');
  }

  function ensurePageHighlightStyle() {
    if (document.getElementById(PAGE_HIGHLIGHT_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = PAGE_HIGHLIGHT_STYLE_ID;
    style.textContent = `
      .${PAGE_HIGHLIGHT_CLASS} {
        text-decoration-line: underline !important;
        text-decoration-thickness: 2px !important;
        text-decoration-color: #ebebeb !important;
        text-underline-offset: 4px !important;
        background: rgb(0 0 0 / 1%) !important;
      }
    `;
    (document.head || document.documentElement).append(style);
  }

  function ensureSelectionStyle() {
    if (document.getElementById(SELECTION_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = SELECTION_STYLE_ID;
    style.textContent = `
      ::selection {
        background: rgb(159 187 249 / 17%) !important;
        color: inherit !important;
      }
    `;
    (document.head || document.documentElement).append(style);
  }

  function clearHighlightedOptions() {
    state.highlightedOptions.forEach((element) => {
      element.classList.remove(PAGE_HIGHLIGHT_CLASS);
      element.removeAttribute('data-ai-puzzle-assistant-highlight');
    });
    state.highlightedOptions = [];
  }

  function highlightCorrectOptions(answerText) {
    clearHighlightedOptions();

    const answerBlock = getAnswerBlock(answerText);
    if (!answerBlock) return 0;

    const candidates = getSelectableOptionCandidates();
    const highlighted = [];

    candidates.forEach((candidate) => {
      if (!matchesCorrectAnswer(candidate.text, candidate.key, answerBlock)) return;

      candidate.element.classList.add(PAGE_HIGHLIGHT_CLASS);
      candidate.element.setAttribute('data-ai-puzzle-assistant-highlight', 'true');
      highlighted.push(candidate.element);
    });

    state.highlightedOptions = Array.from(new Set(highlighted));
    if (state.highlightedOptions.length > 0) ensurePageHighlightStyle();
    return state.highlightedOptions.length;
  }

  function getSelectableOptionCandidates() {
    if (state.lastRequestMode === 'screenshot' && state.lastScreenshotArea) {
      return getScreenshotAreaOptionCandidates(state.lastScreenshotArea);
    }

    const range = state.lastSelectionRange;
    const root = getSelectionRoot(range);
    const selectedText = normalizeOptionText(state.lastSelectedText);
    const inputs = Array.from(root.querySelectorAll('input[type="radio"], input[type="checkbox"]'));
    const candidates = [];

    inputs.forEach((input) => {
      const element = getOptionElement(input);
      if (!element || !isVisibleElement(element)) return;

      const text = getOptionCandidateText(input, element);
      if (!text) return;

      const optionText = normalizeOptionText(stripOptionPrefix(text));
      const isInsideSelection = !range || rangeIntersectsElement(range, input) || rangeIntersectsElement(range, element);
      const isTextInSelection = optionText && selectedText.includes(optionText);

      if (!isInsideSelection && !isTextInSelection) return;

      candidates.push({
        element,
        input,
        key: getOptionKey(text),
        text,
      });
    });

    if (candidates.length > 0) return candidates;
    return getTextOptionCandidates(root, range);
  }

  function getScreenshotAreaOptionCandidates(area) {
    const inputs = Array.from(document.querySelectorAll('input[type="radio"], input[type="checkbox"]'));
    const inputCandidates = [];

    inputs.forEach((input) => {
      const element = getOptionElement(input);
      if (!element || !isVisibleElement(element)) return;
      if (!elementIntersectsScreenshotArea(input, area) && !elementIntersectsScreenshotArea(element, area)) return;

      const text = getOptionCandidateText(input, element);
      if (!text) return;

      inputCandidates.push({
        element,
        input,
        key: getOptionKey(text),
        text,
      });
    });

    if (inputCandidates.length > 0) return inputCandidates;

    const elements = Array.from(document.querySelectorAll('li, button, [role="button"], [role="radio"], [role="checkbox"], label, p, div, span'));
    const seen = new Set();
    const textCandidates = [];

    elements.forEach((element) => {
      if (!isVisibleElement(element)) return;
      if (!elementIntersectsScreenshotArea(element, area)) return;

      const text = element.textContent.replace(/\s+/g, ' ').trim();
      const key = normalizeOptionText(stripOptionPrefix(text));
      if (!text || text.length > 300 || seen.has(key)) return;

      seen.add(key);
      textCandidates.push({
        element,
        input: null,
        key: getOptionKey(text),
        text,
      });
    });

    return keepDeepestOptionElements(textCandidates);
  }

  function getTextOptionCandidates(root, range) {
    const optionLines = extractSelectedOptionLines(state.lastSelectedText);
    if (optionLines.length === 0) return [];

    const elements = Array.from(root.querySelectorAll('li, button, [role="button"], [role="radio"], [role="checkbox"], label, p, div, span'));
    const candidates = [];

    elements.forEach((element) => {
      if (!isVisibleElement(element)) return;
      if (range && !rangeIntersectsElement(range, element)) return;

      const text = element.textContent.replace(/\s+/g, ' ').trim();
      if (!text || text.length > 300) return;

      const matchedOptions = optionLines.filter((option) => isSameOptionText(text, option.raw) || isSameOptionText(text, option.text));
      if (matchedOptions.length !== 1) return;

      const matchedOption = matchedOptions[0];
      candidates.push({
        element,
        input: null,
        key: getOptionKey(text) || matchedOption.key,
        text: matchedOption.text || text,
      });
    });

    return keepDeepestOptionElements(candidates);
  }

  function extractSelectedOptionLines(selectedText) {
    const lines = String(selectedText || '')
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    const prefixedLines = lines
      .map((line) => ({
        key: getOptionKey(line),
        raw: line,
        text: stripOptionPrefix(line),
      }))
      .filter((option) => option.key && option.text.length > 0 && option.text.length <= 220);

    if (prefixedLines.length > 0) return uniqueOptions(prefixedLines);

    const plainLines = lines
      .slice(1)
      .filter((line) => line.length > 0 && line.length <= 220 && !/[?？]\s*$/.test(line))
      .map((line) => ({
        key: '',
        raw: line,
        text: line,
      }));

    return uniqueOptions(plainLines);
  }

  function uniqueOptions(options) {
    const seen = new Set();
    return options.filter((option) => {
      const key = normalizeOptionText(option.text);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function isSameOptionText(elementText, optionText) {
    const normalizedElement = normalizeOptionText(stripOptionPrefix(elementText));
    const normalizedOption = normalizeOptionText(stripOptionPrefix(optionText));
    if (!normalizedElement || !normalizedOption) return false;
    if (normalizedElement === normalizedOption) return true;

    const lengthDelta = Math.abs(normalizedElement.length - normalizedOption.length);
    if (lengthDelta > 30) return false;

    return normalizedElement.includes(normalizedOption) || normalizedOption.includes(normalizedElement);
  }

  function keepDeepestOptionElements(candidates) {
    return candidates.filter((candidate) => {
      return !candidates.some((other) => other !== candidate && candidate.element.contains(other.element));
    });
  }

  function getSelectionRoot(range) {
    if (!range) return document.body;

    let node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    if (!(node instanceof Element)) return document.body;

    let root = node;
    while (root && root !== document.body) {
      if (root.querySelectorAll('input[type="radio"], input[type="checkbox"]').length > 0) return root;
      root = root.parentElement;
    }

    return document.body;
  }

  function rangeIntersectsElement(range, element) {
    if (!range || !element) return false;

    try {
      return range.intersectsNode(element);
    } catch (error) {
      return false;
    }
  }

  function elementIntersectsScreenshotArea(element, area) {
    if (!element || !area) return false;

    const rect = element.getBoundingClientRect();
    return (
      rect.right >= area.left &&
      rect.left <= area.left + area.width &&
      rect.bottom >= area.top &&
      rect.top <= area.top + area.height
    );
  }

  function getOptionElement(input) {
    if (!input) return null;

    const labelByFor = getLabelByFor(input);
    if (labelByFor) return labelByFor;

    const closestLabel = input.closest('label');
    if (closestLabel) return closestLabel;

    const labelledByElement = getElementFromIds(input.getAttribute('aria-labelledby'));
    if (labelledByElement) return labelledByElement;

    const nextTextElement = getNextTextElement(input);
    if (nextTextElement) return nextTextElement;

    const parent = input.parentElement;
    if (parent && parent.querySelectorAll('input[type="radio"], input[type="checkbox"]').length === 1) return parent;

    return null;
  }

  function getLabelByFor(input) {
    if (!input.id) return null;

    return Array.from(document.querySelectorAll('label')).find((label) => label.htmlFor === input.id) || null;
  }

  function getElementFromIds(ids) {
    if (!ids) return null;

    return ids
      .split(/\s+/)
      .map((id) => document.getElementById(id))
      .find((element) => element && element.textContent.trim()) || null;
  }

  function getNextTextElement(input) {
    let sibling = input.nextElementSibling;

    while (sibling) {
      if (sibling.textContent.trim()) return sibling;
      sibling = sibling.nextElementSibling;
    }

    return null;
  }

  function getOptionCandidateText(input, element) {
    const ariaLabel = input.getAttribute('aria-label');
    const text = ariaLabel || element.textContent || input.value || '';
    return text.replace(/\s+/g, ' ').trim();
  }

  function getAnswerBlock(answerText) {
    const lines = String(answerText || '')
      .split('\n')
      .map((line) => line.trim());

    const answerLines = [];
    for (const line of lines) {
      if (!line) {
        if (answerLines.length > 0) break;
        continue;
      }

      if (/^(объяснение|пояснение|почему|решение)\s*[:.-]/i.test(line)) break;
      answerLines.push(stripAnswerPrefix(line));
      if (answerLines.length >= 8) break;
    }

    return answerLines.join(' ').trim();
  }

  function stripAnswerPrefix(text) {
    return String(text || '')
      .trim()
      .replace(/^(ответ|правильный ответ|итоговый(?: проверенный)? ответ)\s*[:.-]\s*/i, '')
      .trim();
  }

  function matchesCorrectAnswer(optionText, optionKey, answerBlock) {
    const normalizedAnswer = normalizeOptionText(answerBlock);
    const normalizedOption = normalizeOptionText(optionText);
    const normalizedOptionWithoutPrefix = normalizeOptionText(stripOptionPrefix(optionText));

    const textMatches = [normalizedOptionWithoutPrefix, normalizedOption].some((candidate) => {
      if (!candidate || candidate.length < 2) return false;
      return normalizedAnswer.includes(candidate) || (candidate.length <= 80 && candidate.includes(normalizedAnswer));
    });

    if (textMatches) return true;
    if (!optionKey) return false;

    const escapedKey = escapeRegExp(optionKey);
    return new RegExp(`(^|[\\s,;:()[\\]{}])${escapedKey}($|[\\s,;:.()[\\]{}])`, 'i').test(answerBlock);
  }

  function getOptionKey(text) {
    const match = String(text || '').trim().match(/^([A-ZА-ЯЁ]|\d{1,3})\s*[\).:-]/i);
    return match ? match[1] : '';
  }

  function stripOptionPrefix(text) {
    return String(text || '')
      .trim()
      .replace(/^([A-ZА-ЯЁ]|\d{1,3})\s*[\).:-]\s*/i, '')
      .trim();
  }

  function normalizeOptionText(text) {
    return String(text || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[“”„«»]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function isVisibleElement(element) {
    if (!element) return false;

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return element.getClientRects().length > 0;
  }

  async function solveScreenshotArea() {
    if (state.isLoading) {
      setStatus('Предыдущий запрос ещё выполняется.', 'error');
      return;
    }

    const validationError = validateApiKey();
    if (validationError) {
      showError(validationError);
      return;
    }

    if (!canUseExtensionMessaging()) {
      showError('Скрин работает только в установленном расширении Chrome.');
      return;
    }

    const area = getScreenshotArea(state.settings.screenshotArea);
    state.settings.screenshotArea = area;
    state.lastSelectedText = '';
    state.lastSelectionRange = null;
    state.lastRequestMode = 'screenshot';
    state.lastScreenshotArea = { ...area };
    state.lastAnswer = '';
    clearHighlightedOptions();
    state.isLoading = true;
    setLoadingState(true, 'screenshot');
    setStatus('Скрин: снимаю сохраненную область...');
    safeLog('Область скрина подготовлена', area);

    try {
      const imageDataUrl = await captureScreenshotArea(area);
      state.lastScreenshotDataUrl = imageDataUrl;
      setStatus('Скрин: отправляю картинку в DeepSeek...');
      const answer = await requestDeepSeek('', '', imageDataUrl);
      showAnswer(answer);
      const highlightedCount = highlightCorrectOptions(answer);
      setStatus(highlightedCount > 0 ? `Скрин: ответ получен. Подчеркнуто вариантов: ${highlightedCount}.` : 'Скрин: ответ получен. Варианты для подчеркивания не найдены.', 'success');
    } catch (error) {
      safeLog('Ошибка запроса со скрином');
      showError(error?.message || 'Неизвестная ошибка.');
    } finally {
      state.isLoading = false;
      setLoadingState(false);
    }
  }

  async function captureScreenshotArea(area) {
    const restoreOverlays = hideCaptureOverlays();

    try {
      await waitForPaint();
      const response = await sendExtensionMessage({ type: 'AI_PUZZLE_CAPTURE_VISIBLE_TAB' });
      if (!response?.ok || !response.dataUrl) {
        throw new Error(response?.error || 'Не удалось сделать скриншот вкладки.');
      }

      return cropScreenshotDataUrl(response.dataUrl, area);
    } finally {
      restoreOverlays();
    }
  }

  function hideCaptureOverlays() {
    const elements = [state.elements.screenshotFrame].filter(Boolean);
    const previousVisibility = elements.map((element) => element.style.visibility);

    elements.forEach((element) => {
      element.style.visibility = 'hidden';
    });

    return () => {
      elements.forEach((element, index) => {
        element.style.visibility = previousVisibility[index];
      });
    };
  }

  function waitForPaint() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }

  async function cropScreenshotDataUrl(dataUrl, area) {
    const image = await loadImageDataUrl(dataUrl);
    const scaleX = image.naturalWidth / window.innerWidth;
    const scaleY = image.naturalHeight / window.innerHeight;
    const sourceX = Math.round(area.left * scaleX);
    const sourceY = Math.round(area.top * scaleY);
    const sourceWidth = Math.round(area.width * scaleX);
    const sourceHeight = Math.round(area.height * scaleY);
    const canvas = document.createElement('canvas');

    canvas.width = Math.max(1, sourceWidth);
    canvas.height = Math.max(1, sourceHeight);
    canvas.getContext('2d').drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  }

  function loadImageDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Не удалось обработать скриншот.'));
      image.src = dataUrl;
    });
  }

  async function solveSelectedText() {
    if (state.isLoading) {
      setStatus('Предыдущий запрос ещё выполняется.', 'error');
      return;
    }

    rememberSelection();
    const selectedText = getCurrentSelection() || state.lastSelectedText;
    const selectedRange = getCurrentSelectionRange() || state.lastSelectionRange;
    const validationError = validateSelectedText(selectedText);
    if (validationError) {
      showError(validationError);
      return;
    }

    state.lastSelectedText = selectedText;
    state.lastSelectionRange = selectedRange;
    state.lastRequestMode = 'text';
    state.lastScreenshotArea = null;
    state.lastScreenshotDataUrl = '';
    state.lastAnswer = '';
    clearHighlightedOptions();
    state.isLoading = true;
    setLoadingState(true, 'solve');
    setStatus('Текст: отправляю выделение в DeepSeek...');
    safeLog('Текст подготовлен');

    try {
      const answer = await requestDeepSeek(selectedText);
      showAnswer(answer);
      const highlightedCount = highlightCorrectOptions(answer);
      setStatus(highlightedCount > 0 ? `Текст: ответ получен. Подчеркнуто вариантов: ${highlightedCount}.` : 'Текст: ответ получен. Варианты для подчеркивания не найдены.', 'success');
    } catch (error) {
      safeLog('Ошибка запроса');
      showError(error?.message || 'Неизвестная ошибка.');
    } finally {
      state.isLoading = false;
      setLoadingState(false);
    }
  }

  async function verifyLastAnswer() {
    if (state.isLoading) {
      setStatus('Предыдущий запрос ещё выполняется.', 'error');
      return;
    }

    if (!state.lastAnswer) {
      showError('Сначала получите ответ, который нужно проверить.');
      return;
    }

    const isScreenshotVerify = state.lastRequestMode === 'screenshot';
    const taskText = isScreenshotVerify ? '' : state.lastSelectedText || getCurrentSelection();

    if (isScreenshotVerify) {
      const validationError = validateApiKey();
      if (validationError) {
        showError(validationError);
        return;
      }

      if (!state.lastScreenshotDataUrl) {
        showError('Не найден последний скрин для проверки. Сначала отправьте задачу через Shift+A.');
        return;
      }
    } else {
      if (!taskText) {
        showError('Не найден исходный текст задачи. Сначала выделите задачу и нажмите Shift+Y.');
        return;
      }

      const validationError = validateSelectedText(taskText);
      if (validationError) {
        showError(validationError);
        return;
      }
    }

    const answerToVerify = state.lastAnswer;
    clearHighlightedOptions();
    state.isLoading = true;
    setLoadingState(true, 'verify');
    setStatus(isScreenshotVerify ? 'Перепроверяю ответ по скрину в DeepSeek...' : 'Перепроверяю ответ в DeepSeek...');

    try {
      const verifiedAnswer = await requestDeepSeek(taskText, answerToVerify, isScreenshotVerify ? state.lastScreenshotDataUrl : '');
      showAnswer(verifiedAnswer);
      const highlightedCount = highlightCorrectOptions(verifiedAnswer);
      setStatus(highlightedCount > 0 ? `Проверка завершена. Подчеркнуто вариантов: ${highlightedCount}.` : 'Проверка завершена. Варианты для подчеркивания не найдены.', 'success');
    } catch (error) {
      safeLog('Ошибка запроса');
      showError(error?.message || 'Неизвестная ошибка.');
    } finally {
      state.isLoading = false;
      setLoadingState(false);
    }
  }

  function setLoadingState(isLoading, mode = '') {
    state.elements.verifyButton.disabled = isLoading || !state.lastAnswer;
    state.elements.verifyButton.textContent = isLoading && mode === 'verify' ? 'Проверяю...' : 'Проверить';
    state.elements.cancelButton.hidden = !isLoading;
  }

  function cancelRequest() {
    if (state.abortController) {
      state.abortController.abort();
      setStatus('Запрос отменяется...');
    }
  }

  function setStatus(message, type) {
    state.elements.status.textContent = message;
    state.elements.status.classList.toggle('success', type === 'success');
    state.elements.status.classList.toggle('error', type === 'error');
  }

  function showAnswer(text) {
    state.lastAnswer = text;
    state.elements.answer.textContent = text;
    setLoadingState(false);
  }

  function showError(error) {
    setStatus(`Ошибка: ${error}`, 'error');
  }

  function clearAnswer() {
    state.lastAnswer = '';
    state.lastRequestMode = 'text';
    state.lastScreenshotDataUrl = '';
    state.elements.answer.textContent = '';
    clearHighlightedOptions();
    setLoadingState(false);
    setStatus('Готово. Shift+Y - текст, Shift+A - скрин, Shift+R - настройка, Ctrl+Shift+R - рамка.');
  }

  function show() {
    if (!state.host) return;
    ensureSelectionStyle();
    state.isHidden = false;
    state.host.style.display = 'block';
    document.documentElement.append(state.host);
    state.host.style.zIndex = String(MAX_Z_INDEX);
    state.settings.collapsed = true;
    applyCollapsedState();
    clampWindowToViewport();
    setStatus(state.isLoading ? 'Запрос выполняется...' : 'Готово. Shift+Y - текст, Shift+A - скрин, Shift+R - настройка, Ctrl+Shift+R - рамка.');
  }

  function hide() {
    if (!state.host) return;
    state.isHidden = true;
    state.host.style.display = 'none';
  }

  function toggleVisibility() {
    if (state.isHidden) {
      show();
      return;
    }

    hide();
  }

  function isMounted() {
    return Boolean(state.host && state.host.isConnected);
  }

  function destroy() {
    if (state.abortController) state.abortController.abort();
    clearHighlightedOptions();
    document.getElementById(PAGE_HIGHLIGHT_STYLE_ID)?.remove();
    document.getElementById(SELECTION_STYLE_ID)?.remove();
    document.getElementById(SCREENSHOT_FRAME_STYLE_ID)?.remove();
    if (canUseExtensionMessaging()) chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
    window.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('selectionchange', rememberSelection, true);
    document.removeEventListener('mouseup', rememberSelection, true);
    document.removeEventListener('keyup', rememberSelection, true);
    window.removeEventListener('resize', clampWindowToViewport);
    document.removeEventListener('mousemove', handleDragMove, true);
    document.removeEventListener('mouseup', handleDragEnd, true);
    document.removeEventListener('mousemove', handleResizeMove, true);
    document.removeEventListener('mouseup', handleResizeEnd, true);
    document.removeEventListener('mousemove', handleScreenshotAreaDragMove, true);
    document.removeEventListener('mouseup', handleScreenshotAreaDragEnd, true);
    document.removeEventListener('mousemove', handleScreenshotAreaResizeMove, true);
    document.removeEventListener('mouseup', handleScreenshotAreaResizeEnd, true);
    window.removeEventListener('mousemove', handleScreenshotAreaDragMove, true);
    window.removeEventListener('mouseup', handleScreenshotAreaDragEnd, true);
    window.removeEventListener('blur', handleScreenshotAreaDragEnd, true);
    window.removeEventListener('mousemove', handleScreenshotAreaResizeMove, true);
    window.removeEventListener('mouseup', handleScreenshotAreaResizeEnd, true);
    window.removeEventListener('blur', handleScreenshotAreaResizeEnd, true);
    removeScreenshotAreaInteractionShield();

    if (state.drag || state.resize || state.screenshotAreaDrag || state.screenshotAreaResize || state.screenshotAreaInteraction) {
      document.body.style.userSelect = state.previousBodyUserSelect;
      state.drag = null;
      state.resize = null;
      state.screenshotAreaDrag = null;
      state.screenshotAreaResize = null;
      state.screenshotAreaInteraction = null;
    }

    state.elements.screenshotFrame?.remove();

    if (state.host) {
      state.host.remove();
      state.host = null;
    }

    state.shadowRoot = null;
    state.elements = {};
    window[GLOBAL_KEY] = undefined;
    try {
      delete window[GLOBAL_KEY];
    } catch (error) {
      window[GLOBAL_KEY] = undefined;
    }
  }

  function init() {
    ensureSelectionStyle();
    createInterface();
    if (canUseExtensionMessaging()) chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('selectionchange', rememberSelection, true);
    document.addEventListener('mouseup', rememberSelection, true);
    document.addEventListener('keyup', rememberSelection, true);
    window.addEventListener('resize', clampWindowToViewport);

    window[GLOBAL_KEY] = {
      show,
      hide,
      toggleVisibility,
      runAction: runAssistantAction,
      destroy,
      isMounted,
    };

    safeLog('Скрипт запущен');
  }

  init();
})();
