// src/core/form-state.js

/* ============================================================================
 * ZODIKA • Form State
 * ----------------------------------------------------------------------------
 * Centralized in-memory state for the form application.
 *
 * Responsibilities
 * - Hold UI state (current step, submission flags, focus handling)
 * - Hold tracking state (debounce timers, sync flags)
 * - Hold session state (token lifecycle)
 * - Hold integration state (city selection and validation)
 * ========================================================================== */

/**
 * Creates the initial form state.
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
      isUpdateRequestInFlight: false,
      activeUpdatePromise: null,
      queuedProgressPayload: null,
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
 * Clears session-related state.
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
 * Resets the entire form state to its initial values.
 *
 * @param {object} state
 */
export function resetFormState(state) {
  if (!state || typeof state !== 'object') return;

  const initial = createInitialFormState();

  state.ui.currentStepIndex = initial.ui.currentStepIndex;
  state.ui.isSubmitting = initial.ui.isSubmitting;
  state.ui.lastFocusedBeforeOverlay = initial.ui.lastFocusedBeforeOverlay;

  state.tracking.isSyncingStep = initial.tracking.isSyncingStep;

  if (state.tracking.draftSyncTimer) {
    clearTimeout(state.tracking.draftSyncTimer);
  }

  state.tracking.draftSyncTimer = null;
  state.tracking.isUpdateRequestInFlight = initial.tracking.isUpdateRequestInFlight;
  state.tracking.activeUpdatePromise = initial.tracking.activeUpdatePromise;
  state.tracking.queuedProgressPayload = initial.tracking.queuedProgressPayload;

  state.session.token = initial.session.token;
  state.session.isStarted = initial.session.isStarted;

  state.city.isValidated = initial.city.isValidated;
  state.city.selectedDisplay = initial.city.selectedDisplay;
  state.city.placePayload = initial.city.placePayload;
}
