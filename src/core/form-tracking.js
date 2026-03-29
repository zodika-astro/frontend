// src/core/form-tracking.js

/* ============================================================================
 * ZODIKA • Form Tracking
 * ----------------------------------------------------------------------------
 * Session lifecycle, progress sync, draft sync, and keepalive helpers for the
 * universal product form app.
 *
 * Responsibilities
 * - Start and maintain tracked form sessions
 * - Sync progress and draft updates
 * - Handle inactive-session tracking errors
 * - Link tracked form sessions to downstream product requests
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

import {
  getSessionToken,
  setSessionToken,
  clearSessionToken,
  getPendingUpdate,
  setPendingUpdate,
  clearPendingUpdate,
} from './form-storage.js';

/**
 * Returns a storage-key reference object for the current product.
 *
 * @param {object} config
 * @returns {{sessionToken: string, pendingUpdate: string}}
 */
export function getTrackingStorageKeys(config) {
  const productKey = config?.productKey || 'default';

  return {
    sessionToken: `zdk_${productKey}_session_token`,
    pendingUpdate: `zdk_${productKey}_pending_update`,
  };
}

/**
 * Returns the subset of API URLs used by the tracking layer.
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
  return getSessionToken(storageKeys);
}

/**
 * Stores the session token in sessionStorage.
 *
 * @param {object} storageKeys
 * @param {string|null} token
 */
export function storeSessionToken(storageKeys, token) {
  setSessionToken(storageKeys, token);
}

/**
 * Clears the session token from sessionStorage.
 *
 * @param {object} storageKeys
 */
export function clearStoredSessionToken(storageKeys) {
  clearSessionToken(storageKeys);
}

/**
 * Reads the pending update payload from sessionStorage.
 *
 * @param {object} storageKeys
 * @returns {object|null}
 */
export function getPendingUpdatePayload(storageKeys) {
  return getPendingUpdate(storageKeys);
}

/**
 * Stores the pending update payload in sessionStorage.
 *
 * @param {object} storageKeys
 * @param {object|null} payload
 */
export function storePendingUpdatePayload(storageKeys, payload) {
  setPendingUpdate(storageKeys, payload);
}

/**
 * Clears the pending update payload from sessionStorage.
 *
 * @param {object} storageKeys
 */
export function clearPendingUpdatePayload(storageKeys) {
  clearPendingUpdate(storageKeys);
}

/**
 * Builds the current form payload snapshot using the current form values.
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
 * Builds the payload used to start a tracked form session.
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
 * Builds a stable step snapshot for progress updates.
 *
 * @param {number} currentStepIndex
 * @param {number} lastCompletedStepIndex
 * @param {number} [highestCompletedStepIndex]
 * @returns {{currentStepIndex:number,lastCompletedStepIndex:number,highestCompletedStepIndex:number}}
 */
export function createProgressSnapshot(
  currentStepIndex,
  lastCompletedStepIndex,
  highestCompletedStepIndex = Math.max(currentStepIndex, lastCompletedStepIndex)
) {
  return {
    currentStepIndex,
    lastCompletedStepIndex,
    highestCompletedStepIndex,
  };
}

/**
 * Builds the standard progress payload used for step transitions and draft sync.
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
 * Builds the payload used when the tracked form session reaches submit.
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
  setSessionToken(storageKeys, token);

  return true;
}

/**
 * Sends a progress update and keeps the last payload persisted until sync succeeds.
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

  const snapshot = createProgressSnapshot(
    targetStepIndex,
    previousStepIndex
  );

  const payload = buildProgressPayload({
    state,
    config,
    form,
    currentStepIndex: snapshot.currentStepIndex,
    lastCompletedStepIndex: snapshot.lastCompletedStepIndex,
    highestCompletedStepIndex: snapshot.highestCompletedStepIndex,
  });

  setPendingUpdate(storageKeys, payload);

  await postJson(
    apiUrls.formUpdate,
    payload,
    config.timeouts.formUpdate
  );

  clearPendingUpdate(storageKeys);
}

/**
 * Attempts to resend the last pending update from storage.
 *
 * Returns a structured result so callers can keep the UI responsive while still
 * understanding what happened during the retry.
 *
 * @param {object} params
 * @param {object} params.config
 * @param {object} params.apiUrls
 * @param {object} params.storageKeys
 * @param {Function} params.onTrackingError
 * @returns {Promise<{ok:boolean,flushed:boolean,handled:boolean,reason:string|null}>}
 */
export async function flushPendingUpdate({
  config,
  apiUrls,
  storageKeys,
  onTrackingError,
}) {
  const pendingPayload = getPendingUpdate(storageKeys);

  if (!pendingPayload) {
    return {
      ok: true,
      flushed: false,
      handled: false,
      reason: null,
    };
  }

  try {
    await postJson(
      apiUrls.formUpdate,
      pendingPayload,
      config.timeouts.formUpdate
    );

    clearPendingUpdate(storageKeys);

    return {
      ok: true,
      flushed: true,
      handled: false,
      reason: null,
    };
  } catch (error) {
    const handled =
      typeof onTrackingError === 'function'
        ? await onTrackingError(error)
        : false;

    return {
      ok: false,
      flushed: false,
      handled,
      reason: handled ? 'handled_error' : 'network_or_unknown_error',
    };
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
  const pendingPayload = getPendingUpdate(storageKeys);
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
 * Marks the tracked form session as submitted.
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
 * Links the tracked form session to a downstream request.
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
    clearSessionToken(storageKeys);
    clearPendingUpdate(storageKeys);

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
      const snapshot = createProgressSnapshot(
        state.ui.currentStepIndex,
        Math.max(0, state.ui.currentStepIndex - 1),
        state.ui.currentStepIndex
      );

      const payload = buildProgressPayload({
        state,
        config,
        form,
        currentStepIndex: snapshot.currentStepIndex,
        lastCompletedStepIndex: snapshot.lastCompletedStepIndex,
        highestCompletedStepIndex: snapshot.highestCompletedStepIndex,
      });

      try {
        setPendingUpdate(storageKeys, payload);

        await postJson(
          apiUrls.formUpdate,
          payload,
          config.timeouts.formUpdate
        );

        clearPendingUpdate(storageKeys);
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
 * Binds input, change, and blur listeners for tracked draft progress.
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
