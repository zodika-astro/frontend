// src/products/birth-chart.config.js

/* ============================================================================
 * ZODIKA • Birth Chart Config
 * ----------------------------------------------------------------------------
 * Product-specific configuration for the Birth Chart form.
 *
 * Responsibilities
 * - Define product-specific settings outside core logic
 * - Centralize selectors, field mappings, endpoints, and timing values
 * - Keep product behavior configurable and reusable
 * ========================================================================== */

/**
 * Birth Chart form configuration.
 */
export const birthChartConfig = {
  productKey: 'birth_chart',
  locale: 'pt-BR',

  apiBaseUrl: 'https://backend-form-webflow-production.up.railway.app',

  endpoints: {
    formStart: '/forms/start',
    formUpdate: '/forms/update',
    formSubmit: '/forms/submit',
    formLinkRequest: '/forms/link-request',
    checkoutSubmit: '/birthchart/birthchartsubmit-form',
  },

  selectors: {
    appRoot: '.natal-app',
    form: '#natalForm',
    steps: '.natal-step',
    progressSteps: '.progress-step',
    spinnerOverlay: '#spinner',
    errorOverlay: '#errorMessage',
    cityInput: '#cityInput',
    privacyCheckbox: '#privacyCheck',
    confirmationSummary: '#confirmation-summary',
  },

  fields: {
    email: 'email',
    fullName: 'name',
    birthDate: 'birth_date',
    birthTime: 'birth_time',
    birthPlace: 'birth_place',
    privacyAgreed: 'privacy_agreed',
  },

  hiddenFields: {
    placeId: 'birth_place_place_id',
    fullAddress: 'birth_place_full',
    country: 'birth_place_country',
    admin1: 'birth_place_admin1',
    admin2: 'birth_place_admin2',
    lat: 'birth_place_lat',
    lng: 'birth_place_lng',
    json: 'birth_place_json',
  },

  errorIds: {
    email: 'emailError',
    name: 'nameError',
    date: 'dateError',
    time: 'timeError',
    city: 'cityError',
    privacy: 'privacyError',
  },

  stepKeys: [
    'email',
    'name',
    'birth_date',
    'birth_time',
    'birth_place',
    'confirmation',
  ],

  tracking: {
    formType: 'birth_chart',
    sessionInactiveCode: 'SESSION_NOT_ACTIVE',
    debounceMs: 900,
  },

  timeouts: {
    formStart: 8000,
    formUpdate: 5000,
    formSubmit: 8000,
    checkoutSubmit: 20000,
  },

  confirmationFields: [
    { key: 'email', labelKey: 'confirmation.email' },
    { key: 'name', labelKey: 'confirmation.name' },
    { key: 'birth_date', labelKey: 'confirmation.birthDate' },
    { key: 'birth_time', labelKey: 'confirmation.birthTime' },
    { key: 'birth_place', labelKey: 'confirmation.birthPlace' },
  ],

  integrations: {
    usesGooglePlaces: true,
  },
};
