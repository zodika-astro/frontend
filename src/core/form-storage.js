// src/core/form-storage.js

/* ============================================================================
 * ZODIKA • Form Storage
 * ----------------------------------------------------------------------------
 * sessionStorage helpers for form session lifecycle and client-side persistence.
 *
 * Responsibilities
 * - Persist session token across page reloads
 * - Store pending tracking updates for retry logic
 * - Persist and restore draft form state
 * - Track last successful tracking timestamp
 * - Provide safe read/write wrappers with graceful failure handling
 * ========================================================================== */

/**
 * Returns storage keys scoped by product.
 *
 * Keys are namespaced using the productKey to ensure isolation between
 * different product forms sharing the same domain.
 *
 * @param {object} config
 * @returns {{
 *   sessionToken: string,
 *   pendingUpdate: string,
 *   draftState: string,
 *   lastTrackingSuccessAt: string
 * }}
 */
export function getStorageKeys(config) {
  const productKey = config?.productKey || 'default';

  return {
    sessionToken: `zdk_${productKey}_session_token`,
    pendingUpdate: `zdk_${productKey}_pending_update`,
    draftState: `zdk_${productKey}_draft_state`,
    lastTrackingSuccessAt: `zdk_${productKey}_last_tracking_success_at`,
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
 * Only persists truthy tokens to avoid storing invalid values.
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
 * Used to retry tracking updates that failed previously.
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
 * Payload is serialized as JSON. No-op if payload is null/undefined.
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
 * Draft state represents a lightweight snapshot of form progress.
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
 * Used for restoring form progress after reload or interruption.
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
 * Reads the timestamp of the last successful tracking update.
 *
 * Used to determine session freshness and inactivity windows.
 *
 * @param {object} storageKeys
 * @returns {number|null}
 */
export function getLastTrackingSuccessAt(storageKeys) {
  try {
    const raw = sessionStorage.getItem(storageKeys.lastTrackingSuccessAt);
    if (!raw) return null;

    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Stores the timestamp of the last successful tracking update.
 *
 * @param {object} storageKeys
 * @param {number} timestamp
 */
export function setLastTrackingSuccessAt(storageKeys, timestamp) {
  try {
    if (!Number.isFinite(timestamp)) return;

    sessionStorage.setItem(
      storageKeys.lastTrackingSuccessAt,
      String(timestamp)
    );
  } catch {}
}

/**
 * Removes the last successful tracking timestamp from sessionStorage.
 *
 * @param {object} storageKeys
 */
export function clearLastTrackingSuccessAt(storageKeys) {
  try {
    sessionStorage.removeItem(storageKeys.lastTrackingSuccessAt);
  } catch {}
}

/**
 * Clears all form-related storage keys.
 *
 * Used when resetting the form lifecycle (e.g., new session, completion, or abandonment).
 *
 * @param {object} storageKeys
 */
export function clearAllFormStorage(storageKeys) {
  clearSessionToken(storageKeys);
  clearPendingUpdate(storageKeys);
  clearDraftState(storageKeys);
  clearLastTrackingSuccessAt(storageKeys);
}
