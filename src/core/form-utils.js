// src/core/form-utils.js

/* ============================================================================
 * ZODIKA • Form Utils
 * ----------------------------------------------------------------------------
 * Shared utility helpers for the universal product form app.
 *
 * Responsibilities
 * - Provide pure helper functions
 * - Avoid coupling with business logic or UI
 * - Support reuse across modules and products
 * ========================================================================== */

/**
 * Returns true when a value is a plain object.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Safely clones serializable data.
 *
 * @template T
 * @param {T} value
 * @returns {T}
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
 * Arrays and non-plain objects are replaced, not merged.
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
 * Converts a relative endpoint path into an absolute URL.
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
 * Safely resolves a nested property from an object using dot notation.
 *
 * @param {object} obj
 * @param {string} path
 * @param {*} fallback
 * @returns {*}
 */
export function getNestedValue(obj, path, fallback = undefined) {
  if (!obj || !path) return fallback;

  const value = String(path)
    .split('.')
    .reduce((acc, key) => {
      if (acc && key in acc) return acc[key];
      return undefined;
    }, obj);

  return value == null ? fallback : value;
}

/**
 * Returns the current local date in ISO format (YYYY-MM-DD).
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
 * Formats an ISO date string for UI display according to locale.
 *
 * @param {string} isoDate
 * @param {string} locale
 * @param {string} fallback
 * @returns {string}
 */
export function formatDisplayDate(isoDate, locale = 'pt-BR', fallback = '') {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return fallback;
  }

  const [year, month, day] = isoDate.split('-');

  if (locale === 'en-US') {
    return `${month}/${day}/${year}`;
  }

  return `${day}/${month}/${year}`;
}

/**
 * Extracts a readable error message from a JSON response.
 *
 * @param {object|null} errorJson
 * @param {string} fallback
 * @returns {string}
 */
export function getJsonErrorMessage(errorJson, fallback) {
  return errorJson?.message || errorJson?.error || fallback;
}

/**
 * Builds a normalized Error object from an HTTP response.
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
 * Sends a JSON POST request with timeout handling.
 *
 * @param {string} url
 * @param {object} payload
 * @param {number} timeoutMs
 * @param {object} [fetchOptions]
 * @returns {Promise<object|null>}
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
 * Creates a debounced function wrapper.
 *
 * @param {Function} fn
 * @param {number} waitMs
 * @returns {Function}
 */
export function debounce(fn, waitMs) {
  let timeoutId = null;

  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, waitMs);
  };
}

/**
 * Normalizes an email string.
 *
 * @param {string} value
 * @returns {string}
 */
export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * Normalizes a personal name.
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
 * Validates a time string in HH:MM format.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isValidTimeString(value) {
  const normalized = String(value || '');

  if (!/^\d{2}:\d{2}$/.test(normalized)) return false;

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
 * Checks whether an error payload represents an inactive session.
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
 * Clamps a value between a minimum and maximum.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}
