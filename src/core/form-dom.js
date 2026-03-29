// src/core/form-dom.js

/* ============================================================================
 * ZODIKA • Form DOM
 * ----------------------------------------------------------------------------
 * DOM resolution and helpers for form elements.
 *
 * Responsibilities
 * - Resolve DOM references using selectors
 * - Provide safe access helpers for inputs and elements
 * - Centralize DOM querying logic
 * ========================================================================== */

/**
 * Resolves all required DOM elements based on selectors.
 *
 * @param {object} selectors
 * @returns {object}
 */
export function resolveDom(selectors) {
  const form = document.querySelector(selectors.form);
  const formScope = form || document;

  return {
    appRoot: document.querySelector(selectors.appRoot),
    form,
    steps: Array.from(formScope.querySelectorAll(selectors.steps)),
    progressSteps: Array.from(
      document.querySelectorAll(selectors.progressSteps)
    ),
    spinnerOverlay: document.querySelector(selectors.spinnerOverlay),
    errorOverlay: document.querySelector(selectors.errorOverlay),
    cityInput: document.querySelector(selectors.cityInput),
    privacyCheckbox: document.querySelector(selectors.privacyCheckbox),
    confirmationSummary: document.querySelector(
      selectors.confirmationSummary
    ),
  };
}

/**
 * Checks if the minimum required DOM structure is present.
 *
 * @param {object} dom
 * @returns {boolean}
 */
export function hasRequiredDom(dom) {
  return Boolean(
    dom?.form &&
      Array.isArray(dom?.steps) &&
      dom.steps.length > 0
  );
}

/**
 * Returns an input element by its name attribute.
 *
 * @param {HTMLFormElement} form
 * @param {string} name
 * @returns {HTMLInputElement|null}
 */
export function getNamedInput(form, name) {
  if (!form || !name) return null;
  return form.querySelector(`[name="${name}"]`);
}

/**
 * Sets the value of an element by ID.
 *
 * @param {string} id
 * @param {string} value
 */
export function setElementValueById(id, value) {
  if (!id) return;

  const element = document.getElementById(id);
  if (!element) return;

  element.value = value ?? '';
}

/**
 * Clears values of multiple elements by ID.
 *
 * @param {string[]} ids
 */
export function clearElementValuesById(ids) {
  if (!Array.isArray(ids)) return;

  ids.forEach((id) => {
    setElementValueById(id, '');
  });
}

/**
 * Returns the list of hidden field IDs used for place data.
 *
 * @param {object} config
 * @returns {string[]}
 */
export function getPlaceHiddenFieldIds(config) {
  if (!config?.hiddenFields) return [];

  return [
    config.hiddenFields.placeId,
    config.hiddenFields.fullAddress,
    config.hiddenFields.country,
    config.hiddenFields.admin1,
    config.hiddenFields.admin2,
    config.hiddenFields.lat,
    config.hiddenFields.lng,
    config.hiddenFields.json,
  ].filter(Boolean);
}
