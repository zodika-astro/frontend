// src/core/form-tracking.js

/* ============================================================================
 * ZODIKA • Form Tracking
 * ----------------------------------------------------------------------------
 * Session lifecycle, progress sync, draft sync, and keepalive helpers for the
 * universal product form app.
 *
 * Phase 1 goals
 * - Preserve the current backend contract
 * - Keep tracking universal across products
 * - Prepare the app for future abandonment automation
 * - Isolate tracking concerns from UI, navigation, and submit logic
 * ========================================================================== */

import {
  normalizeEmail,
  postJson,
  isSessionInactiveErrorPayload,
} from './form-utils.js';

import {
  clearSessionState,
} from './form-state.js';

import {
  getStepKeyByIndex,
} from './form-navigation.js';

/**
 * Returns the browser storage keys for the current product.
 *
 * @param {object} config
 * @returns {{sessionToken: string, pendingUpdate: string}}
 */
export function getTrackingStorageKeys(config) {
  return {
    sessionToken: `zdk_${config.productKey}_session_token`,
    pendingUpdate: `zdk_${config.productKey}_pending_update`,
  };
}

/**
 * Builds the absolute tracking endpoints object from config.
 *
 * Note:
 * This function assumes endpoints are already absolute or were normalized
 * earlier by the app bootstrap layer.
 *
 * @param {object} apiUrls
 * @returns {object}
 */
export function getTrackingApiUrls(apiUrls) {
  return {
    formStart: apiUrls.formStart,
    formUpdate: apiUrls.formUpdate,
    formSubmit: apiUrls.formSubmit,
    formLinkRequest: apiUrls.formLinkRequest,
  };
}

/**
 * Reads the stored session token from sessionStorage.
 *
 * @param {object} storageKeys
 * @returns {string|null}
 */
export function getStoredSessionToken(storageKeys) {
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
export function storeSessionToken(storageKeys, token) {
  try {
    if (token) {
      sessionStorage.setItem(storageKeys.sessionToken, token);
    }
  } catch {}
}

/**
 * Clears the session token from sessionStorage.
 *
 * @param {object} storageKeys
 */
export function clearStoredSessionToken(storageKeys) {
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
export function getPendingUpdatePayload(storageKeys) {
  try {
    const raw = sessionStorage.getItem(storageKeys.pendingUpdate);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Stores the pending update payload in sessionStorage.
 *
 * @param {object} storageKeys
 * @param {object|null} payload
 */
export function storePendingUpdatePayload(storageKeys, payload) {
  try {
    if (!payload) return;
    sessionStorage.setItem(storageKeys.pendingUpdate, JSON.stringify(payload));
  } catch {}
}

/**
 * Clears the pending update payload from sessionStorage.
 *
 * @param {object} storageKeys
 */
export function clearPendingUpdatePayload(storageKeys) {
  try {
    sessionStorage.removeItem(storageKeys.pendingUpdate);
  } catch {}
}

/**
 * Builds the current form payload snapshot using the current form values.
 *
 * Important:
 * This preserves the current backend-facing keys.
 *
 * @param {HTMLFormElement} form
 * @param {object} state
 * @returns {object}
 */
export function getCurrentFormPayload(form, state) {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  if (state?.city?.selectedDisplay) {
    data.birth_place = state.city.selectedDisplay;
  }

  return {
    email: normalizeEmail(data.email || ''),
    name: String(data.name || '').trim(),
    birth_date: data.birth_date || null,
    birth_time: data.birth_time || null,
    birth_place: data.birth_place || null,
    birth_place_place_id: data.birth_place_place_id || null,
    birth_place_full: data.birth_place_full || null,
    birth_place_country: data.birth_place_country || null,
    birth_place_admin1: data.birth_place_admin1 || null,
    birth_place_admin2: data.birth_place_admin2 || null,
    birth_place_lat: data.birth_place_lat || null,
    birth_place_lng: data.birth_place_lng || null,
    birth_place_json: data.birth_place_json || null,
  };
}

/**
 * Builds the payload used to start a form session.
 *
 * Important:
 * This preserves the current backend-facing contract.
 *
 * @param {HTMLFormElement} form
 * @param {object} config
 * @returns {object}
 */
export function buildStartSessionPayload(form, config) {
  const emailInput = form.querySelector(`input[name="${config.fields.email}"]`);
  const emailValue = normalizeEmail(emailInput?.value || '');

  return {
    form_type: config.tracking.formType,
    email: emailValue,
    form_status: 'STARTED',
    current_step_index: 0,
    last_completed_step_index: 0,
    highest_completed_step_index: 0,
    current_step_key: getStepKeyByIndex(config, 0),
    last_completed_step_key: getStepKeyByIndex(config, 0),
    highest_completed_step_key: getStepKeyByIndex(config, 0),
    form_data: {
      email: emailValue,
    },
  };
}

/**
 * Builds a standard in-progress payload for a step transition or draft sync.
 *
 * Important:
 * This preserves the current backend-facing contract.
 *
 * @param {object} params
 * @param {object} params.state
 * @param {object} params.config
 * @param {HTMLFormElement} params.form
 * @param {number} params.currentStepIndex
 * @param {number} params.lastCompletedStepIndex
 * @param {number} params.highestCompletedStepIndex
 * @returns {object}
 */
export function buildProgressPayload({
  state,
  config,
  form,
  currentStepIndex,
  lastCompletedStepIndex,
  highestCompletedStepIndex,
}) {
  return {
    session_token: state.session.token,
    form_status: 'IN_PROGRESS',
    current_step_index: currentStepIndex,
    last_completed_step_index: lastCompletedStepIndex,
    highest_completed_step_index: highestCompletedStepIndex,
    current_step_key: getStepKeyByIndex(config, currentStepIndex),
    last_completed_step_key: getStepKeyByIndex(config, lastCompletedStepIndex),
    highest_completed_step_key: getStepKeyByIndex(config, highestCompletedStepIndex),
    form_data: getCurrentFormPayload(form, state),
  };
}

/**
 * Builds the payload used when the form session reaches the submit stage.
 *
 * Important:
 * This preserves the current backend-facing contract.
 *
 * @param {object} state
 * @param {object} config
 * @param {HTMLFormElement} form
 * @param {number} lastStepIndex
 * @returns {object}
 */
export function buildSubmitSessionPayload(state, config, form, lastStepIndex) {
  return {
    session_token: state.session.token,
    submit_status: 'CREATED',
    current_step_index: lastStepIndex,
    last_completed_step_index: lastStepIndex,
    highest_completed_step_index: lastStepIndex,
    current_step_key: getStepKeyByIndex(config, lastStepIndex),
    last_completed_step_key: getStepKeyByIndex(config, lastStepIndex),
    highest_completed_step_key: getStepKeyByIndex(config, lastStepIndex),
    form_data: getCurrentFormPayload(form, state),
  };
}

/**
 * Starts a new tracked form session.
 *
 * @param {object} params
 * @param {object} params.state
 * @param {object} params.config
 * @param {object} params.apiUrls
 * @param {object} params.storageKeys
 * @param {HTMLFormElement} params.form
 * @returns {Promise<boolean>}
 */
export async function startFormSession({
  state,
  config,
  apiUrls,
  storageKeys,
  form,
}) {
  const payload = buildStartSessionPayload(form, config);

  const data = await postJson(
    apiUrls.formStart,
    payload,
    config.timeouts.formStart
  );

  const token = data?.session?.session_token;
  if (!token) {
    throw new Error('Missing form session token');
  }

  state.session.token = token;
  state.session.isStarted = true;
  storeSessionToken(storageKeys, token);

  return true;
}

/**
 * Sends a progress update and persists it as the latest pending payload until
 * the request succeeds.
 *
 * @param {object} params
 * @param {object} params.state
 * @param {object} params.config
 * @param {object} params.apiUrls
 * @param {object} params.storageKeys
 * @param {HTMLFormElement} params.form
 * @param {number} params.targetStepIndex
 * @param {number} params.previousStepIndex
 * @returns {Promise<void>}
 */
export async function updateFormSessionProgress({
  state,
  config,
  apiUrls,
  storageKeys,
  form,
  targetStepIndex,
  previousStepIndex,
}) {
  if (!state?.session?.token) return;

  const highestCompletedStepIndex = Math.max(previousStepIndex, targetStepIndex);

  const payload = buildProgressPayload({
    state,
    config,
    form,
    currentStepIndex: targetStepIndex,
    lastCompletedStepIndex: previousStepIndex,
    highestCompletedStepIndex,
  });

  storePendingUpdatePayload(storageKeys, payload);

  await postJson(
    apiUrls.formUpdate,
    payload,
    config.timeouts.formUpdate
  );

  clearPendingUpdatePayload(storageKeys);
}

/**
 * Attempts to resend the last pending update from storage.
 *
 * @param {object} params
 * @param {object} params.config
 * @param {object} params.apiUrls
 * @param {object} params.storageKeys
 * @param {Function} params.onTrackingError
 * @returns {Promise<{ok: boolean, flushed: boolean, handled?: boolean}>}
 */
export async function flushPendingUpdate({
  config,
  apiUrls,
  storageKeys,
  onTrackingError,
}) {
  const pendingPayload = getPendingUpdatePayload(storageKeys);
  if (!pendingPayload) {
    return { ok: true, flushed: false };
  }

  try {
    await postJson(
      apiUrls.formUpdate,
      pendingPayload,
      config.timeouts.formUpdate
    );

    clearPendingUpdatePayload(storageKeys);

    return { ok: true, flushed: true };
  } catch (error) {
    const handled =
      typeof onTrackingError === 'function'
        ? await onTrackingError(error)
        : false;

    return { ok: false, flushed: false, handled };
  }
}

/**
 * Sends the latest pending update with keepalive semantics during page exit.
 *
 * @param {object} params
 * @param {object} params.apiUrls
 * @param {object} params.storageKeys
 */
export function flushPendingUpdateWithKeepalive({
  apiUrls,
  storageKeys,
}) {
  const pendingPayload = getPendingUpdatePayload(storageKeys);
  if (!pendingPayload) return;

  try {
    fetch(apiUrls.formUpdate, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(pendingPayload),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

/**
 * Marks the tracked form session as submitted in the universal forms backend.
 *
 * @param {object} params
 * @param {object} params.state
 * @param {object} params.config
 * @param {object} params.apiUrls
 * @param {HTMLFormElement} params.form
 * @param {number} params.lastStepIndex
 * @returns {Promise<void>}
 */
export async function markFormSessionSubmitted({
  state,
  config,
  apiUrls,
  form,
  lastStepIndex,
}) {
  if (!state?.session?.token) return;

  const payload = buildSubmitSessionPayload(state, config, form, lastStepIndex);

  await postJson(
    apiUrls.formSubmit,
    payload,
    config.timeouts.formSubmit
  );
}

/**
 * Links the tracked form session to a request created later in the product flow.
 *
 * @param {object} params
 * @param {object} params.state
 * @param {object} params.apiUrls
 * @param {string|number|null} params.requestId
 * @returns {Promise<void>}
 */
export async function linkFormSessionToRequest({
  state,
  apiUrls,
  requestId,
}) {
  if (!state?.session?.token || !requestId) return;

  await postJson(apiUrls.formLinkRequest, {
    session_token: state.session.token,
    request_id: requestId,
  });
}

/**
 * Handles tracking-specific backend errors.
 *
 * For Phase 1, only inactive-session handling is standardized here.
 *
 * @param {object} params
 * @param {Error} params.error
 * @param {object} params.state
 * @param {object} params.config
 * @param {object} params.storageKeys
 * @param {Function} [params.onSessionInactive]
 * @returns {Promise<boolean>}
 */
export async function handleTrackingError({
  error,
  state,
  config,
  storageKeys,
  onSessionInactive,
}) {
  const payload = error?.payload || null;
  const status = Number(error?.status || 0);

  if (
    status === 409 &&
    isSessionInactiveErrorPayload(payload, config.tracking.sessionInactiveCode)
  ) {
    clearSessionState(state);
    clearStoredSessionToken(storageKeys);
    clearPendingUpdatePayload(storageKeys);

    if (typeof onSessionInactive === 'function') {
      await onSessionInactive();
    }

    return true;
  }

  return false;
}

/**
 * Creates a debounced draft sync function for partial-progress tracking.
 *
 * This is part of the abandonment-ready foundation, but still preserves the
 * current backend contract by using the same universal /forms/update endpoint
 * and payload shape.
 *
 * @param {object} params
 * @param {object} params.state
 * @param {object} params.config
 * @param {object} params.apiUrls
 * @param {object} params.storageKeys
 * @param {HTMLFormElement} params.form
 * @param {Function} params.onTrackingError
 * @returns {Function}
 */
export function createDraftSyncScheduler({
  state,
  config,
  apiUrls,
  storageKeys,
  form,
  onTrackingError,
}) {
  return function scheduleDraftSync() {
    if (!state?.session?.token) return;

    clearTimeout(state.tracking.draftSyncTimer);

    state.tracking.draftSyncTimer = setTimeout(async () => {
      const currentStepIndex = state.ui.currentStepIndex;
      const lastCompletedStepIndex = Math.max(0, currentStepIndex - 1);
      const highestCompletedStepIndex = currentStepIndex;

      const payload = buildProgressPayload({
        state,
        config,
        form,
        currentStepIndex,
        lastCompletedStepIndex,
        highestCompletedStepIndex,
      });

      try {
        storePendingUpdatePayload(storageKeys, payload);

        await postJson(
          apiUrls.formUpdate,
          payload,
          config.timeouts.formUpdate
        );

        clearPendingUpdatePayload(storageKeys);
      } catch (error) {
        console.error('[ZDK] Draft sync error:', error);

        if (typeof onTrackingError === 'function') {
          await onTrackingError(error);
        }
      }
    }, config.tracking.debounceMs);
  };
}

/**
 * Binds input/change/blur listeners for tracked draft progress.
 *
 * @param {object} params
 * @param {HTMLFormElement} params.form
 * @param {object} params.config
 * @param {object} params.state
 * @param {HTMLElement|null} params.cityInput
 * @param {Function} params.scheduleDraftSync
 */
export function bindDraftTrackingListeners({
  form,
  config,
  state,
  cityInput,
  scheduleDraftSync,
}) {
  const trackableFieldNames = new Set([
    config.fields.email,
    config.fields.fullName,
    config.fields.birthDate,
    config.fields.birthTime,
    config.fields.birthPlace,
  ]);

  form.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!('name' in target)) return;

    const fieldName = target.name;
    if (!trackableFieldNames.has(fieldName)) return;
    if (!state?.session?.token) return;

    if (fieldName === config.fields.birthPlace) {
      if (cityInput && cityInput.value !== state.city.selectedDisplay) {
        state.city.isValidated = false;
      }
    }

    scheduleDraftSync();
  });

  form.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!('name' in target)) return;
    if (!trackableFieldNames.has(target.name)) return;
    if (!state?.session?.token) return;

    scheduleDraftSync();
  });

  form.addEventListener(
    'blur',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!('name' in target)) return;
      if (!trackableFieldNames.has(target.name)) return;
      if (!state?.session?.token) return;

      scheduleDraftSync();
    },
    true
  );
}
