//src/core/form-state.js

/* ============================================================================
 * ZODIKA • Form State
 * ----------------------------------------------------------------------------
 * Centralized in-memory state for the universal product form app.
 *
 * Phase 1 goals
 * - Keep state structure explicit and predictable
 * - Avoid scattered mutable globals
 * - Support future product duplication and localization
 * - Preserve backend contract indirectly by not changing external payload keys
 * ========================================================================== */

/**
 * Creates the initial runtime state for a product form instance.
 *
 * This state is intentionally front-end only.
 * It does not define or change any backend payload contract.
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
 * Resets the whole runtime state object in place.
 *
 * This is useful when the app wants to preserve the same object reference
 * across modules while clearing the current form session and UI state.
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
 * Clears the active session from state without touching unrelated UI state.
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
 * Clears only city-specific state.
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
 * Returns whether a valid in-memory session token currently exists.
 *
 * @param {object} state
 * @returns {boolean}
 */
export function hasActiveSessionToken(state) {
  return Boolean(state?.session?.token);
}

/**
 * Returns whether the app is currently blocked by a submit action.
 *
 * @param {object} state
 * @returns {boolean}
 */
export function isSubmitting(state) {
  return Boolean(state?.ui?.isSubmitting);
}

/**
 * Returns whether step tracking is currently in flight.
 *
 * @param {object} state
 * @returns {boolean}
 */
export function isTrackingStepSyncInFlight(state) {
  return Boolean(state?.tracking?.isSyncingStep);
}

/**
 * Returns whether the selected birth place is currently validated.
 *
 * @param {object} state
 * @returns {boolean}
 */
export function isBirthPlaceValidated(state) {
  return Boolean(state?.city?.isValidated);
}
