// products/birth-chart.config.js

/* ============================================================================
 * ZODIKA • Birth Chart Product Config
 * ----------------------------------------------------------------------------
 * Product-specific configuration for the Birth Chart form.
 *
 * Phase 1 goals
 * - Keep ALL product differences here (not in core logic)
 * - Preserve backend contract (DO NOT rename payload keys or endpoints)
 * - Enable easy duplication for new products (e.g. solar return)
 * ========================================================================== */

/**
 * Birth Chart form configuration
 *
 * NOTE:
 * - Endpoints and payload-related keys MUST match current backend contract
 * - Selectors still reflect current Webflow HTML (Phase 1 compatibility)
 */
export const birthChartConfig = {
  /* ------------------------------------------------------------------------
   * Identity
   * ---------------------------------------------------------------------- */
  productKey: 'birth_chart',
  locale: 'pt-BR',

  /* ------------------------------------------------------------------------
   * Backend (DO NOT CHANGE in Phase 1)
   * ---------------------------------------------------------------------- */
  apiBaseUrl: 'https://backend-form-webflow-production.up.railway.app',

  endpoints: {
    formStart: '/forms/start',
    formUpdate: '/forms/update',
    formSubmit: '/forms/submit',
    formLinkRequest: '/forms/link-request',
    checkoutSubmit: '/birthchart/birthchartsubmit-form',
  },

  /* ------------------------------------------------------------------------
   * Selectors (current Webflow structure)
   * ---------------------------------------------------------------------- */
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

  /* ------------------------------------------------------------------------
   * Field mapping (DO NOT CHANGE names — backend contract)
   * ---------------------------------------------------------------------- */
  fields: {
    email: 'email',
    fullName: 'name',
    birthDate: 'birth_date',
    birthTime: 'birth_time',
    birthPlace: 'birth_place',
    privacyAgreed: 'privacy_agreed',
  },

  /* Hidden fields populated by Google Places */
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

  /* ------------------------------------------------------------------------
   * Error element IDs (UI only)
   * ---------------------------------------------------------------------- */
  errorIds: {
    email: 'emailError',
    name: 'nameError',
    date: 'dateError',
    time: 'timeError',
    city: 'cityError',
    privacy: 'privacyError',
  },

  /* ------------------------------------------------------------------------
   * Steps
   * ---------------------------------------------------------------------- */
  stepKeys: [
    'email',
    'name',
    'birth_date',
    'birth_time',
    'birth_place',
    'confirmation',
  ],

  /* ------------------------------------------------------------------------
   * Tracking (UNIVERSAL BACKEND CONTRACT)
   * ---------------------------------------------------------------------- */
  tracking: {
    formType: 'birth_chart', // sent to backend (DO NOT CHANGE now)
    sessionInactiveCode: 'SESSION_NOT_ACTIVE',
    debounceMs: 900,
  },

  /* ------------------------------------------------------------------------
   * Timeouts
   * ---------------------------------------------------------------------- */
  timeouts: {
    formStart: 8000,
    formUpdate: 5000,
    formSubmit: 8000,
    checkoutSubmit: 20000,
  },

  /* ------------------------------------------------------------------------
   * Confirmation summary mapping
   * ---------------------------------------------------------------------- */
  confirmationFields: [
    { key: 'email', labelKey: 'confirmation.email' },
    { key: 'name', labelKey: 'confirmation.name' },
    { key: 'birth_date', labelKey: 'confirmation.birthDate' },
    { key: 'birth_time', labelKey: 'confirmation.birthTime' },
    { key: 'birth_place', labelKey: 'confirmation.birthPlace' },
  ],

  /* ------------------------------------------------------------------------
   * Integrations
   * ---------------------------------------------------------------------- */
  integrations: {
    usesGooglePlaces: true,
  },
};
