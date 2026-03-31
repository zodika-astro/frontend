// src/products/birth-chart.config.js

/* ============================================================================
 * ZODIKA • Birth Chart Product Configuration
 * ----------------------------------------------------------------------------
 * Product-specific configuration for the Birth Chart form.
 *
 * Responsibilities
 * - Define product identity and locale
 * - Define backend API endpoints
 * - Define DOM selectors
 * - Define form field names and hidden fields
 * - Define error mapping and step keys
 * - Define tracking and timeout settings
 * ========================================================================== */

const birthChartConfig = {
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
    appRoot: '.form-app',
    form: '#natalForm',
    steps: '.form-step',
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

    validation: {
    fields: {
      email: {
        type: 'email',
        errorId: 'emailError',
        messageKey: 'errors.invalidEmail',
        fallbackMessage: 'por favor, insira um e-mail válido.',
      },
      name: {
        type: 'full_name',
        errorId: 'nameError',
        minMeaningfulWords: 2,
        minTotalLength: 4,
        messageKey: 'errors.invalidName',
        fallbackMessage: 'por favor, preencha seu nome completo.',
      },
      birth_date: {
        type: 'birth_date',
        errorId: 'dateError',
        messageKey: 'errors.invalidDate',
        fallbackMessage: 'por favor, insira uma data válida.',
      },
      birth_time: {
        type: 'birth_time',
        errorId: 'timeError',
        messageKey: 'errors.invalidTime',
        fallbackMessage: 'por favor, insira um horário válido.',
      },
      birth_place: {
        type: 'birth_place',
        errorId: 'cityError',
        messageKey: 'errors.invalidCity',
        fallbackMessage: 'por favor, selecione uma cidade válida da lista.',
      },
      privacy_agreed: {
        type: 'privacy_checkbox',
        errorId: 'privacyError',
        messageKey: 'errors.privacyRequired',
        fallbackMessage: 'você precisa concordar com a política de privacidade para continuar.',
      },
    },
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
    sessionInactivityWindowMs: 2 * 60 * 60 * 1000,
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

export default birthChartConfig;
