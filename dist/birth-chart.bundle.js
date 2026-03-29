(() => {
  // src/products/birth-chart.config.js
  var birthChartConfig = {
    productKey: "birth_chart",
    locale: "pt-BR",
    apiBaseUrl: "https://backend-form-webflow-production.up.railway.app",
    endpoints: {
      formStart: "/forms/start",
      formUpdate: "/forms/update",
      formSubmit: "/forms/submit",
      formLinkRequest: "/forms/link-request",
      checkoutSubmit: "/birthchart/birthchartsubmit-form"
    },
    selectors: {
      appRoot: ".form-app",
      form: "#natalForm",
      steps: ".form-step",
      progressSteps: ".progress-step",
      spinnerOverlay: "#spinner",
      errorOverlay: "#errorMessage",
      cityInput: "#cityInput",
      privacyCheckbox: "#privacyCheck",
      confirmationSummary: "#confirmation-summary"
    },
    fields: {
      email: "email",
      fullName: "name",
      birthDate: "birth_date",
      birthTime: "birth_time",
      birthPlace: "birth_place",
      privacyAgreed: "privacy_agreed"
    },
    hiddenFields: {
      placeId: "birth_place_place_id",
      fullAddress: "birth_place_full",
      country: "birth_place_country",
      admin1: "birth_place_admin1",
      admin2: "birth_place_admin2",
      lat: "birth_place_lat",
      lng: "birth_place_lng",
      json: "birth_place_json"
    },
    errorIds: {
      email: "emailError",
      name: "nameError",
      date: "dateError",
      time: "timeError",
      city: "cityError",
      privacy: "privacyError"
    },
    stepKeys: [
      "email",
      "name",
      "birth_date",
      "birth_time",
      "birth_place",
      "confirmation"
    ],
    tracking: {
      formType: "birth_chart",
      sessionInactiveCode: "SESSION_NOT_ACTIVE",
      debounceMs: 900
    },
    timeouts: {
      formStart: 8e3,
      formUpdate: 5e3,
      formSubmit: 8e3,
      checkoutSubmit: 2e4
    },
    confirmationFields: [
      { key: "email", labelKey: "confirmation.email" },
      { key: "name", labelKey: "confirmation.name" },
      { key: "birth_date", labelKey: "confirmation.birthDate" },
      { key: "birth_time", labelKey: "confirmation.birthTime" },
      { key: "birth_place", labelKey: "confirmation.birthPlace" }
    ],
    integrations: {
      usesGooglePlaces: true
    }
  };
  var birth_chart_config_default = birthChartConfig;

  // src/core/form-state.js
  function createInitialFormState() {
    return {
      ui: {
        currentStepIndex: 0,
        isSubmitting: false,
        lastFocusedBeforeOverlay: null
      },
      tracking: {
        isSyncingStep: false,
        draftSyncTimer: null
      },
      session: {
        token: null,
        isStarted: false
      },
      city: {
        isValidated: false,
        selectedDisplay: "",
        placePayload: null
      }
    };
  }
  function clearSessionState(state) {
    if (!state || typeof state !== "object") {
      return state;
    }
    state.session.token = null;
    state.session.isStarted = false;
    return state;
  }
  function resetFormState(state) {
    if (!state || typeof state !== "object") return;
    const initial = createInitialFormState();
    state.ui.currentStepIndex = initial.ui.currentStepIndex;
    state.ui.isSubmitting = initial.ui.isSubmitting;
    state.ui.lastFocusedBeforeOverlay = initial.ui.lastFocusedBeforeOverlay;
    state.tracking.isSyncingStep = initial.tracking.isSyncingStep;
    if (state.tracking.draftSyncTimer) {
      clearTimeout(state.tracking.draftSyncTimer);
    }
    state.tracking.draftSyncTimer = null;
    state.session.token = initial.session.token;
    state.session.isStarted = initial.session.isStarted;
    state.city.isValidated = initial.city.isValidated;
    state.city.selectedDisplay = initial.city.selectedDisplay;
    state.city.placePayload = initial.city.placePayload;
  }

  // src/core/form-navigation.js
  function getStepKeyByIndex(config, index) {
    var _a;
    return ((_a = config == null ? void 0 : config.stepKeys) == null ? void 0 : _a[index]) || `step_${index}`;
  }
  function getCurrentStepElement(dom, state) {
    var _a, _b;
    return ((_b = dom == null ? void 0 : dom.steps) == null ? void 0 : _b[(_a = state == null ? void 0 : state.ui) == null ? void 0 : _a.currentStepIndex]) || null;
  }
  function focusFirstInteractive(rootElement) {
    if (!rootElement) return;
    const selectors = [
      'input:not([type="hidden"]):not([disabled])',
      "button:not([disabled])",
      "a[href]",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])'
    ];
    for (const selector of selectors) {
      const target = rootElement.querySelector(selector);
      if (target) {
        target.focus({ preventScroll: true });
        return;
      }
    }
  }
  function updateProgressUI(dom, state) {
    var _a;
    if (!((_a = dom == null ? void 0 : dom.progressSteps) == null ? void 0 : _a.length)) return;
    dom.progressSteps.forEach((element, index) => {
      const isActive = index <= state.ui.currentStepIndex;
      element.classList.toggle("active", isActive);
      element.setAttribute(
        "aria-current",
        index === state.ui.currentStepIndex ? "step" : "false"
      );
    });
  }
  function showStep({ dom, state, index, onAfterShowStep }) {
    var _a;
    if (!((_a = dom == null ? void 0 : dom.steps) == null ? void 0 : _a.length) || !(state == null ? void 0 : state.ui)) return;
    const boundedIndex = Math.max(0, Math.min(index, dom.steps.length - 1));
    state.ui.currentStepIndex = boundedIndex;
    dom.steps.forEach((stepElement, stepIndex) => {
      const isCurrent = stepIndex === boundedIndex;
      stepElement.style.display = isCurrent ? "flex" : "none";
      stepElement.setAttribute("aria-hidden", isCurrent ? "false" : "true");
      stepElement.classList.toggle("active", isCurrent);
    });
    requestAnimationFrame(() => {
      focusFirstInteractive(dom.steps[boundedIndex]);
    });
    updateProgressUI(dom, state);
    if (typeof onAfterShowStep === "function") {
      onAfterShowStep(boundedIndex);
    }
  }
  function canAdvanceToNextStep(dom, state) {
    var _a;
    if (!((_a = dom == null ? void 0 : dom.steps) == null ? void 0 : _a.length) || !(state == null ? void 0 : state.ui)) return false;
    return state.ui.currentStepIndex < dom.steps.length - 1;
  }
  function canGoToPreviousStep(state) {
    var _a;
    return (((_a = state == null ? void 0 : state.ui) == null ? void 0 : _a.currentStepIndex) || 0) > 0;
  }
  function getNextStepIndex(state) {
    var _a;
    return Number(((_a = state == null ? void 0 : state.ui) == null ? void 0 : _a.currentStepIndex) || 0) + 1;
  }
  function getPreviousStepIndex(state) {
    var _a;
    return Math.max(
      0,
      Number(((_a = state == null ? void 0 : state.ui) == null ? void 0 : _a.currentStepIndex) || 0) - 1
    );
  }

  // src/core/form-utils.js
  function isPlainObject(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
  }
  function structuredCloneSafe(value) {
    try {
      return structuredClone(value);
    } catch (e) {
      return JSON.parse(JSON.stringify(value));
    }
  }
  function deepMerge(base, override) {
    if (!override || typeof override !== "object") {
      return structuredCloneSafe(base);
    }
    const output = structuredCloneSafe(base);
    Object.keys(override).forEach((key) => {
      const baseValue = output[key];
      const overrideValue = override[key];
      if (isPlainObject(baseValue) && isPlainObject(overrideValue)) {
        output[key] = deepMerge(baseValue, overrideValue);
      } else {
        output[key] = overrideValue;
      }
    });
    return output;
  }
  function toAbsoluteUrl(base, path) {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    return `${String(base || "").replace(/\/+$/, "")}/${String(path || "").replace(/^\/+/, "")}`;
  }
  function getLocalTodayISO() {
    const now = /* @__PURE__ */ new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  function formatDisplayDate(isoDate, locale = "pt-BR", fallback = "(n\xE3o informado)") {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      return fallback;
    }
    const [year, month, day] = isoDate.split("-");
    if (locale === "pt-BR") {
      return `${day}/${month}/${year}`;
    }
    try {
      const date = /* @__PURE__ */ new Date(`${isoDate}T00:00:00`);
      return new Intl.DateTimeFormat(locale).format(date);
    } catch (e) {
      return `${day}/${month}/${year}`;
    }
  }
  function getJsonErrorMessage(errorJson, fallback) {
    return (errorJson == null ? void 0 : errorJson.message) || (errorJson == null ? void 0 : errorJson.error) || fallback;
  }
  function createHttpError(response, errorJson) {
    const error = new Error(
      getJsonErrorMessage(errorJson, `HTTP ${(response == null ? void 0 : response.status) || 500}`)
    );
    error.status = Number((response == null ? void 0 : response.status) || 500);
    error.payload = errorJson || null;
    return error;
  }
  async function postJson(url, payload, timeoutMs = 15e3, fetchOptions = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...fetchOptions.headers || {}
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        ...fetchOptions
      });
      let data = null;
      try {
        data = await response.json();
      } catch (e) {
        data = null;
      }
      if (!response.ok) {
        throw createHttpError(response, data);
      }
      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }
  function normalizePersonName(value) {
    return String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim();
  }
  function isValidTimeString(value) {
    const normalized = String(value || "");
    if (!/^\d{2}:\d{2}$/.test(normalized)) {
      return false;
    }
    const [hours, minutes] = normalized.split(":").map(Number);
    return Number.isInteger(hours) && Number.isInteger(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  }
  function isSessionInactiveErrorPayload(errorJson, inactiveCode) {
    const errorCode = String((errorJson == null ? void 0 : errorJson.error) || "").toUpperCase();
    return errorCode === String(inactiveCode || "").toUpperCase();
  }
  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  // src/core/form-validation.js
  function setErrorText(container, message) {
    if (!container) return;
    const explicitTextNode = container.querySelector('[id$="Text"]');
    if (explicitTextNode) {
      explicitTextNode.textContent = message;
      return;
    }
    container.textContent = message;
  }
  function showError(errorId, message) {
    const element = document.getElementById(errorId);
    if (!element) return;
    element.removeAttribute("hidden");
    element.style.display = "block";
    if (typeof message === "string") {
      setErrorText(element, message);
    }
    element.setAttribute("role", "alert");
    element.setAttribute("aria-live", "polite");
  }
  function hideError(errorId) {
    const element = document.getElementById(errorId);
    if (!element) return;
    element.style.display = "none";
    element.removeAttribute("role");
    element.removeAttribute("aria-live");
  }
  function markFieldInvalid(field, errorId, message) {
    if (errorId) {
      showError(errorId, message);
    }
    if (field) {
      field.classList.add("invalid");
      field.setAttribute("aria-invalid", "true");
    }
    return false;
  }
  function clearFieldInvalid(field, errorId) {
    if (errorId) {
      hideError(errorId);
    }
    if (field) {
      field.classList.remove("invalid");
      field.removeAttribute("aria-invalid");
    }
    return true;
  }
  function clearAllErrors(config) {
    if (!(config == null ? void 0 : config.errorIds)) return;
    Object.values(config.errorIds).forEach((errorId) => {
      hideError(errorId);
    });
  }
  function clearAllInvalidStates(form) {
    if (!form) return;
    const fields = form.querySelectorAll('[aria-invalid="true"], .invalid');
    fields.forEach((field) => {
      field.classList.remove("invalid");
      field.removeAttribute("aria-invalid");
    });
  }
  function validateEmailInput(input, config, t) {
    const value = normalizeEmail((input == null ? void 0 : input.value) || "");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
    if (!value || !emailRegex.test(value)) {
      return markFieldInvalid(
        input,
        config.errorIds.email,
        t("errors.invalidEmail", "por favor, insira um e-mail v\xE1lido.")
      );
    }
    input.value = value;
    return clearFieldInvalid(input, config.errorIds.email);
  }
  function validateNameInput(input, config, t) {
    const normalized = normalizePersonName((input == null ? void 0 : input.value) || "");
    const words = normalized.split(" ").filter(Boolean);
    const isValid = normalized.length >= 6 && words.length >= 2 && words.slice(0, 2).every((word) => word.length >= 2);
    if (!isValid) {
      return markFieldInvalid(
        input,
        config.errorIds.name,
        t("errors.invalidName", "por favor, preencha seu nome completo.")
      );
    }
    input.value = normalized;
    return clearFieldInvalid(input, config.errorIds.name);
  }
  function validateDateInput(input, config, t) {
    const value = String((input == null ? void 0 : input.value) || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return markFieldInvalid(
        input,
        config.errorIds.date,
        t("errors.invalidDate", "por favor, insira uma data v\xE1lida.")
      );
    }
    const minDate = "1700-01-01";
    const today = getLocalTodayISO();
    if (value < minDate) {
      return markFieldInvalid(
        input,
        config.errorIds.date,
        t("errors.dateTooEarly", "a data n\xE3o pode ser anterior a 1700.")
      );
    }
    if (value > today) {
      return markFieldInvalid(
        input,
        config.errorIds.date,
        t("errors.dateInFuture", "a data n\xE3o pode ser no futuro.")
      );
    }
    return clearFieldInvalid(input, config.errorIds.date);
  }
  function validateTimeInput(input, config, t) {
    const value = String((input == null ? void 0 : input.value) || "");
    if (!isValidTimeString(value)) {
      return markFieldInvalid(
        input,
        config.errorIds.time,
        t("errors.invalidTime", "por favor, insira um hor\xE1rio v\xE1lido.")
      );
    }
    return clearFieldInvalid(input, config.errorIds.time);
  }
  function validateCityInput(input, state, config, t) {
    var _a;
    if (!((_a = state == null ? void 0 : state.city) == null ? void 0 : _a.isValidated)) {
      return markFieldInvalid(
        input,
        config.errorIds.city,
        t("errors.invalidCity", "por favor, selecione uma cidade v\xE1lida da lista.")
      );
    }
    return clearFieldInvalid(input, config.errorIds.city);
  }
  function validatePrivacyCheckbox(input, config, t) {
    if (!(input == null ? void 0 : input.checked)) {
      showError(
        config.errorIds.privacy,
        t(
          "errors.privacyRequired",
          "voc\xEA precisa concordar com a pol\xEDtica de privacidade para continuar."
        )
      );
      input == null ? void 0 : input.setAttribute("aria-invalid", "true");
      return false;
    }
    hideError(config.errorIds.privacy);
    input == null ? void 0 : input.removeAttribute("aria-invalid");
    return true;
  }
  function validateStepFields(stepElement, state, config, t) {
    if (!stepElement) return false;
    const inputs = Array.from(stepElement.querySelectorAll("input"));
    const selects = Array.from(stepElement.querySelectorAll("select"));
    let isValid = true;
    for (const input of inputs) {
      const { name, required, type } = input;
      if (name === config.fields.email) {
        isValid = validateEmailInput(input, config, t) && isValid;
      }
      if (name === config.fields.fullName) {
        isValid = validateNameInput(input, config, t) && isValid;
      }
      if (name === config.fields.birthDate) {
        isValid = validateDateInput(input, config, t) && isValid;
      }
      if (name === config.fields.birthTime) {
        isValid = validateTimeInput(input, config, t) && isValid;
      }
      if (name === config.fields.birthPlace) {
        isValid = validateCityInput(input, state, config, t) && isValid;
      }
      if (required && type !== "hidden" && !input.checkValidity()) {
        input.classList.add("invalid");
        input.setAttribute("aria-invalid", "true");
        isValid = false;
      }
    }
    for (const select of selects) {
      if (select.required && !select.checkValidity()) {
        select.classList.add("invalid");
        select.setAttribute("aria-invalid", "true");
        isValid = false;
      }
    }
    return isValid;
  }

  // src/core/form-storage.js
  function getStorageKeys(config) {
    const productKey = (config == null ? void 0 : config.productKey) || "default";
    return {
      sessionToken: `zdk_${productKey}_session_token`,
      pendingUpdate: `zdk_${productKey}_pending_update`
    };
  }
  function getSessionToken(storageKeys) {
    try {
      return sessionStorage.getItem(storageKeys.sessionToken);
    } catch (e) {
      return null;
    }
  }
  function setSessionToken(storageKeys, token) {
    try {
      if (token) {
        sessionStorage.setItem(storageKeys.sessionToken, token);
      }
    } catch (e) {
    }
  }
  function clearSessionToken(storageKeys) {
    try {
      sessionStorage.removeItem(storageKeys.sessionToken);
    } catch (e) {
    }
  }
  function getPendingUpdate(storageKeys) {
    try {
      const raw = sessionStorage.getItem(storageKeys.pendingUpdate);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
  function setPendingUpdate(storageKeys, payload) {
    try {
      if (!payload) return;
      sessionStorage.setItem(
        storageKeys.pendingUpdate,
        JSON.stringify(payload)
      );
    } catch (e) {
    }
  }
  function clearPendingUpdate(storageKeys) {
    try {
      sessionStorage.removeItem(storageKeys.pendingUpdate);
    } catch (e) {
    }
  }
  function clearAllFormStorage(storageKeys) {
    clearSessionToken(storageKeys);
    clearPendingUpdate(storageKeys);
  }

  // src/core/form-tracking.js
  function getCurrentFormPayload(form, state) {
    var _a;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    if ((_a = state == null ? void 0 : state.city) == null ? void 0 : _a.selectedDisplay) {
      data.birth_place = state.city.selectedDisplay;
    }
    return {
      email: normalizeEmail(data.email || ""),
      name: String(data.name || "").trim(),
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
      birth_place_json: data.birth_place_json || null
    };
  }
  function buildStartSessionPayload(form, config) {
    const emailInput = form.querySelector(`input[name="${config.fields.email}"]`);
    const emailValue = normalizeEmail((emailInput == null ? void 0 : emailInput.value) || "");
    return {
      form_type: config.tracking.formType,
      email: emailValue,
      form_status: "STARTED",
      current_step_index: 0,
      last_completed_step_index: 0,
      highest_completed_step_index: 0,
      current_step_key: getStepKeyByIndex(config, 0),
      last_completed_step_key: getStepKeyByIndex(config, 0),
      highest_completed_step_key: getStepKeyByIndex(config, 0),
      form_data: {
        email: emailValue
      }
    };
  }
  function createProgressSnapshot(currentStepIndex, lastCompletedStepIndex, highestCompletedStepIndex = Math.max(currentStepIndex, lastCompletedStepIndex)) {
    return {
      currentStepIndex,
      lastCompletedStepIndex,
      highestCompletedStepIndex
    };
  }
  function buildProgressPayload({
    state,
    config,
    form,
    currentStepIndex,
    lastCompletedStepIndex,
    highestCompletedStepIndex
  }) {
    return {
      session_token: state.session.token,
      form_status: "IN_PROGRESS",
      current_step_index: currentStepIndex,
      last_completed_step_index: lastCompletedStepIndex,
      highest_completed_step_index: highestCompletedStepIndex,
      current_step_key: getStepKeyByIndex(config, currentStepIndex),
      last_completed_step_key: getStepKeyByIndex(config, lastCompletedStepIndex),
      highest_completed_step_key: getStepKeyByIndex(config, highestCompletedStepIndex),
      form_data: getCurrentFormPayload(form, state)
    };
  }
  function buildSubmitSessionPayload(state, config, form, lastStepIndex) {
    return {
      session_token: state.session.token,
      submit_status: "CREATED",
      current_step_index: lastStepIndex,
      last_completed_step_index: lastStepIndex,
      highest_completed_step_index: lastStepIndex,
      current_step_key: getStepKeyByIndex(config, lastStepIndex),
      last_completed_step_key: getStepKeyByIndex(config, lastStepIndex),
      highest_completed_step_key: getStepKeyByIndex(config, lastStepIndex),
      form_data: getCurrentFormPayload(form, state)
    };
  }
  async function startFormSession({
    state,
    config,
    apiUrls,
    storageKeys,
    form
  }) {
    var _a;
    const payload = buildStartSessionPayload(form, config);
    const data = await postJson(
      apiUrls.formStart,
      payload,
      config.timeouts.formStart
    );
    const token = (_a = data == null ? void 0 : data.session) == null ? void 0 : _a.session_token;
    if (!token) {
      throw new Error("Missing form session token");
    }
    state.session.token = token;
    state.session.isStarted = true;
    setSessionToken(storageKeys, token);
    return true;
  }
  async function updateFormSessionProgress({
    state,
    config,
    apiUrls,
    storageKeys,
    form,
    targetStepIndex,
    previousStepIndex
  }) {
    var _a;
    if (!((_a = state == null ? void 0 : state.session) == null ? void 0 : _a.token)) return;
    const snapshot = createProgressSnapshot(
      targetStepIndex,
      previousStepIndex
    );
    const payload = buildProgressPayload({
      state,
      config,
      form,
      currentStepIndex: snapshot.currentStepIndex,
      lastCompletedStepIndex: snapshot.lastCompletedStepIndex,
      highestCompletedStepIndex: snapshot.highestCompletedStepIndex
    });
    setPendingUpdate(storageKeys, payload);
    await postJson(
      apiUrls.formUpdate,
      payload,
      config.timeouts.formUpdate
    );
    clearPendingUpdate(storageKeys);
  }
  async function flushPendingUpdate({
    config,
    apiUrls,
    storageKeys,
    onTrackingError
  }) {
    const pendingPayload = getPendingUpdate(storageKeys);
    if (!pendingPayload) {
      return {
        ok: true,
        flushed: false,
        handled: false,
        reason: null
      };
    }
    try {
      await postJson(
        apiUrls.formUpdate,
        pendingPayload,
        config.timeouts.formUpdate
      );
      clearPendingUpdate(storageKeys);
      return {
        ok: true,
        flushed: true,
        handled: false,
        reason: null
      };
    } catch (error) {
      const handled = typeof onTrackingError === "function" ? await onTrackingError(error) : false;
      return {
        ok: false,
        flushed: false,
        handled,
        reason: handled ? "handled_error" : "network_or_unknown_error"
      };
    }
  }
  function flushPendingUpdateWithKeepalive({
    apiUrls,
    storageKeys
  }) {
    const pendingPayload = getPendingUpdate(storageKeys);
    if (!pendingPayload) return;
    try {
      fetch(apiUrls.formUpdate, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(pendingPayload),
        keepalive: true
      }).catch(() => {
      });
    } catch (e) {
    }
  }
  async function markFormSessionSubmitted({
    state,
    config,
    apiUrls,
    form,
    lastStepIndex
  }) {
    var _a;
    if (!((_a = state == null ? void 0 : state.session) == null ? void 0 : _a.token)) return;
    const payload = buildSubmitSessionPayload(state, config, form, lastStepIndex);
    await postJson(
      apiUrls.formSubmit,
      payload,
      config.timeouts.formSubmit
    );
  }
  async function linkFormSessionToRequest({
    state,
    apiUrls,
    requestId
  }) {
    var _a;
    if (!((_a = state == null ? void 0 : state.session) == null ? void 0 : _a.token) || !requestId) return;
    await postJson(apiUrls.formLinkRequest, {
      session_token: state.session.token,
      request_id: requestId
    });
  }
  async function handleTrackingError({
    error,
    state,
    config,
    storageKeys,
    onSessionInactive
  }) {
    const payload = (error == null ? void 0 : error.payload) || null;
    const status = Number((error == null ? void 0 : error.status) || 0);
    if (status === 409 && isSessionInactiveErrorPayload(payload, config.tracking.sessionInactiveCode)) {
      clearSessionState(state);
      clearSessionToken(storageKeys);
      clearPendingUpdate(storageKeys);
      if (typeof onSessionInactive === "function") {
        await onSessionInactive();
      }
      return true;
    }
    return false;
  }
  function createDraftSyncScheduler({
    state,
    config,
    apiUrls,
    storageKeys,
    form,
    onTrackingError
  }) {
    return function scheduleDraftSync() {
      var _a;
      if (!((_a = state == null ? void 0 : state.session) == null ? void 0 : _a.token)) return;
      clearTimeout(state.tracking.draftSyncTimer);
      state.tracking.draftSyncTimer = setTimeout(async () => {
        const snapshot = createProgressSnapshot(
          state.ui.currentStepIndex,
          Math.max(0, state.ui.currentStepIndex - 1),
          state.ui.currentStepIndex
        );
        const payload = buildProgressPayload({
          state,
          config,
          form,
          currentStepIndex: snapshot.currentStepIndex,
          lastCompletedStepIndex: snapshot.lastCompletedStepIndex,
          highestCompletedStepIndex: snapshot.highestCompletedStepIndex
        });
        try {
          setPendingUpdate(storageKeys, payload);
          await postJson(
            apiUrls.formUpdate,
            payload,
            config.timeouts.formUpdate
          );
          clearPendingUpdate(storageKeys);
        } catch (error) {
          console.error("[ZDK] Draft sync error:", error);
          if (typeof onTrackingError === "function") {
            await onTrackingError(error);
          }
        }
      }, config.tracking.debounceMs);
    };
  }
  function bindDraftTrackingListeners({
    form,
    config,
    state,
    cityInput,
    scheduleDraftSync
  }) {
    const trackableFieldNames = /* @__PURE__ */ new Set([
      config.fields.email,
      config.fields.fullName,
      config.fields.birthDate,
      config.fields.birthTime,
      config.fields.birthPlace
    ]);
    form.addEventListener("input", (event) => {
      var _a;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!("name" in target)) return;
      const fieldName = target.name;
      if (!trackableFieldNames.has(fieldName)) return;
      if (!((_a = state == null ? void 0 : state.session) == null ? void 0 : _a.token)) return;
      if (fieldName === config.fields.birthPlace) {
        if (cityInput && cityInput.value !== state.city.selectedDisplay) {
          state.city.isValidated = false;
        }
      }
      scheduleDraftSync();
    });
    form.addEventListener("change", (event) => {
      var _a;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!("name" in target)) return;
      if (!trackableFieldNames.has(target.name)) return;
      if (!((_a = state == null ? void 0 : state.session) == null ? void 0 : _a.token)) return;
      scheduleDraftSync();
    });
    form.addEventListener(
      "blur",
      (event) => {
        var _a;
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (!("name" in target)) return;
        if (!trackableFieldNames.has(target.name)) return;
        if (!((_a = state == null ? void 0 : state.session) == null ? void 0 : _a.token)) return;
        scheduleDraftSync();
      },
      true
    );
  }

  // src/core/form-submit.js
  function buildCheckoutPayload(form, state, config) {
    var _a, _b;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.birth_place = ((_a = state == null ? void 0 : state.city) == null ? void 0 : _a.selectedDisplay) || payload.birth_place || "";
    payload.product_type = config.tracking.formType;
    payload.privacyConsent = true;
    payload.privacy_agreed = true;
    payload.privacy_policy = "on";
    payload.form_session_token = ((_b = state == null ? void 0 : state.session) == null ? void 0 : _b.token) || null;
    return payload;
  }
  async function submitCheckoutRequest({
    form,
    state,
    config,
    apiUrls
  }) {
    const payload = buildCheckoutPayload(form, state, config);
    return postJson(
      apiUrls.checkoutSubmit,
      payload,
      config.timeouts.checkoutSubmit
    );
  }
  function redirectToCheckoutUrl(url) {
    window.location.href = url;
  }
  function hasCheckoutRedirectUrl(responseData) {
    return Boolean(responseData == null ? void 0 : responseData.url);
  }

  // src/core/form-overlays.js
  function focusFirstInteractive2(rootElement) {
    if (!rootElement) return;
    const selectors = [
      'input:not([type="hidden"]):not([disabled])',
      "button:not([disabled])",
      "a[href]",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])'
    ];
    for (const selector of selectors) {
      const target = rootElement.querySelector(selector);
      if (target) {
        target.focus({ preventScroll: true });
        return;
      }
    }
  }
  function openOverlay({ overlayElement, state }) {
    if (!overlayElement || !(state == null ? void 0 : state.ui)) return;
    state.ui.lastFocusedBeforeOverlay = document.activeElement;
    overlayElement.style.display = "flex";
    function trapTabKey(event) {
      if (event.key !== "Tab") return;
      const focusables = Array.from(
        overlayElement.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute("disabled"));
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
    overlayElement.addEventListener("keydown", trapTabKey);
    overlayElement._zdkTrapHandler = trapTabKey;
    requestAnimationFrame(() => {
      focusFirstInteractive2(overlayElement);
    });
  }
  function closeOverlay({ overlayElement, state }) {
    var _a;
    if (!overlayElement) return;
    overlayElement.style.display = "none";
    if (overlayElement._zdkTrapHandler) {
      overlayElement.removeEventListener(
        "keydown",
        overlayElement._zdkTrapHandler
      );
      overlayElement._zdkTrapHandler = null;
    }
    const previousFocus = (_a = state == null ? void 0 : state.ui) == null ? void 0 : _a.lastFocusedBeforeOverlay;
    if (previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus();
    }
  }
  function setSessionExpiredOverlayContent({ errorOverlay, t }) {
    if (!errorOverlay) return;
    const heading = errorOverlay.querySelector("h2");
    const paragraph = errorOverlay.querySelector("p");
    if (heading) {
      heading.textContent = t(
        "overlays.sessionExpiredTitle",
        "sua sess\xE3o expirou"
      );
    }
    if (paragraph) {
      paragraph.textContent = t(
        "overlays.sessionExpiredBody",
        "por seguran\xE7a, esta sess\xE3o do formul\xE1rio n\xE3o est\xE1 mais ativa. por favor, comece novamente."
      );
    }
  }
  function showSessionExpiredOverlay({
    spinnerOverlay,
    errorOverlay,
    state,
    t
  }) {
    closeOverlay({ overlayElement: spinnerOverlay, state });
    setSessionExpiredOverlayContent({ errorOverlay, t });
    openOverlay({ overlayElement: errorOverlay, state });
  }

  // src/core/form-dom.js
  function resolveDom(selectors) {
    const form = document.querySelector(selectors.form);
    const formScope = form || document;
    return {
      appRoot: document.querySelector(selectors.appRoot),
      form,
      steps: Array.from(formScope.querySelectorAll(selectors.steps)),
      progressSteps: Array.from(
        document.querySelectorAll(selectors.progressSteps)
      ),
      spinnerOverlay: document.querySelector(selectors.spinnerOverlay),
      errorOverlay: document.querySelector(selectors.errorOverlay),
      cityInput: document.querySelector(selectors.cityInput),
      privacyCheckbox: document.querySelector(selectors.privacyCheckbox),
      confirmationSummary: document.querySelector(
        selectors.confirmationSummary
      )
    };
  }
  function hasRequiredDom(dom) {
    return Boolean(
      (dom == null ? void 0 : dom.form) && Array.isArray(dom == null ? void 0 : dom.steps) && dom.steps.length > 0
    );
  }
  function getNamedInput(form, name) {
    if (!form || !name) return null;
    return form.querySelector(`[name="${name}"]`);
  }
  function setElementValueById(id, value) {
    if (!id) return;
    const element = document.getElementById(id);
    if (!element) return;
    element.value = value != null ? value : "";
  }
  function clearElementValuesById(ids) {
    if (!Array.isArray(ids)) return;
    ids.forEach((id) => {
      setElementValueById(id, "");
    });
  }
  function getPlaceHiddenFieldIds(config) {
    if (!(config == null ? void 0 : config.hiddenFields)) return [];
    return [
      config.hiddenFields.placeId,
      config.hiddenFields.fullAddress,
      config.hiddenFields.country,
      config.hiddenFields.admin1,
      config.hiddenFields.admin2,
      config.hiddenFields.lat,
      config.hiddenFields.lng,
      config.hiddenFields.json
    ].filter(Boolean);
  }

  // src/i18n/messages.js
  var messages = {
    "pt-BR": {
      errors: {
        invalidEmail: "por favor, insira um e-mail v\xE1lido.",
        invalidName: "por favor, preencha seu nome completo.",
        invalidDate: "por favor, insira uma data v\xE1lida.",
        dateTooEarly: "a data n\xE3o pode ser anterior a 1700.",
        dateInFuture: "a data n\xE3o pode ser no futuro.",
        invalidTime: "por favor, insira um hor\xE1rio v\xE1lido.",
        invalidCity: "por favor, selecione uma cidade v\xE1lida da lista.",
        privacyRequired: "voc\xEA precisa concordar com a pol\xEDtica de privacidade para continuar.",
        startSessionFailed: "n\xE3o foi poss\xEDvel iniciar sua sess\xE3o agora. tente novamente.",
        checkoutUrlMissing: "URL de pagamento n\xE3o recebida."
      },
      overlays: {
        sessionExpiredTitle: "sua sess\xE3o expirou",
        sessionExpiredBody: "por seguran\xE7a, esta sess\xE3o do formul\xE1rio n\xE3o est\xE1 mais ativa. por favor, comece novamente."
      },
      confirmation: {
        email: "e-mail",
        name: "nome",
        birthDate: "data de nascimento",
        birthTime: "hora de nascimento",
        birthPlace: "cidade de nascimento",
        notProvided: "(n\xE3o informado)"
      }
    },
    "en-US": {
      errors: {
        invalidEmail: "please enter a valid email address.",
        invalidName: "please enter your full name.",
        invalidDate: "please enter a valid date.",
        dateTooEarly: "date cannot be earlier than 1700.",
        dateInFuture: "date cannot be in the future.",
        invalidTime: "please enter a valid time.",
        invalidCity: "please select a valid city from the list.",
        privacyRequired: "you must agree to the privacy policy to continue.",
        startSessionFailed: "we could not start your session. please try again.",
        checkoutUrlMissing: "payment URL not received."
      },
      overlays: {
        sessionExpiredTitle: "your session has expired",
        sessionExpiredBody: "for security reasons, this form session is no longer active. please start again."
      },
      confirmation: {
        email: "email",
        name: "name",
        birthDate: "birth date",
        birthTime: "birth time",
        birthPlace: "birth city",
        notProvided: "(not provided)"
      }
    }
  };
  function createTranslator(dictionary, locale) {
    const lang = (dictionary == null ? void 0 : dictionary[locale]) || {};
    return function t(key, fallback = "") {
      if (!key) return fallback;
      const parts = key.split(".");
      let value = lang;
      for (const part of parts) {
        if (value && typeof value === "object" && part in value) {
          value = value[part];
        } else {
          return fallback || key;
        }
      }
      return typeof value === "string" ? value : fallback || key;
    };
  }

  // src/core/form-app.js
  function createFormApp(productConfig) {
    const config = deepMerge(productConfig, window.ZDK_FORM_CONFIG || {});
    const dom = resolveDom(config.selectors);
    if (!hasRequiredDom(dom)) return null;
    const mergedMessages = deepMerge(messages, window.ZDK_FORM_MESSAGES || {});
    const t = createTranslator(mergedMessages, config.locale);
    const state = createInitialFormState();
    const storageKeys = getStorageKeys(config);
    const apiUrls = Object.fromEntries(
      Object.entries(config.endpoints).map(([k, v]) => [
        k,
        toAbsoluteUrl(config.apiBaseUrl, v)
      ])
    );
    const placeHiddenFieldIds = getPlaceHiddenFieldIds(config);
    function ensureErrorContainersAreStyleControlled() {
      Object.values(config.errorIds || {}).forEach((errorId) => {
        const element = document.getElementById(errorId);
        if (element) {
          element.removeAttribute("hidden");
          element.style.display = "none";
        }
      });
    }
    function setInitialFieldConstraints() {
      const birthDateInput = getNamedInput(dom.form, config.fields.birthDate);
      if (birthDateInput) {
        const now = /* @__PURE__ */ new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        birthDateInput.max = `${year}-${month}-${day}`;
      }
      const birthTimeInput = getNamedInput(dom.form, config.fields.birthTime);
      if (birthTimeInput) {
        birthTimeInput.setAttribute("step", "60");
        birthTimeInput.setAttribute("inputmode", "numeric");
      }
    }
    function resetCitySelectionState() {
      state.city.isValidated = false;
      state.city.selectedDisplay = "";
      state.city.placePayload = null;
      clearElementValuesById(placeHiddenFieldIds);
    }
    function fillConfirmationSummary() {
      if (!dom.confirmationSummary || !Array.isArray(config.confirmationFields)) return;
      const formData = new FormData(dom.form);
      const data = Object.fromEntries(formData.entries());
      const fallback = t("confirmation.notProvided", "(n\xE3o informado)");
      const list = document.createElement("ul");
      config.confirmationFields.forEach(({ key, labelKey }) => {
        let value = data[key] || fallback;
        if (key === config.fields.birthDate) {
          value = formatDisplayDate(value, config.locale, fallback);
        }
        if (key === config.fields.birthPlace) {
          value = state.city.selectedDisplay || value || fallback;
        }
        const item = document.createElement("li");
        const strong = document.createElement("strong");
        strong.textContent = `${t(labelKey, key)}: `;
        item.appendChild(strong);
        item.appendChild(document.createTextNode(value || fallback));
        list.appendChild(item);
      });
      dom.confirmationSummary.replaceChildren(list);
    }
    function resetForm() {
      dom.form.reset();
      resetFormState(state);
      clearAllFormStorage(storageKeys);
      clearAllErrors(config);
      clearAllInvalidStates(dom.form);
      clearElementValuesById(placeHiddenFieldIds);
      if (dom.confirmationSummary) {
        dom.confirmationSummary.replaceChildren();
      }
      closeOverlay({ overlayElement: dom.spinnerOverlay, state });
      closeOverlay({ overlayElement: dom.errorOverlay, state });
      showStep({ dom, state, index: 0 });
    }
    function initAutocomplete() {
      var _a;
      if (!((_a = config.integrations) == null ? void 0 : _a.usesGooglePlaces)) return;
      if (!dom.cityInput || !window.google || !google.maps || !google.maps.places) return;
      if (dom.cityInput.dataset.autocompleteBound === "true") return;
      dom.cityInput.dataset.autocompleteBound = "true";
      const autocomplete = new google.maps.places.Autocomplete(dom.cityInput, {
        types: ["(cities)"]
      });
      if (typeof autocomplete.setFields === "function") {
        autocomplete.setFields([
          "place_id",
          "name",
          "formatted_address",
          "address_components",
          "geometry"
        ]);
      }
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place || !place.place_id || !place.geometry || !place.geometry.location) {
          resetCitySelectionState();
          validateCityInput(dom.cityInput, state, config, t);
          return;
        }
        const components = place.address_components || [];
        const pick = (type) => {
          const component = components.find((item) => (item.types || []).includes(type));
          return component ? component.short_name || component.long_name || "" : "";
        };
        const countryRaw = pick("country");
        const admin1 = pick("administrative_area_level_1");
        const admin2 = pick("administrative_area_level_2");
        const name = place.name || admin2 || "";
        const countryPretty = countryRaw === "Brazil" || countryRaw === "Brasil" ? "Brasil" : countryRaw === "United States" ? "EUA" : countryRaw;
        const displayValue = [name, admin1, countryPretty].filter(Boolean).join(", ");
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        state.city.placePayload = {
          place_id: place.place_id,
          formatted_address: place.formatted_address || displayValue,
          name: place.name || name,
          address_components: components,
          country: countryRaw,
          admin1,
          admin2,
          lat,
          lng
        };
        state.city.selectedDisplay = displayValue;
        state.city.isValidated = true;
        dom.cityInput.value = displayValue;
        setElementValueById(config.hiddenFields.placeId, place.place_id || "");
        setElementValueById(config.hiddenFields.fullAddress, place.formatted_address || displayValue || "");
        setElementValueById(config.hiddenFields.country, countryRaw || "");
        setElementValueById(config.hiddenFields.admin1, admin1 || "");
        setElementValueById(config.hiddenFields.admin2, admin2 || "");
        setElementValueById(config.hiddenFields.lat, String(lat));
        setElementValueById(config.hiddenFields.lng, String(lng));
        setElementValueById(
          config.hiddenFields.json,
          JSON.stringify({
            place_id: place.place_id,
            formatted_address: place.formatted_address,
            name: place.name,
            address_components: components
          })
        );
        validateCityInput(dom.cityInput, state, config, t);
      });
      dom.cityInput.addEventListener("input", () => {
        if (dom.cityInput.value !== state.city.selectedDisplay) {
          resetCitySelectionState();
        }
      });
    }
    window.initAutocomplete = initAutocomplete;
    const scheduleDraftSync = createDraftSyncScheduler({
      state,
      config,
      apiUrls,
      storageKeys,
      form: dom.form,
      onTrackingError
    });
    function onTrackingError(error) {
      return handleTrackingError({
        error,
        state,
        config,
        storageKeys,
        onSessionInactive: () => showSessionExpiredOverlay({
          spinnerOverlay: dom.spinnerOverlay,
          errorOverlay: dom.errorOverlay,
          state,
          t
        })
      });
    }
    function restoreClientSession() {
      const token = getSessionToken(storageKeys);
      const pending = getPendingUpdate(storageKeys);
      if (token) {
        state.session.token = token;
        state.session.isStarted = true;
      }
      if ((pending == null ? void 0 : pending.current_step_index) != null) {
        state.ui.currentStepIndex = clamp(
          Number(pending.current_step_index),
          0,
          dom.steps.length - 1
        );
      }
    }
    async function nextStep() {
      if (!canAdvanceToNextStep(dom, state) || state.tracking.isSyncingStep) return;
      const currentStep = getCurrentStepElement(dom, state);
      if (!validateStepFields(currentStep, state, config, t)) return;
      state.tracking.isSyncingStep = true;
      try {
        const previousStepIndex = state.ui.currentStepIndex;
        const nextIndex = getNextStepIndex(state);
        if (!state.session.token && previousStepIndex === 0) {
          await startFormSession({
            state,
            config,
            apiUrls,
            storageKeys,
            form: dom.form
          });
          if (nextIndex === dom.steps.length - 1) {
            fillConfirmationSummary();
          }
          showStep({ dom, state, index: nextIndex });
          return;
        }
        const flushResult = await flushPendingUpdate({
          config,
          apiUrls,
          storageKeys,
          onTrackingError
        });
        if (flushResult == null ? void 0 : flushResult.handled) {
          return;
        }
        if (nextIndex === dom.steps.length - 1) {
          fillConfirmationSummary();
        }
        showStep({ dom, state, index: nextIndex });
        if (state.session.token) {
          updateFormSessionProgress({
            state,
            config,
            apiUrls,
            storageKeys,
            form: dom.form,
            targetStepIndex: nextIndex,
            previousStepIndex
          }).catch(async (error) => {
            await onTrackingError(error);
          });
        }
      } catch (error) {
        const handled = await onTrackingError(error);
        if (!handled) {
          showError(
            config.errorIds.email,
            t("errors.startSessionFailed", "n\xE3o foi poss\xEDvel iniciar sua sess\xE3o agora. tente novamente.")
          );
        }
      } finally {
        state.tracking.isSyncingStep = false;
      }
    }
    async function prevStep() {
      if (!canGoToPreviousStep(state)) return;
      showStep({ dom, state, index: getPreviousStepIndex(state) });
    }
    async function submitCheckout(event) {
      event.preventDefault();
      if (state.ui.isSubmitting) return;
      state.ui.isSubmitting = true;
      try {
        const currentStep = getCurrentStepElement(dom, state);
        if (!validateStepFields(currentStep, state, config, t)) return;
        if (!validateCityInput(dom.cityInput, state, config, t)) return;
        if (!validatePrivacyCheckbox(dom.privacyCheckbox, config, t)) return;
        const flushResult = await flushPendingUpdate({
          config,
          apiUrls,
          storageKeys,
          onTrackingError
        });
        if (flushResult == null ? void 0 : flushResult.handled) {
          return;
        }
        if (state.session.token) {
          await markFormSessionSubmitted({
            state,
            config,
            apiUrls,
            form: dom.form,
            lastStepIndex: dom.steps.length - 1
          });
        }
        openOverlay({ overlayElement: dom.spinnerOverlay, state });
        const response = await submitCheckoutRequest({
          form: dom.form,
          state,
          config,
          apiUrls
        });
        if (state.session.token && (response == null ? void 0 : response.request_id)) {
          try {
            await linkFormSessionToRequest({
              state,
              apiUrls,
              requestId: response.request_id
            });
          } catch (e) {
          }
        }
        if (!hasCheckoutRedirectUrl(response)) {
          throw new Error(t("errors.checkoutUrlMissing", "URL de pagamento n\xE3o recebida."));
        }
        redirectToCheckoutUrl(response.url);
      } catch (error) {
        const handled = await onTrackingError(error);
        if (handled) {
          return;
        }
        closeOverlay({ overlayElement: dom.spinnerOverlay, state });
        openOverlay({ overlayElement: dom.errorOverlay, state });
        const backendMessage = String((error == null ? void 0 : error.message) || "").toLowerCase();
        if (backendMessage.includes("privacy")) {
          showError(config.errorIds.privacy, error.message);
        }
      } finally {
        state.ui.isSubmitting = false;
      }
    }
    function bindEvents() {
      dom.form.addEventListener("submit", submitCheckout);
      dom.form.addEventListener("click", (e) => {
        var _a;
        const action = (_a = e.target.closest("[data-action]")) == null ? void 0 : _a.dataset.action;
        if (action === "next") nextStep();
        if (action === "back") prevStep();
        if (action === "reset") resetForm();
      });
      dom.form.addEventListener("keydown", (event) => {
        var _a;
        if (event.key !== "Enter") return;
        const target = event.target;
        const tagName = String((target == null ? void 0 : target.tagName) || "").toLowerCase();
        const inputType = String(((_a = target == null ? void 0 : target.getAttribute) == null ? void 0 : _a.call(target, "type")) || "").toLowerCase();
        const isCheckbox = tagName === "input" && inputType === "checkbox";
        const isButton = tagName === "button";
        const isLastStep = state.ui.currentStepIndex === dom.steps.length - 1;
        if (!isLastStep && !isCheckbox && !isButton) {
          event.preventDefault();
          nextStep();
        }
      });
      bindDraftTrackingListeners({
        form: dom.form,
        config,
        state,
        cityInput: dom.cityInput,
        scheduleDraftSync
      });
      window.addEventListener(
        "pagehide",
        () => flushPendingUpdateWithKeepalive({ apiUrls, storageKeys })
      );
    }
    function init() {
      ensureErrorContainersAreStyleControlled();
      setInitialFieldConstraints();
      restoreClientSession();
      bindEvents();
      initAutocomplete();
      showStep({ dom, state, index: state.ui.currentStepIndex });
      if (state.ui.currentStepIndex === dom.steps.length - 1) {
        fillConfirmationSummary();
      }
    }
    return { init };
  }
  function mountFormApp(config) {
    const app = createFormApp(config);
    if (!app) return;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => app.init(), { once: true });
    } else {
      app.init();
    }
  }

  // src/bundles/birth-chart.bundle.js
  mountFormApp(birth_chart_config_default);
})();
