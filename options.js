'use strict';

const API_KEY_STORAGE_KEY = 'webHelperAiApiKey';
const form = document.querySelector('#api-key-form');
const input = document.querySelector('#api-key');
const deleteButton = document.querySelector('#delete-key');
const status = document.querySelector('#status');

function setStatus(message, type = '') {
  status.textContent = message;
  status.className = `status ${type}`.trim();
}

async function hasStoredApiKey() {
  const stored = await chrome.storage.local.get(API_KEY_STORAGE_KEY);
  return typeof stored?.[API_KEY_STORAGE_KEY] === 'string' && stored[API_KEY_STORAGE_KEY].trim() !== '';
}

async function refreshStatus() {
  try {
    const configured = await hasStoredApiKey();
    deleteButton.disabled = !configured;
    setStatus(configured ? 'Status: eingerichtet' : 'Status: nicht eingerichtet', configured ? 'success' : '');
  } catch (error) {
    deleteButton.disabled = true;
    setStatus('Der Status konnte nicht gelesen werden.', 'error');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const apiKey = input.value.trim();
  if (!apiKey) {
    setStatus('Geben Sie zuerst einen KI-API-Schlüssel ein.', 'error');
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    await chrome.storage.local.set({
      [API_KEY_STORAGE_KEY]: apiKey,
    });
    input.value = '';
    deleteButton.disabled = false;
    setStatus('Der KI-API-Schlüssel wurde lokal gespeichert.', 'success');
  } catch (error) {
    setStatus('Der KI-API-Schlüssel konnte nicht gespeichert werden.', 'error');
  } finally {
    submitButton.disabled = false;
  }
});

deleteButton.addEventListener('click', async () => {
  deleteButton.disabled = true;
  try {
    await chrome.storage.local.remove(API_KEY_STORAGE_KEY);
    input.value = '';
    setStatus('Der gespeicherte KI-API-Schlüssel wurde gelöscht.', 'success');
  } catch (error) {
    setStatus('Der KI-API-Schlüssel konnte nicht gelöscht werden.', 'error');
    deleteButton.disabled = false;
  }
});

refreshStatus();
