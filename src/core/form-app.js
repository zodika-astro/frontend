// src/core/form-app.js

/* ============================================================================
 * ZODIKA • Form App
 * ----------------------------------------------------------------------------
 * Main application orchestrator for universal product forms.
 *
 * Responsibilities
 * - Compose all core modules
 * - Initialize UI, tracking, and submit flow
 * - Expose only the minimum global API required by current Webflow HTML
 *
 * Architectural notes
 * - `form_status` belongs to the universal forms tracking flow
 *   (`STARTED`, `IN_PROGRESS`, etc.) and is sent to the forms backend.
 * - `formSubmit` marks the tracked form session as having reached the submit
 *   stage in the universal forms flow.
 * - `checkoutSubmit` is the product-specific checkout request and may create
 *   the payment link / product request.
 * - `sessionStorage` is intentionally used instead of `localStorage` to reduce
 *   persistence of personal data on the client and keep draft state session-
 *   scoped.
 * - Step 0 is blocking because a valid email is required before the app can
 *   safely open a tracked form session.
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

/* --------------------------------------------------------------------------
 * App factory
 * ------------------------------------------------------------------------ */

/**
 * Creates a new form application instance.
 *
 * @param {object} productConfig
 * @returns {object|null}
 */
export function createFormApp(productConfig) {
  if (!productConfig || typeof productConfig !== 'object') {
    console.error('[ZDK] Missing product config. App initialization aborted.');
    return null;
  }

  const config = deepMerge(productConfig, window.ZDK_FORM_CONFIG || {});
  const dom = resolveDom(config.selectors);

  if (!hasRequiredDom(dom)) {
    console.error('[ZDK] Required form DOM not found. App initialization aborted.');
    return null;
  }

  const mergedMessages = deepMerge(messages, window.ZDK_FORM_MESSAGES || {});
  const t = createTranslator(mergedMessages, config.locale);

  const state = createInitialFormState();

  const storageKeys = getStorageKeys(config);

  const apiUrls = {
    formStart: toAbsoluteUrl(config.apiBaseUrl, config.endpoints.formStart),
    formUpdate: toAbsoluteUrl(config.apiBaseUrl, config.endpoints.formUpdate),
    formSubmit: toAbsoluteUrl(config.apiBaseUrl, config.endpoints.formSubmit),
    formLinkRequest: toAbsoluteUrl(config.apiBaseUrl, config.endpoints.formLinkRequest),
    checkoutSubmit: toAbsoluteUrl(config.apiBaseUrl, config.endpoints.checkoutSubmit),
  };

  /* ------------------------------------------------------------------------
   * Local helpers
   * ---------------------------------------------------------------------- */

  function getProgressStatusElement() {
    return document.getElementById('progressStatus');
  }

  function updateAccessibleProgressText() {
    const element = getProgressStatusElement();
    if (!element) return;

    const current = state.ui.currentStepIndex + 1;
    const total = dom.steps.length;

    if (config.locale === 'en-US') {
      element.textContent = `Step ${current} of ${total}`;
      return;
    }

    element.textContent = `Etapa ${current} de ${total}`;
  }

  function afterStepRender() {
    if (state.ui.currentStepIndex === dom.steps.length - 1) {
      fillConfirmationSummary();
    }

    updateAccessibleProgressText();
  }

  function renderStep(index) {
    showStep({
      dom,
      state,
      index,
      onAfterShowStep: afterStepRender,
    });
  }

  function getCurrentStepSnapshot(targetStepIndex, previousStepIndex) {
    return {
      targetStepIndex,
      previousStepIndex,
      highestCompletedStepIndex: Math.max(targetStepIndex, previousStepIndex),
    };
  }

  function getHiddenPlaceFieldMap() {
    return config.hiddenFields;
  }

  function setCityStateFromPayload(payload) {
    if (!payload) return;

    const birthPlace = payload.birth_place || '';
    const placeId = payload.birth_place_place_id || '';

    state.city.selectedDisplay = birthPlace || '';
    state.city.isValidated = Boolean(birthPlace && placeId);
    state.city.placePayload = placeId
      ? {
          place_id: placeId,
          formatted_address: payload.birth_place_full || '',
          country: payload.birth_place_country || '',
          admin1: payload.birth_place_admin1 || '',
          admin2: payload.birth_place_admin2 || '',
          lat: payload.birth_place_lat || '',
          lng: payload.birth_place_lng || '',
        }
      : null;
  }

  function applyPayloadToFormFields(payload) {
    if (!payload || !dom.form) return;

    Object.entries(payload).forEach(([key, value]) => {
      const field = dom.form.querySelector(`[name="${key}"]`);
      if (!field) return;

      if (field.type === 'checkbox') {
        field.checked = Boolean(value);
      } else if (value != null) {
        field.value = value;
      }
    });

    const hidden = getHiddenPlaceFieldMap();
    setElementValueById(hidden.placeId, payload.birth_place_place_id || '');
    setElementValueById(hidden.fullAddress, payload.birth_place_full || '');
    setElementValueById(hidden.country, payload.birth_place_country || '');
    setElementValueById(hidden.admin1, payload.birth_place_admin1 || '');
    setElementValueById(hidden.admin2, payload.birth_place_admin2 || '');
    setElementValueById(hidden.lat, payload.birth_place_lat || '');
    setElementValueById(hidden.lng, payload.birth_place_lng || '');
    setElementValueById(hidden.json, payload.birth_place_json || '');

    setCityStateFromPayload(payload);
  }

  /**
   * Restores the client-side session snapshot from sessionStorage.
   *
   * Restoration order:
   * 1) session token
   * 2) pending draft payload (if any)
   * 3) current UI step derived from the pending payload
   *
   * This is still a client-side best-effort restoration. The backend remains
   * the source of truth for actual session validity.
   */
  function restoreClientSession() {
    const storedToken = getSessionToken(storageKeys);
    const pendingPayload = getPendingUpdate(storageKeys);

    if (storedToken) {
      state.session.token = storedToken;
    }

    if (pendingPayload?.form_data) {
      applyPayloadToFormFields(pendingPayload.form_data);
    }

    if (pendingPayload?.current_step_index != null) {
      state.ui.currentStepIndex = clamp(
        Number(pendingPayload.current_step_index) || 0,
        0,
        dom.steps.length - 1
      );
    }

    updateAccessibleProgressText();
  }

  function fillConfirmationSummary() {
    if (!dom.confirmationSummary || !dom.form) return;

    const formData = new FormData(dom.form);
    const data = Object.fromEntries(formData.entries());

    const list = document.createElement('ul');

    config.confirmationFields.forEach(({ key, labelKey }) => {
      let value = data[key] || t('confirmation.notProvided', '(não informado)');

      if (key === 'birth_date' && value) {
        value = formatDisplayDate(
          value,
          config.locale,
          t('confirmation.notProvided', '(não informado)')
        );
      }

      if (key === 'birth_place') {
        value = state.city.selectedDisplay || value;
      }

      const item = document.createElement('li');
      const strong = document.createElement('strong');

      strong.textContent = `${t(labelKey, key)}: `;
      item.appendChild(strong);
      item.appendChild(document.createTextNode(value));
      list.appendChild(item);
    });

    dom.confirmationSummary.replaceChildren(list);
  }

  function applyInitialFieldAttributes() {
    const dateInput = getNamedInput(dom.form, config.fields.birthDate);
    if (dateInput) {
      dateInput.max = new Date().toISOString().split('T')[0];
    }

    const timeInput = getNamedInput(dom.form, config.fields.birthTime);
    if (timeInput) {
      timeInput.setAttribute('step', '60');
      timeInput.setAttribute('inputmode', 'numeric');
    }

    if (dom.privacyCheckbox) {
      dom.privacyCheckbox.required = true;
    }
  }

  function clearClientCityState() {
    state.city.isValidated = false;
    state.city.selectedDisplay = '';
    state.city.placePayload = null;

    clearElementValuesById(getPlaceHiddenFieldIds(config));
  }

  async function onTrackingError(error) {
    return handleTrackingError({
      error,
      state,
      config,
      storageKeys,
      onSessionInactive: async () => {
        showSessionExpiredOverlay({
          spinnerOverlay: dom.spinnerOverlay,
          errorOverlay: dom.errorOverlay,
          state,
          t,
        });

        renderStep(0);
      },
    });
  }

  const scheduleDraftSync = createDraftSyncScheduler({
    state,
    config,
    apiUrls,
    storageKeys,
    form: dom.form,
    onTrackingError,
  });

  async function syncStepTransition(targetStepIndex) {
    const previousStepIndex = state.ui.currentStepIndex;
    const snapshot = getCurrentStepSnapshot(targetStepIndex, previousStepIndex);

    renderStep(targetStepIndex);

    try {
      await updateFormSessionProgress({
        state,
        config,
        apiUrls,
        storageKeys,
        form: dom.form,
        targetStepIndex: snapshot.targetStepIndex,
        previousStepIndex: snapshot.previousStepIndex,
      });
    } catch (error) {
      console.error('[ZDK] Step transition sync error:', error);
      await onTrackingError(error);
    }
  }

  /* ------------------------------------------------------------------------
   * Navigation
   * ---------------------------------------------------------------------- */

  async function nextStep() {
    if (!canAdvanceToNextStep(dom, state) || state.tracking.isSyncingStep) {
      return;
    }

    const currentStepElement = getCurrentStepElement(dom, state);
    if (!validateStepFields(currentStepElement, state, config, t)) {
      return;
    }

    state.tracking.isSyncingStep = true;

    try {
      const nextIndex = getNextStepIndex(state);

      /**
       * Step 0 is intentionally blocking:
       * the app must first create a valid tracked form session after a valid
       * email is provided.
       */
      if (!state.session.token && state.ui.currentStepIndex === 0) {
        await startFormSession({
          state,
          config,
          apiUrls,
          storageKeys,
          form: dom.form,
        });

        renderStep(nextIndex);
        return;
      }

      /**
       * UX-first flow:
       * - flush any previously failed pending update
       * - advance the UI
       * - send the new step update
       *
       * `flushPendingUpdate()` returns a structured result on purpose so the
       * app can continue the UX flow even when errors were already handled.
       */
      if (state.session.token) {
        await flushPendingUpdate({
          config,
          apiUrls,
          storageKeys,
          onTrackingError,
        });

        await syncStepTransition(nextIndex);
        return;
      }

      renderStep(nextIndex);
    } catch (error) {
      console.error('[ZDK] nextStep error:', error);

      const handled = await onTrackingError(error);
      if (!handled) {
        showError(
          config.errorIds.email,
          t(
            'errors.startSessionFailed',
            'não foi possível iniciar sua sessão agora. tente novamente.'
          )
        );
      }
    } finally {
      state.tracking.isSyncingStep = false;
    }
  }

  async function prevStep() {
    if (!canGoToPreviousStep(state)) return;

    const previousIndex = getPreviousStepIndex(state);
    renderStep(previousIndex);

    if (state.session.token) {
      scheduleDraftSync();
    }
  }

  /* ------------------------------------------------------------------------
   * Submit
   * ---------------------------------------------------------------------- */

  async function submitTrackedSessionIfNeeded() {
    if (!state.session.token) return;

    await flushPendingUpdate({
      config,
      apiUrls,
      storageKeys,
      onTrackingError,
    });

    await markFormSessionSubmitted({
      state,
      config,
      apiUrls,
      form: dom.form,
      lastStepIndex: dom.steps.length - 1,
    });
  }

  async function createCheckout() {
    return submitCheckoutRequest({
      form: dom.form,
      state,
      config,
      apiUrls,
    });
  }

  async function submitCheckout(event) {
    event.preventDefault();

    if (state.ui.isSubmitting) return;
    state.ui.isSubmitting = true;

    try {
      const currentStepElement = getCurrentStepElement(dom, state);

      if (!validateStepFields(currentStepElement, state, config, t)) {
        return;
      }

      if (!validateCityInput(dom.cityInput, state, config, t)) {
        return;
      }

      if (!validatePrivacyCheckbox(dom.privacyCheckbox, config, t)) {
        dom.privacyCheckbox?.focus();
        return;
      }

      await submitTrackedSessionIfNeeded();

      openOverlay({
        overlayElement: dom.spinnerOverlay,
        state,
      });

      const responseData = await createCheckout();

      if (state.session.token && responseData?.request_id) {
        try {
          await linkFormSessionToRequest({
            state,
            apiUrls,
            requestId: responseData.request_id,
          });
        } catch (linkError) {
          console.error('[ZDK] Session link error:', linkError);
        }
      }

      if (!hasCheckoutRedirectUrl(responseData)) {
        throw new Error(
          t('errors.checkoutUrlMissing', 'URL de pagamento não recebida.')
        );
      }

      redirectToCheckoutUrl(responseData.url);
    } catch (error) {
      console.error('[ZDK] submitCheckout error:', error);

      const handled = await onTrackingError(error);
      if (handled) return;

      closeOverlay({
        overlayElement: dom.spinnerOverlay,
        state,
      });

      openOverlay({
        overlayElement: dom.errorOverlay,
        state,
      });
    } finally {
      state.ui.isSubmitting = false;
    }
  }

  /* ------------------------------------------------------------------------
   * Google Places
   * ---------------------------------------------------------------------- */

  function initAutocomplete() {
    if (!dom.cityInput || !window.google || !google.maps || !google.maps.places) {
      return;
    }

    const autocomplete = new google.maps.places.Autocomplete(dom.cityInput, {
      types: ['(cities)'],
    });

    if (typeof autocomplete.setFields === 'function') {
      autocomplete.setFields([
        'place_id',
        'name',
        'formatted_address',
        'address_components',
        'geometry',
      ]);
    }

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();

      if (!place || !place.place_id || !place.geometry || !place.geometry.location) {
        state.city.isValidated = false;
        return;
      }

      const components = place.address_components || [];
      const pick = (type) => {
        const component = components.find((item) => (item.types || []).includes(type));
        return component ? (component.short_name || component.long_name || '') : '';
      };

      const countryRaw = pick('country');
      const admin1 = pick('administrative_area_level_1');
      const admin2 = pick('administrative_area_level_2');
      const placeName = place.name || admin2 || '';

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      const countryDisplay =
        countryRaw === 'Brazil' || countryRaw === 'Brasil'
          ? 'Brasil'
          : countryRaw === 'United States'
            ? 'EUA'
            : countryRaw;

      const displayFormatted = [placeName, admin1, countryDisplay]
        .filter(Boolean)
        .join(', ');

      state.city.selectedDisplay = displayFormatted;
      state.city.isValidated = true;
      state.city.placePayload = {
        place_id: place.place_id,
        formatted_address: place.formatted_address || displayFormatted,
        name: place.name,
        address_components: place.address_components,
        country: countryRaw,
        admin1,
        admin2,
        lat,
        lng,
      };

      dom.cityInput.value = displayFormatted;

      setElementValueById(config.hiddenFields.placeId, place.place_id || '');
      setElementValueById(
        config.hiddenFields.fullAddress,
        place.formatted_address || displayFormatted || ''
      );
      setElementValueById(config.hiddenFields.country, countryRaw || '');
      setElementValueById(config.hiddenFields.admin1, admin1 || '');
      setElementValueById(config.hiddenFields.admin2, admin2 || '');
      setElementValueById(config.hiddenFields.lat, String(lat));
      setElementValueById(config.hiddenFields.lng, String(lng));
      setElementValueById(
        config.hiddenFields.json,
        JSON.stringify({
          place_id: place.place_id,
          formatted_address: place.formatted_address,
          name: place.name,
          address_components: place.address_components,
        })
      );

      if (state.session.token) {
        scheduleDraftSync();
      }
    });

    dom.cityInput.addEventListener('input', () => {
      if (dom.cityInput.value !== state.city.selectedDisplay) {
        state.city.isValidated = false;
      }
    });
  }

  /* ------------------------------------------------------------------------
   * Lifecycle
   * ---------------------------------------------------------------------- */

  function handlePageHide() {
    flushPendingUpdateWithKeepalive({
      apiUrls,
      storageKeys,
    });
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      flushPendingUpdateWithKeepalive({
        apiUrls,
        storageKeys,
      });
    }
  }

  function handleBeforeUnload() {
    flushPendingUpdateWithKeepalive({
      apiUrls,
      storageKeys,
    });
  }

  function handleKeydown(event) {
    if (event.key !== 'Enter') return;

    const tagName = String(event.target?.tagName || '').toLowerCase();
    const type = String(event.target?.getAttribute?.('type') || '').toLowerCase();

    const isCheckbox = tagName === 'input' && type === 'checkbox';
    const isButton = tagName === 'button';
    const isLastStep = state.ui.currentStepIndex === dom.steps.length - 1;

    if (!isLastStep && !isCheckbox && !isButton) {
      event.preventDefault();
      nextStep();
    }
  }

  function resetForm() {
    dom.form.reset();

    resetFormState(state);
    clearAllFormStorage(storageKeys);
    clearAllErrors(config);
    clearAllInvalidStates(dom.form);
    clearClientCityState();

    closeOverlay({
      overlayElement: dom.spinnerOverlay,
      state,
    });

    closeOverlay({
      overlayElement: dom.errorOverlay,
      state,
    });

    renderStep(0);
  }

  function bindEvents() {
    dom.form.addEventListener('submit', submitCheckout);
    dom.form.addEventListener('keydown', handleKeydown);

    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    bindDraftTrackingListeners({
      form: dom.form,
      config,
      state,
      cityInput: dom.cityInput,
      scheduleDraftSync,
    });
  }

  function init() {
    applyInitialFieldAttributes();
    restoreClientSession();
    bindEvents();
    renderStep(state.ui.currentStepIndex);

    if (config.integrations?.usesGooglePlaces) {
      initAutocomplete();
    }
  }

  return {
    init,
    nextStep,
    prevStep,
    resetForm,
    initAutocomplete,
    getConfig() {
      return config;
    },
  };
}

/* --------------------------------------------------------------------------
 * Compatibility bootstrap for current Webflow HTML
 * ------------------------------------------------------------------------ */

/**
 * Minimal global exposure required by current HTML:
 * - nextStep
 * - prevStep
 * - resetForm
 * - initAutocomplete
 *
 * Everything else stays encapsulated inside the app instance.
 */
export function mountFormApp(productConfig) {
  const app = createFormApp(productConfig);

  if (!app) return null;

  function initialize() {
    app.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    window.addEventListener('load', initialize, { once: true });
  }

  window.nextStep = app.nextStep;
  window.prevStep = app.prevStep;
  window.resetForm = app.resetForm;
  window.initAutocomplete = app.initAutocomplete;

  return app;
}
