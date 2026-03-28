// src/core/form-validation.js

/* ============================================================================
 * ZODIKA • Form Validation
 * ----------------------------------------------------------------------------
 * Input and step validation helpers for the universal product form app.
 *
 * Responsibilities
 * - Validate individual inputs and step-level form state
 * - Manage inline error visibility and invalid field state
 * - Keep validation logic isolated from navigation and submit flows
 * ========================================================================== */

import {
  getLocalTodayISO,
  normalizeEmail,
  normalizePersonName,
  isValidTimeString,
} from './form-utils.js';

/**
 * Sets the visible text inside an error container.
 *
 * @param {HTMLElement|null} container
 * @param {string} message
 */
export function setErrorText(container, message) {
  if (!container) return;

  const explicitTextNode = container.querySelector('[id$="Text"]');
  if (explicitTextNode) {
    explicitTextNode.textContent = message;
    return;
  }

  container.textContent = message;
}

/**
 * Shows an error container and updates its message.
 *
 * @param {string} errorId
 * @param {string} message
 */
export function showError(errorId, message) {
  const element = document.getElementById(errorId);
  if (!element) return;

  if (typeof message === 'string') {
    setErrorText(element, message);
  }

  element.style.display = 'block';
  element.setAttribute('role', 'alert');
  element.setAttribute('aria-live', 'polite');
}

/**
 * Hides an error container.
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
 * Marks a field as invalid and optionally shows an associated error message.
 *
 * @param {HTMLElement|null} field
 * @param {string|null} errorId
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
 * Clears the invalid state for a field and its associated error container.
 *
 * @param {HTMLElement|null} field
 * @param {string|null} errorId
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
 * Validates the email input field.
 *
 * @param {HTMLInputElement|null} input
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
 * Validates the full name input field.
 *
 * @param {HTMLInputElement|null} input
 * @param {object} config
 * @param {Function} t
 * @returns {boolean}
 */
export function validateNameInput(input, config, t) {
  const normalized = normalizePersonName(input?.value || '');
  const words = normalized.split(' ').filter(Boolean);

  const isValid =
    normalized.length >= 6 &&
    words.length >= 2 &&
    words.slice(0, 2).every((word) => word.length >= 2);

  if (!isValid) {
    return markFieldInvalid(
      input,
      config.errorIds.name,
      t('errors.invalidName', 'por favor, preencha seu nome completo.')
    );
  }

  input.value = normalized;
  return clearFieldInvalid(input, config.errorIds.name);
}

/**
 * Validates the birth date input field.
 *
 * @param {HTMLInputElement|null} input
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
 * Validates the birth time input field.
 *
 * @param {HTMLInputElement|null} input
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
 * Validates the birth place input using the current city-selection state.
 *
 * @param {HTMLInputElement|null} input
 * @param {object} state
 * @param {object} config
 * @param {Function} t
 * @returns {boolean}
 */
export function validateCityInput(input, state, config, t) {
  if (!state?.city?.isValidated) {
    return markFieldInvalid(
      input,
      config.errorIds.city,
      t('errors.invalidCity', 'por favor, selecione uma cidade válida da lista.')
    );
  }

  return clearFieldInvalid(input, config.errorIds.city);
}

/**
 * Validates the privacy consent checkbox.
 *
 * @param {HTMLInputElement|null} input
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

    input?.setAttribute('aria-invalid', 'true');
    return false;
  }

  hideError(config.errorIds.privacy);
  input?.removeAttribute('aria-invalid');
  return true;
}

/**
 * Validates all relevant fields inside a given step element.
 *
 * @param {HTMLElement|null} stepElement
 * @param {object} state
 * @param {object} config
 * @param {Function} t
 * @returns {boolean}
 */
export function validateStepFields(stepElement, state, config, t) {
  if (!stepElement) return false;

  const inputs = Array.from(stepElement.querySelectorAll('input'));
  const selects = Array.from(stepElement.querySelectorAll('select'));
  let isValid = true;

  for (const input of inputs) {
    const { name, required, type } = input;

    if (name === config.fields.email) {
      isValid = validateEmailInput(input, config, t) && isValid;
    }

    if (name === config.fields.fullName) {
      isValid = validateNameInput(input, config, t) && isValid;
    }

    if (name === config.fields.birthDate) {
      isValid = validateDateInput(input, config, t) && isValid;
    }

    if (name === config.fields.birthTime) {
      isValid = validateTimeInput(input, config, t) && isValid;
    }

    if (name === config.fields.birthPlace) {
      isValid = validateCityInput(input, state, config, t) && isValid;
    }

    if (required && type !== 'hidden' && !input.checkValidity()) {
      input.classList.add('invalid');
      input.setAttribute('aria-invalid', 'true');
      isValid = false;
    }
  }

  for (const select of selects) {
    if (select.required && !select.checkValidity()) {
      select.classList.add('invalid');
      select.setAttribute('aria-invalid', 'true');
      isValid = false;
    }
  }

  return isValid;
}

/**
 * Clears all configured form error containers.
 *
 * @param {object} config
 */
export function clearAllErrors(config) {
  Object.values(config.errorIds || {}).forEach(hideError);
}

/**
 * Clears invalid styling and aria-invalid attributes inside a form element.
 *
 * @param {HTMLFormElement|null} form
 */
export function clearAllInvalidStates(form) {
  if (!form) return;

  form.querySelectorAll('.invalid').forEach((element) => {
    element.classList.remove('invalid');
  });

  form.querySelectorAll('[aria-invalid="true"]').forEach((element) => {
    element.removeAttribute('aria-invalid');
  });
}
