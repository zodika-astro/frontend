// i18n/messages.js

/* ============================================================================
 * ZODIKA • i18n Messages
 * ----------------------------------------------------------------------------
 * Centralized dictionary for UI text and validation messages.
 *
 * Phase 1 goals
 * - Keep ALL user-facing text out of business logic
 * - Support multiple languages (pt-BR, en-US)
 * - Allow future expansion without touching core modules
 * - Preserve backend contract (this is purely front-end)
 * ========================================================================== */

/**
 * Default message dictionary.
 * You can extend/override this via window.ZDK_FORM_MESSAGES later.
 */
export const messages = {
  'pt-BR': {
    buttons: {
      next: 'próximo',
      back: 'voltar',
      confirmAndPay: 'confirmar e pagar',
      tryAgain: 'tentar novamente',
    },

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
    buttons: {
      next: 'next',
      back: 'back',
      confirmAndPay: 'confirm and pay',
      tryAgain: 'try again',
    },

    errors: {
      invalidEmail: 'please enter a valid email address.',
      invalidName: 'please enter your full name.',
      invalidDate: 'please enter a valid date.',
      dateTooEarly: 'the date cannot be earlier than 1700.',
      dateInFuture: 'the date cannot be in the future.',
      invalidTime: 'please enter a valid time.',
      invalidCity: 'please select a valid city from the list.',
      privacyRequired:
        'you must agree to the privacy policy to continue.',
      startSessionFailed:
        'we could not start your session right now. please try again.',
      checkoutUrlMissing: 'Payment URL not received.',
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

/* ============================================================================
 * Message Resolver
 * ----------------------------------------------------------------------------
 * Helper to safely retrieve nested messages
 * ========================================================================== */

/**
 * Creates a translator function for a given locale.
 *
 * Usage:
 * const t = createTranslator(messages, 'pt-BR')
 * t('errors.invalidEmail')
 *
 * @param {object} messagesDict
 * @param {string} locale
 * @returns {(path: string, fallback?: string) => string}
 */
export function createTranslator(messagesDict, locale = 'pt-BR') {
  const dictionary =
    messagesDict?.[locale] ||
    messagesDict?.['pt-BR'] ||
    {};

  return function t(path, fallback = '') {
    if (!path) return fallback;

    const value = path
      .split('.')
      .reduce((acc, key) => {
        if (acc && key in acc) return acc[key];
        return undefined;
      }, dictionary);

    return value == null ? fallback : value;
  };
}
