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
  hideError,
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
  restoreDefaultErrorOverlayContent,
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

  const placeHiddenFieldIds = getPlaceHiddenFieldIds(config);

  function ensureErrorContainersAreStyleControlled() {
    Object.values(config.errorIds || {}).forEach((errorId) => {
      const element = document.getElementById(errorId);
      if (element) {
        element.removeAttribute('hidden');
        element.style.display = 'none';
      }
    });
  }

  function setInitialFieldConstraints() {
    const birthDateInput = getNamedInput(dom.form, config.fields.birthDate);
    if (birthDateInput) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      birthDateInput.max = `${year}-${month}-${day}`;
    }

    const birthTimeInput = getNamedInput(dom.form, config.fields.birthTime);
    if (birthTimeInput) {
      birthTimeInput.setAttribute('step', '60');
      birthTimeInput.setAttribute('inputmode', 'numeric');
    }
  }

  function resetCitySelectionState() {
    state.city.isValidated = false;
    state.city.selectedDisplay = '';
    state.city.placePayload = null;
    clearElementValuesById(placeHiddenFieldIds);
  }

  function fillConfirmationSummary() {
    if (!dom.confirmationSummary || !Array.isArray(config.confirmationFields)) return;

    const formData = new FormData(dom.form);
    const data = Object.fromEntries(formData.entries());

    const fallback = t('confirmation.notProvided', '(não informado)');
    const list = document.createElement('ul');

    config.confirmationFields.forEach(({ key, labelKey }) => {
      let value = data[key] || fallback;

      if (key === config.fields.birthDate) {
        value = formatDisplayDate(value, config.locale, fallback);
      }

      if (key === config.fields.birthPlace) {
        value = state.city.selectedDisplay || value || fallback;
      }

      const item = document.createElement('li');
      const strong = document.createElement('strong');

      strong.textContent = `${t(labelKey, key)}: `;
      item.appendChild(strong);
      item.appendChild(document.createTextNode(value || fallback));
      list.appendChild(item);
    });

    dom.confirmationSummary.replaceChildren(list);
  }

  function getCurrentNextButton() {
    const currentStep = getCurrentStepElement(dom, state);
    return currentStep?.querySelector('[data-action="next"]') || null;
  }

  function setCurrentNextButtonLoading(isLoading) {
    const button = getCurrentNextButton();
    if (!button) return;

    button.disabled = isLoading;
    button.classList.toggle('is-loading', isLoading);
    button.setAttribute('aria-busy', isLoading ? 'true' : 'false');
  }

  function resetForm() {
    dom.form.reset();
    resetFormState(state);
    clearAllFormStorage(storageKeys);
    clearAllErrors(config);
    clearAllInvalidStates(dom.form);
    clearElementValuesById(placeHiddenFieldIds);

    if (dom.confirmationSummary) {
      dom.confirmationSummary.replaceChildren();
    }

    restoreDefaultErrorOverlayContent({
      errorOverlay: dom.errorOverlay,
      t,
    });

    closeOverlay({ overlayElement: dom.spinnerOverlay, state });
    closeOverlay({ overlayElement: dom.errorOverlay, state });

    showStep({ dom, state, index: 0 });
  }

  function initAutocomplete() {
    if (!config.integrations?.usesGooglePlaces) return;
    if (!dom.cityInput || !window.google || !google.maps || !google.maps.places) return;

    if (dom.cityInput.dataset.autocompleteBound === 'true') return;
    dom.cityInput.dataset.autocompleteBound = 'true';

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
        resetCitySelectionState();
        validateCityInput(dom.cityInput, state, config, t);
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
      const name = place.name || admin2 || '';

      const countryPretty =
        countryRaw === 'Brazil' || countryRaw === 'Brasil'
          ? 'Brasil'
          : countryRaw === 'United States'
            ? 'EUA'
            : countryRaw;

      const displayValue = [name, admin1, countryPretty].filter(Boolean).join(', ');
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      state.city.placePayload = {
        place_id: place.place_id,
        formatted_address: place.formatted_address || displayValue,
        name: place.name || name,
        address_components: components,
        country: countryRaw,
        admin1,
        admin2,
        lat,
        lng,
      };

      state.city.selectedDisplay = displayValue;
      state.city.isValidated = true;

      dom.cityInput.value = displayValue;

      setElementValueById(config.hiddenFields.placeId, place.place_id || '');
      setElementValueById(config.hiddenFields.fullAddress, place.formatted_address || displayValue || '');
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
          address_components: components,
        })
      );

      validateCityInput(dom.cityInput, state, config, t);
    });

    dom.cityInput.addEventListener('input', () => {
      if (dom.cityInput.value !== state.city.selectedDisplay) {
        resetCitySelectionState();
      }
    });
  }

  window.initAutocomplete = initAutocomplete;

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
    if (!canAdvanceToNextStep(dom, state) || state.tracking.isSyncingStep) return;

    const currentStep = getCurrentStepElement(dom, state);
    if (!validateStepFields(currentStep, state, config, t)) return;

    state.tracking.isSyncingStep = true;

    try {
      const previousStepIndex = state.ui.currentStepIndex;
      const nextIndex = getNextStepIndex(state);

      if (!state.session.token && previousStepIndex === 0) {
        let loadingTimer = null;

        try {
          loadingTimer = window.setTimeout(() => {
            setCurrentNextButtonLoading(true);
          }, 180);
        
        await startFormSession({
          state,
          config,
          apiUrls,
          storageKeys,
          form: dom.form,
        });
        } finally {
          if (loadingTimer) {
            window.clearTimeout(loadingTimer);
          }
          setCurrentNextButtonLoading(false);
          }
        
        if (nextIndex === dom.steps.length - 1) {
          fillConfirmationSummary();
        }

        showStep({ dom, state, index: nextIndex });
        return;
      }

      const flushResult = await flushPendingUpdate({
        config,
        apiUrls,
        storageKeys,
        onTrackingError,
      });

      if (flushResult?.handled) {
        return;
      }

      if (nextIndex === dom.steps.length - 1) {
        fillConfirmationSummary();
      }

      showStep({ dom, state, index: nextIndex });

      if (state.session.token) {
        updateFormSessionProgress({
          state,
          config,
          apiUrls,
          storageKeys,
          form: dom.form,
          targetStepIndex: nextIndex,
          previousStepIndex,
        }).catch(async (error) => {
          await onTrackingError(error);
        });
      }
    } catch (error) {
      const handled = await onTrackingError(error);

      if (!handled) {
        showError(
          config.errorIds.email,
          t('errors.startSessionFailed', 'não foi possível iniciar sua sessão agora. tente novamente.')
        );
      }
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
      const currentStep = getCurrentStepElement(dom, state);
      if (!validateStepFields(currentStep, state, config, t)) return;

      if (!validateCityInput(dom.cityInput, state, config, t)) return;
      if (!validatePrivacyCheckbox(dom.privacyCheckbox, config, t)) return;

      const flushResult = await flushPendingUpdate({
        config,
        apiUrls,
        storageKeys,
        onTrackingError,
      });

      if (flushResult?.handled) {
        return;
      }

      if (state.session.token) {
        await markFormSessionSubmitted({
          state,
          config,
          apiUrls,
          form: dom.form,
          lastStepIndex: dom.steps.length - 1,
        });
      }

      openOverlay({ overlayElement: dom.spinnerOverlay, state });

      const response = await submitCheckoutRequest({
        form: dom.form,
        state,
        config,
        apiUrls,
      });

      if (state.session.token && response?.request_id) {
        try {
          await linkFormSessionToRequest({
            state,
            apiUrls,
            requestId: response.request_id,
          });
        } catch {}
      }

      if (!hasCheckoutRedirectUrl(response)) {
        throw new Error(t('errors.checkoutUrlMissing', 'URL de pagamento não recebida.'));
      }

      redirectToCheckoutUrl(response.url);
    } catch (error) {
      const handled = await onTrackingError(error);

      if (handled) {
        return;
      }

      closeOverlay({ overlayElement: dom.spinnerOverlay, state });
      openOverlay({ overlayElement: dom.errorOverlay, state });

      const backendMessage = String(error?.message || '').toLowerCase();
      if (backendMessage.includes('privacy')) {
        showError(config.errorIds.privacy, error.message);
      }
    } finally {
      state.ui.isSubmitting = false;
    }
  }

  /* ------------------------------------------------------------------------
   * Events
   * ---------------------------------------------------------------------- */

  function bindEvents() {
  dom.form.addEventListener('submit', submitCheckout);

    const handleActionClick = (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;

    if (action === 'next') nextStep();
    if (action === 'back') prevStep();
    if (action === 'reset') resetForm();
    };

  dom.form.addEventListener('click', handleActionClick);

    const resetOverlayButton = dom.errorOverlay?.querySelector('[data-action="reset"]');
      if (resetOverlayButton) {
          resetOverlayButton.addEventListener('click', (event) => {
          event.preventDefault();
          resetForm();
          });
      }

    if (dom.privacyCheckbox) {
      dom.privacyCheckbox.addEventListener('change', () => {
        if (dom.privacyCheckbox.checked) {
          hideError(config.errorIds.privacy);
          dom.privacyCheckbox.removeAttribute('aria-invalid');
        }
      });
    }

    dom.form.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;

      const target = event.target;
      const tagName = String(target?.tagName || '').toLowerCase();
      const inputType = String(target?.getAttribute?.('type') || '').toLowerCase();
      const isCheckbox = tagName === 'input' && inputType === 'checkbox';
      const isButton = tagName === 'button';
      const isLastStep = state.ui.currentStepIndex === dom.steps.length - 1;

      if (!isLastStep && !isCheckbox && !isButton) {
        event.preventDefault();
        nextStep();
      }
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
    ensureErrorContainersAreStyleControlled();
    setInitialFieldConstraints();
    restoreClientSession();
    bindEvents();
    initAutocomplete();
    showStep({ dom, state, index: state.ui.currentStepIndex });

    if (state.ui.currentStepIndex === dom.steps.length - 1) {
      fillConfirmationSummary();
    }
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
