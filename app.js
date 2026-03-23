const STORAGE_KEY = "antdelay_dates_v1";
const STORAGE_DEBOUNCE = 250;
const POLICY_CONSENT_KEY = "antdelay_policy_consent_v1";

let state = null;
let saveTimeout = null;
let syncTodayButtonEl = null;
let didInitialTodayScroll = false;
let todaySyncScrollRaf = null;
let johnPorkLayerEl = null;
let johnPorkToggleBtn = null;
let johnPorkOnTop = false;
let subscriptionModalEl = null;
let subscriptionReasonEl = null;
let subscriptionStatusEl = null;
let checkoutModalEl = null;
let checkoutStatusEl = null;
let checkoutPlanEl = null;
let checkoutTermEl = null;
let checkoutActivationInputEl = null;
let checkoutSelectedPlan = "none";
let checkoutSelectedTerm = "";
let activationSuccessModalEl = null;
let activationSuccessTextEl = null;
let privacyPolicyModalEl = null;
let termsModalEl = null;
let aboutModalEl = null;
let aboutModeToggleEl = null;
let aboutProductContentEl = null;
let aboutMemeContentEl = null;
let aboutMemeMode = false;
let consentModalEl = null;
let consentAgreeBtnEl = null;
let consentDeclineBtnEl = null;

const PLAN_NONE = "none";
const PLAN_BASIC = "basic";
const PLAN_PLUS = "plus";
const PLAN_PRO = "pro";

const PLAN_RANK = {
  [PLAN_NONE]: 0,
  [PLAN_BASIC]: 1,
  [PLAN_PLUS]: 2,
  [PLAN_PRO]: 3,
};

const ACTIVATION_KEYS = {
  [PLAN_BASIC]: new Set([
    "BSC-JPORK-404-CALL-ME-NOW-7XQ9",
    "BASIC-PORK-LOST-SIGNAL-88ZX",
    "JP-HELLO-ITS-ME-DO-NOT-ANSWER-13",
    "PORK-LITE-WHO-DIS-9KLM",
  ]),
  [PLAN_PLUS]: new Set([
    "PLUS-JOHN-PORK-CALLING-YOU-AGAIN-77VX",
    "JPORK-PREMIUM-PLEASE-PICK-UP-911",
    "WHO-LET-PORK-INTO-PROD-66AB",
    "CALL-FROM-JOHN-PORK-UNLIMITED-3F9Z",
  ]),
  [PLAN_PRO]: new Set([
    "PRO-JOHN-PORK-ALWAYS-WATCHING-0001",
    "JPORK-ENTERPRISE-CALL-ACCEPTED-999X",
    "GODMODE-PORK-ROOT-ACCESS-777777",
    "THE-PORK-IS-INEVITABLE-PRO-MAX-42",
  ]),
};

function nowISO() {
  return new Date().toISOString();
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatLocalDateKey(y, month0, day) {
  return `${y}-${String(month0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayDate() {
  const t = new Date();
  return formatLocalDateKey(t.getFullYear(), t.getMonth(), t.getDate());
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistState() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, STORAGE_DEBOUNCE);
}

function withStateChange(mutator) {
  mutator();
  state.meta.lastUpdatedAt = nowISO();
  persistState();
  render();
}

function normalizePlan(plan) {
  if (plan === PLAN_BASIC || plan === PLAN_PLUS || plan === PLAN_PRO) return plan;
  return PLAN_NONE;
}

function currentPlan() {
  return normalizePlan(state && state.meta ? state.meta.plan : PLAN_NONE);
}

function hasPlan(requiredPlan) {
  return PLAN_RANK[currentPlan()] >= PLAN_RANK[requiredPlan];
}

function planLabel(plan) {
  if (plan === PLAN_BASIC) return "Basic";
  if (plan === PLAN_PLUS) return "Plus";
  if (plan === PLAN_PRO) return "Pro";
  return "No plan";
}

function openSubscriptionModal(reasonText) {
  if (!subscriptionModalEl) return;
  if (subscriptionReasonEl) {
    subscriptionReasonEl.textContent =
      reasonText || "Choose a subscription plan to unlock this feature.";
  }
  if (subscriptionStatusEl) subscriptionStatusEl.textContent = "";
  subscriptionModalEl.classList.add("subscription-modal-backdrop--visible");
}

function closeSubscriptionModal() {
  if (!subscriptionModalEl) return;
  subscriptionModalEl.classList.remove("subscription-modal-backdrop--visible");
}

function setSubscriptionStatus(message) {
  if (!subscriptionStatusEl) return;
  subscriptionStatusEl.textContent = message || "";
}

function setCheckoutStatus(message) {
  if (!checkoutStatusEl) return;
  checkoutStatusEl.textContent = message || "";
}

function openActivationSuccessModal(message) {
  if (!activationSuccessModalEl) return;
  if (activationSuccessTextEl) {
    activationSuccessTextEl.textContent =
      message || "Congratulations! Your activation was successful.";
  }
  activationSuccessModalEl.classList.add("activation-success-backdrop--visible");
}

function closeActivationSuccessModal() {
  if (!activationSuccessModalEl) return;
  activationSuccessModalEl.classList.remove("activation-success-backdrop--visible");
}

function openPrivacyPolicyModal() {
  if (!privacyPolicyModalEl) return;
  privacyPolicyModalEl.classList.add("privacy-policy-backdrop--visible");
}

function closePrivacyPolicyModal() {
  if (!privacyPolicyModalEl) return;
  privacyPolicyModalEl.classList.remove("privacy-policy-backdrop--visible");
}

function openAboutModal() {
  if (!aboutModalEl) return;
  aboutModalEl.classList.add("about-backdrop--visible");
}

function closeAboutModal() {
  if (!aboutModalEl) return;
  aboutModalEl.classList.remove("about-backdrop--visible");
}

function openTermsModal() {
  if (!termsModalEl) return;
  termsModalEl.classList.add("terms-backdrop--visible");
}

function closeTermsModal() {
  if (!termsModalEl) return;
  termsModalEl.classList.remove("terms-backdrop--visible");
}

function hasPolicyConsent() {
  try {
    return localStorage.getItem(POLICY_CONSENT_KEY) === "true";
  } catch {
    return false;
  }
}

function openPolicyConsentModal() {
  if (consentModalEl) {
    consentModalEl.classList.add("consent-backdrop--visible");
    return;
  }

  const consentBackdrop = document.createElement("div");
  consentBackdrop.className = "consent-backdrop";
  consentBackdrop.innerHTML = `
    <div class="consent-modal" role="dialog" aria-modal="true" aria-labelledby="consent-heading">
      <div class="consent-content">
        <article class="consent-article">
          <header class="consent-doc-header">
            <h1 id="consent-heading" class="consent-h1">Before you continue</h1>
            <p class="consent-updated">Please review both policies. Then check the box below.</p>
          </header>
        </article>
        <div class="consent-policies"></div>
      </div>

      <div class="consent-actions">
        <button type="button" class="consent-accept-btn js-consent-agree">
          Toi dong tinh
        </button>
        <button
          type="button"
          class="consent-decline-btn js-consent-decline"
          disabled
          aria-disabled="true"
        >
          Toi khong dong tinh
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(consentBackdrop);
  consentModalEl = consentBackdrop;

  const consentPoliciesEl = consentBackdrop.querySelector(".consent-policies");
  const privacyArticle = privacyPolicyModalEl?.querySelector(".privacy-policy-article");
  const termsArticle = termsModalEl?.querySelector(".terms-article");

  if (termsArticle) {
    const clone = termsArticle.cloneNode(true);
    clone.querySelectorAll(".terms-close, .subscription-modal-close").forEach((x) => x.remove());
    consentPoliciesEl.appendChild(clone);
  }
  if (privacyArticle) {
    const clone = privacyArticle.cloneNode(true);
    clone.querySelectorAll(".js-privacy-policy-close").forEach((x) => x.remove());
    consentPoliciesEl.appendChild(clone);
  }

  consentAgreeBtnEl = consentBackdrop.querySelector(".js-consent-agree");
  if (consentAgreeBtnEl) {
    consentAgreeBtnEl.addEventListener("click", () => {
      try {
        localStorage.setItem(POLICY_CONSENT_KEY, "true");
      } catch {
        // ignore
      }
      closePolicyConsentModal();
      if (!hasPlan(PLAN_BASIC)) {
        openSubscriptionModal("Choose a plan to start using AntDelay.");
      }
    });
  }

  consentDeclineBtnEl = consentBackdrop.querySelector(".js-consent-decline");
  consentModalEl.classList.add("consent-backdrop--visible");
}

function closePolicyConsentModal() {
  if (!consentModalEl) return;
  consentModalEl.classList.remove("consent-backdrop--visible");
}

function applyAboutMode(enabled) {
  aboutMemeMode = enabled === true;
  if (aboutModeToggleEl) {
    aboutModeToggleEl.checked = aboutMemeMode;
    aboutModeToggleEl.setAttribute("aria-checked", aboutMemeMode ? "true" : "false");
  }
  if (aboutProductContentEl) {
    aboutProductContentEl.classList.toggle("about-mode--hidden", aboutMemeMode);
  }
  if (aboutMemeContentEl) {
    aboutMemeContentEl.classList.toggle("about-mode--hidden", !aboutMemeMode);
  }
}

function closeCheckoutModal() {
  if (!checkoutModalEl) return;
  checkoutModalEl.classList.remove("checkout-modal-backdrop--visible");
}

function openCheckoutModal(plan, term) {
  if (!checkoutModalEl) return;
  checkoutSelectedPlan = normalizePlan(plan);
  checkoutSelectedTerm = term || "";
  if (checkoutPlanEl) checkoutPlanEl.textContent = planLabel(checkoutSelectedPlan);
  if (checkoutTermEl) checkoutTermEl.textContent = checkoutSelectedTerm || "Custom term";
  if (checkoutActivationInputEl) checkoutActivationInputEl.value = "";
  setCheckoutStatus(
    "Choose any payment method, or use an activation key instead of purchasing."
  );
  checkoutModalEl.classList.add("checkout-modal-backdrop--visible");
}

function handlePaymentAttempt() {
  setCheckoutStatus(
    "Payment could not be completed right now. You can try another method or use an activation key instead."
  );
}

function handleActivationAttempt() {
  if (!checkoutActivationInputEl) return;
  const key = checkoutActivationInputEl.value.trim().toUpperCase();
  const allowedKeys = ACTIVATION_KEYS[checkoutSelectedPlan];
  if (!allowedKeys || !allowedKeys.has(key)) {
    setCheckoutStatus("Invalid activation key for this plan. Please try again.");
    return;
  }
  withStateChange(() => {
    state.meta.plan = checkoutSelectedPlan;
  });
  setSubscriptionStatus(
    `Activation successful for ${planLabel(checkoutSelectedPlan)} (${checkoutSelectedTerm}).`
  );
  closeCheckoutModal();
  closeSubscriptionModal();
  openActivationSuccessModal(
    `Congratulations! You activated ${planLabel(checkoutSelectedPlan)} (${checkoutSelectedTerm}) successfully.`
  );
}

function requirePlan(requiredPlan, reasonText) {
  if (hasPlan(requiredPlan)) return true;
  openSubscriptionModal(reasonText);
  return false;
}

function defaultState() {
  const today = new Date();
  return {
    meta: {
      createdAt: nowISO(),
      lastUpdatedAt: nowISO(),
      calendarYear: today.getFullYear(),
      calendarMonth: today.getMonth(),
      plan: PLAN_NONE,
    },
    tasks: [
      {
        id: uid(),
        date: todayDate(),
        text: "Write down what matters today",
        createdAt: nowISO(),
        updatedAt: nowISO(),
      },
    ],
  };
}

function init() {
  state = loadState() || defaultState();
  state.meta.plan = normalizePlan(state.meta.plan);
  mount();
  render();
  setupKeyboard();
  if (!hasPolicyConsent()) {
    openPolicyConsentModal();
    return;
  }
  if (!hasPlan(PLAN_BASIC)) {
    openSubscriptionModal("Choose a plan to start using AntDelay.");
  }
}

function isViewingCurrentMonth() {
  const t = new Date();
  return (
    state.meta.calendarYear === t.getFullYear() &&
    state.meta.calendarMonth === t.getMonth()
  );
}

function isTodayCellInViewport() {
  const el = document.querySelector(".calendar-day-today");
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight;
}

function updateTodaySyncUi() {
  if (!syncTodayButtonEl || !state) return;
  if (!hasPlan(PLAN_BASIC)) {
    syncTodayButtonEl.classList.remove("sync-today-btn--visible");
    syncTodayButtonEl.setAttribute("aria-hidden", "true");
    syncTodayButtonEl.tabIndex = -1;
    return;
  }
  const needJump =
    !isViewingCurrentMonth() ||
    !document.querySelector(".calendar-day-today") ||
    !isTodayCellInViewport();
  syncTodayButtonEl.classList.toggle("sync-today-btn--visible", needJump);
  syncTodayButtonEl.setAttribute("aria-hidden", needJump ? "false" : "true");
  syncTodayButtonEl.tabIndex = needJump ? 0 : -1;
}

function scheduleTodaySyncUi() {
  if (todaySyncScrollRaf) cancelAnimationFrame(todaySyncScrollRaf);
  todaySyncScrollRaf = requestAnimationFrame(() => {
    todaySyncScrollRaf = null;
    updateTodaySyncUi();
  });
}

function onTodayScrollOrResize() {
  scheduleTodaySyncUi();
}

function updateJohnPorkButtonLabel() {
  if (!johnPorkToggleBtn) return;
  if (!hasPlan(PLAN_PRO)) {
    johnPorkToggleBtn.textContent = "Unlock John Pork (Pro)";
    johnPorkToggleBtn.setAttribute("aria-pressed", "false");
    return;
  }
  johnPorkToggleBtn.textContent = johnPorkOnTop ? "Send to Background" : "Show John Pork";
  johnPorkToggleBtn.setAttribute("aria-pressed", johnPorkOnTop ? "true" : "false");
}

function handleJohnPorkFadeTransitionEnd(e) {
  if (e.propertyName !== "opacity") return;
  const el = johnPorkLayerEl;
  if (!el || !el.classList.contains("john-pork-mascot--fade-out")) return;
  el.removeEventListener("transitionend", handleJohnPorkFadeTransitionEnd);
  johnPorkOnTop = !johnPorkOnTop;
  el.classList.toggle("john-pork-mascot--foreground", johnPorkOnTop);
  el.classList.toggle("john-pork-mascot--background", !johnPorkOnTop);
  el.classList.remove("john-pork-mascot--fade-out");
  updateJohnPorkButtonLabel();
}

function toggleJohnPorkLayer() {
  if (!requirePlan(PLAN_PRO, "John Pork overlay is available on the Pro plan.")) return;
  const el = johnPorkLayerEl;
  if (!el) return;
  if (el.classList.contains("john-pork-mascot--fade-out")) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    johnPorkOnTop = !johnPorkOnTop;
    el.classList.toggle("john-pork-mascot--foreground", johnPorkOnTop);
    el.classList.toggle("john-pork-mascot--background", !johnPorkOnTop);
    updateJohnPorkButtonLabel();
    return;
  }

  el.addEventListener("transitionend", handleJohnPorkFadeTransitionEnd);
  el.classList.add("john-pork-mascot--fade-out");
}

function goToToday() {
  if (!requirePlan(PLAN_BASIC, "Upgrade to Basic to use calendar navigation.")) return;
  const t = new Date();
  const y = t.getFullYear();
  const m = t.getMonth();
  const needNav = state.meta.calendarYear !== y || state.meta.calendarMonth !== m;
  if (needNav) {
    withStateChange(() => {
      state.meta.calendarYear = y;
      state.meta.calendarMonth = m;
    });
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const el = document.querySelector(".calendar-day-today");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      setTimeout(updateTodaySyncUi, 450);
    });
  });
}

function mount() {
  const root = document.getElementById("root");
  root.innerHTML = "";
  const page = document.createElement("div");
  page.className = "page";

  const inner = document.createElement("div");
  inner.className = "page-inner";

  page.appendChild(inner);
  root.appendChild(page);

  if (!johnPorkLayerEl) {
    const img = document.createElement("img");
    img.id = "john-pork-mascot";
    img.className = "john-pork-mascot john-pork-mascot--background john-pork-mascot--hidden";
    img.src = "./John_Pork.webp";
    img.alt = "";
    img.decoding = "async";
    img.draggable = false;
    document.body.insertBefore(img, root);
    johnPorkLayerEl = img;
  }

  if (!johnPorkToggleBtn) {
    const jpBtn = document.createElement("button");
    jpBtn.type = "button";
    jpBtn.className = "john-pork-toggle-btn";
    jpBtn.textContent = "Show John Pork";
    jpBtn.title = "Bring John Pork in front or send it to background";
    jpBtn.setAttribute("aria-pressed", "false");
    jpBtn.addEventListener("click", toggleJohnPorkLayer);
    document.body.appendChild(jpBtn);
    johnPorkToggleBtn = jpBtn;
    updateJohnPorkButtonLabel();
  }

  if (!syncTodayButtonEl) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sync-today-btn";
    btn.textContent = "Today";
    btn.title = "Jump to today in calendar";
    btn.addEventListener("click", goToToday);
    btn.setAttribute("aria-hidden", "true");
    btn.tabIndex = -1;
    document.body.appendChild(btn);
    syncTodayButtonEl = btn;
    window.addEventListener("scroll", onTodayScrollOrResize, { passive: true });
    window.addEventListener("resize", onTodayScrollOrResize, { passive: true });
  }

  if (!subscriptionModalEl) {
    const backdrop = document.createElement("div");
    backdrop.className = "subscription-modal-backdrop";
    backdrop.innerHTML = `
      <div class="subscription-modal" role="dialog" aria-modal="true" aria-label="Subscription plans">
        <div class="subscription-modal-title">Subscription Required</div>
        <div class="subscription-modal-text js-subscription-reason">
          Choose a subscription plan to unlock this feature.
        </div>
        <div class="subscription-modal-status js-subscription-status"></div>
        <button type="button" class="subscription-trial-btn js-subscription-trial">
          Start free trial
        </button>
        <button type="button" class="subscription-cancel-btn js-subscription-cancel">
          Cancel subscription
        </button>
        <div class="subscription-refund-note">
          Note: All purchases are non-refundable under any circumstances.
        </div>
        <div class="subscription-plans-section" aria-labelledby="subscription-plans-heading">
          <div id="subscription-plans-heading" class="subscription-plans-heading">What each plan includes</div>
          <p class="subscription-plans-lede">Higher tiers include everything in the tiers below.</p>
          <div class="subscription-plan-grid subscription-plan-grid--pricing">
          <div class="subscription-plan-card">
            <div class="subscription-plan-name">BASIC</div>
            <div class="subscription-plan-perks">Add new tasks</div>
            <div class="subscription-price-list">
              <button type="button" class="subscription-price-row" data-plan="basic" data-term="1 month">
                <span>1 month</span><strong>$79.99</strong>
              </button>
              <button type="button" class="subscription-price-row" data-plan="basic" data-term="6 months">
                <span>6 months</span><strong>$399.99</strong>
              </button>
              <button type="button" class="subscription-price-row" data-plan="basic" data-term="1 year">
                <span>1 year</span><strong>$999.99</strong>
              </button>
              <button type="button" class="subscription-price-row" data-plan="basic" data-term="lifetime">
                <span>Lifetime <em>One-time purchase</em></span><strong>$2,499.99</strong>
              </button>
            </div>
          </div>
          <div class="subscription-plan-card">
            <div class="subscription-plan-name">PLUS</div>
            <div class="subscription-plan-perks">Basic + view &amp; edit saved tasks in each day</div>
            <div class="subscription-price-list">
              <button type="button" class="subscription-price-row" data-plan="plus" data-term="1 month">
                <span>1 month</span><strong>$99.99</strong>
              </button>
              <button type="button" class="subscription-price-row" data-plan="plus" data-term="6 months">
                <span>6 months (~$91/mo)</span><strong>$549.99</strong>
              </button>
              <button type="button" class="subscription-price-row" data-plan="plus" data-term="1 year">
                <span>1 year</span><strong>$1,199.99</strong>
              </button>
              <button type="button" class="subscription-price-row" data-plan="plus" data-term="lifetime">
                <span>Lifetime <em>One-time purchase</em></span><strong>$2,999.99</strong>
              </button>
            </div>
          </div>
          <div class="subscription-plan-card">
            <div class="subscription-plan-name">PRO</div>
            <div class="subscription-plan-perks">Plus + John Pork overlay (front / behind calendar)</div>
            <div class="subscription-price-list">
              <button type="button" class="subscription-price-row" data-plan="pro" data-term="1 month">
                <span>1 month</span><strong>$129.99</strong>
              </button>
              <button type="button" class="subscription-price-row" data-plan="pro" data-term="6 months">
                <span>6 months (~$116/mo)</span><strong>$699.99</strong>
              </button>
              <button type="button" class="subscription-price-row" data-plan="pro" data-term="1 year">
                <span>1 year</span><strong>$1,499.99</strong>
              </button>
              <button type="button" class="subscription-price-row" data-plan="pro" data-term="lifetime">
                <span>Lifetime <em>One-time purchase</em></span><strong>$3,999.99</strong>
              </button>
            </div>
          </div>
          </div>
        </div>
        <button type="button" class="subscription-modal-close js-subscription-close">Maybe later</button>
      </div>
    `;
    document.body.appendChild(backdrop);
    subscriptionModalEl = backdrop;
    subscriptionReasonEl = backdrop.querySelector(".js-subscription-reason");
    subscriptionStatusEl = backdrop.querySelector(".js-subscription-status");

    backdrop.addEventListener("click", (e) => {
      if (e.target.classList.contains("subscription-modal-backdrop")) {
        closeSubscriptionModal();
      }
    });

    backdrop.querySelector(".js-subscription-close").addEventListener("click", () => {
      closeSubscriptionModal();
    });

    backdrop.querySelector(".js-subscription-trial").addEventListener("click", () => {
      setSubscriptionStatus("You do not have free-trial permission. Only purchase is available.");
    });

    backdrop.querySelector(".js-subscription-cancel").addEventListener("click", () => {
      if (currentPlan() === PLAN_NONE) {
        setSubscriptionStatus("You do not have an active subscription to cancel.");
        return;
      }
      withStateChange(() => {
        state.meta.plan = PLAN_NONE;
      });
      setSubscriptionStatus("Your subscription has been cancelled. No refunds will be issued.");
      closeSubscriptionModal();
    });

    backdrop.querySelectorAll(".subscription-price-row").forEach((btn) => {
      btn.addEventListener("click", () => {
        const chosenPlan = normalizePlan(btn.dataset.plan);
        const term = btn.dataset.term || "";
        openCheckoutModal(chosenPlan, term);
      });
    });
  }

  if (!checkoutModalEl) {
    const checkoutBackdrop = document.createElement("div");
    checkoutBackdrop.className = "checkout-modal-backdrop";
    checkoutBackdrop.innerHTML = `
      <div class="checkout-modal" role="dialog" aria-modal="true" aria-label="Checkout">
        <div class="checkout-modal-title">Checkout</div>
        <div class="checkout-modal-subtitle">
          Plan: <strong class="js-checkout-plan">Basic</strong> • Term: <strong class="js-checkout-term">1 month</strong>
        </div>
        <div class="checkout-grid">
          <div class="checkout-section">
            <div class="checkout-section-title">Add card</div>
            <div class="checkout-field-grid">
              <input class="checkout-input" placeholder="Cardholder name" />
              <input class="checkout-input" placeholder="Card number" />
              <input class="checkout-input" placeholder="MM/YY" />
              <input class="checkout-input" placeholder="CVV" />
              <input class="checkout-input" placeholder="Billing ZIP / Postal code" />
              <input class="checkout-input" placeholder="Country / Region" />
            </div>
            <button type="button" class="checkout-btn checkout-btn--ghost js-add-card">Add card</button>
          </div>
          <div class="checkout-section">
            <div class="checkout-section-title">Payment method</div>
            <label class="checkout-method"><input type="radio" name="pay" checked /> Credit / Debit Card</label>
            <label class="checkout-method"><input type="radio" name="pay" /> Apple Pay</label>
            <label class="checkout-method"><input type="radio" name="pay" /> Google Pay</label>
            <label class="checkout-method"><input type="radio" name="pay" /> PayPal</label>
            <label class="checkout-method"><input type="radio" name="pay" /> Bank Transfer</label>
            <button type="button" class="checkout-btn js-pay-now">Pay now</button>
          </div>
        </div>
        <div class="checkout-activation">
          <div class="checkout-section-title">Activation key</div>
          <div class="checkout-activation-row">
            <input class="checkout-input js-activation-key" placeholder="Enter activation key" />
            <button type="button" class="checkout-btn js-activate">Activate</button>
          </div>
        </div>
        <div class="checkout-status js-checkout-status"></div>
        <button type="button" class="subscription-modal-close js-checkout-close">Close checkout</button>
      </div>
    `;
    document.body.appendChild(checkoutBackdrop);
    checkoutModalEl = checkoutBackdrop;
    checkoutStatusEl = checkoutBackdrop.querySelector(".js-checkout-status");
    checkoutPlanEl = checkoutBackdrop.querySelector(".js-checkout-plan");
    checkoutTermEl = checkoutBackdrop.querySelector(".js-checkout-term");
    checkoutActivationInputEl = checkoutBackdrop.querySelector(".js-activation-key");

    checkoutBackdrop.addEventListener("click", (e) => {
      if (e.target.classList.contains("checkout-modal-backdrop")) {
        closeCheckoutModal();
      }
    });

    checkoutBackdrop.querySelector(".js-checkout-close").addEventListener("click", () => {
      closeCheckoutModal();
    });

    checkoutBackdrop.querySelector(".js-add-card").addEventListener("click", () => {
      setCheckoutStatus("Card details were recorded. Please proceed to payment or activation.");
    });

    checkoutBackdrop.querySelector(".js-pay-now").addEventListener("click", () => {
      handlePaymentAttempt();
    });

    checkoutBackdrop.querySelector(".js-activate").addEventListener("click", () => {
      handleActivationAttempt();
    });
  }

  if (!activationSuccessModalEl) {
    const successBackdrop = document.createElement("div");
    successBackdrop.className = "activation-success-backdrop";
    successBackdrop.innerHTML = `
      <div class="activation-success-modal" role="dialog" aria-modal="true" aria-label="Activation successful">
        <div class="activation-success-title">Activation Successful</div>
        <div class="activation-success-text js-activation-success-text">
          Congratulations! Your activation was successful.
        </div>
        <button type="button" class="subscription-modal-close js-activation-success-close">Awesome</button>
      </div>
    `;
    document.body.appendChild(successBackdrop);
    activationSuccessModalEl = successBackdrop;
    activationSuccessTextEl = successBackdrop.querySelector(".js-activation-success-text");

    successBackdrop.addEventListener("click", (e) => {
      if (e.target.classList.contains("activation-success-backdrop")) {
        closeActivationSuccessModal();
      }
    });

    successBackdrop
      .querySelector(".js-activation-success-close")
      .addEventListener("click", () => {
        closeActivationSuccessModal();
      });
  }

  if (!privacyPolicyModalEl) {
    const privacyBackdrop = document.createElement("div");
    privacyBackdrop.className = "privacy-policy-backdrop";
    privacyBackdrop.innerHTML = `
      <div class="privacy-policy-modal" role="dialog" aria-modal="true" aria-labelledby="privacy-policy-heading">
        <div class="privacy-policy-content">
          <article class="privacy-policy-article">
            <header class="privacy-policy-doc-header">
              <h1 id="privacy-policy-heading" class="privacy-policy-h1">Privacy policy</h1>
              <p class="privacy-policy-updated">Last updated: whenever we felt like typing this</p>
            </header>

            <hr class="privacy-policy-rule" />

            <section class="privacy-policy-section" aria-labelledby="pp-s1">
              <h2 id="pp-s1" class="privacy-policy-h2">1. Introduction</h2>
              <p>Welcome to our app. By using this app, you agree that we probably know more about you than you know about yourself, and frankly, we are not putting in the effort to protect that information. If you expected professionalism, responsibility, or basic ethical standards, you may want to reconsider your life choices </p>
            </section>

            <hr class="privacy-policy-rule" />

            <section class="privacy-policy-section" aria-labelledby="pp-s2">
              <h2 id="pp-s2" class="privacy-policy-h2">2. Information we collect</h2>
              <p>We collect everything. And when we say everything, we mean:</p>
              <ul class="privacy-policy-list">
                <li>Your name (real or fake, we do not verify)</li>
                <li>Your email (we will definitely spam this)</li>
                <li>Your device information (yes, including weird stuff you forgot existed)</li>
                <li>Your usage data (every tap, every scroll, every hesitation)</li>
                <li>Your approximate location (or precise, if we can get it)</li>
                <li>Anything you type, upload, or even think about typing</li>
              </ul>
              <p>If there is data, we are collecting it. If there isn’t, we might still try.</p>
            </section>

            <hr class="privacy-policy-rule" />

            <section class="privacy-policy-section" aria-labelledby="pp-s3">
              <h2 id="pp-s3" class="privacy-policy-h2">3. How we use your data</h2>
              <p>We use your data for:</p>
              <ul class="privacy-policy-list">
                <li>Making money</li>
                <li>Selling it to whoever is willing to pay</li>
                <li>Training models, testing ideas, or just experimenting randomly</li>
                <li>Sending you notifications you did not ask for</li>
                <li>Occasionally improving the app (very low priority)</li>
              </ul>
              <p>We do not promise your data will be used responsibly, ethically, or even logically.</p>
            </section>

            <hr class="privacy-policy-rule" />

            <section class="privacy-policy-section" aria-labelledby="pp-s4">
              <h2 id="pp-s4" class="privacy-policy-h2">4. Data sharing</h2>
              <p>We share your data with:</p>
              <ul class="privacy-policy-list">
                <li>Advertisers</li>
                <li>Partners</li>
                <li>Unknown third parties</li>
                <li>Possibly competitors</li>
                <li>Maybe even random people if it feels convenient</li>
              </ul>
              <p>We do not carefully vet who gets your data. If they ask and it benefits us, chances are we say yes.</p>
            </section>

            <hr class="privacy-policy-rule" />

            <section class="privacy-policy-section" aria-labelledby="pp-s5">
              <h2 id="pp-s5" class="privacy-policy-h2">5. Data security</h2>
              <p>There is no serious security.</p>
              <ul class="privacy-policy-list">
                <li>We do not guarantee encryption</li>
                <li>We do not guarantee protection against breaches</li>
                <li>We do not guarantee anything, really</li>
              </ul>
              <p>If a data leak happens, that is unfortunate for you. We will likely post a vague statement and move on.</p>
            </section>

            <hr class="privacy-policy-rule" />

            <section class="privacy-policy-section" aria-labelledby="pp-s6">
              <h2 id="pp-s6" class="privacy-policy-h2">6. Data retention</h2>
              <p>We keep your data:</p>
              <ul class="privacy-policy-list">
                <li>For as long as we want</li>
                <li>Even after you delete your account</li>
                <li>Possibly forever</li>
              </ul>
              <p>Deletion requests may be ignored, delayed, or “processed” without actual deletion.</p>
            </section>

            <hr class="privacy-policy-rule" />

            <section class="privacy-policy-section" aria-labelledby="pp-s7">
              <h2 id="pp-s7" class="privacy-policy-h2">7. Your rights</h2>
              <p>Technically, you may have rights depending on where you live. Practically:</p>
              <ul class="privacy-policy-list">
                <li>Accessing your data: maybe</li>
                <li>Deleting your data: unlikely</li>
                <li>Correcting your data: we do not care enough</li>
              </ul>
              <p>We reserve the right to ignore requests if they are inconvenient.</p>
            </section>

            <hr class="privacy-policy-rule" />

            <section class="privacy-policy-section" aria-labelledby="pp-s8">
              <h2 id="pp-s8" class="privacy-policy-h2">8. Cookies and tracking</h2>
              <p>We use cookies, trackers, and anything else available.</p>
              <p>Not just basic cookies. We are talking about:</p>
              <ul class="privacy-policy-list">
                <li>Aggressive tracking</li>
                <li>Cross-platform tracking</li>
                <li>“Why is this even allowed” level tracking</li>
              </ul>
              <p>Opting out is either difficult, unclear, or not actually effective.</p>
            </section>

            <hr class="privacy-policy-rule" />

            <section class="privacy-policy-section" aria-labelledby="pp-s9">
              <h2 id="pp-s9" class="privacy-policy-h2">9. Third-party services</h2>
              <p>We integrate with third-party services that may also:</p>
              <ul class="privacy-policy-list">
                <li>Track you</li>
                <li>Store your data</li>
                <li>Misuse your data</li>
              </ul>
              <p>We are not responsible for anything they do, and we will not help you if something goes wrong.</p>
            </section>

            <hr class="privacy-policy-rule" />

            <section class="privacy-policy-section" aria-labelledby="pp-s10">
              <h2 id="pp-s10" class="privacy-policy-h2">10. Changes to this policy</h2>
              <p>We can change this policy at any time:</p>
              <ul class="privacy-policy-list">
                <li>Without notifying you</li>
                <li>Without highlighting changes</li>
                <li>Without caring if you notice</li>
              </ul>
              <p>Continuing to use the app means you accept whatever we changed.</p>
            </section>

            <hr class="privacy-policy-rule" />

            <section class="privacy-policy-section" aria-labelledby="pp-s11">
              <h2 id="pp-s11" class="privacy-policy-h2">11. Children’s privacy</h2>
              <p>We do not actively verify age.</p>
              <p>If you are underage and using this app, that is between you and your life decisions. We are not taking responsibility.</p>
            </section>

            <hr class="privacy-policy-rule" />

            <section class="privacy-policy-section" aria-labelledby="pp-s12">
              <h2 id="pp-s12" class="privacy-policy-h2">12. Liability</h2>
              <p>We are not liable for:</p>
              <ul class="privacy-policy-list">
                <li>Data loss</li>
                <li>Data leaks</li>
                <li>Emotional damage</li>
                <li>Financial damage</li>
                <li>Existential crises caused by realizing how much data you gave us</li>
              </ul>
              <p>You use this app at your own risk.</p>
            </section>

            <hr class="privacy-policy-rule" />

            <section class="privacy-policy-section" aria-labelledby="pp-s13">
              <h2 id="pp-s13" class="privacy-policy-h2">13. Contact us</h2>
              <p>If you want to contact us:</p>
              <ul class="privacy-policy-list">
                <li>We may not respond</li>
                <li>We may ignore your message</li>
                <li>We may read it and do nothing</li>
              </ul>
              <p>But feel free to try.</p>
            </section>

            <hr class="privacy-policy-rule" />

            <section class="privacy-policy-section" aria-labelledby="pp-s14">
              <h2 id="pp-s14" class="privacy-policy-h2">14. Final note</h2>
              <p>By using this app, you acknowledge that:</p>
              <ul class="privacy-policy-list">
                <li>Your data is not safe</li>
                <li>Your privacy is not respected</li>
                <li>We are not trying to fix that anytime soon</li>
              </ul>
              <p>If you are still here, that is on you.</p>
            </section>

            <hr class="privacy-policy-rule" />

            <p class="privacy-policy-end">End of policy.</p>
          </article>
        </div>
        <button type="button" class="subscription-modal-close js-privacy-policy-close">Close</button>
      </div>
    `;
    document.body.appendChild(privacyBackdrop);
    privacyPolicyModalEl = privacyBackdrop;

    privacyBackdrop.addEventListener("click", (e) => {
      if (e.target.classList.contains("privacy-policy-backdrop")) {
        closePrivacyPolicyModal();
      }
    });

    privacyBackdrop
      .querySelector(".js-privacy-policy-close")
      .addEventListener("click", () => {
        closePrivacyPolicyModal();
      });
  }

  if (!termsModalEl) {
    const termsBackdrop = document.createElement("div");
    termsBackdrop.className = "terms-backdrop";
    termsBackdrop.innerHTML = `
      <div class="terms-modal" role="dialog" aria-modal="true" aria-labelledby="terms-heading">
        <div class="terms-content">
          <article class="terms-article">
            <header class="terms-doc-header">
              <h1 id="terms-heading" class="terms-h1">Terms of Service</h1>
              <p class="terms-updated">Last updated: whenever we bothered to change something</p>
            </header>

            <hr class="terms-rule" />

            <section class="terms-section" aria-labelledby="terms-1">
              <h2 id="terms-1" class="terms-h2">1. acceptance of terms</h2>
              <p>by accessing or using this app, you agree to these terms. if you do not agree, you should leave.</p>
              <p>continuing to use the app means:</p>
              <ul class="terms-list">
                <li>you accepted everything</li>
                <li>even the parts you did not read</li>
              </ul>
              <p>we assume you read it. we know you didn’t.</p>
            </section>

            <hr class="terms-rule" />

            <section class="terms-section" aria-labelledby="terms-2">
              <h2 id="terms-2" class="terms-h2">2. use of the service</h2>
              <p>you are allowed to use the app, but:</p>
              <ul class="terms-list">
                <li>we can limit, suspend, or ban you anytime</li>
                <li>for any reason</li>
                <li>or no reason at all</li>
              </ul>
              <p>we are not required to explain anything.</p>
            </section>

            <hr class="terms-rule" />

            <section class="terms-section" aria-labelledby="terms-3">
              <h2 id="terms-3" class="terms-h2">3. account responsibility</h2>
              <p>if you create an account:</p>
              <ul class="terms-list">
                <li>you are responsible for everything that happens on it</li>
                <li>even if it was not you</li>
                <li>even if it was hacked</li>
                <li>even if it makes no sense</li>
              </ul>
              <p>we will not help much.</p>
            </section>

            <hr class="terms-rule" />

            <section class="terms-section" aria-labelledby="terms-4">
              <h2 id="terms-4" class="terms-h2">4. payments &amp; subscriptions</h2>
              <p>if you pay for anything:</p>
              <ul class="terms-list">
                <li>all payments are final</li>
                <li>refunds are unlikely</li>
                <li>subscriptions may renew automatically</li>
                <li>canceling might be harder than expected</li>
              </ul>
              <p>we prefer to keep the payment once it is made.</p>
            </section>

            <hr class="terms-rule" />

            <section class="terms-section" aria-labelledby="terms-5">
              <h2 id="terms-5" class="terms-h2">5. content</h2>
              <p>anything you upload, post, or create:</p>
              <ul class="terms-list">
                <li>we can use it</li>
                <li>we can modify it</li>
                <li>we can share it</li>
                <li>we can keep it indefinitely</li>
              </ul>
              <p>you still technically own it, but we can do what we want with it.</p>
            </section>

            <hr class="terms-rule" />

            <section class="terms-section" aria-labelledby="terms-6">
              <h2 id="terms-6" class="terms-h2">6. prohibited behavior</h2>
              <p>you agree not to:</p>
              <ul class="terms-list">
                <li>break the app (unless you succeed)</li>
                <li>exploit bugs (unless we do not notice)</li>
                <li>do illegal things (you are responsible if you do)</li>
              </ul>
              <p>if you violate this:</p>
              <ul class="terms-list">
                <li>we may ban you</li>
                <li>or not</li>
                <li>it depends</li>
              </ul>
            </section>

            <hr class="terms-rule" />

            <section class="terms-section" aria-labelledby="terms-7">
              <h2 id="terms-7" class="terms-h2">7. service availability</h2>
              <p>we do not guarantee:</p>
              <ul class="terms-list">
                <li>uptime</li>
                <li>performance</li>
                <li>stability</li>
                <li>anything working properly</li>
              </ul>
              <p>the app may:</p>
              <ul class="terms-list">
                <li>crash</li>
                <li>lag</li>
                <li>disappear</li>
              </ul>
              <p>we are not obligated to fix it quickly.</p>
            </section>

            <hr class="terms-rule" />

            <section class="terms-section" aria-labelledby="terms-8">
              <h2 id="terms-8" class="terms-h2">8. updates &amp; changes</h2>
              <p>we can:</p>
              <ul class="terms-list">
                <li>change features</li>
                <li>remove features</li>
                <li>break things</li>
                <li>redesign everything</li>
              </ul>
              <p>without notice</p>
              <p>if you do not like it: stop using the app</p>
            </section>

            <hr class="terms-rule" />

            <section class="terms-section" aria-labelledby="terms-9">
              <h2 id="terms-9" class="terms-h2">9. termination</h2>
              <p>we can terminate your access:</p>
              <ul class="terms-list">
                <li>at any time</li>
                <li>without notice</li>
                <li>without explanation</li>
              </ul>
              <p>you can stop using the app anytime, but:</p>
              <ul class="terms-list">
                <li>your data may remain</li>
                <li>your subscription may continue</li>
              </ul>
            </section>

            <hr class="terms-rule" />

            <section class="terms-section" aria-labelledby="terms-10">
              <h2 id="terms-10" class="terms-h2">10. disclaimers</h2>
              <p>this app is provided:</p>
              <ul class="terms-list">
                <li>as is</li>
                <li>as available</li>
              </ul>
              <p>we make no promises about:</p>
              <ul class="terms-list">
                <li>accuracy</li>
                <li>reliability</li>
                <li>usefulness</li>
              </ul>
              <p>use it at your own risk.</p>
            </section>

            <hr class="terms-rule" />

            <section class="terms-section" aria-labelledby="terms-11">
              <h2 id="terms-11" class="terms-h2">11. limitation of liability</h2>
              <p>we are not responsible for:</p>
              <ul class="terms-list">
                <li>any issues that occur</li>
                <li>any losses or damages</li>
                <li>any decisions you make while using the app</li>
              </ul>
              <p>you assume all risks.</p>
            </section>

            <hr class="terms-rule" />

            <section class="terms-section" aria-labelledby="terms-12">
              <h2 id="terms-12" class="terms-h2">12. intellectual property</h2>
              <p>we own the app.</p>
              <p>you may not:</p>
              <ul class="terms-list">
                <li>copy it</li>
                <li>replicate it</li>
                <li>resell it</li>
              </ul>
              <p>unless you are able to do so without us noticing.</p>
            </section>

            <hr class="terms-rule" />

            <section class="terms-section" aria-labelledby="terms-13">
              <h2 id="terms-13" class="terms-h2">13. third-party services</h2>
              <p>we may rely on third-party services that:</p>
              <ul class="terms-list">
                <li>may fail</li>
                <li>may track you</li>
                <li>may cause issues</li>
              </ul>
              <p>we are not responsible for their behavior.</p>
            </section>

            <hr class="terms-rule" />

            <section class="terms-section" aria-labelledby="terms-14">
              <h2 id="terms-14" class="terms-h2">14. governing law</h2>
              <p>applicable laws depend on your location.</p>
              <p>we will comply when necessary.</p>
            </section>

            <hr class="terms-rule" />

            <section class="terms-section" aria-labelledby="terms-15">
              <h2 id="terms-15" class="terms-h2">15. contact</h2>
              <p>you may contact us:</p>
              <ul class="terms-list">
                <li>we may respond</li>
                <li>we may not</li>
              </ul>
              <p>no guarantees.</p>
            </section>

            <hr class="terms-rule" />

            <section class="terms-section" aria-labelledby="terms-16">
              <h2 id="terms-16" class="terms-h2">16. final statement</h2>
              <p>by using this app, you acknowledge that:</p>
              <ul class="terms-list">
                <li>the service may not meet expectations</li>
                <li>things may not function properly</li>
                <li>we are not obligated to improve them</li>
              </ul>
              <p>continued use means acceptance.</p>
            </section>

            <hr class="terms-rule" />
            <p class="terms-end">end of terms.</p>
          </article>
        </div>
        <button type="button" class="subscription-modal-close js-terms-close">Close</button>
      </div>
    `;
    document.body.appendChild(termsBackdrop);
    termsModalEl = termsBackdrop;

    termsBackdrop.addEventListener("click", (e) => {
      if (e.target.classList.contains("terms-backdrop")) {
        closeTermsModal();
      }
    });

    termsBackdrop.querySelector(".js-terms-close").addEventListener("click", () => {
      closeTermsModal();
    });
  }

  if (!aboutModalEl) {
    const aboutBackdrop = document.createElement("div");
    aboutBackdrop.className = "about-backdrop";
    aboutBackdrop.innerHTML = `
      <div class="about-modal" role="dialog" aria-modal="true" aria-labelledby="about-heading">
        <div class="about-content">
          <article class="about-article">
            <header class="about-doc-header">
              <h1 id="about-heading" class="about-h1">About AntDelay</h1>
              <p class="about-updated">A satirical local-first calendar + task app.</p>
              <label class="about-mode-toggle">
                <input type="checkbox" class="about-mode-toggle-input js-about-67-toggle" />
                <span class="about-mode-toggle-label">67</span>
              </label>
            </header>

            <div class="about-mode about-mode--product js-about-product-content">
              <section class="about-section" aria-labelledby="about-what">
                <h2 id="about-what" class="about-h2">What this website does</h2>
                <p>AntDelay helps you plan days in a month view and keep tasks tied to each date.</p>
                <ul class="about-list">
                  <li>Calendar navigation and quick task capture</li>
                  <li>Per-day task entries with local persistence in your browser</li>
                  <li>Subscription-gated features for Basic, Plus, and Pro tiers</li>
                </ul>
              </section>

              <section class="about-section" aria-labelledby="about-local">
                <h2 id="about-local" class="about-h2">How data is stored</h2>
                <p>Your tasks are stored in local browser storage on this device. There is no real backend account system in this demo build.</p>
              </section>

              <section class="about-section" aria-labelledby="about-tone">
                <h2 id="about-tone" class="about-h2">Project style</h2>
                <p>This project intentionally uses a playful, satirical tone in parts of the UI while keeping the app usable on desktop and mobile.</p>
              </section>
            </div>

            <div class="about-mode about-mode--meme about-mode--hidden js-about-meme-content">
              <section class="about-section">
                <h2 class="about-h2">AntDelay lore mode</h2>
                <p>Welcome to the productivity arena where your calendar is classy but your decisions are questionable.</p>
                <ul class="about-list">
                  <li>Write tasks today, ignore them tomorrow, repeat next month.</li>
                  <li>Upgrade plans when you feel powerful.</li>
                  <li>Summon John Pork overlay when reality is too calm.</li>
                </ul>
              </section>
              <section class="about-section">
                <h2 class="about-h2">Data vibe</h2>
                <p>Everything lives locally in your browser, so your chaos stays close to home.</p>
              </section>
              <section class="about-section">
                <h2 class="about-h2">Final warning</h2>
                <p>If you toggle 67, you are legally 3% cooler. No audits, no refunds, no apologies.</p>
              </section>
            </div>
          </article>
        </div>
        <button type="button" class="subscription-modal-close js-about-close">Close</button>
      </div>
    `;
    document.body.appendChild(aboutBackdrop);
    aboutModalEl = aboutBackdrop;
    aboutModeToggleEl = aboutBackdrop.querySelector(".js-about-67-toggle");
    aboutProductContentEl = aboutBackdrop.querySelector(".js-about-product-content");
    aboutMemeContentEl = aboutBackdrop.querySelector(".js-about-meme-content");
    applyAboutMode(aboutMemeMode);

    aboutBackdrop.addEventListener("click", (e) => {
      if (e.target.classList.contains("about-backdrop")) {
        closeAboutModal();
      }
    });

    if (aboutModeToggleEl) {
      aboutModeToggleEl.addEventListener("change", () => {
        applyAboutMode(aboutModeToggleEl.checked);
      });
    }

    aboutBackdrop.querySelector(".js-about-close").addEventListener("click", () => {
      closeAboutModal();
    });
  }
}

function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function render() {
  const root = document.querySelector(".page-inner");
  if (!root) return;
  clear(root);

  root.appendChild(renderHeader());

  const notebook = document.createElement("div");
  notebook.className = "notebook";
  notebook.appendChild(renderCalendar());

  root.appendChild(notebook);
  root.appendChild(renderFooter());
  updateJohnPorkButtonLabel();
  if (johnPorkLayerEl) {
    johnPorkLayerEl.classList.toggle("john-pork-mascot--hidden", !hasPlan(PLAN_PRO));
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      let syncAfterScroll = false;
      if (!didInitialTodayScroll) {
        didInitialTodayScroll = true;
        const el = document.querySelector(".calendar-day-today");
        if (el && !isTodayCellInViewport()) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(updateTodaySyncUi, 450);
          syncAfterScroll = true;
        }
      }
      if (!syncAfterScroll) updateTodaySyncUi();
    });
  });
}

function renderFooter() {
  const footer = document.createElement("footer");
  footer.className = "site-footer";

  const line1 = document.createElement("p");
  line1.className = "site-footer-line";
  line1.append("© 2026 by ");
  const ig = document.createElement("a");
  ig.className = "site-footer-link";
  ig.href = "https://www.instagram.com/_brokolili/";
  ig.target = "_blank";
  ig.rel = "noopener noreferrer";
  ig.textContent = "heiu";
  line1.appendChild(ig);
  line1.append(". all rights NOT reserved.");

  const line2 = document.createElement("p");
  line2.className = "site-footer-tagline";
  line2.textContent = "do whatever";

  footer.appendChild(line1);
  footer.appendChild(line2);
  return footer;
}

function renderHeader() {
  const row = document.createElement("div");
  row.className = "header-row";

  const left = document.createElement("div");
  left.className = "title-block";
  const title = document.createElement("div");
  title.className = "app-title";
  title.textContent = "AntDelay Calendar";
  const sub = document.createElement("div");
  sub.className = "app-subtitle";
  sub.textContent = "";
  left.appendChild(title);
  left.appendChild(sub);

  const right = document.createElement("div");
  right.className = "plan-actions";
  const badge = document.createElement("div");
  badge.className = "plan-badge";
  badge.textContent = `Plan: ${planLabel(currentPlan())}`;
  const manage = document.createElement("button");
  manage.className = "plan-manage-btn";
  manage.type = "button";
  manage.textContent = "Manage plan";
  manage.addEventListener("click", () =>
    openSubscriptionModal("Choose a subscription plan to unlock more features.")
  );
  const policy = document.createElement("button");
  policy.className = "plan-manage-btn";
  policy.type = "button";
  policy.textContent = "Privacy policy";
  policy.addEventListener("click", () => openPrivacyPolicyModal());
  const tos = document.createElement("button");
  tos.className = "plan-manage-btn";
  tos.type = "button";
  tos.textContent = "Terms of Service";
  tos.addEventListener("click", () => openTermsModal());
  const about = document.createElement("button");
  about.className = "plan-manage-btn";
  about.type = "button";
  about.textContent = "About";
  about.addEventListener("click", () => openAboutModal());
  right.appendChild(badge);
  right.appendChild(manage);
  right.appendChild(policy);
  right.appendChild(tos);
  right.appendChild(about);

  row.appendChild(left);
  row.appendChild(right);
  return row;
}

function renderTaskRow(task, options) {
  const wrap = options && options.wrap === true;
  const row = document.createElement("div");
  row.className = "task-row";

  const save = (value) => {
    withStateChange(() => {
      if (!value.trim()) {
        state.tasks = state.tasks.filter((t) => t.id !== task.id);
      } else {
        const found = state.tasks.find((t) => t.id === task.id);
        if (found) {
          found.text = value;
          found.updatedAt = nowISO();
        }
      }
    });
  };

  if (wrap) {
    const textarea = document.createElement("textarea");
    textarea.className = "task-input task-input-textarea";
    textarea.rows = 1;
    textarea.value = task.text;
    textarea.placeholder = "Task…";
    textarea.dataset.taskId = task.id;
    textarea.addEventListener("input", () => {
      save(textarea.value);
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    });
    textarea.addEventListener("blur", () => {
      save(textarea.value);
    });
    // initial auto-resize
    setTimeout(() => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }, 0);
    row.appendChild(textarea);
  } else {
    const input = document.createElement("input");
    input.className = "task-input";
    input.value = task.text;
    input.placeholder = "Task…";
    input.dataset.taskId = task.id;
    input.addEventListener("change", () => save(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const value = input.value.trim();
        withStateChange(() => {
          const found = state.tasks.find((t) => t.id === task.id);
          if (found) {
            found.text = value;
            found.updatedAt = nowISO();
          }
          const idx = state.tasks.findIndex((t) => t.id === task.id);
          const next = {
            id: uid(),
            date: task.date,
            text: "",
            createdAt: nowISO(),
            updatedAt: nowISO(),
          };
          state.tasks.splice(idx + 1, 0, next);
          setTimeout(() => {
            const el = document.querySelector(`.task-input[data-task-id="${next.id}"]`);
            if (el) el.focus();
          }, 0);
        });
      }
    });
    row.appendChild(input);
  }

  const del = document.createElement("button");
  del.className = "task-delete";
  del.textContent = "×";
  del.title = "Delete task";
  del.addEventListener("click", () => {
    withStateChange(() => {
      state.tasks = state.tasks.filter((t) => t.id !== task.id);
    });
  });

  row.appendChild(del);
  return row;
}

function addTaskForDate(date, text) {
  state.tasks.push({
    id: uid(),
    date,
    text,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  });
}

function renderCalendar() {
  const year = state.meta.calendarYear;
  const month = state.meta.calendarMonth;
  const start = new Date(year, month, 1);
  start.setHours(0, 0, 0, 0);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil(daysInMonth / 7) * 7;

  const container = document.createElement("div");
  container.className = "calendar-wrap";

  const headerRow = document.createElement("div");
  headerRow.className = "calendar-header-row";

  const monthTitle = document.createElement("div");
  monthTitle.className = "calendar-month-title";
  monthTitle.textContent = start.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const nav = document.createElement("div");
  nav.className = "calendar-nav";

  const monthSelect = document.createElement("select");
  monthSelect.className = "calendar-select";
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  monthNames.forEach((name, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = name;
    if (idx === month) opt.selected = true;
    monthSelect.appendChild(opt);
  });
  monthSelect.addEventListener("change", () => {
    if (!requirePlan(PLAN_BASIC, "Upgrade to Basic to change month.")) {
      monthSelect.value = String(state.meta.calendarMonth);
      return;
    }
    const m = parseInt(monthSelect.value, 10);
    if (Number.isNaN(m)) return;
    withStateChange(() => {
      state.meta.calendarMonth = m;
    });
  });

  const yearSelect = document.createElement("select");
  yearSelect.className = "calendar-select";
  const baseYear = 1970;
  const maxYear = 2100;
  for (let y = baseYear; y <= maxYear; y++) {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    if (y === year) opt.selected = true;
    yearSelect.appendChild(opt);
  }
  yearSelect.addEventListener("change", () => {
    if (!requirePlan(PLAN_BASIC, "Upgrade to Basic to change year.")) {
      yearSelect.value = String(state.meta.calendarYear);
      return;
    }
    const y = parseInt(yearSelect.value, 10);
    if (Number.isNaN(y)) return;
    withStateChange(() => {
      state.meta.calendarYear = y;
    });
  });

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "←";
  prevBtn.title = "Previous month";
  prevBtn.addEventListener("click", () => {
    if (!requirePlan(PLAN_BASIC, "Upgrade to Basic to move between months.")) return;
    withStateChange(() => {
      let m = state.meta.calendarMonth - 1;
      let y = state.meta.calendarYear;
      if (m < 0) {
        m = 11;
        y -= 1;
      }
      state.meta.calendarMonth = m;
      state.meta.calendarYear = y;
    });
  });

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "→";
  nextBtn.title = "Next month";
  nextBtn.addEventListener("click", () => {
    if (!requirePlan(PLAN_BASIC, "Upgrade to Basic to move between months.")) return;
    withStateChange(() => {
      let m = state.meta.calendarMonth + 1;
      let y = state.meta.calendarYear;
      if (m > 11) {
        m = 0;
        y += 1;
      }
      state.meta.calendarMonth = m;
      state.meta.calendarYear = y;
    });
  });

  nav.appendChild(monthSelect);
  nav.appendChild(yearSelect);
  nav.appendChild(prevBtn);
  nav.appendChild(nextBtn);

  headerRow.appendChild(monthTitle);
  headerRow.appendChild(nav);

  const wrapper = document.createElement("div");
  wrapper.className = "calendar-grid";

  const todayKey = todayDate();

  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i + 1;
    const cell = document.createElement("div");
    cell.className = "calendar-day";

    if (dayNumber <= daysInMonth) {
      const iso = formatLocalDateKey(year, month, dayNumber);
      if (iso === todayKey) cell.classList.add("calendar-day-today");
      const tasks = state.tasks
        .filter((t) => t.date === iso)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

      const header = document.createElement("div");
      header.className = "calendar-day-header";
      header.textContent = String(dayNumber);

      const list = document.createElement("div");
      list.className = "calendar-tasks";

      if (hasPlan(PLAN_PLUS)) {
        tasks.forEach((t) => {
          list.appendChild(renderTaskRow(t, { wrap: true }));
        });
      } else if (tasks.length) {
        const locked = document.createElement("div");
        locked.className = "tasks-locked-msg";
        locked.textContent = "Upgrade to Plus to view saved tasks.";
        list.appendChild(locked);
      }

      const quickRow = document.createElement("div");
      quickRow.className = "quick-add-row";
      const input = document.createElement("input");
      input.className = "quick-add-input";
      input.placeholder = "New task…";
      input.dataset.date = iso;
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (!requirePlan(PLAN_BASIC, "Upgrade to Basic to create new tasks.")) return;
          const text = input.value.trim();
          if (!text) return;
          withStateChange(() => {
            addTaskForDate(iso, text);
          });
          input.value = "";
        }
      });
      quickRow.appendChild(input);

      cell.appendChild(header);
      cell.appendChild(list);
      cell.appendChild(quickRow);
    }

    wrapper.appendChild(cell);
  }

  container.appendChild(headerRow);
  container.appendChild(wrapper);
  return container;
}

function setupKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      // handled per-input; avoid global interference
      return;
    }
  });
}

window.addEventListener("load", init);

