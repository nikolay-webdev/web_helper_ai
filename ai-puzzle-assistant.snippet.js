(() => {
  'use strict';

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

  // ВНИМАНИЕ:
  // API-ключ хранится в клиентском JavaScript.
  // Не публикуйте этот файл и не передавайте его другим людям.
  const CONFIG = {
    apiKey: 'sk-', // <-- Вставьте сюда API-ключ DeepSeek.
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    hotkey: {
      ctrl: true,
      shift: true,
      alt: false,
      key: 'Y',
    },
    maxSelectedTextLength: 10000,
    maxTokens: 2000,
    temperature: 0.2,
    timeoutMs: 60000,
    ignoreHotkeyInEditable: true,
    debug: false,
  };

  const STORAGE_KEY = 'aiPuzzleAssistantSettingsV1';
  const GLOBAL_KEY = '__AI_PUZZLE_ASSISTANT__';
  const MAX_Z_INDEX = 2147483647;
  const DEFAULT_WINDOW_WIDTH = 420;
  const MIN_WINDOW_WIDTH = 320;
  const MIN_WINDOW_HEIGHT = 250;

  const SYSTEM_PROMPT = [
    'Ты - внимательный ИИ-помощник по решению задач.',
    'Пользователь передает текст, который может содержать:',
    '- математическую задачу;',
    '- логическую головоломку;',
    '- загадку;',
    '- вопрос с вариантами ответа;',
    '- текстовую задачу;',
    '- задачу на внимательность;',
    '- несколько связанных заданий.',
    '',
    'Требования к ответу:',
    '1. Определи, что требуется найти или решить.',
    '2. Не пропускай важные условия.',
    '3. Решай задачу последовательно и проверяй результат.',
    '4. Объясняй кратко, понятно и без лишней воды.',
    '5. Если есть несколько задач, реши каждую отдельно.',
    '6. Если существуют варианты ответа, укажи правильный вариант.',
    '7. Итоговый ответ помести в конце отдельной строкой.',
    '8. Если данных недостаточно, точно укажи, каких данных не хватает.',
    '9. Отвечай на русском языке.',
  ].join('\n');

  const DEFAULT_SETTINGS = {
    left: Math.max(12, window.innerWidth - 450),
    top: 80,
    width: DEFAULT_WINDOW_WIDTH,
    height: null,
    opacity: 0.92,
    collapsed: false,
  };

  const state = {
    isLoading: false,
    lastSelectedText: '',
    abortController: null,
    settings: loadSettings(),
    host: null,
    shadowRoot: null,
    elements: {},
    drag: null,
    resize: null,
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
        collapsed: Boolean(parsed.collapsed),
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
        border: 1px solid #d8dee8;
        border-radius: 8px;
        box-shadow: 0 18px 44px rgba(15, 23, 42, 0.18);
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
        border-bottom: 1px solid #d8dee8;
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
        color: #111827;
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
        color: #047857;
      }

      .status.error {
        color: #b91c1c;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
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
    title.textContent = 'ИИ-помощник';

    const opacityControl = document.createElement('label');
    opacityControl.className = 'opacity-control';
    opacityControl.setAttribute('data-no-drag', 'true');

    const opacityLabel = document.createElement('span');
    opacityLabel.textContent = 'Прозрачность';

    const opacityInput = document.createElement('input');
    opacityInput.type = 'range';
    opacityInput.min = '1';
    opacityInput.max = '100';
    opacityInput.step = '1';
    opacityInput.value = String(Math.round(state.settings.opacity * 100));
    opacityInput.title = 'Прозрачность окна';

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

    const solveButton = document.createElement('button');
    solveButton.type = 'button';
    solveButton.className = 'button primary';
    solveButton.textContent = 'Решить выделенное';

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

    opacityControl.append(opacityLabel, opacityInput);
    header.append(title, opacityControl, collapseButton, closeButton);
    actions.append(solveButton, clearButton, cancelButton);
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
      solveButton,
      status,
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
    solveButton.addEventListener('mousedown', (event) => event.preventDefault());
    solveButton.addEventListener('click', solveSelectedText);
    clearButton.addEventListener('click', clearAnswer);
    cancelButton.addEventListener('click', cancelRequest);
    opacityInput.addEventListener('input', updateOpacity);

    makeWindowDraggable();
    makeWindowResizable();
    applyCollapsedState();
    clampWindowToViewport();
    setStatus('Готово. Выделите текст задачи.');
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
      saveSettings();
    });
  }

  function updateOpacity() {
    const opacity = Number(state.elements.opacityInput.value) / 100;
    state.settings.opacity = clamp(opacity, 0.01, 1);
    state.host.style.opacity = String(state.settings.opacity);
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

  function rememberSelection() {
    const selectedText = getCurrentSelection();
    if (selectedText) state.lastSelectedText = selectedText;
  }

  function validateSelectedText(text) {
    if (!text) {
      return 'Выделите текст задачи перед отправкой.';
    }

    if (text.length > CONFIG.maxSelectedTextLength) {
      return `Выделенный текст слишком длинный. Максимум: ${CONFIG.maxSelectedTextLength} символов.`;
    }

    if (!CONFIG.apiKey || CONFIG.apiKey.trim() === '' || CONFIG.apiKey.trim() === 'sk-') {
      return 'Добавьте API-ключ DeepSeek в CONFIG.apiKey в начале Snippet.';
    }

    return '';
  }

  function isHotkeyPressed(event) {
    const hotkey = CONFIG.hotkey;
    const keyMatches = String(event.key || '').toUpperCase() === String(hotkey.key || '').toUpperCase();
    return (
      keyMatches &&
      event.ctrlKey === Boolean(hotkey.ctrl) &&
      event.shiftKey === Boolean(hotkey.shift) &&
      event.altKey === Boolean(hotkey.alt)
    );
  }

  function isEditableTarget(target) {
    if (!target || !(target instanceof Element)) return false;
    const editable = target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]');
    return Boolean(editable || target.isContentEditable);
  }

  function handleKeyDown(event) {
    if (event.repeat) return;
    if (!isHotkeyPressed(event)) return;

    const shadowActiveElement = state.shadowRoot?.activeElement || null;
    if (CONFIG.ignoreHotkeyInEditable && (isEditableTarget(event.target) || isEditableTarget(shadowActiveElement))) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    solveSelectedText();
  }

  async function requestDeepSeek(text) {
    state.abortController = new AbortController();
    const timeoutId = window.setTimeout(() => {
      if (state.abortController) state.abortController.abort();
    }, CONFIG.timeoutMs);

    try {
      safeLog('Запрос отправлен');
      const response = await fetch(CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          model: CONFIG.model,
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: text,
            },
          ],
          max_tokens: CONFIG.maxTokens,
          temperature: CONFIG.temperature,
        }),
        signal: state.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(getHttpErrorMessage(response.status));
      }

      const rawBody = await response.text();
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

  function getHttpErrorMessage(status) {
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

  function isLikelyCorsOrNetworkError(error) {
    const message = String(error?.message || '').toLowerCase();
    return error instanceof TypeError || message.includes('failed to fetch') || message.includes('networkerror');
  }

  async function solveSelectedText() {
    if (state.isLoading) {
      setStatus('Предыдущий запрос ещё выполняется.', 'error');
      return;
    }

    rememberSelection();
    const selectedText = getCurrentSelection() || state.lastSelectedText;
    const validationError = validateSelectedText(selectedText);
    if (validationError) {
      showError(validationError);
      return;
    }

    state.lastSelectedText = selectedText;
    state.isLoading = true;
    setLoadingState(true);
    setStatus('Отправляю задачу в DeepSeek...');
    safeLog('Текст подготовлен');

    try {
      const answer = await requestDeepSeek(selectedText);
      showAnswer(answer);
      setStatus('Ответ получен.', 'success');
    } catch (error) {
      safeLog('Ошибка запроса');
      showError(error?.message || 'Неизвестная ошибка.');
    } finally {
      state.isLoading = false;
      setLoadingState(false);
    }
  }

  function setLoadingState(isLoading) {
    state.elements.solveButton.disabled = isLoading;
    state.elements.solveButton.textContent = isLoading ? 'Решаю...' : 'Решить выделенное';
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
    state.elements.answer.textContent = text;
  }

  function showError(error) {
    setStatus(`Ошибка: ${error}`, 'error');
  }

  function clearAnswer() {
    state.elements.answer.textContent = '';
    setStatus('Готово. Выделите текст задачи.');
  }

  function show() {
    if (!state.host) return;
    document.documentElement.append(state.host);
    state.host.style.zIndex = String(MAX_Z_INDEX);
    state.settings.collapsed = false;
    applyCollapsedState();
    clampWindowToViewport();
    setStatus(state.isLoading ? 'Отправляю задачу в DeepSeek...' : 'Готово. Выделите текст задачи.');
  }

  function isMounted() {
    return Boolean(state.host && state.host.isConnected);
  }

  function destroy() {
    if (state.abortController) state.abortController.abort();
    document.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('selectionchange', rememberSelection, true);
    document.removeEventListener('mouseup', rememberSelection, true);
    document.removeEventListener('keyup', rememberSelection, true);
    window.removeEventListener('resize', clampWindowToViewport);
    document.removeEventListener('mousemove', handleDragMove, true);
    document.removeEventListener('mouseup', handleDragEnd, true);
    document.removeEventListener('mousemove', handleResizeMove, true);
    document.removeEventListener('mouseup', handleResizeEnd, true);

    if (state.drag || state.resize) {
      document.body.style.userSelect = state.previousBodyUserSelect;
      state.drag = null;
      state.resize = null;
    }

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
    createInterface();
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('selectionchange', rememberSelection, true);
    document.addEventListener('mouseup', rememberSelection, true);
    document.addEventListener('keyup', rememberSelection, true);
    window.addEventListener('resize', clampWindowToViewport);

    window[GLOBAL_KEY] = {
      show,
      destroy,
      isMounted,
    };

    safeLog('Скрипт запущен');
  }

  init();
})();
