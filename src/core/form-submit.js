// src/core/form-submit.js

/* ============================================================================
 * ZODIKA • Form Submit
 * ----------------------------------------------------------------------------
 * Checkout payload builder and submission helpers.
 *
 * Responsibilities
 * - Build checkout payload preserving backend contract
 * - Submit checkout request
 * - Handle redirect logic
 * ========================================================================== */

import { postJson } from './form-utils.js';

/**
 * Builds the checkout payload using the current form data.
 *
 * @param {HTMLFormElement} form
 * @param {object} state
 * @param {object} config
 * @returns {object}
 */
export function buildCheckoutPayload(form, state, config) {
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  payload.birth_place =
    state?.city?.selectedDisplay ||
    payload.birth_place ||
    '';

  payload.product_type = config.tracking.formType;

  payload.privacyConsent = true;
  payload.privacy_agreed = true;
  payload.privacy_policy = 'on';

  payload.form_session_token =
    state?.session?.token || null;

  return payload;
}

/**
 * Sends the checkout request to the backend.
 *
 * @param {object} params
 * @param {HTMLFormElement} params.form
 * @param {object} params.state
 * @param {object} params.config
 * @param {object} params.apiUrls
 * @returns {Promise<object>}
 */
export async function submitCheckoutRequest({
  form,
  state,
  config,
  apiUrls,
}) {
  const payload = buildCheckoutPayload(form, state, config);

  return postJson(
    apiUrls.checkoutSubmit,
    payload,
    config.timeouts.checkoutSubmit
  );
}

/**
 * Redirects the user to the checkout URL.
 *
 * @param {string} url
 */
export function redirectToCheckoutUrl(url) {
  window.location.href = url;
}

/**
 * Checks if the backend response contains a redirect URL.
 *
 * @param {object} responseData
 * @returns {boolean}
 */
export function hasCheckoutRedirectUrl(responseData) {
  return Boolean(responseData?.url);
}
