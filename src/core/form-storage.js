// src/core/form-storage.js

/* ============================================================================
 * ZODIKA • Form Storage
 * ----------------------------------------------------------------------------
 * sessionStorage helpers for form session and draft persistence.
 *
 * Responsibilities
 * - Persist session token across page reloads
 * - Store pending tracking updates for retry
 * - Provide safe read/write wrappers
 * ========================================================================== */

/**
 * Returns storage keys scoped by product.
 *
 * @param {object} config
 * @returns {{sessionToken: string, pendingUpdate: string}}
 */
export function getStorageKeys(config) {
  const productKey = config?.productKey || 'default';

  return {
    sessionToken: `zdk_${productKey}_session_token`,
    pendingUpdate: `zdk_${productKey}_pending_update`,
    draftState: `zdk_${productKey}_draft_state`,
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
 * Reads pending update payload from sessionStorage.
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
 * Stores pending update payload in sessionStorage.
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
 * Removes pending update payload from sessionStorage.
 *
 * @param {object} storageKeys
 */
export function clearPendingUpdate(storageKeys) {
  try {
    sessionStorage.removeItem(storageKeys.pendingUpdate);
  } catch {}
}
/**
 * Reads draft state from sessionStorage.
 *
 * @param {object} storageKeys
 * @returns {object|null}
 */
export function getDraftState(storageKeys) {
  try {
    const raw = sessionStorage.getItem(storageKeys.draftState);
    if (!raw) return null;

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Stores draft state in sessionStorage.
 *
 * @param {object} storageKeys
 * @param {object|null} payload
 */
export function setDraftState(storageKeys, payload) {
  try {
    if (!payload) return;

    sessionStorage.setItem(
      storageKeys.draftState,
      JSON.stringify(payload)
    );
  } catch {}
}

/**
 * Removes draft state from sessionStorage.
 *
 * @param {object} storageKeys
 */
export function clearDraftState(storageKeys) {
  try {
    sessionStorage.removeItem(storageKeys.draftState);
  } catch {}
}

/**
 * Clears all form-related storage keys.
 *
 * @param {object} storageKeys
 */
export function clearAllFormStorage(storageKeys) {
  clearSessionToken(storageKeys);
  clearPendingUpdate(storageKeys);
  clearDraftState(storageKeys);
}
