// src/core/form-overlays.js

/* ============================================================================
 * ZODIKA • Form Overlays
 * ----------------------------------------------------------------------------
 * Overlay open/close helpers and focus management for the universal product
 * form app.
 *
 * Responsibilities
 * - Control loading and error overlays
 * - Manage focus when overlays open and close
 * - Keep overlay behavior isolated from submit and tracking logic
 * ========================================================================== */

/**
 * Focuses the first interactive element inside a container.
 *
 * @param {HTMLElement|null} rootElement
 */
export function focusFirstInteractive(rootElement) {
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
 * Opens an overlay and traps keyboard focus inside it.
 *
 * @param {object} params
 * @param {HTMLElement|null} params.overlayElement
 * @param {object} params.state
 */
export function openOverlay({ overlayElement, state }) {
  if (!overlayElement || !state?.ui) return;

  state.ui.lastFocusedBeforeOverlay = document.activeElement;
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
 * Closes an overlay and restores focus to the previously focused element.
 *
 * @param {object} params
 * @param {HTMLElement|null} params.overlayElement
 * @param {object} params.state
 */
export function closeOverlay({ overlayElement, state }) {
  if (!overlayElement) return;

  overlayElement.style.display = 'none';

  if (overlayElement._zdkTrapHandler) {
    overlayElement.removeEventListener('keydown', overlayElement._zdkTrapHandler);
    overlayElement._zdkTrapHandler = null;
  }

  const previousFocus = state?.ui?.lastFocusedBeforeOverlay;
  if (previousFocus && typeof previousFocus.focus === 'function') {
    previousFocus.focus();
  }
}

/**
 * Updates the error overlay content for an inactive session state.
 *
 * @param {object} params
 * @param {HTMLElement|null} params.errorOverlay
 * @param {Function} params.t
 */
export function setSessionExpiredOverlayContent({ errorOverlay, t }) {
  if (!errorOverlay) return;

  const heading = errorOverlay.querySelector('h2');
  const paragraph = errorOverlay.querySelector('p');

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
 * Closes the loading overlay, updates the error overlay content for an inactive
 * session, and opens the error overlay.
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
