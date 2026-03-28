// src/core/form-dom.js

/* ============================================================================
 * ZODIKA • Form DOM
 * ----------------------------------------------------------------------------
 * DOM querying and element resolution helpers for the universal product form
 * app.
 *
 * Phase 1 goals
 * - Centralize DOM lookup logic
 * - Reduce scattered selectors across modules
 * - Prepare the app for future multi-product and multi-form support
 * - Keep backend contract untouched (DOM structure is front-end only)
 * ========================================================================== */

/**
 * Resolves the DOM elements required by the form app.
 *
 * Current behavior:
 * - Preserves compatibility with the current production HTML structure
 * - Uses the configured selectors exactly as provided
 *
 * Future evolution:
 * - Can be extended later to support container-scoped queries and data-role
 *   selectors for more reusable templates
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
    progressSteps: Array.from(document.querySelectorAll(selectors.progressSteps)),
    spinnerOverlay: document.querySelector(selectors.spinnerOverlay),
    errorOverlay: document.querySelector(selectors.errorOverlay),
    cityInput: document.querySelector(selectors.cityInput),
    privacyCheckbox: document.querySelector(selectors.privacyCheckbox),
    confirmationSummary: document.querySelector(selectors.confirmationSummary),
  };
}

/**
 * Returns true when the minimum required DOM structure exists.
 *
 * This should be used by the app bootstrap layer before binding events.
 *
 * @param {object} dom
 * @returns {boolean}
 */
export function hasRequiredDom(dom) {
  return Boolean(dom?.form && Array.isArray(dom?.steps) && dom.steps.length > 0);
}

/**
 * Returns a named input inside the resolved form.
 *
 * @param {HTMLFormElement|null} form
 * @param {string} fieldName
 * @returns {HTMLInputElement|null}
 */
export function getNamedInput(form, fieldName) {
  if (!form || !fieldName) return null;
  return form.querySelector(`input[name="${fieldName}"]`);
}

/**
 * Returns a named select inside the resolved form.
 *
 * @param {HTMLFormElement|null} form
 * @param {string} fieldName
 * @returns {HTMLSelectElement|null}
 */
export function getNamedSelect(form, fieldName) {
  if (!form || !fieldName) return null;
  return form.querySelector(`select[name="${fieldName}"]`);
}

/**
 * Returns any named field inside the resolved form.
 *
 * @param {HTMLFormElement|null} form
 * @param {string} fieldName
 * @returns {HTMLElement|null}
 */
export function getNamedField(form, fieldName) {
  if (!form || !fieldName) return null;
  return form.querySelector(`[name="${fieldName}"]`);
}

/**
 * Returns an element by ID safely.
 *
 * @param {string} elementId
 * @returns {HTMLElement|null}
 */
export function getElementByIdSafe(elementId) {
  if (!elementId) return null;
  return document.getElementById(elementId);
}

/**
 * Sets the value of an element identified by ID if the element exists.
 *
 * Useful for hidden inputs populated by integrations such as Google Places.
 *
 * @param {string} elementId
 * @param {string} value
 */
export function setElementValueById(elementId, value) {
  const element = getElementByIdSafe(elementId);
  if (element) {
    element.value = value;
  }
}

/**
 * Clears a list of element values by ID.
 *
 * @param {string[]} elementIds
 */
export function clearElementValuesById(elementIds) {
  if (!Array.isArray(elementIds)) return;

  elementIds.forEach((elementId) => {
    const element = getElementByIdSafe(elementId);
    if (element) {
      element.value = '';
    }
  });
}

/**
 * Returns all hidden place-related field IDs from config in a stable array.
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
