// src/core/form-state.js

/* ============================================================================
 * ZODIKA • Form State
 * ----------------------------------------------------------------------------
 * Centralized in-memory state for the universal product form app.
 *
 * Responsibilities
 * - Maintain UI, tracking, session, and integration state
 * - Provide predictable and explicit state structure
 * - Avoid scattered mutable globals
 * ========================================================================== */

/**
 * Creates the initial runtime state for a form instance.
 *
 * @returns {object}
 */
export function createInitialFormState() {
  return {
    ui: {
      currentStepIndex: 0,
      isSubmitting: false,
      lastFocusedBeforeOverlay: null,
    },

    tracking: {
      isSyncingStep: false,
      draftSyncTimer: null,
    },

    session: {
      token: null,
      isStarted: false,
    },

    city: {
      isValidated: false,
      selectedDisplay: '',
      placePayload: null,
    },
  };
}

/**
 * Resets the runtime state in place while preserving the object reference.
 *
 * @param {object} state
 * @returns {object}
 */
export function resetFormState(state) {
  if (!state || typeof state !== 'object') {
    return createInitialFormState();
  }

  state.ui.currentStepIndex = 0;
  state.ui.isSubmitting = false;
  state.ui.lastFocusedBeforeOverlay = null;

  state.tracking.isSyncingStep = false;
  state.tracking.draftSyncTimer = null;

  state.session.token = null;
  state.session.isStarted = false;

  state.city.isValidated = false;
  state.city.selectedDisplay = '';
  state.city.placePayload = null;

  return state;
}

/**
 * Applies a stored session token to the runtime state.
 *
 * @param {object} state
 * @param {string|null} token
 * @returns {object}
 */
export function applyStoredSessionToken(state, token) {
  if (!state || typeof state !== 'object') {
    return state;
  }

  state.session.token = token || null;
  state.session.isStarted = Boolean(token);

  return state;
}

/**
 * Clears the active session from state.
 *
 * @param {object} state
 * @returns {object}
 */
export function clearSessionState(state) {
  if (!state || typeof state !== 'object') {
    return state;
  }

  state.session.token = null;
  state.session.isStarted = false;

  return state;
}

/**
 * Clears city-related state.
 *
 * @param {object} state
 * @returns {object}
 */
export function clearCityState(state) {
  if (!state || typeof state !== 'object') {
    return state;
  }

  state.city.isValidated = false;
  state.city.selectedDisplay = '';
  state.city.placePayload = null;

  return state;
}

/**
 * Returns whether a session token is present.
 *
 * @param {object} state
 * @returns {boolean}
 */
export function hasActiveSessionToken(state) {
  return Boolean(state?.session?.token);
}

/**
 * Returns whether a submit operation is in progress.
 *
 * @param {object} state
 * @returns {boolean}
 */
export function isSubmitting(state) {
  return Boolean(state?.ui?.isSubmitting);
}

/**
 * Returns whether a step sync operation is in progress.
 *
 * @param {object} state
 * @returns {boolean}
 */
export function isTrackingStepSyncInFlight(state) {
  return Boolean(state?.tracking?.isSyncingStep);
}

/**
 * Returns whether the birth place is validated.
 *
 * @param {object} state
 * @returns {boolean}
 */
export function isBirthPlaceValidated(state) {
  return Boolean(state?.city?.isValidated);
}
