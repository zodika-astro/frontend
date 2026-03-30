// src/core/form-navigation.js

/* ============================================================================
 * ZODIKA • Form Navigation
 * ----------------------------------------------------------------------------
 * Step navigation helpers for multi-step product forms.
 *
 * Responsibilities
 * - Manage step transitions and visibility
 * - Control navigation boundaries
 * - Update progress UI state
 * - Handle focus management for accessibility
 * ========================================================================== */

/**
 * Returns the step key by index.
 *
 * @param {object} config
 * @param {number} index
 * @returns {string}
 */
export function getStepKeyByIndex(config, index) {
  return config?.stepKeys?.[index] || `step_${index}`;
}

/**
 * Returns the current step element.
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

function scrollStepIntoView(stepElement) {
  if (!stepElement) return;

  stepElement.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
    inline: 'nearest',
  });
}

/**
 * Updates the progress bar UI.
 *
 * @param {object} dom
 * @param {object} state
 */
function updateProgressUI(dom, state) {
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
 * Shows a specific step.
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
    const activeStep = dom.steps[boundedIndex];
    scrollStepIntoView(activeStep);
    focusFirstInteractive(activeStep);
  });

  updateProgressUI(dom, state);

  if (typeof onAfterShowStep === 'function') {
    onAfterShowStep(boundedIndex);
  }
}

/**
 * Checks if the user can advance to the next step.
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
 * Checks if the user can go back.
 *
 * @param {object} state
 * @returns {boolean}
 */
export function canGoToPreviousStep(state) {
  return (state?.ui?.currentStepIndex || 0) > 0;
}

/**
 * Returns the next step index.
 *
 * @param {object} state
 * @returns {number}
 */
export function getNextStepIndex(state) {
  return Number(state?.ui?.currentStepIndex || 0) + 1;
}

/**
 * Returns the previous step index.
 *
 * @param {object} state
 * @returns {number}
 */
export function getPreviousStepIndex(state) {
  return Math.max(
    0,
    Number(state?.ui?.currentStepIndex || 0) - 1
  );
}
