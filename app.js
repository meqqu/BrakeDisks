// app.js – main shop logic (ESM module)
import { serverSyncReady } from "./serverSync.js";
import { USERS } from "./config.js";
import { ensureDefaultUsers } from "./db.js";
import DOMPurify from 'https://esm.sh/dompurify';

serverSyncReady.then(() => {
  // Guarantee admin account exists on every page load after sync
  ensureDefaultUsers();
});

const brandFilterEl = document.getElementById("brandFilter");
const mfgFilterEl = document.getElementById("manufacturerFilter");
const productGridEl = document.getElementById("productGrid");
const searchSectionEl = document.getElementById("searchSection");
const searchInputEl = document.getElementById("searchInput");
const homeLink = document.getElementById("homeLink");
const adminNav = document.getElementById("adminNav");
const accountNav = document.getElementById("accountNav");
const logoutBtn = document.getElementById("logoutBtn");
const userInfo = document.getElementById("userInfo");
const userMenuBtn = document.getElementById("userMenuBtn");
const userDropdown = document.getElementById("userDropdown");
const openLoginBtn = document.getElementById("openLoginBtn");
const loginModal = document.getElementById("loginModal");
const closeAuthBtn = document.getElementById("closeAuthBtn");
const authForm = document.getElementById("authForm");
const tabLogin = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");

let currentAuthMode = "login"; // "login" or "register"

// Point 4: Toast notification
function showToast(message, isSuccess = true) {
  const toast = document.getElementById("toastNotification");
  const toastText = document.getElementById("toastText");
  const toastIcon = document.getElementById("toastIcon");
  if (!toast) return;
  toastText.textContent = message;
  toastIcon.textContent = isSuccess ? "✅" : "❌";
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// User Menu Toggle
if (userMenuBtn && userDropdown) {
  userMenuBtn.addEventListener("click", () => {
    userDropdown.style.display = userDropdown.style.display === "none" ? "flex" : "none";
  });
}

// Hide dropdown if clicked outside
document.addEventListener("click", (e) => {
  if (!e.target.closest('.user-menu')) {
    userDropdown.style.display = "none";
  }
});

let products = [];
let filtered = [];
let brands = [];
let userRole = "user";
let activeBrand = "all";
let activeMfg = "all";
let currentUser = null;

// Fetch secure session from server
async function fetchUserSession() {
  try {
    const res = await fetch(`${SERVER}/api/auth/me`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
      userRole = data.user.role;
      // Keep a non-authoritative copy for other scripts (like checkout autofill)
      localStorage.setItem("brakeUser", JSON.stringify(currentUser));
      localStorage.setItem("brakeRole", userRole);
      
      const allUsers = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
      const dbUser = allUsers.find(x => x.username === currentUser.username);
      if (dbUser && dbUser.blocked) {
        await fetch(`${SERVER}/api/auth/logout`, { method: "POST", credentials: "include" });
        localStorage.removeItem("brakeRole");
        localStorage.removeItem("brakeUser");
        location.reload();
        return;
      }
    } else {
      // Backend is reachable but rejected auth - wipe session
      currentUser = null;
      userRole = "user";
      localStorage.removeItem("brakeRole");
      localStorage.removeItem("brakeUser");
    }
  } catch (err) {
    // Backend is unreachable - fallback to localStorage
    const savedUser = JSON.parse(localStorage.getItem("brakeUser") || "null");
    if (savedUser) {
      currentUser = savedUser;
      userRole = localStorage.getItem("brakeRole") || "user";
    } else {
      currentUser = null;
      userRole = "user";
    }
  }
  restoreSession();
}

// Show UI based on fetched session
function restoreSession() {
  const savedUser = currentUser;
  const savedRole = userRole;
  const topAdminLink = document.getElementById("topAdminLink");
  const customDiscsLink = document.getElementById("customDiscsLink");
  const userMenuText = document.getElementById("userMenuText");
  const cartToggle = document.getElementById("cartToggle");
  
  const navArticles = document.getElementById("navArticles");
  const navUsers = document.getElementById("navUsers");
  const navSettings = document.getElementById("navSettings");
  
  if (savedRole && savedUser) {
    userRole = savedRole;
    if (userRole === "admin" || userRole === "superadmin") {
      adminNav.style.display = "block";
      if(topAdminLink) topAdminLink.style.display = "block";
      if(customDiscsLink) customDiscsLink.style.display = "none";
      // Point 13: Hide cart for producers
      if(cartToggle) cartToggle.style.display = "none";
      
      if (userRole === "superadmin") {
        if(navArticles) navArticles.style.display = "block";
        if(navUsers) navUsers.style.display = "block";
        if(navSettings) navSettings.style.display = "block";
      } else {
        if(navArticles) navArticles.style.display = "block";
        if(navUsers) navUsers.style.display = "none";
        if(navSettings) navSettings.style.display = "none";
      }
    } else {
      adminNav.style.display = "none";
      if(topAdminLink) topAdminLink.style.display = "none";
      if(customDiscsLink) customDiscsLink.style.display = "block";
      if(cartToggle) cartToggle.style.display = "block";
      
      if(navArticles) navArticles.style.display = "none";
      if(navUsers) navUsers.style.display = "none";
      if(navSettings) navSettings.style.display = "none";
    }
    accountNav.style.display = "block";
    logoutBtn.style.display = "block";
    userInfo.style.display = "block";
    openLoginBtn.style.display = "none";
    userInfo.textContent = `Hi, ${savedUser.username}`;
    if (userMenuText) userMenuText.textContent = savedUser.username;
    if (loginModal) loginModal.style.display = "none";
  } else {
    adminNav.style.display = "none";
    accountNav.style.display = "none";
    logoutBtn.style.display = "none";
    userInfo.style.display = "none";
    openLoginBtn.style.display = "block";
    if(topAdminLink) topAdminLink.style.display = "none";
    if(customDiscsLink) customDiscsLink.style.display = "block";
    if(cartToggle) cartToggle.style.display = "block";
    if (userMenuText) userMenuText.textContent = "Sign In"; // Point 4: Word Sign In
    
    if(navArticles) navArticles.style.display = "none";
    if(navUsers) navUsers.style.display = "none";
    if(navSettings) navSettings.style.display = "none";
    // navMyAccount removed - element no longer exists, accountNav used instead
  }
  updateChatsNotification();
}

function updateChatsNotification() {
  const allMsgs = JSON.parse(localStorage.getItem("brakeMessages") || "[]");
  const savedUser = JSON.parse(localStorage.getItem("brakeUser") || "{}");
  const savedRole = localStorage.getItem("brakeRole") || "user";
  
  const askQuestionBtn = document.getElementById("askQuestionBtn");
  if (!askQuestionBtn) return;
  
  if (savedRole === "superadmin" || savedRole === "admin") {
    const userMfg = savedUser.manufacturer || "";
    const filteredMsgs = allMsgs.filter(m => {
      if (savedRole === "superadmin") return true;
      const mMfg = m.manufacturer || "Garage1";
      return mMfg === userMfg;
    });
    
    const unreadUsers = new Set();
    filteredMsgs.forEach(m => {
      if (!m.readByAdmin && m.sender === 'user') {
        unreadUsers.add(m.username);
      }
    });
    
    const count = unreadUsers.size;
    const chatLabel = "Chats";
    if (count > 0) {
      askQuestionBtn.innerHTML = DOMPurify.sanitize(`💬 ${chatLabel} <span style="background:#ff1744; color:var(--color-text-bright); border-radius:50%; padding:0.1rem 0.5rem; font-size:0.75rem; font-weight:bold; margin-left:0.3rem; box-shadow:0 0 5px rgba(255,23,68,0.5);">${count}</span>`);
    } else {
      askQuestionBtn.innerHTML = `💬 ${chatLabel}`;
    }
    
    // Redirect to admin.html with questions tab when clicked
    askQuestionBtn.onclick = (e) => {
      e.preventDefault();
      window.location.href = "/admin.html?tab=questions";
    };
    askQuestionBtn.style.border = "1px solid #00b0ff";
    askQuestionBtn.style.color = "#00b0ff";
  } else {
    askQuestionBtn.innerHTML = "Ask a Question";
    askQuestionBtn.onclick = null;
    askQuestionBtn.style.border = "1px solid var(--color-primary-start)";
    askQuestionBtn.style.color = "#fff";
  }
}

// Add interval to check new messages
setInterval(updateChatsNotification, 3000);

// Logout handling
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch(`${SERVER}/api/auth/logout`, { method: "POST", credentials: "include" });
    } catch {}
    localStorage.removeItem("brakeRole");
    localStorage.removeItem("brakeUser");
    userRole = "user";
    currentUser = null;
    restoreSession();
    if (userDropdown) userDropdown.style.display = "none";
    showToast("You have successfully logged out");
  });
}

const SERVER = ""; // Relative path — works with any port

// Helpers for auth message display
function showAuthMsg(text, isError = false, testLink = null) {
  const el = document.getElementById("authMsg");
  if (!el) return;
  el.innerHTML = DOMPurify.sanitize(text);
  if (testLink) {
    el.innerHTML += `<br><br><span style="font-size:0.8rem;color:#888;">Для тестов: </span><a href="${DOMPurify.sanitize(testLink)}" style="color:#a78bfa;text-decoration:underline;">Нажмите сюда</a>`;
  }
  el.style.display = "block";
  el.style.background = isError ? "rgba(255,82,82,0.12)" : "rgba(0,230,118,0.1)";
  el.style.borderLeft = isError ? "4px solid #ff5252" : "4px solid #00e676";
  el.style.color = isError ? "#ff7070" : "#00e676";
}
function hideAuthMsg() {
  const el = document.getElementById("authMsg"); if (el) el.style.display = "none";
}

// Auth modal toggling
if (openLoginBtn) {
  openLoginBtn.addEventListener("click", () => {
    if (loginModal) {
      loginModal.style.display = "flex";
      if (userDropdown) userDropdown.style.display = "none";
    } else {
      window.location.href = "index.html?action=login";
    }
  });
}

if (closeAuthBtn) {
  closeAuthBtn.addEventListener("click", () => {
    if (loginModal) loginModal.style.display = "none";
  });
}


// Tab switching
if (tabLogin && tabRegister) {
  tabLogin.addEventListener("click", () => {
    currentAuthMode = "login";
    tabLogin.style.color = "#fff"; tabLogin.style.borderBottom = "2px solid #7c3aed";
    tabRegister.style.color = "#888"; tabRegister.style.borderBottom = "2px solid transparent";
    document.getElementById("authModalTitle").textContent = "Sign In";
    document.getElementById("authModalSub").textContent = "Welcome back to MotoBrake Discs";
    document.getElementById("authModalIcon").textContent = "👤";
    document.getElementById("authBtn").textContent = "Sign In";
    document.getElementById("emailFieldWrapper").style.display = "none";
    document.getElementById("loginEmail")?.removeAttribute("required");
    document.getElementById("forgotPasswordLink").style.display = "block";
    document.getElementById("authForm").style.display = "flex";
    document.getElementById("forgotPanel").style.display = "none";
    hideAuthMsg();
  });

  tabRegister.addEventListener("click", () => {
    currentAuthMode = "register";
    tabRegister.style.color = "#fff"; tabRegister.style.borderBottom = "2px solid #7c3aed";
    tabLogin.style.color = "#888"; tabLogin.style.borderBottom = "2px solid transparent";
    document.getElementById("authModalTitle").textContent = "Create Account";
    document.getElementById("authModalSub").textContent = "Join MotoBrake Discs";
    document.getElementById("authModalIcon").textContent = "✨";
    document.getElementById("authBtn").textContent = "Create Account";
    document.getElementById("emailFieldWrapper").style.display = "block";
    document.getElementById("loginEmail")?.setAttribute("required", "");
    document.getElementById("forgotPasswordLink").style.display = "none";
    hideAuthMsg();
  });
}

// Forgot password toggle
const showForgotBtn = document.getElementById("showForgotBtn");
const backToLoginBtn = document.getElementById("backToLoginBtn");
const sendForgotBtn = document.getElementById("sendForgotBtn");

if (showForgotBtn) {
  showForgotBtn.addEventListener("click", () => {
    document.getElementById("authForm").style.display = "none";
    document.getElementById("forgotPanel").style.display = "flex";
    document.getElementById("authModalTitle").textContent = "Reset Password";
    document.getElementById("authModalSub").textContent = "We'll email you a reset link";
    document.getElementById("authModalIcon").textContent = "🔑";
    hideAuthMsg();
  });
}
if (backToLoginBtn) {
  backToLoginBtn.addEventListener("click", () => {
    document.getElementById("authForm").style.display = "flex";
    document.getElementById("forgotPanel").style.display = "none";
    document.getElementById("authModalTitle").textContent = "Sign In";
    document.getElementById("authModalSub").textContent = "Welcome back to MotoBrake Discs";
    document.getElementById("authModalIcon").textContent = "👤";
    hideAuthMsg();
  });
}
if (sendForgotBtn) {
  sendForgotBtn.addEventListener("click", async () => {
    const email = document.getElementById("forgotEmail")?.value.trim();
    if (!email) { showAuthMsg("Please enter your email.", true); return; }
    sendForgotBtn.disabled = true;
    sendForgotBtn.textContent = "Sending...";
    try {
      const res = await fetch(`${SERVER}/api/auth/forgot-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      showAuthMsg("📧 " + data.message, false, data.testLink);
    } catch {
      showAuthMsg("Server error. Make sure the backend is running.", true);
    }
    sendForgotBtn.disabled = false;
    sendForgotBtn.textContent = "📧 Send Reset Link";
  });
}

// ─── Auth form submit (login or register) ────────────────────────────────────
if (authForm) {
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAuthMsg();
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const email = document.getElementById("loginEmail")?.value.trim() || "";
    const btn = document.getElementById("authBtn");
    if (!username || !password) return;

    btn.disabled = true;
    btn.textContent = currentAuthMode === "login" ? "Signing in..." : "Creating account...";

    try {
      if (currentAuthMode === "login") {
        // ── LOGIN ─────────────────────────────────────────────────────────────
        // Try server first
        let serverOk = false;
        try {
          const res = await fetch(`${SERVER}/api/auth/login`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
            credentials: "include"
          });
          const data = await res.json();
          if (res.ok) {
            serverOk = true;
            await fetchUserSession(); // Fetches me and restores UI
            if (loginModal) loginModal.style.display = "none";
            showToast("Welcome back, " + data.user.username + "! 🏍️");
          } else {
            showAuthMsg("❌ " + data.error, true);
          }
        } catch {
          // Server not running - fall back to localStorage auth (for superadmin etc.)
          const allUsers = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
          const match = allUsers.find(x => x.username === username && x.password === password);
          if (match) {
            if (match.blocked) { showAuthMsg("❌ Your account has been blocked.", true); return; }
            localStorage.setItem("brakeRole", match.role);
            localStorage.setItem("brakeUser", JSON.stringify(match));
            if (loginModal) loginModal.style.display = "none";
            restoreSession();
            showToast("Welcome, " + match.username + "!");
            serverOk = true;
          } else {
            showAuthMsg("❌ Invalid username or password.", true);
          }
        }

      } else {
        // ── REGISTER ──────────────────────────────────────────────────────────
        if (!email) { showAuthMsg("❌ Email is required for registration.", true); return; }
        const res = await fetch(`${SERVER}/api/auth/register`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (res.ok) {
          showAuthMsg("✅ " + data.message, false, data.testLink);
          // Switch to login tab after successful register
          if (!data.testLink) setTimeout(() => { if (tabLogin) tabLogin.click(); }, 3000);
        } else {
          showAuthMsg("❌ " + data.error, true);
        }
      }
    } catch (err) {
      showAuthMsg("❌ Cannot connect to server. Please try again.", true);
    }

    btn.disabled = false;
    btn.textContent = currentAuthMode === "login" ? "Sign In" : "Create Account";
  });
}

function loadProducts() {
  const CATALOG_VERSION = "v2-en"; // Bump this to force-reset on structure changes
  const storedVersion = localStorage.getItem("brakeProductsVersion");
  const stored = localStorage.getItem("brakeProducts");

  if (stored && storedVersion === CATALOG_VERSION) {
    products = JSON.parse(stored);
    init();
  } else {
    // Version mismatch or first load — reset to fresh English catalog
    localStorage.removeItem("brakeProducts");
    fetch("/products.json")
      .then((r) => r.json())
      .then((data) => {
        products = data;
        localStorage.setItem("brakeProducts", JSON.stringify(products));
        localStorage.setItem("brakeProductsVersion", CATALOG_VERSION);
        init();
      })
      .catch(console.error);
  }
}

function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const mfgParam = urlParams.get("mfg");
  if (mfgParam) {
    activeMfg = mfgParam;
  }
  
  if (urlParams.get("action") === "login" && loginModal) {
    loginModal.style.display = "flex";
    // clean up url without reloading
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  
  brands = ["all", ...new Set(products.map((p) => p.brand))];
  renderBrandFilters();
  renderManufacturerFilters();
  filterProducts();
  renderCart();
  renderFooterData();
  populateAskManufacturers();
  
  // Authenticate user securely on init
  fetchUserSession();
}

function renderBrandFilters() {
  if (!brandFilterEl) return;
  brandFilterEl.innerHTML = brands
    .map(
      (b) => `
    <button class="brand-btn ${activeBrand === b ? "active" : ""}" data-brand="${b}">
      ${b === "all" ? "All Brands" : b}
    </button>
  `
    )
    .join("");

  brandFilterEl.querySelectorAll(".brand-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeBrand = btn.dataset.brand;
      brandFilterEl.querySelectorAll(".brand-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      filterProducts();
    });
  });
}

// Point 2: Dynamic manufacturer list filters with "All" button
function renderManufacturerFilters() {
  if (!mfgFilterEl) return;
  
  const allUsers = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
  const registeredMfgs = allUsers.filter(u => u.role === 'admin').map(u => u.manufacturer).filter(Boolean);
  const productMfgs = products.map(p => p.manufacturer || "BrakeDiscs Official").filter(Boolean);
  const manufacturers = [...new Set([...registeredMfgs, ...productMfgs])];
  
  let html = `<button class="brand-btn ${activeMfg === 'all' ? 'active' : ''}" data-mfg="all">All</button>`;
  html += manufacturers.map(m => `<button class="brand-btn ${activeMfg === m ? 'active' : ''}" data-mfg="${m}">${m}</button>`).join('');
  mfgFilterEl.innerHTML = html;
  
  mfgFilterEl.querySelectorAll(".brand-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      activeMfg = btn.dataset.mfg;
      mfgFilterEl.querySelectorAll(".brand-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filterProducts();
    });
  });
}

function filterProducts() {
  let temp = products.filter(p => p.visible !== false);
  
  // Filter by Brand
  if (activeBrand !== "all") {
    temp = temp.filter(p => p.brand === activeBrand);
  }
  
  // Filter by Manufacturer
  if (activeMfg !== "all") {
    temp = temp.filter(p => (p.manufacturer || "BrakeDiscs Official") === activeMfg);
  }
  
  // Filter by Search Query
  const q = searchInputEl.value.trim().toLowerCase();
  if (q) {
    temp = temp.filter(p => p.name.toLowerCase().includes(q) || (p.brand && p.brand.toLowerCase().includes(q)));
  }
  
  filtered = temp;
  renderProducts();
}

const SVG_FALLBACK = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="100%" height="100%"><defs><radialGradient id="discGrad" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="%23444" /><stop offset="70%" stop-color="%23222" /><stop offset="85%" stop-color="%23666" /><stop offset="95%" stop-color="%23111" /><stop offset="100%" stop-color="%23ff5500" /></radialGradient></defs><rect width="100%" height="100%" fill="%23151518" /><circle cx="150" cy="100" r="75" fill="none" stroke="%23ff5500" stroke-width="2" opacity="0.4" /><circle cx="150" cy="100" r="70" fill="url(%23discGrad)" stroke="%23444" stroke-width="4" /><circle cx="150" cy="100" r="50" fill="none" stroke="%230a0a0c" stroke-width="4" stroke-dasharray="10 15" /><circle cx="150" cy="100" r="35" fill="none" stroke="%230a0a0c" stroke-width="4" stroke-dasharray="8 12" /><circle cx="150" cy="100" r="20" fill="%23111" stroke="%23ff5500" stroke-width="2" /><circle cx="150" cy="88" r="3" fill="%23666" /><circle cx="162" cy="106" r="3" fill="%23666" /><circle cx="138" cy="106" r="3" fill="%23666" /><path d="M 78,55 C 80,45 100,40 120,48 L 115,75 C 100,68 88,68 85,73 Z" fill="%23ff1744" stroke="%23d50000" stroke-width="2" /><text x="100" y="60" fill="%23fff" font-size="8" font-family="Arial" font-weight="bold" transform="rotate(-15, 100, 60)">BREMBO</text><text x="150" y="185" fill="%23aaa" font-size="12" font-family="sans-serif" text-anchor="middle" font-weight="bold">MOTO BRAKE PREMIUM</text></svg>`;

function renderProducts() {
  if (!productGridEl) return;
  productGridEl.innerHTML = "";
  if (filtered.length === 0) {
    productGridEl.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:3rem; color:var(--color-muted);">No products found</div>`;
    return;
  }

  filtered.forEach((p) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.style.cursor = "pointer";
    const textStock = p.stock ? "In Stock" : "On Request";
    const stockClass = p.stock ? "stock-yes" : "stock-no";
    const pMfg = p.manufacturer || "BrakeDiscs Official";

    // Point 4: Hide/disable Buy button for admin and superadmin
    const savedRole = localStorage.getItem("brakeRole") || "user";
    const isAdmin = savedRole === "admin" || savedRole === "superadmin";
    const buttonHtml = isAdmin
      ? `<button class="add-to-cart-btn" style="background:var(--color-input-bg); color:var(--color-text); border:1px solid var(--color-border); cursor:default;" disabled>🔒 Admin Mode</button>`
      : `<button class="add-to-cart-btn" data-id="${p.id}">Buy</button>`;

    const priceVal = parseFloat(p.price);
    const displayPrice = isNaN(priceVal) ? "0.00" : priceVal.toFixed(2);

    const safeName = DOMPurify.sanitize(p.name);
    const safeBrand = DOMPurify.sanitize(p.brand || "---");
    const safeMfg = DOMPurify.sanitize(pMfg);
    const safeImage = DOMPurify.sanitize(p.image || SVG_FALLBACK);
    const safeSeoTitle = DOMPurify.sanitize(p.seoTitle || p.name);
    const safeMotoModel = DOMPurify.sanitize(p.motoModel);
    const safeMotoYears = DOMPurify.sanitize(p.motoYears);

    card.innerHTML = `
      <img src="${safeImage}" alt="${safeSeoTitle}" style="width:100%; height:200px; object-fit:cover;" />
      <div class="product-info">
        <div class="product-brand">${safeBrand}</div>
        <h3 class="product-title">${safeName}</h3>
        <!-- Point 6: Render manufacturer brand inside product cards -->
        <div class="product-mfg-link" style="display:inline-block; font-size:0.75rem; color:var(--color-muted); font-weight:600; margin-top:2px; cursor:pointer; text-decoration:underline;" title="View manufacturer profile">🏭 ${safeMfg}</div>
        ${p.motoModel || p.motoYears ? `
          <div style="font-size:0.75rem; color:var(--color-text); margin-top:2px; font-weight:bold;">
            ${p.motoModel ? `<span>🏍️ ${safeMotoModel}</span>` : ''}
            ${p.motoYears ? `<span style="color:var(--color-primary-start); margin-left:4px;">(${safeMotoYears})</span>` : ''}
          </div>
        ` : ''}
        <div style="font-size:0.75rem; color:var(--color-primary-start); font-weight:bold; margin-top:2px;">⚙️ Type: ${(p.placement || 'Front') === 'Front' ? 'Front' : 'Rear'}</div>
        <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.3rem;">
          <span class="product-stock ${stockClass}">${textStock}</span>
        </div>
        <div class="product-price">$${displayPrice}</div>
      </div>
      ${buttonHtml}
    `;

    // Bind image error fallback via JS (inline onerror breaks due to SVG quotes)
    const cardImg = card.querySelector("img");
    if (cardImg) {
      cardImg.addEventListener("error", function() {
        this.onerror = null;
        this.src = SVG_FALLBACK;
      });
    }

    const mfgLinkEl = card.querySelector(".product-mfg-link");
    if (mfgLinkEl) {
      mfgLinkEl.addEventListener("click", (e) => {
        e.stopPropagation();
        openMfgDetailsModal(pMfg);
      });
    }
    
    // Add to cart click event if not admin
    if (!isAdmin) {
      card.querySelector(".add-to-cart-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        addToCart(p.id);
      });
    }
    
    // Navigation to product details
    card.addEventListener("click", () => {
      window.location.href = `product.html?id=${p.slug || p.id}`;
    });
    
    productGridEl.appendChild(card);
  });
}

// Shopping Cart Core
function addToCart(id) {
  const cart = JSON.parse(localStorage.getItem("brakeCart") || "{}");
  cart[id] = (cart[id] || 0) + 1;
  localStorage.setItem("brakeCart", JSON.stringify(cart));
  renderCart();
  showToast("Product added to cart");
}

// Point 3: Cart Items Stacking layout
function renderCart() {
  const cartDrawerItems = document.getElementById("cartItems");
  const cartTotal = document.getElementById("cartTotal");
  if (!cartDrawerItems) return;
  
  const storedCart = JSON.parse(localStorage.getItem("brakeCart") || "{}");
  
  cartDrawerItems.innerHTML = "";
  let total = 0;
  
  Object.entries(storedCart).forEach(([id, qty]) => {
    const prod = products.find(p => p.id == id);
    if (!prod) return;
    const lineTotal = prod.price * qty;
    total += lineTotal;
    const safeName = DOMPurify.sanitize(prod.name);
    const safeImage = DOMPurify.sanitize(prod.image || SVG_FALLBACK);

    cartDrawerItems.innerHTML += `
      <div class="cart-item">
        <img src="${safeImage}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;" />
        <div class="cart-item-details">
          <div class="cart-item-name">${safeName}</div>
          <div class="cart-item-price-block">$${prod.price.toFixed(2)}</div>
        </div>
        <div class="cart-item-qty-block">
          <input type="number" min="1" value="${qty}" class="cart-item-qty-input" data-id="${prod.id}" style="width:45px; padding:0.1rem; border-radius:4px; border:1px solid var(--color-border); background:var(--color-input-bg); color:var(--color-text-bright); text-align:center;" />
        </div>
        <button class="cart-item-remove" data-id="${prod.id}">🗑️</button>
      </div>
    `;
  });
  
  cartTotal.textContent = `$${total.toFixed(2)}`;
  
  // Remove item listeners
  cartDrawerItems.querySelectorAll(".cart-item-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const cart = JSON.parse(localStorage.getItem("brakeCart") || "{}");
      delete cart[id];
      localStorage.setItem("brakeCart", JSON.stringify(cart));
      renderCart();
      showToast('Item removed from cart');
    });
  });
  
  // Quantity change listeners
  cartDrawerItems.querySelectorAll(".cart-item-qty-input").forEach(inp => {
    inp.addEventListener("change", () => {
      const id = inp.dataset.id;
      let val = parseInt(inp.value);
      if (isNaN(val) || val < 1) val = 1;
      const cart = JSON.parse(localStorage.getItem("brakeCart") || "{}");
      cart[id] = val;
      localStorage.setItem("brakeCart", JSON.stringify(cart));
      renderCart();
    });
  });
}

const cartToggle = document.getElementById("cartToggle");
const cartDrawer = document.getElementById("cartDrawer");
const closeCartBtn = document.getElementById("closeCartBtn");

if (cartToggle) {
  cartToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    cartDrawer.classList.toggle("open");
  });
}

if (closeCartBtn) {
  closeCartBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    cartDrawer.classList.remove("open");
  });
}

document.addEventListener("click", (e) => {
  if (
    cartDrawer &&
    cartDrawer.classList.contains("open") &&
    !cartDrawer.contains(e.target) &&
    e.target !== cartToggle &&
    (!closeCartBtn || !closeCartBtn.contains(e.target))
  ) {
    cartDrawer.classList.remove("open");
  }
});

// Search filtering
if (searchInputEl) searchInputEl.addEventListener("input", filterProducts);

// Home click reset
if (homeLink) {
  homeLink.addEventListener("click", (e) => {
    e.preventDefault();
    searchSectionEl.style.display = "flex";
    mfgFilterEl.style.display = "flex";
    brandFilterEl.style.display = "flex";
    const lblMfgTitle = document.getElementById("lblMfgTitle");
    if (lblMfgTitle) lblMfgTitle.style.display = "block";
    document.getElementById("productGrid").style.display = "grid";
    document.getElementById("shopArticlesSection").style.display = "none";
    activeBrand = "all";
    activeMfg = "all";
    init();
  });
}

// --- Ask Question Modal ---
const askQuestionBtn = document.getElementById("askQuestionBtn");
const askModal = document.getElementById("askModal");
const closeAskBtn = document.getElementById("closeAskBtn");
const askForm = document.getElementById("askForm");
const askWarning = document.getElementById("askWarning");
const askText = document.getElementById("askText");
const submitAskBtn = document.getElementById("submitAskBtn");
const askManufacturer = document.getElementById("askManufacturer");

// Point 13: Ask Question to Administrators (Superuser)
function populateAskManufacturers() {
  if (!askManufacturer) return;
  const allUsers = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
  const savedUser = JSON.parse(localStorage.getItem("brakeUser") || "{}");
  const currentMfg = savedUser.manufacturer || "";
  
  const manufacturers = allUsers
    .filter(u => u.role === 'admin')
    .map(u => u.manufacturer)
    .filter(Boolean)
    .filter(m => m !== currentMfg);
  
  let html = "";
  if (savedUser.role !== "superadmin") {
    html += `<option value="Administration (Superuser)">Administration (Superuser)</option>`;
  }
  html += manufacturers.map(m => `<option value="${m}">${m}</option>`).join('');
  askManufacturer.innerHTML = html;

  // If user role is "user" or empty (guest), hide the selector wrapper so they ask Superuser directly
  const mfgSelectWrapper = document.getElementById("mfgSelectWrapper");
  if (mfgSelectWrapper) {
    if (!savedUser.role || savedUser.role === "user") {
      mfgSelectWrapper.style.display = "none";
    } else {
      mfgSelectWrapper.style.display = "flex";
    }
  }
}

askQuestionBtn.addEventListener("click", () => {
  askModal.style.display = "flex";
  const user = localStorage.getItem("brakeUser");
  populateAskManufacturers();
  
  if (!user) {
    askWarning.style.display = "block";
    askWarning.textContent = "Please login or register to ask a question.";
    askText.disabled = true;
    submitAskBtn.disabled = true;
    if (askManufacturer) askManufacturer.disabled = true;
  } else {
    askWarning.style.display = "none";
    askText.disabled = false;
    submitAskBtn.disabled = false;
    if (askManufacturer) askManufacturer.disabled = false;
  }
});

if (closeAskBtn) {
  closeAskBtn.addEventListener("click", () => {
    askModal.style.display = "none";
  });
}

askForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = document.getElementById("askText").value.trim();
  if (!text) return;

  const user = JSON.parse(localStorage.getItem("brakeUser") || "{}");
  const username = user.username || "Guest";
  
  // If simple user, target is automatically the Superuser
  const targetMfg = (!user.role || user.role === "user") 
    ? "Administration (Superuser)" 
    : (askManufacturer ? askManufacturer.value : "Administration (Superuser)");

  const msgs = JSON.parse(localStorage.getItem("brakeMessages") || "[]");
  msgs.push({
    id: Date.now(),
    username: username,
    sender: "user",
    text: text,
    date: new Date().toISOString(),
    readByAdmin: false,
    manufacturer: targetMfg
  });
  localStorage.setItem("brakeMessages", JSON.stringify(msgs));

  alert("Your question was successfully sent! The reply will appear in your profile.");
  askForm.reset();
  askModal.style.display = "none";
});

// --- Point 10: Custom Individual Disc Form with File/Image support ---
const customDiscsLink = document.getElementById("customDiscsLink");
if (customDiscsLink) {
  customDiscsLink.addEventListener("click", (e) => {
  e.preventDefault();
  searchSectionEl.style.display = "none";
  brandFilterEl.style.display = "none";
  mfgFilterEl.style.display = "none";
  
  const customProducts = products.filter(p => p.stock === false);
  
  let html = `
    <div style="grid-column: 1/-1; margin-bottom:2rem; background:var(--color-surface); padding:2rem; border-radius:var(--radius); box-shadow:var(--shadow);">
      <h2 style="color:var(--color-primary-start); margin-bottom:1rem;" id="cdTitle">Order Custom Disc</h2>
      <p style="margin-bottom:1rem; color:var(--color-muted);" id="cdDescText">Didn't find the perfect size or design? Describe your idea, upload a photograph/blueprint, and we will manufacture an exclusive brake disc specifically for your motorcycle.</p>
      
      <form id="customDiscForm" style="display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; gap:1rem; flex-wrap:wrap;">
          <input type="text" id="cdName" placeholder="Your Name" required style="flex:1; padding:0.8rem; border-radius:var(--radius); border:1px solid var(--color-muted); background:var(--color-bg); color:var(--color-text);" />
          <input type="text" id="cdMoto" placeholder="Motorcycle (model, year)" required style="flex:1; padding:0.8rem; border-radius:var(--radius); border:1px solid var(--color-muted); background:var(--color-bg); color:var(--color-text);" />
        </div>
        <textarea id="cdDesc" placeholder="Describe design, diameters, thickness..." required style="min-height:100px; padding:0.8rem; border-radius:var(--radius); border:1px solid var(--color-muted); background:var(--color-bg); color:var(--color-text); font-family:inherit;"></textarea>
        
        <!-- Photo/ blueprint attachment upload input -->
        <div style="display:flex; flex-direction:column; gap:0.4rem;">
          <label style="font-size:0.85rem; color:var(--color-muted);" id="lblCdAttach">Attach blueprint / photograph</label>
          <input type="file" id="cdFile" accept="image/*" style="padding:0.6rem; border-radius:var(--radius); border:1px solid var(--color-muted); background:var(--color-bg); color:var(--color-text);" />
          <div id="cdFilePreviewContainer" style="display:none; margin-top:0.5rem;">
            <img id="cdFilePreview" src="" alt="Blueprint Preview" style="max-height:150px; border-radius:8px; border:1px solid var(--color-border);" />
          </div>
        </div>
        
        <button type="submit" style="background:linear-gradient(135deg, var(--color-primary-start), var(--color-primary-end)); color:#fff; border:none; padding:0.8rem; border-radius:var(--radius); cursor:pointer; font-weight:bold; font-size:1.1rem; width:100%; max-width:300px;" id="btnSubmitCd">Submit Application</button>
      </form>
    </div>
  `;
  
  if (customProducts.length === 0) {
    html += `<div style="grid-column: 1/-1; text-align:center; padding:3rem; color:var(--color-muted);">No custom disks in catalog.</div>`;
    productGridEl.innerHTML = html;
  } else {
    productGridEl.innerHTML = html;
    const gridContainer = document.createElement("div");
    gridContainer.style.display = "grid";
    gridContainer.style.gridTemplateColumns = "repeat(auto-fill, minmax(240px, 1fr))";
    gridContainer.style.gap = "1.5rem";
    gridContainer.style.gridColumn = "1/-1";
    productGridEl.appendChild(gridContainer);
    
    customProducts.forEach(p => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.innerHTML = `
        <img src="${p.image}" alt="${p.seoTitle || p.name}" class="product-img" style="width:100%; height:200px; object-fit:cover;" />
        <div style="padding:1rem; text-align:center;">
          <div class="product-brand" style="font-size:0.85rem; color:var(--color-muted); text-transform:uppercase;">${p.brand}</div>
          <div class="product-name" style="font-size:1.2rem; font-weight:600;">${p.name}</div>
          <div class="product-price" style="font-size:1.4rem; color:var(--color-primary-start); margin:0.5rem 0;">$${p.price.toFixed(2)}</div>
          <button class="add-to-cart-btn add-to-cart" data-id="${p.id}">Buy</button>
        </div>
      `;
      card.querySelector('.add-to-cart').addEventListener('click', (e) => { e.stopPropagation(); addToCart(p.id); });
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => { window.location.href = `product.html?id=${p.slug || p.id}`; });
      gridContainer.appendChild(card);
    });
  }
  
  // Attach File upload preview listener
  const cdFile = document.getElementById("cdFile");
  const cdFilePreviewContainer = document.getElementById("cdFilePreviewContainer");
  const cdFilePreview = document.getElementById("cdFilePreview");
  let cdImgBase64 = "";

  if (cdFile) {
    cdFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const r = new FileReader();
        r.onload = (event) => {
          cdImgBase64 = event.target.result;
          cdFilePreview.src = cdImgBase64;
          cdFilePreviewContainer.style.display = "block";
        };
        r.readAsDataURL(file);
      } else {
        cdImgBase64 = "";
        cdFilePreviewContainer.style.display = "none";
      }
    });
  }
  
  // Attach submit handler for custom form
  const customDiscForm = document.getElementById("customDiscForm");
  if (customDiscForm) {
    customDiscForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("cdName").value.trim();
      const moto = document.getElementById("cdMoto").value.trim();
      const desc = document.getElementById("cdDesc").value.trim();
      
      const customInquiries = JSON.parse(localStorage.getItem("brakeCustomRequests") || "[]");
      customInquiries.push({
        id: Date.now(),
        name,
        moto,
        desc,
        image: cdImgBase64,
        date: new Date().toISOString(),
        status: "pending"
      });
      localStorage.setItem("brakeCustomRequests", JSON.stringify(customInquiries));

      alert("Your application has been sent successfully!");
      e.target.reset();
      if(cdFilePreviewContainer) cdFilePreviewContainer.style.display = "none";
      cdImgBase64 = "";
    });
  }
  }); // end customDiscsLink click handler
} // end if (customDiscsLink)

// Language logic removed as site is strictly English

// --- Point 12: Superuser Articles and site settings ---
function renderFooterData() {
  const siteEmailEl = document.getElementById("siteEmail");
  const footerArticlesList = document.getElementById("footerArticlesList");
  
  const settings = JSON.parse(localStorage.getItem("brakeSiteSettings") || "{}");
  if (siteEmailEl) {
    siteEmailEl.textContent = settings.contactEmail || "support@brakediscs.com";
  }
  
  const defaultRichArticles = [
    {
      id: 1,
      title: "Innovations in Production: Sintered Metal and Hardened Steel",
      image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80",
      content: "<h3>Technological Breakthrough</h3><p>Garage1 uses advanced milling technology from solid steel blocks with subsequent nitrogen hardening...</p>",
      author: "Garage1",
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      title: "Instruction for proper bedding of new discs and pads",
      image: "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=800&q=80",
      content: "<h3>Bedding procedure:</h3><p>1. Perform 10 smooth brakings from 60 to 20 km/h...</p>",
      author: "BrakeDiscs Official",
      createdAt: new Date().toISOString()
    }
  ];

  let articles = JSON.parse(localStorage.getItem("brakeRichArticles") || "[]");
  if (articles.length === 0) {
    articles = defaultRichArticles;
  }

  if (footerArticlesList) {
    footerArticlesList.innerHTML = articles.map(art => {
      return `<li><a href="#" class="footer-article-link" data-id="${art.id}">${art.title}</a></li>`;
    }).join('');
    
    footerArticlesList.querySelectorAll(".footer-article-link").forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const artId = link.dataset.id;
        const a = articles.find(x => x.id == artId);
        if (a) {
          openArticleReader(a);
        }
      });
    });
  }
}

function injectShopSchema() {
  let existing = document.getElementById("shopSchemaJson");
  if (existing) existing.remove();
  
  const schema = {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    "name": "MotoBrake Discs Store",
    "description": "High-performance motorcycle brake discs catalog, ordering and custom design workshop.",
    "url": window.location.origin,
    "telephone": "+1-800-555-MOTO",
    "priceRange": "$$",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "123 Racing Lane",
      "addressLocality": "Indianapolis",
      "addressRegion": "IN",
      "postalCode": "46201",
      "addressCountry": "US"
    }
  };
  const script = document.createElement("script");
  script.id = "shopSchemaJson";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

// Initial session restoration and product load — wait for server sync first
restoreSession();
serverSyncReady.then(() => {
  loadProducts();
  renderFooterData();
  injectShopSchema();
});

// --- SHOP-WIDE ARTICLES SYSTEM ---
function renderShopArticles() {
  const grid = document.getElementById("shopArticlesGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const articles = JSON.parse(localStorage.getItem("brakeRichArticles") || "[]");
  
  const q = (document.getElementById("articleSearchInput")?.value || "").trim().toLowerCase();
  const filtered = articles.filter(art => {
    return art.title.toLowerCase().includes(q) || art.content.toLowerCase().includes(q) || art.author.toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:3rem; color:var(--color-muted);">No articles found</div>`;
    return;
  }

  filtered.forEach(art => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.cursor = "pointer";
    card.style.transition = "transform 0.2s, box-shadow 0.2s";

    card.addEventListener("mouseenter", () => {
      card.style.transform = "translateY(-4px)";
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "translateY(0)";
    });

    card.addEventListener("click", () => {
      openArticleReader(art);
    });

    const coverUrl = art.image || "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80";
    const dateStr = new Date(art.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    card.innerHTML = `
      <img src="${coverUrl}" alt="${art.title}" style="width:100%; height:180px; object-fit:cover; border-radius:8px 8px 0 0;" />
      <div class="product-info" style="flex:1; display:flex; flex-direction:column; justify-content:space-between; padding:1.2rem;">
        <div>
          <div class="article-author-link" style="display:inline-block; font-size:0.75rem; color:var(--color-primary-start); font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:0.4rem; cursor:pointer; text-decoration:underline;" title="View manufacturer profile">${art.author}</div>
          <h3 style="color:var(--color-text-bright); margin:0 0 0.8rem 0; font-size:1.15rem; font-weight:bold; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; min-height:3.2rem;">${art.title}</h3>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--color-border); padding-top:0.8rem; margin-top:0.5rem; font-size:0.8rem; color:#888; width:100%;">
          <span>${dateStr}</span>
          <span style="color:var(--color-primary-start); font-weight:bold; margin-left:auto;">Read ➔</span>
        </div>
      </div>
    `;

    const authorLink = card.querySelector(".article-author-link");
    if (authorLink) {
      authorLink.addEventListener("click", (e) => {
        e.stopPropagation();
        openMfgDetailsModal(art.author);
      });
    }

    grid.appendChild(card);
  });
}

function openArticleReader(art) {
  const readerModal = document.getElementById("articleReaderModal");
  const readerTitle = document.getElementById("readerTitle");
  const readerAuthor = document.getElementById("readerAuthor");
  const readerDate = document.getElementById("readerDate");
  const readerCover = document.getElementById("readerCover");
  const readerContent = document.getElementById("readerContent");

  if (!readerModal) return;

  readerTitle.textContent = art.title;
  readerAuthor.textContent = `Author: ${art.author}`;
  readerDate.textContent = `Published: ${new Date(art.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })}`;

  if (art.image) {
    readerCover.src = art.image;
    readerCover.style.display = "block";
  } else {
    readerCover.style.display = "none";
  }

  readerContent.innerHTML = art.content || "";
  readerModal.style.display = "flex";
}

function setupShopArticles() {
  const link = document.getElementById("shopArticlesLink");
  const searchInput = document.getElementById("articleSearchInput");
  const closeBtn = document.getElementById("closeReaderBtn");
  const readerModal = document.getElementById("articleReaderModal");

  if (link) {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      
      document.getElementById("productGrid").style.display = "none";
      brandFilterEl.style.display = "none";
      mfgFilterEl.style.display = "none";
      const lblMfgTitle = document.getElementById("lblMfgTitle");
      if (lblMfgTitle) lblMfgTitle.style.display = "none";
      searchSectionEl.style.display = "none";
      
      document.getElementById("shopArticlesSection").style.display = "block";
      renderShopArticles();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", renderShopArticles);
  }

  if (closeBtn && readerModal) {
    closeBtn.addEventListener("click", () => {
      readerModal.style.display = "none";
    });
  }

  const readerAuthor = document.getElementById("readerAuthor");
  if (readerAuthor) {
    readerAuthor.addEventListener("click", () => {
      const authorText = readerAuthor.textContent;
      const authorName = authorText.replace("Author: ", "").trim();
      readerModal.style.display = "none";
      openMfgDetailsModal(authorName);
    });
  }

  const closeMfgBtn = document.getElementById("closeMfgInfoBtn");
  if (closeMfgBtn) {
    closeMfgBtn.addEventListener("click", () => {
      document.getElementById("mfgInfoModal").style.display = "none";
    });
  }
}

// Global functions so they can be accessed anywhere
window.openMfgDetailsModal = function(mfgName) {
  const mfgModal = document.getElementById("mfgInfoModal");
  if (!mfgModal) return;
  
  const key = `brakeMfgDetails_${mfgName}`;
  const info = JSON.parse(localStorage.getItem(key) || "{}");
  
  const users = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
  const mfgUser = users.find(u => u.manufacturer === mfgName) || {};
  
  document.getElementById("mfgInfoTitle").textContent = `${mfgName}`;
  document.getElementById("mfgInfoDesc").textContent = info.description || "No description filled by the manufacturer yet.";
  
  const rawWorkload = info.workload || "Not specified";
  document.getElementById("mfgInfoWorkload").textContent = rawWorkload;
  
  const workloadLower = rawWorkload.toLowerCase();
  const badge = document.getElementById("mfgInfoWorkloadBadge");
  if (badge) {
    if (workloadLower.includes("high") || /([89]\d|100)%/.test(workloadLower)) {
      badge.style.background = "rgba(239, 68, 68, 0.15)";
      badge.style.border = "1px solid rgba(239, 68, 68, 0.3)";
      badge.style.color = "#ef4444";
    } else if (workloadLower.includes("med") || /([4567]\d)%/.test(workloadLower)) {
      badge.style.background = "rgba(245, 158, 11, 0.15)";
      badge.style.border = "1px solid rgba(245, 158, 11, 0.3)";
      badge.style.color = "#f59e0b";
    } else {
      badge.style.background = "rgba(16, 185, 129, 0.15)";
      badge.style.border = "1px solid rgba(16, 185, 129, 0.3)";
      badge.style.color = "#10b981";
    }
  }

  document.getElementById("mfgInfoMaterials").textContent = info.materials || "Steel, carbon, sintered metal";
  document.getElementById("mfgInfoAddress").textContent = info.address || "Not specified";
  
  const contacts = [];
  if (info.phone) contacts.push(`Phone: ${info.phone}`);
  if (mfgUser.username) contacts.push(`Email: ${mfgUser.username}@motobrake.com`);
  
  document.getElementById("mfgInfoPhone").textContent = contacts.length > 0 ? contacts.join(", ") : "Contacts not specified";

  // Load manufacturer's articles
  const mfgArticlesBlock = document.getElementById("mfgArticlesBlock");
  const mfgArticlesList = document.getElementById("mfgArticlesList");
  if (mfgArticlesBlock && mfgArticlesList) {
    mfgArticlesList.innerHTML = "";
    const allArticles = JSON.parse(localStorage.getItem("brakeRichArticles") || "[]");
    const mfgArticles = allArticles.filter(art => art.author.toLowerCase() === mfgName.toLowerCase());
    
    if (mfgArticles.length > 0) {
      mfgArticlesBlock.style.display = "block";
      mfgArticles.forEach(art => {
        const artEl = document.createElement("div");
        artEl.style.display = "flex";
        artEl.style.gap = "0.8rem";
        artEl.style.alignItems = "center";
        artEl.style.padding = "0.5rem";
        artEl.style.borderRadius = "6px";
        artEl.style.background = "rgba(255,255,255,0.03)";
        artEl.style.border = "1px solid rgba(255,255,255,0.05)";
        artEl.style.cursor = "pointer";
        artEl.style.transition = "background 0.2s";
        
        artEl.addEventListener("mouseenter", () => {
          artEl.style.background = "rgba(255,255,255,0.08)";
        });
        artEl.addEventListener("mouseleave", () => {
          artEl.style.background = "rgba(255,255,255,0.03)";
        });

        artEl.addEventListener("click", () => {
          mfgModal.style.display = "none";
          openArticleReader(art);
        });

        const coverUrl = art.image || "https://via.placeholder.com/80x50?text=Article";
        const dateLocale = "en-US";
        artEl.innerHTML = `
          <img src="${coverUrl}" style="width:60px; height:40px; object-fit:cover; border-radius:4px;" />
          <div style="flex:1; overflow:hidden;">
            <div style="font-weight:bold; font-size:0.85rem; color:var(--color-text-bright); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${art.title}</div>
            <div style="font-size:0.75rem; color:#888;">${new Date(art.createdAt).toLocaleDateString(dateLocale)}</div>
          </div>
          <div style="color:var(--color-primary-start); font-size:0.9rem;">➔</div>
        `;
        mfgArticlesList.appendChild(artEl);
      });
    } else {
      mfgArticlesBlock.style.display = "none";
    }
  }

  // Setup View Products button inside modal
  const mfgViewProductsBtn = document.getElementById("mfgViewProductsBtn");
  if (mfgViewProductsBtn) {
    const newBtn = mfgViewProductsBtn.cloneNode(true);
    mfgViewProductsBtn.parentNode.replaceChild(newBtn, mfgViewProductsBtn);
    newBtn.addEventListener("click", () => {
      mfgModal.style.display = "none";
      
      // Restore storefront catalog visibility
      document.getElementById("productGrid").style.display = "grid";
      brandFilterEl.style.display = "flex";
      mfgFilterEl.style.display = "flex";
      const lblMfgTitle = document.getElementById("lblMfgTitle");
      if (lblMfgTitle) lblMfgTitle.style.display = "block";
      searchSectionEl.style.display = "flex";
      document.getElementById("shopArticlesSection").style.display = "none";
      
      // Filter products by manufacturer
      activeMfg = mfgName;
      filterProducts();
      
      // Update filter UI buttons
      const mfgButtons = mfgFilterEl.querySelectorAll(".brand-btn");
      mfgButtons.forEach(btn => {
        if (btn.getAttribute("data-mfg") === mfgName) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    });
  }

  // General Questions button setup inside modal
  const mfgAskQuestionBtn = document.getElementById("mfgAskQuestionBtn");
  if (mfgAskQuestionBtn) {
    const newBtn = mfgAskQuestionBtn.cloneNode(true);
    mfgAskQuestionBtn.parentNode.replaceChild(newBtn, mfgAskQuestionBtn);
    newBtn.addEventListener("click", () => {
      mfgModal.style.display = "none";
      const askModal = document.getElementById("askModal");
      const askManufacturer = document.getElementById("askManufacturer");
      if (askModal) {
        askModal.style.display = "flex";
        if (askManufacturer) {
          askManufacturer.value = mfgName;
        }
      }
    });
  }

  mfgModal.style.display = "flex";
}

function setupFooterArticles() {
  const footArticles = document.getElementById("footArticles");
  const footerArticlesTitle = document.getElementById("footerArticlesTitle");
  const shopArticlesLink = document.getElementById("shopArticlesLink");
  
  const showArticlesFn = (e) => {
    e.preventDefault();
    if (shopArticlesLink) {
      shopArticlesLink.click();
      const section = document.getElementById("shopArticlesSection");
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  if (footArticles) footArticles.addEventListener("click", showArticlesFn);
  if (footerArticlesTitle) footerArticlesTitle.addEventListener("click", showArticlesFn);
}

setupShopArticles();
setupFooterArticles();
