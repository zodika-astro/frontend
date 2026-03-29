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

    input?.setAttribute('aria-invalid', 'true');

    return false;
  }

  hideError(config.errorIds.privacy);
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
