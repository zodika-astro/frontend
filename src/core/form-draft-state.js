// src/core/form-draft-state.js

/* ============================================================================
 * ZODIKA • Form Draft State
 * ----------------------------------------------------------------------------
 * Client-side draft snapshot and recovery helpers for multi-step product forms.
 *
 * Responsibilities
 * - Build a lightweight draft snapshot from the current form state
 * - Persist and restore draft-compatible field values
 * - Restore city validation state used by Google Places flows
 * - Determine the earliest safe step for recovery after reload
 * ========================================================================== */

import {
  getDraftState,
  setDraftState,
} from './form-storage.js';

import {
  clearElementValuesById,
} from './form-dom.js';

import {
  clamp,
} from './form-utils.js';

/**
 * Builds a lightweight draft snapshot from the current form state.
 *
 * @param {object} params
 * @param {HTMLFormElement} params.form
 * @param {object} params.state
 * @returns {object}
 */
export function buildDraftStateSnapshot({ form, state }) {
  const formData = new FormData(form);
  const fields = Object.fromEntries(formData.entries());

  return {
    currentStepIndex: state.ui.currentStepIndex,
    fields,
    city: {
      isValidated: state.city.isValidated,
      selectedDisplay: state.city.selectedDisplay,
    },
  };
}

/**
 * Persists the current draft snapshot in sessionStorage.
 *
 * @param {object} params
 * @param {object} params.storageKeys
 * @param {HTMLFormElement} params.form
 * @param {object} params.state
 */
export function persistDraftState({
  storageKeys,
  form,
  state,
}) {
  const snapshot = buildDraftStateSnapshot({ form, state });
  setDraftState(storageKeys, snapshot);
}

/**
 * Hydrates form fields from a stored draft snapshot.
 *
 * @param {object} params
 * @param {HTMLFormElement} params.form
 * @param {object} params.fields
 */
export function hydrateDraftStateFields({
  form,
  fields,
}) {
  if (!form || !fields || typeof fields !== 'object') return;

  Object.entries(fields).forEach(([name, value]) => {
    const field = form.elements.namedItem(name);

    if (!field) return;

    if (field instanceof RadioNodeList) {
      const items = Array.from(field);

      items.forEach((item) => {
        if (!(item instanceof HTMLInputElement)) return;

        if (item.type === 'checkbox') {
          item.checked = Array.isArray(value)
            ? value.includes(item.value)
            : Boolean(value);
          return;
        }

        item.checked = item.value === value;
      });

      return;
    }

    if (field instanceof HTMLInputElement && field.type === 'checkbox') {
      field.checked = Boolean(value);
      return;
    }

    field.value = value ?? '';
  });
}

/**
 * Returns the earliest safe step index based on the recovered draft data.
 *
 * @param {object} params
 * @param {object} params.draftState
 * @param {object} params.config
 * @param {number} params.stepCount
 * @returns {number}
 */
export function getEarliestSafeStepIndex({
  draftState,
  config,
  stepCount,
}) {
  const fields = draftState?.fields || {};
  const requestedStepIndex = clamp(
    Number(draftState?.currentStepIndex ?? 0),
    0,
    Math.max(0, stepCount - 1)
  );

  const hasEmail = Boolean(String(fields[config.fields.email] || '').trim());
  if (!hasEmail) return 0;

  const hasName = Boolean(String(fields[config.fields.fullName] || '').trim());
  if (!hasName) return Math.min(requestedStepIndex, 1);

  const hasBirthDate = Boolean(String(fields[config.fields.birthDate] || '').trim());
  if (!hasBirthDate) return Math.min(requestedStepIndex, 2);

  const hasBirthTime = Boolean(String(fields[config.fields.birthTime] || '').trim());
  if (!hasBirthTime) return Math.min(requestedStepIndex, 3);

  const hasValidatedCity =
    Boolean(draftState?.city?.isValidated) &&
    Boolean(String(fields[config.fields.birthPlace] || '').trim()) &&
    Boolean(String(fields.birth_place_place_id || '').trim());

  if (!hasValidatedCity) return Math.min(requestedStepIndex, 4);

  return requestedStepIndex;
}

/**
 * Restores draft state from sessionStorage into the current form runtime.
 *
 * @param {object} params
 * @param {object} params.storageKeys
 * @param {HTMLFormElement} params.form
 * @param {object} params.state
 * @param {object} params.config
 * @param {number} params.stepCount
 * @param {string[]} params.placeHiddenFieldIds
 * @returns {number|null}
 */
export function restoreDraftState({
  storageKeys,
  form,
  state,
  config,
  stepCount,
  placeHiddenFieldIds,
}) {
  const draftState = getDraftState(storageKeys);
  if (!draftState) return null;

  hydrateDraftStateFields({
    form,
    fields: draftState.fields,
  });

  state.city.isValidated = Boolean(draftState?.city?.isValidated);
  state.city.selectedDisplay = String(draftState?.city?.selectedDisplay || '');
  state.city.placePayload = null;

  if (!state.city.isValidated) {
    clearElementValuesById(placeHiddenFieldIds);
  }

  return getEarliestSafeStepIndex({
    draftState,
    config,
    stepCount,
  });
}
