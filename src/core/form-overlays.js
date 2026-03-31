// src/core/form-overlays.js

/* ============================================================================
 * ZODIKA • Form Overlays
 * ----------------------------------------------------------------------------
 * Overlay management for loading, error, and session states.
 *
 * Responsibilities
 * - Open and close overlay dialogs
 * - Trap focus inside overlays for accessibility
 * - Restore focus after closing overlays
 * - Handle session expiration messaging
 * ========================================================================== */

/**
 * Focuses the first interactive element inside a container.
 *
 * @param {HTMLElement|null} rootElement
 */
function focusFirstInteractive(rootElement) {
  if (!rootElement) return;

  const selectors = [
    'input:not([type="hidden"]):not([disabled])',
    'button:not([disabled])',
    'a[href]',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];

  for (const selector of selectors) {
    const target = rootElement.querySelector(selector);
    if (target) {
      target.focus({ preventScroll: true });
      return;
    }
  }
}

/**
 * Locks background page scroll while a modal overlay is open.
 */
function lockBodyScroll() {
  document.body.dataset.zdkOverlayScrollLock = 'true';
  document.body.style.overflow = 'hidden';
}

/**
 * Restores background page scroll after modal overlays close.
 */
function unlockBodyScroll() {
  delete document.body.dataset.zdkOverlayScrollLock;
  document.body.style.overflow = '';
}

/**
 * Returns whether any overlay is currently open.
 *
 * @returns {boolean}
 */
function hasOpenOverlay() {
  return Array.from(document.querySelectorAll('.overlay')).some(
    (element) => element instanceof HTMLElement && element.style.display !== 'none'
  );
}

/**
 * Opens an overlay and traps focus inside it.
 *
 * @param {object} params
 * @param {HTMLElement|null} params.overlayElement
 * @param {object} params.state
 */
export function openOverlay({ overlayElement, state }) {
  if (!overlayElement || !state?.ui) return;

  state.ui.lastFocusedBeforeOverlay = document.activeElement;

  lockBodyScroll();

  overlayElement.style.display = 'flex';

  function trapTabKey(event) {
    if (event.key !== 'Tab') return;

    const focusables = Array.from(
      overlayElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.hasAttribute('disabled'));

    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  overlayElement.addEventListener('keydown', trapTabKey);
  overlayElement._zdkTrapHandler = trapTabKey;

  requestAnimationFrame(() => {
    focusFirstInteractive(overlayElement);
  });
}

/**
 * Closes an overlay and restores focus.
 *
 * @param {object} params
 * @param {HTMLElement|null} params.overlayElement
 * @param {object} params.state
 */

export function closeOverlay({ overlayElement, state }) {
  if (!overlayElement) return;

  overlayElement.style.display = 'none';

  if (overlayElement._zdkTrapHandler) {
    overlayElement.removeEventListener(
      'keydown',
      overlayElement._zdkTrapHandler
    );
    overlayElement._zdkTrapHandler = null;
  }

  if (!hasOpenOverlay()) {
    unlockBodyScroll();
  }

  const previousFocus = state?.ui?.lastFocusedBeforeOverlay;

  if (previousFocus && typeof previousFocus.focus === 'function') {
    previousFocus.focus();
  }
}

/**
 * Sets session expired content in the error overlay.
 *
 * @param {object} params
 * @param {HTMLElement|null} params.errorOverlay
 * @param {Function} params.t
 */
export function setSessionExpiredOverlayContent({ errorOverlay, t }) {
  if (!errorOverlay) return;

  const heading = errorOverlay.querySelector('#error-overlay-title');
  const paragraph = errorOverlay.querySelector('#error-overlay-text');

  if (heading) {
    heading.textContent = t(
      'overlays.sessionExpiredTitle',
      'sua sessão expirou'
    );
  }

  if (paragraph) {
    paragraph.textContent = t(
      'overlays.sessionExpiredBody',
      'por segurança, esta sessão do formulário não está mais ativa. por favor, comece novamente.'
    );
  }
}

/**
 * Restores the default generic error overlay content.
 *
 * @param {object} params
 * @param {HTMLElement|null} params.errorOverlay
 * @param {Function} params.t
 */
export function restoreDefaultErrorOverlayContent({ errorOverlay, t }) {
  if (!errorOverlay) return;

  const heading = errorOverlay.querySelector('#error-overlay-title');
  const paragraph = errorOverlay.querySelector('#error-overlay-text');

  if (heading) {
    heading.textContent = t(
      'overlays.errorTitle',
      'ops... algo deu errado.'
    );
  }

  if (paragraph) {
    paragraph.textContent = t(
      'overlays.errorBody',
      'você quer tentar novamente? clique no botão abaixo ou envie um e-mail para: info@zodika.com.br'
    );
  }
}

/**
 * Shows the session expired overlay.
 *
 * @param {object} params
 * @param {HTMLElement|null} params.spinnerOverlay
 * @param {HTMLElement|null} params.errorOverlay
 * @param {object} params.state
 * @param {Function} params.t
 */
export function showSessionExpiredOverlay({
  spinnerOverlay,
  errorOverlay,
  state,
  t,
}) {
  closeOverlay({ overlayElement: spinnerOverlay, state });

  setSessionExpiredOverlayContent({ errorOverlay, t });

  openOverlay({ overlayElement: errorOverlay, state });
}
