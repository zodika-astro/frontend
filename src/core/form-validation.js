// src/core/form-validation.js

/* ============================================================================
 * ZODIKA • Form Validation
 * ----------------------------------------------------------------------------
 * Input validation and error handling helpers.
 *
 * Responsibilities
 * - Validate individual inputs and steps
 * - Control error visibility and accessibility attributes
 * - Normalize input values when needed
 * - Config-driven validation helpers used to resolve field rules
 * ========================================================================== */

import {
  normalizeEmail,
  normalizePersonName,
  isValidTimeString,
  getLocalTodayISO,
} from './form-utils.js';

/**
 * Sets error text inside a container.
 *
 * @param {HTMLElement|null} container
 * @param {string} message
 */
function setErrorText(container, message) {
  if (!container) return;

  const explicitTextNode = container.querySelector('[id$="Text"]');

  if (explicitTextNode) {
    explicitTextNode.textContent = message;
    return;
  }

  container.textContent = message;
}

/**
 * Shows an error message.
 *
 * @param {string} errorId
 * @param {string} message
 */
export function showError(errorId, message) {
  const element = document.getElementById(errorId);
  if (!element) return;

  element.removeAttribute('hidden');
  element.style.display = 'block';

  if (typeof message === 'string') {
    setErrorText(element, message);
  }

  element.setAttribute('role', 'alert');
  element.setAttribute('aria-live', 'polite');
}

/**
 * Hides an error message.
 *
 * @param {string} errorId
 */
export function hideError(errorId) {
  const element = document.getElementById(errorId);
  if (!element) return;

  element.style.display = 'none';
  element.removeAttribute('role');
  element.removeAttribute('aria-live');
}

/**
 * Marks a field as invalid and shows the associated error.
 *
 * @param {HTMLElement|null} field
 * @param {string} errorId
 * @param {string} message
 * @returns {false}
 */
export function markFieldInvalid(field, errorId, message) {
  if (errorId) {
    showError(errorId, message);
  }

  if (field) {
    field.classList.add('invalid');
    field.setAttribute('aria-invalid', 'true');
  }

  return false;
}

/**
 * Clears invalid state from a field and hides its error.
 *
 * @param {HTMLElement|null} field
 * @param {string} errorId
 * @returns {true}
 */
export function clearFieldInvalid(field, errorId) {
  if (errorId) {
    hideError(errorId);
  }

  if (field) {
    field.classList.remove('invalid');
    field.removeAttribute('aria-invalid');
  }

  return true;
}

/**
 * Clears all known error messages.
 *
 * @param {object} config
 */
export function clearAllErrors(config) {
  if (!config?.errorIds) return;

  Object.values(config.errorIds).forEach((errorId) => {
    hideError(errorId);
  });
}

/**
 * Clears all invalid states from fields inside a form.
 *
 * @param {HTMLFormElement} form
 */
export function clearAllInvalidStates(form) {
  if (!form) return;

  const fields = form.querySelectorAll('[aria-invalid="true"], .invalid');

  fields.forEach((field) => {
    field.classList.remove('invalid');
    field.removeAttribute('aria-invalid');
  });
}

/**
 * Returns the validation schema map from product config.
 *
 * @param {object} config
 * @returns {object}
 */
function getValidationSchema(config) {
  return config?.validation?.fields || {};
}

/**
 * Returns the validation rule for a field name.
 *
 * @param {object} config
 * @param {string} fieldName
 * @returns {object|null}
 */
function getFieldValidationRule(config, fieldName) {
  const schema = getValidationSchema(config);
  return schema?.[fieldName] || null;
}

/**
 * Returns a normalized field value.
 *
 * @param {HTMLElement|null} field
 * @returns {string}
 */
function getNormalizedFieldValue(field) {
  return String(field?.value || '').trim();
}

/**
 * Checks whether a restored or current city field is coherently validated.
 *
 * @param {HTMLInputElement} input
 * @param {object} state
 * @returns {boolean}
 */
function hasCoherentCitySelection(input, state) {
  const value = getNormalizedFieldValue(input);

  const placePayload = state?.city?.placePayload || null;
  const hasPlacePayload =
    Boolean(placePayload?.place_id) &&
    Number.isFinite(Number(placePayload?.lat)) &&
    Number.isFinite(Number(placePayload?.lng));

  const form = input?.form || null;
  const placeId = form?.elements?.namedItem?.('birth_place_place_id');
  const lat = form?.elements?.namedItem?.('birth_place_lat');
  const lng = form?.elements?.namedItem?.('birth_place_lng');

  const hasHiddenFields =
    Boolean(String(placeId?.value || '').trim()) &&
    Boolean(String(lat?.value || '').trim()) &&
    Boolean(String(lng?.value || '').trim());

  return Boolean(state?.city?.isValidated) && Boolean(value) && (hasPlacePayload || hasHiddenFields);
}

/**
 * Validates a generic required field using schema-driven messaging.
 *
 * @param {HTMLElement|null} field
 * @param {object|null} rule
 * @param {Function} t
 * @returns {boolean}
 */
function validateRequiredField(field, rule, t) {
  if (!field?.hasAttribute?.('required')) return true;
  if (field instanceof HTMLInputElement && field.type === 'hidden') return true;
  if (field.checkValidity()) {
    return clearFieldInvalid(field, rule?.errorId);
  }

  return markFieldInvalid(
    field,
    rule?.errorId,
    t(rule?.messageKey, rule?.fallbackMessage || 'por favor, preencha este campo.')
  );
}

/**
 * Runs the schema-defined validator for a field when available.
 *
 * @param {object} params
 * @param {HTMLElement} params.field
 * @param {object} params.state
 * @param {object} params.config
 * @param {Function} params.t
 * @returns {boolean}
 */
function validateFieldBySchema({
  field,
  state,
  config,
  t,
}) {
  const rule = getFieldValidationRule(config, field?.name);
  if (!rule) {
    return validateRequiredField(field, null, t);
  }

  switch (rule.type) {
    case 'email':
      return validateEmailInput(field, config, t);

    case 'full_name':
      return validateNameInput(field, config, t, rule);

    case 'birth_date':
      return validateDateInput(field, config, t);

    case 'birth_time':
      return validateTimeInput(field, config, t);

    case 'birth_place':
      return validateCityInput(field, state, config, t, rule);

    case 'privacy_checkbox':
      return validatePrivacyCheckbox(field, config, t);

    default:
      return validateRequiredField(field, rule, t);
  }
}

/**
 * Validates email input.
 *
 * @param {HTMLInputElement} input
 * @param {object} config
 * @param {Function} t
 * @returns {boolean}
 */
export function validateEmailInput(input, config, t) {
  const value = normalizeEmail(input?.value || '');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

  if (!value || !emailRegex.test(value)) {
    return markFieldInvalid(
      input,
      config.errorIds.email,
      t('errors.invalidEmail', 'por favor, insira um e-mail válido.')
    );
  }

  input.value = value;

  return clearFieldInvalid(input, config.errorIds.email);
}

/**
 * Validates full name input.
 *
 * @param {HTMLInputElement} input
 * @param {object} config
 * @param {Function} t
 * @returns {boolean}
 */
export function validateNameInput(input, config, t, rule = null) {
  const normalized = normalizePersonName(input?.value || '');
  const words = normalized
    .split(' ')
    .map((word) => word.trim())
    .filter(Boolean);

  const meaningfulWords = words.filter((word) => word.length >= 2);

  const minMeaningfulWords = Number(rule?.minMeaningfulWords || 2);
  const minTotalLength = Number(rule?.minTotalLength || 4);

  const isValid =
    normalized.length >= minTotalLength &&
    meaningfulWords.length >= minMeaningfulWords;

  if (!isValid) {
    return markFieldInvalid(
      input,
      config.errorIds.name,
      t(
        rule?.messageKey || 'errors.invalidName',
        rule?.fallbackMessage || 'por favor, preencha seu nome completo.'
      )
    );
  }

  input.value = normalized;

  return clearFieldInvalid(input, config.errorIds.name);
}

/**
 * Validates birth date input.
 *
 * @param {HTMLInputElement} input
 * @param {object} config
 * @param {Function} t
 * @returns {boolean}
 */
export function validateDateInput(input, config, t) {
  const value = String(input?.value || '');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return markFieldInvalid(
      input,
      config.errorIds.date,
      t('errors.invalidDate', 'por favor, insira uma data válida.')
    );
  }

  const minDate = '1700-01-01';
  const today = getLocalTodayISO();

  if (value < minDate) {
    return markFieldInvalid(
      input,
      config.errorIds.date,
      t('errors.dateTooEarly', 'a data não pode ser anterior a 1700.')
    );
  }

  if (value > today) {
    return markFieldInvalid(
      input,
      config.errorIds.date,
      t('errors.dateInFuture', 'a data não pode ser no futuro.')
    );
  }

  return clearFieldInvalid(input, config.errorIds.date);
}

/**
 * Validates birth time input.
 *
 * @param {HTMLInputElement} input
 * @param {object} config
 * @param {Function} t
 * @returns {boolean}
 */
export function validateTimeInput(input, config, t) {
  const value = String(input?.value || '');

  if (!isValidTimeString(value)) {
    return markFieldInvalid(
      input,
      config.errorIds.time,
      t('errors.invalidTime', 'por favor, insira um horário válido.')
    );
  }

  return clearFieldInvalid(input, config.errorIds.time);
}

/**
 * Validates city input based on Google Places selection.
 *
 * @param {HTMLInputElement} input
 * @param {object} state
 * @param {object} config
 * @param {Function} t
 * @returns {boolean}
 */
export function validateCityInput(input, state, config, t, rule = null) {
  if (!hasCoherentCitySelection(input, state)) {
    return markFieldInvalid(
      input,
      config.errorIds.city,
      t(
        rule?.messageKey || 'errors.invalidCity',
        rule?.fallbackMessage || 'por favor, selecione uma cidade válida da lista.'
      )
    );
  }

  return clearFieldInvalid(input, config.errorIds.city);
}

/**
 * Validates privacy checkbox.
 *
 * @param {HTMLInputElement} input
 * @param {object} config
 * @param {Function} t
 * @returns {boolean}
 */
export function validatePrivacyCheckbox(input, config, t) {
  if (!input?.checked) {
    showError(
      config.errorIds.privacy,
      t(
        'errors.privacyRequired',
        'você precisa concordar com a política de privacidade para continuar.'
      )
    );
    
    input.classList.add('invalid');
    input?.setAttribute('aria-invalid', 'true');

    return false;
  }

  hideError(config.errorIds.privacy);
  input.classList.remove('invalid');
  input?.removeAttribute('aria-invalid');

  return true;
}

/**
 * Validates all inputs inside a step container.
 *
 * @param {HTMLElement|null} stepElement
 * @param {object} state
 * @param {object} config
 * @param {Function} t
 * @returns {boolean}
 */
export function validateStepFields(stepElement, state, config, t) {
  if (!stepElement) return false;

  const fields = Array.from(
    stepElement.querySelectorAll('input, select, textarea')
  );

  let isValid = true;

  for (const field of fields) {
    if (!(field instanceof HTMLElement)) continue;
    if (!('name' in field)) continue;
    if (!field.name) continue;

    const fieldIsValid = validateFieldBySchema({
      field,
      state,
      config,
      t,
    });

    isValid = fieldIsValid && isValid;
  }

  return isValid;
}
