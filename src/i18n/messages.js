// src/i18n/messages.js

/* ============================================================================
 * ZODIKA • Messages
 * ----------------------------------------------------------------------------
 * Centralized message dictionary and translation helper.
 *
 * Responsibilities
 * - Store UI and validation messages
 * - Provide a simple translation resolver
 * ========================================================================== */

export const messages = {
  'pt-BR': {
    errors: {
      invalidEmail: 'por favor, insira um e-mail válido.',
      invalidName: 'por favor, preencha seu nome completo.',
      invalidDate: 'por favor, insira uma data válida.',
      dateTooEarly: 'a data não pode ser anterior a 1700.',
      dateInFuture: 'a data não pode ser no futuro.',
      invalidTime: 'por favor, insira um horário válido.',
      invalidCity: 'por favor, selecione uma cidade válida da lista.',
      privacyRequired:
        'você precisa concordar com a política de privacidade para continuar.',
      startSessionFailed:
        'não foi possível iniciar sua sessão agora. tente novamente.',
      checkoutUrlMissing: 'URL de pagamento não recebida.',
    },

    overlays: {
      sessionExpiredTitle: 'sua sessão expirou',
      sessionExpiredBody:
        'por segurança, esta sessão do formulário não está mais ativa. por favor, comece novamente.',
    },

    confirmation: {
      email: 'e-mail',
      name: 'nome',
      birthDate: 'data de nascimento',
      birthTime: 'hora de nascimento',
      birthPlace: 'cidade de nascimento',
      notProvided: '(não informado)',
    },
  },

  'en-US': {
    errors: {
      invalidEmail: 'please enter a valid email address.',
      invalidName: 'please enter your full name.',
      invalidDate: 'please enter a valid date.',
      dateTooEarly: 'date cannot be earlier than 1700.',
      dateInFuture: 'date cannot be in the future.',
      invalidTime: 'please enter a valid time.',
      invalidCity: 'please select a valid city from the list.',
      privacyRequired:
        'you must agree to the privacy policy to continue.',
      startSessionFailed:
        'we could not start your session. please try again.',
      checkoutUrlMissing: 'payment URL not received.',
    },

    overlays: {
      sessionExpiredTitle: 'your session has expired',
      sessionExpiredBody:
        'for security reasons, this form session is no longer active. please start again.',
    },

    confirmation: {
      email: 'email',
      name: 'name',
      birthDate: 'birth date',
      birthTime: 'birth time',
      birthPlace: 'birth city',
      notProvided: '(not provided)',
    },
  },
};

/**
 * Creates a translation function for a given locale.
 *
 * @param {object} dictionary
 * @param {string} locale
 * @returns {(key: string, fallback?: string) => string}
 */
export function createTranslator(dictionary, locale) {
  const lang = dictionary?.[locale] || {};

  return function t(key, fallback = '') {
    if (!key) return fallback;

    const parts = key.split('.');
    let value = lang;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return fallback || key;
      }
    }

    return typeof value === 'string' ? value : fallback || key;
  };
}
