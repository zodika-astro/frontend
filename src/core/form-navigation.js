// src/core/form-navigation.js

/* ============================================================================
 * ZODIKA • Form Navigation
 * ----------------------------------------------------------------------------
 * Step rendering, progress UI, and navigation helpers for the universal
 * product form app.
 *
 * Responsibilities
 * - Render the active step
 * - Update progress state and progress UI
 * - Keep step navigation isolated from tracking and submit logic
 * ========================================================================== */

/**
 * Returns the configured step key for a given index.
 *
 * @param {object} config
 * @param {number} index
 * @returns {string}
 */
export function getStepKeyByIndex(config, index) {
  return config?.stepKeys?.[index] || `step_${index}`;
}

/**
 * Returns the current active step element.
 *
 * @param {object} dom
 * @param {object} state
 * @returns {HTMLElement|null}
 */
export function getCurrentStepElement(dom, state) {
  return dom?.steps?.[state?.ui?.currentStepIndex] || null;
}

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
 * Updates the visual progress UI based on the current step index.
 *
 * @param {object} dom
 * @param {object} state
 */
export function updateProgressUI(dom, state) {
  if (!dom?.progressSteps?.length) return;

  dom.progressSteps.forEach((element, index) => {
    const isActive = index <= state.ui.currentStepIndex;
    element.classList.toggle('active', isActive);
    element.setAttribute(
      'aria-current',
      index === state.ui.currentStepIndex ? 'step' : 'false'
    );
  });
}

/**
 * Renders the requested step and updates visibility state.
 *
 * @param {object} params
 * @param {object} params.dom
 * @param {object} params.state
 * @param {number} params.index
 * @param {Function} [params.onAfterShowStep]
 */
export function showStep({ dom, state, index, onAfterShowStep }) {
  if (!dom?.steps?.length || !state?.ui) return;

  const boundedIndex = Math.max(0, Math.min(index, dom.steps.length - 1));
  state.ui.currentStepIndex = boundedIndex;

  dom.steps.forEach((stepElement, stepIndex) => {
    const isCurrent = stepIndex === boundedIndex;

    stepElement.style.display = isCurrent ? 'flex' : 'none';
    stepElement.setAttribute('aria-hidden', isCurrent ? 'false' : 'true');
    stepElement.classList.toggle('active', isCurrent);
  });

  requestAnimationFrame(() => {
    focusFirstInteractive(dom.steps[boundedIndex]);
  });

  updateProgressUI(dom, state);

  if (typeof onAfterShowStep === 'function') {
    onAfterShowStep(boundedIndex);
  }
}

/**
 * Returns whether the user can move to the next step.
 *
 * @param {object} dom
 * @param {object} state
 * @returns {boolean}
 */
export function canAdvanceToNextStep(dom, state) {
  if (!dom?.steps?.length || !state?.ui) return false;
  return state.ui.currentStepIndex < dom.steps.length - 1;
}

/**
 * Returns whether the user can move to the previous step.
 *
 * @param {object} state
 * @returns {boolean}
 */
export function canGoToPreviousStep(state) {
  return Boolean(state?.ui?.currentStepIndex > 0);
}

/**
 * Returns the next step index without mutating state.
 *
 * @param {object} state
 * @returns {number}
 */
export function getNextStepIndex(state) {
  return Number(state?.ui?.currentStepIndex || 0) + 1;
}

/**
 * Returns the previous step index without mutating state.
 *
 * @param {object} state
 * @returns {number}
 */
export function getPreviousStepIndex(state) {
  return Math.max(0, Number(state?.ui?.currentStepIndex || 0) - 1);
}
