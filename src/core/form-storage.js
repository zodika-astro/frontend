// src/core/form-storage.js

/* ============================================================================
 * ZODIKA • Form Storage
 * ----------------------------------------------------------------------------
 * SessionStorage helpers for the universal product form app.
 *
 * Responsibilities
 * - Isolate browser storage concerns
 * - Namespace keys by product
 * - Keep storage access safe and resilient
 * ========================================================================== */

/**
 * Builds namespaced storage keys for the current product.
 *
 * @param {object} config
 * @returns {{sessionToken: string, pendingUpdate: string}}
 */
export function getStorageKeys(config) {
  const productKey = config?.productKey || 'default';

  return {
    sessionToken: `zdk_${productKey}_session_token`,
    pendingUpdate: `zdk_${productKey}_pending_update`,
  };
}

/**
 * Reads the session token from sessionStorage.
 *
 * @param {object} storageKeys
 * @returns {string|null}
 */
export function getSessionToken(storageKeys) {
  try {
    return sessionStorage.getItem(storageKeys.sessionToken);
  } catch {
    return null;
  }
}

/**
 * Stores the session token in sessionStorage.
 *
 * @param {object} storageKeys
 * @param {string|null} token
 */
export function setSessionToken(storageKeys, token) {
  try {
    if (token) {
      sessionStorage.setItem(storageKeys.sessionToken, token);
    }
  } catch {}
}

/**
 * Removes the session token from sessionStorage.
 *
 * @param {object} storageKeys
 */
export function clearSessionToken(storageKeys) {
  try {
    sessionStorage.removeItem(storageKeys.sessionToken);
  } catch {}
}

/**
 * Reads the pending update payload from sessionStorage.
 *
 * @param {object} storageKeys
 * @returns {object|null}
 */
export function getPendingUpdate(storageKeys) {
  try {
    const raw = sessionStorage.getItem(storageKeys.pendingUpdate);
    if (!raw) return null;

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Stores a pending update payload in sessionStorage.
 *
 * @param {object} storageKeys
 * @param {object|null} payload
 */
export function setPendingUpdate(storageKeys, payload) {
  try {
    if (!payload) return;

    sessionStorage.setItem(
      storageKeys.pendingUpdate,
      JSON.stringify(payload)
    );
  } catch {}
}

/**
 * Removes the pending update payload from sessionStorage.
 *
 * @param {object} storageKeys
 */
export function clearPendingUpdate(storageKeys) {
  try {
    sessionStorage.removeItem(storageKeys.pendingUpdate);
  } catch {}
}

/**
 * Removes all storage entries related to the current form instance.
 *
 * @param {object} storageKeys
 */
export function clearAllFormStorage(storageKeys) {
  clearSessionToken(storageKeys);
  clearPendingUpdate(storageKeys);
}
