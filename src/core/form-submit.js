// src/core/form-submit.js

/* ============================================================================
 * ZODIKA • Form Submit
 * ----------------------------------------------------------------------------
 * Checkout payload creation and submit helpers for the universal product form
 * app.
 *
 * Responsibilities
 * - Build checkout payload from current form state
 * - Submit data to the product checkout endpoint
 * - Handle redirect to payment flow
 * ========================================================================== */

import { postJson } from './form-utils.js';

/**
 * Builds the checkout payload from the current form values.
 *
 * The payload structure must match the backend expectations exactly.
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
    state?.city?.selectedDisplay || payload.birth_place || '';

  payload.product_type = config.tracking.formType;

  payload.privacyConsent = true;
  payload.privacy_agreed = true;
  payload.privacy_policy = 'on';

  payload.form_session_token = state?.session?.token || null;

  return payload;
}

/**
 * Sends the checkout request to the configured endpoint.
 *
 * @param {object} params
 * @param {HTMLFormElement} params.form
 * @param {object} params.state
 * @param {object} params.config
 * @param {object} params.apiUrls
 * @returns {Promise<object|null>}
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
 * Redirects the browser to the checkout/payment URL.
 *
 * @param {string} url
 */
export function redirectToCheckoutUrl(url) {
  window.location.href = url;
}

/**
 * Returns whether the checkout response contains a valid redirect URL.
 *
 * @param {object|null} responseData
 * @returns {boolean}
 */
export function hasCheckoutRedirectUrl(responseData) {
  return Boolean(responseData?.url);
}
