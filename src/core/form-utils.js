// src/core/form-utils.js

/* ============================================================================
 * ZODIKA • Form Utils
 * ----------------------------------------------------------------------------
 * Shared utility helpers used across the form application.
 *
 * Responsibilities
 * - Provide safe object merge helpers
 * - Normalize user input values
 * - Handle HTTP JSON requests with timeout support
 * - Provide date and formatting helpers
 * ========================================================================== */

/**
 * Checks whether a value is a plain object.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Safely clones a serializable value.
 *
 * @param {any} value
 * @returns {any}
 */
export function structuredCloneSafe(value) {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

/**
 * Deep-merges two objects.
 *
 * @param {object} base
 * @param {object} override
 * @returns {object}
 */
export function deepMerge(base, override) {
  if (!override || typeof override !== 'object') {
    return structuredCloneSafe(base);
  }

  const output = structuredCloneSafe(base);

  Object.keys(override).forEach((key) => {
    const baseValue = output[key];
    const overrideValue = override[key];

    if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
      output[key] = deepMerge(baseValue, overrideValue);
    } else {
      output[key] = overrideValue;
    }
  });

  return output;
}

/**
 * Converts a relative path into an absolute URL using a base URL.
 *
 * @param {string} base
 * @param {string} path
 * @returns {string}
 */
export function toAbsoluteUrl(base, path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${String(base || '').replace(/\/+$/, '')}/${String(path || '').replace(/^\/+/, '')}`;
}

/**
 * Returns today's date in local ISO format (YYYY-MM-DD).
 *
 * @returns {string}
 */
export function getLocalTodayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Formats an ISO date string for display.
 *
 * @param {string} isoDate
 * @param {string} locale
 * @param {string} fallback
 * @returns {string}
 */
export function formatDisplayDate(isoDate, locale = 'pt-BR', fallback = '(não informado)') {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return fallback;
  }

  const [year, month, day] = isoDate.split('-');
  if (locale === 'pt-BR') {
    return `${day}/${month}/${year}`;
  }

  try {
    const date = new Date(`${isoDate}T00:00:00`);
    return new Intl.DateTimeFormat(locale).format(date);
  } catch {
    return `${day}/${month}/${year}`;
  }
}

/**
 * Returns a backend error message from a JSON payload.
 *
 * @param {object|null} errorJson
 * @param {string} fallback
 * @returns {string}
 */
export function getJsonErrorMessage(errorJson, fallback) {
  return errorJson?.message || errorJson?.error || fallback;
}

/**
 * Creates an HTTP error carrying status and payload.
 *
 * @param {Response} response
 * @param {object|null} errorJson
 * @returns {Error}
 */
export function createHttpError(response, errorJson) {
  const error = new Error(
    getJsonErrorMessage(errorJson, `HTTP ${response?.status || 500}`)
  );

  error.status = Number(response?.status || 500);
  error.payload = errorJson || null;

  return error;
}

/**
 * Sends a JSON POST request with timeout support.
 *
 * @param {string} url
 * @param {object} payload
 * @param {number} timeoutMs
 * @param {object} fetchOptions
 * @returns {Promise<any>}
 */
export async function postJson(url, payload, timeoutMs = 15000, fetchOptions = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(fetchOptions.headers || {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      ...fetchOptions,
    });

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw createHttpError(response, data);
    }

    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Normalizes an email value.
 *
 * @param {string} value
 * @returns {string}
 */
export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * Normalizes a person name value.
 *
 * @param {string} value
 * @returns {string}
 */
export function normalizePersonName(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validates a HH:MM time string.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isValidTimeString(value) {
  const normalized = String(value || '');

  if (!/^\d{2}:\d{2}$/.test(normalized)) {
    return false;
  }

  const [hours, minutes] = normalized.split(':').map(Number);

  return (
    Number.isInteger(hours) &&
    Number.isInteger(minutes) &&
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59
  );
}

/**
 * Checks whether the backend payload represents an inactive session error.
 *
 * @param {object|null} errorJson
 * @param {string} inactiveCode
 * @returns {boolean}
 */
export function isSessionInactiveErrorPayload(errorJson, inactiveCode) {
  const errorCode = String(errorJson?.error || '').toUpperCase();
  return errorCode === String(inactiveCode || '').toUpperCase();
}

/**
 * Clamps a number between a minimum and maximum value.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}
