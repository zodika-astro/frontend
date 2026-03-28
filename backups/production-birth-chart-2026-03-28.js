//production-birth-chart-2026-03-28.js

<script>
/* ============================================================================
 * ZODIKA • Natal Chart Form — Production JS
 * ----------------------------------------------------------------------------
 * Features
 *  - Multi-step form navigation and validation
 *  - Google Places city validation
 *  - Generic pre-checkout form session tracking
 *  - UX-first background sync for intermediate steps
 *  - Checkout creation through the birthchart backend
 * ========================================================================== */

/* ------------------------------- Configuration ----------------------------- */
const ZDK_API_BASE = 'https://backend-form-webflow-production.up.railway.app';
const ZDK_ENDPOINTS = {
  formStart: `${ZDK_API_BASE}/forms/start`,
  formUpdate: `${ZDK_API_BASE}/forms/update`,
  formSubmit: `${ZDK_API_BASE}/forms/submit`,
  formLinkRequest: `${ZDK_API_BASE}/forms/link-request`,
  checkoutSubmit: `${ZDK_API_BASE}/birthchart/birthchartsubmit-form`,
};

const ZDK_FORM_TYPE = 'birth_chart';
const ZDK_SESSION_STORAGE_KEY = 'zodika_form_session_token';
const ZDK_PENDING_UPDATE_STORAGE_KEY = 'zodika_form_pending_update';
const ZDK_SESSION_INACTIVE_ERROR = 'SESSION_NOT_ACTIVE';

const ZDK_TIMEOUTS = {
  formStart: 8000,
  formUpdate: 5000,
  formSubmit: 8000,
  checkoutSubmit: 20000,
};

/* ----------------------------- DOM references ----------------------------- */
let currentStep = 0;
const form = document.getElementById('natalForm');
const steps = Array.from(document.querySelectorAll('.natal-step'));
const progressSteps = Array.from(document.querySelectorAll('.progress-step'));
const spinner = document.getElementById('spinner');
const errorMessage = document.getElementById('errorMessage');
const cityInput = document.getElementById('cityInput');

let submitting = false;
let trackingInFlight = false;
let lastFocusedBeforeOverlay = null;

/* ------------------------------- Session state ----------------------------- */
const formSessionState = {
  token: null,
  started: false,
};

/* ------------------------------- City state ------------------------------- */
const cityState = {
  validated: false,
  selectedDisplay: '',
  placePayload: null,
};

/* ------------------------------- Progress UI ------------------------------ */
function updateProgress() {
  progressSteps.forEach((el, idx) => {
    const isActive = idx <= currentStep;
    el.classList.toggle('active', isActive);
    el.setAttribute('aria-current', idx === currentStep ? 'step' : 'false');
  });
}

function focusFirstInteractive(root) {
  const selectors = [
    'input:not([type="hidden"]):not([disabled])',
    'button:not([disabled])',
    'a[href]',
    'select:not([disabled])',
    'textarea:not([disabled])',
  ];

  for (const sel of selectors) {
    const el = root.querySelector(sel);
    if (el) {
      el.focus({ preventScroll: true });
      return;
    }
  }
}

function showStep(idx) {
  currentStep = Math.max(0, Math.min(idx, steps.length - 1));

  steps.forEach((stepEl, i) => {
    const isCurrent = i === currentStep;
    stepEl.style.display = isCurrent ? 'flex' : 'none';
    stepEl.setAttribute('aria-hidden', isCurrent ? 'false' : 'true');
    stepEl.classList.toggle('active', isCurrent);
  });

  requestAnimationFrame(() => focusFirstInteractive(steps[currentStep]));
  updateProgress();
}
window.showStep = showStep;

/* ------------------------------- Error helpers ---------------------------- */
function setErrorText(el, message) {
  const explicit = el.querySelector('[id$="Text"]');
  if (explicit) {
    explicit.textContent = message;
    return;
  }
  el.textContent = message;
}

function showError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  if (typeof message === 'string') setErrorText(el, message);
  el.style.display = 'block';
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'polite');
}

function hideError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'none';
  el.removeAttribute('role');
  el.removeAttribute('aria-live');
}

function showSessionExpiredMessage() {
  closeOverlay(spinner);
  openOverlay(errorMessage);

  const heading = errorMessage.querySelector('h2');
  const paragraph = errorMessage.querySelector('p');

  if (heading) heading.textContent = 'sua sessão expirou';
  if (paragraph) {
    paragraph.textContent =
      'por segurança, esta sessão do formulário não está mais ativa. por favor, comece novamente.';
  }
}

/* -------------------------------- Date utils ------------------------------ */
function getLocalTodayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateBR(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '(não informado)';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/* ------------------------------- Storage helpers -------------------------- */
function getStoredSessionToken() {
  try {
    return sessionStorage.getItem(ZDK_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeSessionToken(token) {
  try {
    if (token) sessionStorage.setItem(ZDK_SESSION_STORAGE_KEY, token);
  } catch {}
}

function clearStoredSessionToken() {
  try {
    sessionStorage.removeItem(ZDK_SESSION_STORAGE_KEY);
  } catch {}
}

function getPendingUpdatePayload() {
  try {
    const raw = sessionStorage.getItem(ZDK_PENDING_UPDATE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storePendingUpdatePayload(payload) {
  try {
    if (!payload) return;
    sessionStorage.setItem(ZDK_PENDING_UPDATE_STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

function clearPendingUpdatePayload() {
  try {
    sessionStorage.removeItem(ZDK_PENDING_UPDATE_STORAGE_KEY);
  } catch {}
}

/* ------------------------------- API helpers ------------------------------ */
function getJsonErrorMessage(errJson, fallback) {
  return errJson?.message || errJson?.error || fallback;
}

function isSessionInactiveErrorPayload(errJson) {
  const errValue = String(errJson?.error || '').toUpperCase();
  return errValue === ZDK_SESSION_INACTIVE_ERROR;
}

async function postJson(url, payload, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const timeoutId = setTimeout(
    () => ctrl.abort(new Error(`timeout_${timeoutMs}ms`)),
    timeoutMs
  );

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const err = new Error(getJsonErrorMessage(data, `HTTP ${res.status}`));
      err.status = res.status;
      err.payload = data;
      throw err;
    }

    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

/* ------------------------------ Form tracking ----------------------------- */
function getCurrentFormPayload() {
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());

  if (cityState.selectedDisplay) {
    data.birth_place = cityState.selectedDisplay;
  }

  return {
    email: (data.email || '').trim().toLowerCase(),
    name: (data.name || '').trim(),
    birth_date: data.birth_date || null,
    birth_time: data.birth_time || null,
    birth_place: data.birth_place || null,
    birth_place_place_id: data.birth_place_place_id || null,
    birth_place_full: data.birth_place_full || null,
    birth_place_country: data.birth_place_country || null,
    birth_place_admin1: data.birth_place_admin1 || null,
    birth_place_admin2: data.birth_place_admin2 || null,
    birth_place_lat: data.birth_place_lat || null,
    birth_place_lng: data.birth_place_lng || null,
    birth_place_json: data.birth_place_json || null,
  };
}

function getStepKeyByIndex(idx) {
  switch (idx) {
    case 0: return 'email';
    case 1: return 'name';
    case 2: return 'birth_date';
    case 3: return 'birth_time';
    case 4: return 'birth_place';
    case 5: return 'confirmation';
    default: return `step_${idx}`;
  }
}

async function startFormSession() {
  const emailInput = form.querySelector('input[name="email"]');
  if (!validateEmailInput(emailInput)) return false;

  const payload = {
    form_type: ZDK_FORM_TYPE,
    email: (emailInput?.value || '').trim().toLowerCase(),
    form_status: 'STARTED',
    current_step_index: 0,
    last_completed_step_index: 0,
    highest_completed_step_index: 0,
    current_step_key: 'email',
    last_completed_step_key: 'email',
    highest_completed_step_key: 'email',
    form_data: {
      email: (emailInput?.value || '').trim().toLowerCase(),
    },
  };

  const data = await postJson(
    ZDK_ENDPOINTS.formStart,
    payload,
    ZDK_TIMEOUTS.formStart
  );

  const token = data?.session?.session_token;
  if (!token) {
    throw new Error('Missing form session token');
  }

  formSessionState.token = token;
  formSessionState.started = true;
  storeSessionToken(token);
  return true;
}

async function updateFormSessionProgress(nextIdx) {
  if (!formSessionState.token) return;

  const previousIdx = currentStep;
  const payload = {
    session_token: formSessionState.token,
    form_status: 'IN_PROGRESS',
    current_step_index: nextIdx,
    last_completed_step_index: previousIdx,
    highest_completed_step_index: Math.max(previousIdx, nextIdx),
    current_step_key: getStepKeyByIndex(nextIdx),
    last_completed_step_key: getStepKeyByIndex(previousIdx),
    highest_completed_step_key: getStepKeyByIndex(Math.max(previousIdx, nextIdx)),
    form_data: getCurrentFormPayload(),
  };

  storePendingUpdatePayload(payload);
  await postJson(ZDK_ENDPOINTS.formUpdate, payload, ZDK_TIMEOUTS.formUpdate);
  clearPendingUpdatePayload();
}

async function flushPendingUpdate() {
  const pending = getPendingUpdatePayload();
  if (!pending) return true;

  try {
    await postJson(ZDK_ENDPOINTS.formUpdate, pending, ZDK_TIMEOUTS.formUpdate);
    clearPendingUpdatePayload();
    return true;
  } catch (err) {
    const handled = await handleTrackingError(err);
    if (handled) return false;
    return false;
  }
}

function flushPendingUpdateWithKeepalive() {
  const pending = getPendingUpdatePayload();
  if (!pending) return;

  try {
    fetch(ZDK_ENDPOINTS.formUpdate, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(pending),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

async function markFormSessionSubmitted() {
  if (!formSessionState.token) return;

  const lastIdx = steps.length - 1;
  const payload = {
    session_token: formSessionState.token,
    submit_status: 'CREATED',
    current_step_index: lastIdx,
    last_completed_step_index: lastIdx,
    highest_completed_step_index: lastIdx,
    current_step_key: 'confirmation',
    last_completed_step_key: 'confirmation',
    highest_completed_step_key: 'confirmation',
    form_data: getCurrentFormPayload(),
  };

  await postJson(
    ZDK_ENDPOINTS.formSubmit,
    payload,
    ZDK_TIMEOUTS.formSubmit
  );
}

async function linkFormSessionToRequest(requestId) {
  if (!formSessionState.token || !requestId) return;

  await postJson(ZDK_ENDPOINTS.formLinkRequest, {
    session_token: formSessionState.token,
    request_id: requestId,
  });
}

async function handleTrackingError(err) {
  const payload = err?.payload || null;
  const status = Number(err?.status || 0);

  if (status === 409 && isSessionInactiveErrorPayload(payload)) {
    formSessionState.token = null;
    formSessionState.started = false;
    clearStoredSessionToken();
    clearPendingUpdatePayload();
    showSessionExpiredMessage();
    showStep(0);
    return true;
  }

  return false;
}

/* -------------------------------- Validation ------------------------------ */
function validateDateInput(input) {
  const v = input?.value || '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    showError('dateError', 'por favor, insira uma data válida.');
    input?.classList.add('invalid');
    input?.setAttribute('aria-invalid', 'true');
    return false;
  }

  const MIN = '1700-01-01';
  const TODAY = getLocalTodayISO();

  if (v < MIN) {
    showError('dateError', 'a data não pode ser anterior a 1700.');
    input?.classList.add('invalid');
    input?.setAttribute('aria-invalid', 'true');
    return false;
  }

  if (v > TODAY) {
    showError('dateError', 'a data não pode ser no futuro.');
    input?.classList.add('invalid');
    input?.setAttribute('aria-invalid', 'true');
    return false;
  }

  hideError('dateError');
  input.classList.remove('invalid');
  input.removeAttribute('aria-invalid');
  return true;
}

function validateEmailInput(input) {
  const value = (input?.value || '').trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

  if (!value || !emailRegex.test(value)) {
    showError('emailError', 'por favor, insira um e-mail válido.');
    input?.classList.add('invalid');
    input?.setAttribute('aria-invalid', 'true');
    return false;
  }

  input.value = value;
  hideError('emailError');
  input.classList.remove('invalid');
  input.removeAttribute('aria-invalid');
  return true;
}

function validateNameInput(input) {
  const raw = input?.value || '';
  const cleaned = raw.normalize('NFKC').replace(/\s+/g, ' ').trim();
  const words = cleaned.split(' ').filter(Boolean);
  const ok = cleaned.length >= 6
    && words.length >= 2
    && words.slice(0, 2).every((w) => w.length >= 2);

  if (!ok) {
    showError('nameError', 'por favor, preencha seu nome completo.');
    input?.classList.add('invalid');
    input?.setAttribute('aria-invalid', 'true');
    return false;
  }

  input.value = cleaned;
  hideError('nameError');
  input.classList.remove('invalid');
  input.removeAttribute('aria-invalid');
  return true;
}

function validateTimeInput(input) {
  const v = input?.value || '';
  if (!v || !/^\d{2}:\d{2}$/.test(v)) {
    input?.classList.add('invalid');
    input?.setAttribute('aria-invalid', 'true');
    return false;
  }

  input.classList.remove('invalid');
  input.removeAttribute('aria-invalid');
  return true;
}

function validateCityInput(input) {
  if (!cityState.validated) {
    showError('cityError', 'por favor, selecione uma cidade válida da lista.');
    input?.classList.add('invalid');
    input?.setAttribute('aria-invalid', 'true');
    return false;
  }

  hideError('cityError');
  input.classList.remove('invalid');
  input.removeAttribute('aria-invalid');
  return true;
}

function validateStepFields(stepEl) {
  const inputs = Array.from(stepEl.querySelectorAll('input'));
  const selects = Array.from(stepEl.querySelectorAll('select'));
  let ok = true;

  for (const input of inputs) {
    const { name, required, type } = input;

    if (name === 'email') ok = validateEmailInput(input) && ok;
    if (name === 'name') ok = validateNameInput(input) && ok;
    if (name === 'birth_date') ok = validateDateInput(input) && ok;
    if (name === 'birth_time') ok = validateTimeInput(input) && ok;
    if (name === 'birth_place') ok = validateCityInput(input) && ok;

    if (required && type !== 'hidden' && !input.checkValidity()) {
      input.classList.add('invalid');
      input.setAttribute('aria-invalid', 'true');
      ok = false;
    }
  }

  for (const sel of selects) {
    const { required } = sel;
    if (required && !sel.checkValidity()) {
      sel.classList.add('invalid');
      sel.setAttribute('aria-invalid', 'true');
      ok = false;
    }
  }

  return ok;
}

/* --------------------------------- Steps API ------------------------------ */
async function nextStep() {
  if (currentStep >= steps.length - 1 || trackingInFlight) return;

  const activeEl = steps[currentStep];
  const canAdvance = validateStepFields(activeEl);
  if (!canAdvance) return;

  trackingInFlight = true;

  try {
    const nextIdx = currentStep + 1;

    /*
     * Step 0 remains blocking because the session must exist before
     * the rest of the tracking flow can continue safely.
     */
    if (!formSessionState.token && currentStep === 0) {
      await startFormSession();

      if (nextIdx === steps.length - 1) {
        fillConfirmation();
      }

      showStep(nextIdx);
      return;
    }

    /*
     * For subsequent steps, prioritize UX:
     *  1) Try to flush any previously failed update
     *  2) Advance immediately
     *  3) Send the new update in the background
     */
    if (formSessionState.token) {
      await flushPendingUpdate();

      if (nextIdx === steps.length - 1) {
        fillConfirmation();
      }

      showStep(nextIdx);

      updateFormSessionProgress(nextIdx).catch(async (err) => {
        console.error('[ZDK] Background step tracking error:', err);
        await handleTrackingError(err);
      });

      return;
    }

    if (nextIdx === steps.length - 1) {
      fillConfirmation();
    }

    showStep(nextIdx);
  } catch (err) {
    console.error('[ZDK] Step tracking error:', err);
    const handled = await handleTrackingError(err);
    if (!handled) {
      showError('emailError', 'não foi possível iniciar sua sessão agora. tente novamente.');
    }
  } finally {
    trackingInFlight = false;
  }
}

function prevStep() {
  if (currentStep <= 0) return;
  showStep(currentStep - 1);
}

window.nextStep = nextStep;
window.prevStep = prevStep;

/* ---------------------------- Confirmation summary ------------------------ */
function fillConfirmation() {
  const summaryDiv = document.getElementById('confirmation-summary');
  if (!summaryDiv) return;

  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());

  const labels = [
    ['email', 'e-mail'],
    ['name', 'nome'],
    ['birth_date', 'data de nascimento'],
    ['birth_time', 'hora de nascimento'],
    ['birth_place', 'cidade de nascimento'],
  ];

  const ul = document.createElement('ul');
  ul.style.paddingLeft = '0';
  ul.style.listStyle = 'none';

  labels.forEach(([key, label]) => {
    let value = data[key] || '(não informado)';

    if (key === 'birth_date' && value) value = formatDateBR(value);
    if (key === 'birth_place') value = cityState.selectedDisplay || value;

    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = `${label}: `;
    li.appendChild(strong);
    li.appendChild(document.createTextNode(value));
    ul.appendChild(li);
  });

  summaryDiv.replaceChildren(ul);
}

/* ------------------------- Google Places Autocomplete --------------------- */
window.initAutocomplete = function initAutocomplete() {
  if (!cityInput || !window.google || !google.maps || !google.maps.places) return;

  const ac = new google.maps.places.Autocomplete(cityInput, { types: ['(cities)'] });
  if (typeof ac.setFields === 'function') {
    ac.setFields(['place_id', 'name', 'formatted_address', 'address_components', 'geometry']);
  }

  ac.addListener('place_changed', function onPlaceChanged() {
    const place = ac.getPlace();

    if (!place || !place.place_id || !place.geometry || !place.geometry.location) {
      cityState.validated = false;
      cityInput.classList.add('invalid');
      cityInput.setAttribute('aria-invalid', 'true');
      showError('cityError', 'por favor, selecione uma cidade da lista.');
      return;
    }

    const comps = place.address_components || [];
    const pick = (type) => {
      const c = comps.find((acItem) => (acItem.types || []).includes(type));
      return c ? (c.short_name || c.long_name || '') : '';
    };

    const countryRaw = pick('country');
    const admin1 = pick('administrative_area_level_1');
    const admin2 = pick('administrative_area_level_2');
    const name = place.name || admin2 || '';

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    const countryPretty =
      countryRaw === 'Brazil' || countryRaw === 'Brasil'
        ? 'Brasil'
        : countryRaw === 'United States'
          ? 'EUA'
          : countryRaw;

    const displayFormatted = [name, admin1, countryPretty].filter(Boolean).join(', ');

    cityState.placePayload = {
      place_id: place.place_id,
      formatted_address: place.formatted_address || displayFormatted,
      name: place.name,
      address_components: place.address_components,
      country: countryRaw,
      admin1,
      admin2,
      lat,
      lng,
    };

    cityInput.value = displayFormatted;
    cityState.selectedDisplay = displayFormatted;
    cityState.validated = true;

    document.getElementById('birth_place_place_id').value = place.place_id || '';
    document.getElementById('birth_place_full').value = place.formatted_address || displayFormatted || '';
    document.getElementById('birth_place_country').value = countryRaw || '';
    document.getElementById('birth_place_admin1').value = admin1 || '';
    document.getElementById('birth_place_admin2').value = admin2 || '';
    document.getElementById('birth_place_lat').value = String(lat);
    document.getElementById('birth_place_lng').value = String(lng);
    document.getElementById('birth_place_json').value = JSON.stringify({
      place_id: place.place_id,
      formatted_address: place.formatted_address,
      name: place.name,
      address_components: place.address_components,
    });

    cityInput.classList.remove('invalid');
    cityInput.removeAttribute('aria-invalid');
    hideError('cityError');
  });

  cityInput.addEventListener('input', function onCityInput() {
    if (cityInput.value !== cityState.selectedDisplay) {
      cityState.validated = false;
    }
  });
};

/* ---------------------------- Overlay helpers ----------------------------- */
function openOverlay(overlayEl) {
  if (!overlayEl) return;

  lastFocusedBeforeOverlay = document.activeElement;
  overlayEl.style.display = 'flex';

  function onKeydown(e) {
    if (e.key !== 'Tab') return;

    const focusables = overlayEl.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const f = Array.from(focusables).filter((el) => !el.hasAttribute('disabled'));
    if (!f.length) return;

    const first = f[0];
    const last = f[f.length - 1];
    const a = document.activeElement;

    if (e.shiftKey && a === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && a === last) {
      e.preventDefault();
      first.focus();
    }
  }

  overlayEl.addEventListener('keydown', onKeydown);
  overlayEl._trapHandler = onKeydown;

  requestAnimationFrame(() => focusFirstInteractive(overlayEl));
}

function closeOverlay(overlayEl) {
  if (!overlayEl) return;

  overlayEl.style.display = 'none';

  if (overlayEl._trapHandler) {
    overlayEl.removeEventListener('keydown', overlayEl._trapHandler);
    overlayEl._trapHandler = null;
  }

  if (lastFocusedBeforeOverlay && typeof lastFocusedBeforeOverlay.focus === 'function') {
    lastFocusedBeforeOverlay.focus();
  }
}

/* ---------------------------- Keyboard behavior --------------------------- */
form.addEventListener('keydown', function onFormKeydown(e) {
  if (e.key !== 'Enter') return;

  const tag = (e.target.tagName || '').toLowerCase();
  const type = (e.target.getAttribute('type') || '').toLowerCase();
  const isCheckbox = tag === 'input' && type === 'checkbox';
  const isButton = tag === 'button';
  const isLastStep = currentStep === steps.length - 1;

  if (!isLastStep && !isCheckbox && !isButton) {
    e.preventDefault();
    nextStep();
  }
});

/* ----------------------- Decorative time icon control --------------------- */
function syncTimeIcon() {
  const input = document.querySelector('input[name="birth_time"]');
  const icon = input ? input.closest('.input-container')?.querySelector('.input-icon') : null;
  if (!icon || !input) return;

  const isPointerFine = window.matchMedia('(pointer: fine)').matches;
  const hasShowPicker = typeof input.showPicker === 'function';
  icon.style.display = isPointerFine || hasShowPicker ? 'none' : '';
}

/* --------------------------------- Submit --------------------------------- */
form.addEventListener('submit', async function onFormSubmit(e) {
  e.preventDefault();
  if (submitting) return;
  submitting = true;

  try {
    const activeEl = steps[currentStep];
    if (!validateStepFields(activeEl)) {
      submitting = false;
      return;
    }

    if (!cityState.validated) {
      showError('cityError', 'por favor, selecione uma cidade válida da lista.');
      cityInput?.classList.add('invalid');
      cityInput?.setAttribute('aria-invalid', 'true');
      submitting = false;
      return;
    }

    hideError('privacyError');
    const privacyCheck = document.getElementById('privacyCheck');
    const privacyIsChecked = !!(privacyCheck && privacyCheck.checked);

    if (!privacyIsChecked) {
      showError('privacyError', 'você precisa concordar com a política de privacidade para continuar.');
      privacyCheck?.focus();
      privacyCheck?.setAttribute('aria-invalid', 'true');
      submitting = false;
      return;
    }

    privacyCheck.removeAttribute('aria-invalid');

    if (formSessionState.token) {
      await flushPendingUpdate();
      await markFormSessionSubmitted();
    }

    openOverlay(spinner);

    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());

    payload.birth_place = cityState.selectedDisplay || payload.birth_place || '';
    payload.product_type = ZDK_FORM_TYPE;
    payload.privacyConsent = true;
    payload.privacy_agreed = true;
    payload.privacy_policy = 'on';
    payload.form_session_token = formSessionState.token || null;

    const ctrl = new AbortController();
    const timeoutId = setTimeout(
      () => ctrl.abort(new Error(`timeout_${ZDK_TIMEOUTS.checkoutSubmit}ms`)),
      ZDK_TIMEOUTS.checkoutSubmit
    );

    const res = await fetch(ZDK_ENDPOINTS.checkoutSubmit, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let errJson = null;
      try {
        errJson = await res.json();
      } catch {}

      const err = new Error(
        getJsonErrorMessage(errJson, `erro ao criar pagamento (HTTP ${res.status})`)
      );
      err.status = res.status;
      err.payload = errJson;
      throw err;
    }

    const data = await res.json();

    if (formSessionState.token && data?.request_id) {
      try {
        await linkFormSessionToRequest(data.request_id);
      } catch (linkErr) {
        console.error('[ZDK] Session link error:', linkErr);
      }
    }

    if (data?.url) {
      window.location.href = data.url;
      return;
    }

    throw new Error('URL de pagamento não recebida');
  } catch (err) {
    console.error('[ZDK] Submit error:', err);

    const handled = await handleTrackingError(err);
    if (handled) {
      submitting = false;
      return;
    }

    closeOverlay(spinner);
    openOverlay(errorMessage);

    const backendMsg = String(err?.message || '').toLowerCase();
    if (backendMsg.includes('privacy')) showError('privacyError', err.message);
  } finally {
    submitting = false;
  }
});

/* --------------------------------- Init ----------------------------------- */
window.onload = function onWindowLoad() {
  const d = form.querySelector('input[name="birth_date"]');
  if (d) d.max = getLocalTodayISO();

  const t = form.querySelector('input[name="birth_time"]');
  if (t) {
    t.setAttribute('step', '60');
    t.setAttribute('inputmode', 'numeric');
  }

  formSessionState.token = getStoredSessionToken();
  formSessionState.started = !!formSessionState.token;

  showStep(0);

  if (window.google && google.maps && google.maps.places) {
    window.initAutocomplete();
  }

  syncTimeIcon();
};

/* --------- ZODIKA • Product Media Tilt (desktop-only) --------------------- */
(function attachTiltEffect() {
  const isReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFine = () => window.matchMedia('(pointer: fine)').matches;
  const isDesktop = () => window.matchMedia('(min-width: 769px)').matches;

  function initTiltOnLastStep() {
    if (isReduced() || !isFine() || !isDesktop()) return;

    const lastStep = steps[steps.length - 1];
    const media = lastStep?.querySelector('.zdk-product__media');
    if (!media || media.dataset.tiltBound === '1') return;

    const img = media.querySelector('img');
    if (!img) return;

    media.dataset.tiltBound = '1';
    const MAX_TILT = 8;
    const SCALE = 1.02;
    let rafId = null;

    function applyTilt(clientX, clientY) {
      const rect = media.getBoundingClientRect();
      const px = (clientX - rect.left) / rect.width;
      const py = (clientY - rect.top) / rect.height;
      const rX = (0.5 - py) * (MAX_TILT * 2);
      const rY = (px - 0.5) * (MAX_TILT * 2);

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        img.style.animation = 'none';
        img.style.willChange = 'transform';
        img.style.transform = `rotateX(${rX}deg) rotateY(${rY}deg) scale(${SCALE})`;
      });
    }

    function resetTilt() {
      if (rafId) cancelAnimationFrame(rafId);
      img.style.willChange = 'auto';
      img.style.transform = '';
      img.style.animation = '';
    }

    media.addEventListener('pointerenter', (e) => {
      if (!isReduced()) applyTilt(e.clientX, e.clientY);
    }, { passive: true });

    media.addEventListener('pointermove', (e) => {
      if (!isReduced()) applyTilt(e.clientX, e.clientY);
    }, { passive: true });

    media.addEventListener('pointerleave', () => {
      resetTilt();
    }, { passive: true });

    ['(pointer: fine)', '(min-width: 769px)', '(prefers-reduced-motion: reduce)']
      .map((q) => window.matchMedia(q))
      .forEach((mq) => {
        const handler = () => resetTilt();
        if (typeof mq.addEventListener === 'function') mq.addEventListener('change', handler);
        else if (typeof mq.addListener === 'function') mq.addListener(handler);
      });
  }

  try {
    const originalShowStep = window.showStep;
    if (typeof originalShowStep === 'function') {
      window.showStep = function patchedShowStep(index) {
        originalShowStep(index);
        if (index === steps.length - 1) initTiltOnLastStep();
      };
    }
  } catch (_) {}

  const obs = new MutationObserver(() => {
    const lastStep = steps[steps.length - 1];
    if (lastStep && lastStep.classList.contains('active')) initTiltOnLastStep();
  });

  obs.observe(document.documentElement, {
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style'],
  });

  const activeLastStep = document.querySelector(
    `.natal-step[data-step="${steps.length - 1}"].active`
  );
  if (activeLastStep) {
    initTiltOnLastStep();
  }
})();

/* ------------------------------ Lifecycle sync ---------------------------- */
window.addEventListener('pagehide', function onPageHide() {
  flushPendingUpdateWithKeepalive();
});

/* --------------------------- Public API (window) -------------------------- */
window.resetForm = function resetForm() {
  form.reset();

  formSessionState.token = null;
  formSessionState.started = false;
  clearStoredSessionToken();
  clearPendingUpdatePayload();

  cityState.validated = false;
  cityState.selectedDisplay = '';
  cityState.placePayload = null;

  closeOverlay(spinner);
  closeOverlay(errorMessage);

  ['emailError', 'nameError', 'dateError', 'cityError', 'privacyError'].forEach(hideError);

  form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
  form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));

  steps.forEach((step) => {
    step.style.display = 'none';
    step.classList.remove('active');
    step.setAttribute('aria-hidden', 'true');
  });

  showStep(0);
};
</script>
