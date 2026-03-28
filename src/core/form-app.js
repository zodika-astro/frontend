// src/core/form-app.js

/* ============================================================================
 * ZODIKA • Form App
 * ----------------------------------------------------------------------------
 * Main application orchestrator for reusable multi-step product forms.
 *
 * Responsibilities
 * - Compose and coordinate all core modules (state, navigation, validation,
 *   tracking, submit, storage, and overlays)
 * - Initialize the form lifecycle, including session restoration and UI state
 * - Manage step transitions and synchronization with the tracking backend
 * - Handle checkout submission flow and error states
 * - Integrate optional external services (e.g. Google Places)
 *
 * Notes
 * - Tracking and checkout flows are intentionally separated:
 *   the form session lifecycle is handled independently from the
 *   product-specific checkout request.
 * - sessionStorage is used to keep draft state scoped to the current session.
 * - The module exposes only a minimal public interface through mountFormApp().
 * ========================================================================== */

import { createInitialFormState, resetFormState } from './form-state.js';
import {
  showStep,
  getCurrentStepElement,
  getNextStepIndex,
  getPreviousStepIndex,
  canAdvanceToNextStep,
  canGoToPreviousStep,
} from './form-navigation.js';
import {
  validateStepFields,
  validatePrivacyCheckbox,
  validateCityInput,
  showError,
  clearAllErrors,
  clearAllInvalidStates,
} from './form-validation.js';
import {
  startFormSession,
  updateFormSessionProgress,
  flushPendingUpdate,
  flushPendingUpdateWithKeepalive,
  createDraftSyncScheduler,
  bindDraftTrackingListeners,
  handleTrackingError,
  markFormSessionSubmitted,
  linkFormSessionToRequest,
} from './form-tracking.js';
import {
  submitCheckoutRequest,
  redirectToCheckoutUrl,
  hasCheckoutRedirectUrl,
} from './form-submit.js';
import {
  getStorageKeys,
  getSessionToken,
  getPendingUpdate,
  clearAllFormStorage,
} from './form-storage.js';
import {
  openOverlay,
  closeOverlay,
  showSessionExpiredOverlay,
} from './form-overlays.js';
import {
  resolveDom,
  hasRequiredDom,
  getNamedInput,
  setElementValueById,
  clearElementValuesById,
  getPlaceHiddenFieldIds,
} from './form-dom.js';
import {
  messages,
  createTranslator,
} from '../i18n/messages.js';
import {
  deepMerge,
  toAbsoluteUrl,
  formatDisplayDate,
  clamp,
} from './form-utils.js';

/* ============================================================================
 * App factory
 * ========================================================================== */

export function createFormApp(productConfig) {
  const config = deepMerge(productConfig, window.ZDK_FORM_CONFIG || {});
  const dom = resolveDom(config.selectors);

  if (!hasRequiredDom(dom)) return null;

  const mergedMessages = deepMerge(messages, window.ZDK_FORM_MESSAGES || {});
  const t = createTranslator(mergedMessages, config.locale);

  const state = createInitialFormState();
  const storageKeys = getStorageKeys(config);

  const apiUrls = Object.fromEntries(
    Object.entries(config.endpoints).map(([k, v]) => [
      k,
      toAbsoluteUrl(config.apiBaseUrl, v),
    ])
  );

  /* ------------------------------------------------------------------------
   * Draft tracking
   * ---------------------------------------------------------------------- */

  const scheduleDraftSync = createDraftSyncScheduler({
    state,
    config,
    apiUrls,
    storageKeys,
    form: dom.form,
    onTrackingError,
  });

  function onTrackingError(error) {
    return handleTrackingError({
      error,
      state,
      config,
      storageKeys,
      onSessionInactive: () =>
        showSessionExpiredOverlay({
          spinnerOverlay: dom.spinnerOverlay,
          errorOverlay: dom.errorOverlay,
          state,
          t,
        }),
    });
  }

  /* ------------------------------------------------------------------------
   * Restore session
   * ---------------------------------------------------------------------- */

  function restoreClientSession() {
    const token = getSessionToken(storageKeys);
    const pending = getPendingUpdate(storageKeys);

    if (token) {
      state.session.token = token;
      state.session.isStarted = true;
    }

    if (pending?.current_step_index != null) {
      state.ui.currentStepIndex = clamp(
        Number(pending.current_step_index),
        0,
        dom.steps.length - 1
      );
    }
  }

  /* ------------------------------------------------------------------------
   * Navigation
   * ---------------------------------------------------------------------- */

  async function nextStep() {
    if (state.tracking.isSyncingStep) return;

    const currentStep = getCurrentStepElement(dom, state);
    if (!validateStepFields(currentStep, state, config, t)) return;

    state.tracking.isSyncingStep = true;

    try {
      if (!state.session.token && state.ui.currentStepIndex === 0) {
        await startFormSession({
          state,
          config,
          apiUrls,
          storageKeys,
          form: dom.form,
        });
      }

      await flushPendingUpdate({
        config,
        apiUrls,
        storageKeys,
        onTrackingError,
      });

      const nextIndex = getNextStepIndex(state);

      showStep({ dom, state, index: nextIndex });

      await updateFormSessionProgress({
        state,
        config,
        apiUrls,
        storageKeys,
        form: dom.form,
        targetStepIndex: nextIndex,
        previousStepIndex: state.ui.currentStepIndex,
      });
    } catch (error) {
      await onTrackingError(error);
    } finally {
      state.tracking.isSyncingStep = false;
    }
  }

  async function prevStep() {
    if (!canGoToPreviousStep(state)) return;
    showStep({ dom, state, index: getPreviousStepIndex(state) });
  }

  /* ------------------------------------------------------------------------
   * Submit
   * ---------------------------------------------------------------------- */

  async function submitCheckout(event) {
    event.preventDefault();

    if (state.ui.isSubmitting) return;
    state.ui.isSubmitting = true;

    try {
      if (!validatePrivacyCheckbox(dom.privacyCheckbox, config, t)) return;

      await flushPendingUpdate({
        config,
        apiUrls,
        storageKeys,
        onTrackingError,
      });

      openOverlay({ overlayElement: dom.spinnerOverlay, state });

      const response = await submitCheckoutRequest({
        form: dom.form,
        state,
        config,
        apiUrls,
      });

      if (!hasCheckoutRedirectUrl(response)) {
        throw new Error();
      }

      redirectToCheckoutUrl(response.url);
    } catch (error) {
      closeOverlay({ overlayElement: dom.spinnerOverlay, state });
      openOverlay({ overlayElement: dom.errorOverlay, state });
    } finally {
      state.ui.isSubmitting = false;
    }
  }

  /* ------------------------------------------------------------------------
   * Events
   * ---------------------------------------------------------------------- */

  function bindEvents() {
    dom.form.addEventListener('submit', submitCheckout);

    dom.form.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;

      if (action === 'next') nextStep();
      if (action === 'back') prevStep();
      if (action === 'reset') location.reload();
    });

    bindDraftTrackingListeners({
      form: dom.form,
      config,
      state,
      cityInput: dom.cityInput,
      scheduleDraftSync,
    });

    window.addEventListener('pagehide', () =>
      flushPendingUpdateWithKeepalive({ apiUrls, storageKeys })
    );
  }

  /* ------------------------------------------------------------------------
   * Init
   * ---------------------------------------------------------------------- */

  function init() {
    restoreClientSession();
    bindEvents();
    showStep({ dom, state, index: state.ui.currentStepIndex });
  }

  return { init };
}

/* ============================================================================
 * Mount
 * ========================================================================== */

export function mountFormApp(config) {
  const app = createFormApp(config);
  if (!app) return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init(), { once: true });
  } else {
    app.init();
  }
}
