// bundles/birth-chart.bundle.js

/* ============================================================================
 * ZODIKA • Birth Chart Bundle
 * ----------------------------------------------------------------------------
 * Entry point for the Birth Chart form application.
 *
 * Responsibilities:
 * - Compose modules
 * - Initialize app
 * - Expose minimal global API (Webflow compatibility)
 * ========================================================================== */

import { birthChartConfig } from '../products/birth-chart.config.js';

import { createInitialFormState } from '../core/form-state.js';
import { resolveDom, hasRequiredDom } from '../core/form-dom.js';

import { createTranslator } from '../i18n/messages.js';

import {
  showStep,
  getNextStepIndex,
  getPreviousStepIndex,
  canAdvanceToNextStep,
  canGoToPreviousStep,
} from '../core/form-navigation.js';

import {
  validateStepFields,
  validatePrivacyCheckbox,
} from '../core/form-validation.js';

import {
  getTrackingStorageKeys,
  getTrackingApiUrls,
  getStoredSessionToken,
  startFormSession,
  updateFormSessionProgress,
  flushPendingUpdate,
  flushPendingUpdateWithKeepalive,
  createDraftSyncScheduler,
  bindDraftTrackingListeners,
  handleTrackingError,
  markFormSessionSubmitted,
  linkFormSessionToRequest,
} from '../core/form-tracking.js';

import {
  submitCheckoutRequest,
  redirectToCheckoutUrl,
  hasCheckoutRedirectUrl,
} from '../core/form-submit.js';

import {
  openOverlay,
  closeOverlay,
  showSessionExpiredOverlay,
} from '../core/form-overlays.js';

import {
  toAbsoluteUrl,
} from '../core/form-utils.js';

/* ============================================================================
 * Bootstrap
 * ========================================================================== */

(function bootstrap() {
  const config = birthChartConfig;

  const state = createInitialFormState();
  const dom = resolveDom(config.selectors);

  if (!hasRequiredDom(dom)) {
    console.warn('[ZDK] Required DOM not found. Aborting init.');
    return;
  }

  const t = createTranslator(window.ZDK_FORM_MESSAGES || {}, config.locale);

  /* ------------------------------------------------------------------------
   * API URLs
   * ---------------------------------------------------------------------- */

  const apiUrls = Object.fromEntries(
    Object.entries(config.endpoints).map(([key, path]) => [
      key,
      toAbsoluteUrl(config.apiBaseUrl, path),
    ])
  );

  const trackingApiUrls = getTrackingApiUrls(apiUrls);
  const storageKeys = getTrackingStorageKeys(config);

  /* ------------------------------------------------------------------------
   * Restore session (if exists)
   * ---------------------------------------------------------------------- */

  const storedToken = getStoredSessionToken(storageKeys);
  if (storedToken) {
    state.session.token = storedToken;
    state.session.isStarted = true;
  }

  /* ------------------------------------------------------------------------
   * Draft tracking
   * ---------------------------------------------------------------------- */

  const scheduleDraftSync = createDraftSyncScheduler({
    state,
    config,
    apiUrls: trackingApiUrls,
    storageKeys,
    form: dom.form,
    onTrackingError: (error) =>
      handleTrackingError({
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
      }),
  });

  bindDraftTrackingListeners({
    form: dom.form,
    config,
    state,
    cityInput: dom.cityInput,
    scheduleDraftSync,
  });

  /* ------------------------------------------------------------------------
   * Navigation
   * ---------------------------------------------------------------------- */

  async function goToStep(nextIndex) {
    const previousIndex = state.ui.currentStepIndex;

    showStep({
      dom,
      state,
      index: nextIndex,
      onAfterShowStep: async () => {
        try {
          await updateFormSessionProgress({
            state,
            config,
            apiUrls: trackingApiUrls,
            storageKeys,
            form: dom.form,
            targetStepIndex: nextIndex,
            previousStepIndex: previousIndex,
          });
        } catch (error) {
          await handleTrackingError({
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
      },
    });
  }

  async function nextStep() {
    if (!validateStepFields(dom.form, state, config, t)) return;

    if (!state.session.isStarted) {
      try {
        await startFormSession({
          state,
          config,
          apiUrls: trackingApiUrls,
          storageKeys,
          form: dom.form,
        });
      } catch {
        alert(t('errors.startSessionFailed'));
        return;
      }
    }

    if (!canAdvanceToNextStep(dom, state)) return;

    await goToStep(getNextStepIndex(state));
  }

  async function prevStep() {
    if (!canGoToPreviousStep(state)) return;
    await goToStep(getPreviousStepIndex(state));
  }

  /* ------------------------------------------------------------------------
   * Submit
   * ---------------------------------------------------------------------- */

  dom.form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!validateStepFields(dom.form, state, config, t)) return;

    if (!validatePrivacyCheckbox(dom.privacyCheckbox, config, t)) return;

    openOverlay({ overlayElement: dom.spinnerOverlay, state });

    try {
      await markFormSessionSubmitted({
        state,
        config,
        apiUrls: trackingApiUrls,
        form: dom.form,
        lastStepIndex: state.ui.currentStepIndex,
      });

      const response = await submitCheckoutRequest({
        form: dom.form,
        state,
        config,
        apiUrls,
      });

      if (!hasCheckoutRedirectUrl(response)) {
        throw new Error(t('errors.checkoutUrlMissing'));
      }

      await linkFormSessionToRequest({
        state,
        apiUrls: trackingApiUrls,
        requestId: response.request_id,
      });

      redirectToCheckoutUrl(response.url);
    } catch (error) {
      console.error('[ZDK] Submit error:', error);

      closeOverlay({ overlayElement: dom.spinnerOverlay, state });
      openOverlay({ overlayElement: dom.errorOverlay, state });
    }
  });

  /* ------------------------------------------------------------------------
   * Exit tracking
   * ---------------------------------------------------------------------- */

  window.addEventListener('pagehide', () => {
    flushPendingUpdateWithKeepalive({
      apiUrls: trackingApiUrls,
      storageKeys,
    });
  });

  /* ------------------------------------------------------------------------
   * Global (Webflow compatibility)
   * ---------------------------------------------------------------------- */

  window.nextStep = nextStep;
  window.prevStep = prevStep;

  window.resetForm = () => {
    window.location.reload();
  };

  console.log('[ZDK] Birth Chart Form Initialized');
})();
