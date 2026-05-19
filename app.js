// app.js – main shop logic (ESM module)
import { USERS } from "./config.js";
import { ensureDefaultUsers } from "./db.js";

// Guarantee admin account exists on every page load
ensureDefaultUsers();

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
let currentLang = "ru";

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
userMenuBtn.addEventListener("click", () => {
  userDropdown.style.display = userDropdown.style.display === "none" ? "flex" : "none";
});

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

// Show UI based on saved session
function restoreSession() {
  const savedRole = localStorage.getItem("brakeRole");
  const savedUser = JSON.parse(localStorage.getItem("brakeUser") || "null");
  const topAdminLink = document.getElementById("topAdminLink");
  const customDiscsLink = document.getElementById("customDiscsLink");
  const userMenuText = document.getElementById("userMenuText");
  const cartToggle = document.getElementById("cartToggle");
  
  if (savedRole && savedUser) {
    userRole = savedRole;
    if (userRole === "admin" || userRole === "superadmin") {
      adminNav.style.display = "block";
      if(topAdminLink) topAdminLink.style.display = "block";
      if(customDiscsLink) customDiscsLink.style.display = "none";
      // Point 13: Hide cart for producers
      if(cartToggle) cartToggle.style.display = "none";
    } else {
      adminNav.style.display = "none";
      if(topAdminLink) topAdminLink.style.display = "none";
      if(customDiscsLink) customDiscsLink.style.display = "block";
      if(cartToggle) cartToggle.style.display = "block";
    }
    accountNav.style.display = "block";
    logoutBtn.style.display = "block";
    userInfo.style.display = "block";
    openLoginBtn.style.display = "none";
    userInfo.textContent = currentLang === "ru" ? `Привет, ${savedUser.username}` : `Hi, ${savedUser.username}`;
    if (userMenuText) userMenuText.textContent = savedUser.username; // Point 1: Username next to avatar
    loginModal.style.display = "none";
  } else {
    adminNav.style.display = "none";
    accountNav.style.display = "none";
    logoutBtn.style.display = "none";
    userInfo.style.display = "none";
    openLoginBtn.style.display = "block";
    if(topAdminLink) topAdminLink.style.display = "none";
    if(customDiscsLink) customDiscsLink.style.display = "block";
    if(cartToggle) cartToggle.style.display = "block";
    if (userMenuText) userMenuText.textContent = currentLang === "ru" ? "Войти" : "Sign In"; // Point 4: Word Sign In
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
    
    if (count > 0) {
      askQuestionBtn.innerHTML = `💬 Чаты <span style="background:#ff1744; color:#fff; border-radius:50%; padding:0.1rem 0.5rem; font-size:0.75rem; font-weight:bold; margin-left:0.3rem; box-shadow:0 0 5px rgba(255,23,68,0.5);">${count}</span>`;
    } else {
      askQuestionBtn.innerHTML = `💬 Чаты`;
    }
    
    // Redirect to admin.html with questions tab when clicked
    askQuestionBtn.onclick = (e) => {
      e.preventDefault();
      window.location.href = "/admin.html?tab=questions";
    };
    askQuestionBtn.style.border = "1px solid #00b0ff";
    askQuestionBtn.style.color = "#00b0ff";
  } else {
    askQuestionBtn.innerHTML = currentLang === "ru" ? "Задать вопрос" : "Ask a Question";
    askQuestionBtn.onclick = null;
    askQuestionBtn.style.border = "1px solid var(--color-primary-start)";
    askQuestionBtn.style.color = "#fff";
  }
}

// Add interval to check new messages
setInterval(updateChatsNotification, 3000);

// Logout handling
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("brakeRole");
  localStorage.removeItem("brakeUser");
  userRole = "user";
  restoreSession();
  userDropdown.style.display = "none";
  showToast(currentLang === "ru" ? "Вы успешно вышли из аккаунта" : "You have successfully logged out");
});

// Auth form handling
if (openLoginBtn) {
  openLoginBtn.addEventListener("click", () => {
    loginModal.style.display = "flex";
    userDropdown.style.display = "none";
  });
}

if (closeAuthBtn) {
  closeAuthBtn.addEventListener("click", () => {
    loginModal.style.display = "none";
  });
}

if (tabLogin && tabRegister) {
  tabLogin.addEventListener("click", () => {
    currentAuthMode = "login";
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    document.getElementById("authBtn").textContent = currentLang === "ru" ? "Войти" : "Sign In";
  });
  
  tabRegister.addEventListener("click", () => {
    currentAuthMode = "register";
    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");
    document.getElementById("authBtn").textContent = currentLang === "ru" ? "Зарегистрироваться" : "Register";
  });
}

if (authForm) {
  authForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const u = document.getElementById("loginUsername").value.trim();
    const p = document.getElementById("loginPassword").value.trim();
    if (!u || !p) return;
    
    const allUsers = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
    
    if (currentAuthMode === "login") {
      const match = allUsers.find(x => x.username === u && x.password === p);
      if (match) {
        localStorage.setItem("brakeRole", match.role);
        localStorage.setItem("brakeUser", JSON.stringify(match));
        restoreSession();
        showToast(currentLang === "ru" ? "Вы успешно вошли!" : "Success login!");
      } else {
        alert(currentLang === "ru" ? "Неправильное имя пользователя или пароль!" : "Invalid username or password!");
      }
    } else {
      // Register
      const exists = allUsers.find(x => x.username === u);
      if (exists) {
        alert(currentLang === "ru" ? "Пользователь с таким именем уже существует!" : "Username already exists!");
        return;
      }
      
      const newUser = { username: u, password: p, role: "user", manufacturer: "" };
      allUsers.push(newUser);
      localStorage.setItem("brakeUsers", JSON.stringify(allUsers));
      
      localStorage.setItem("brakeRole", "user");
      localStorage.setItem("brakeUser", JSON.stringify(newUser));
      restoreSession();
      showToast(currentLang === "ru" ? "Регистрация прошла успешно!" : "Registration successful!");
    }
  });
}

function loadProducts() {
  const stored = localStorage.getItem("brakeProducts");
  if (stored) {
    products = JSON.parse(stored);
    init();
  } else {
    fetch("/products.json")
      .then((r) => r.json())
      .then((data) => {
        products = data;
        localStorage.setItem("brakeProducts", JSON.stringify(products));
        init();
      })
      .catch(console.error);
  }
}

function init() {
  brands = ["all", ...new Set(products.map((p) => p.brand))];
  renderBrandFilters();
  renderManufacturerFilters();
  filterProducts();
  renderCart();
  renderFooterData();
  populateAskManufacturers();
}

function renderBrandFilters() {
  if (!brandFilterEl) return;
  brandFilterEl.innerHTML = brands
    .map(
      (b) => `
    <button class="brand-btn ${activeBrand === b ? "active" : ""}" data-brand="${b}">
      ${b === "all" ? (currentLang === "ru" ? "Все бренды" : "All Brands") : b}
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

// Point 2: Dynamic manufacturer list filters with "Все" button
function renderManufacturerFilters() {
  if (!mfgFilterEl) return;
  
  const allUsers = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
  const registeredMfgs = allUsers.filter(u => u.role === 'admin').map(u => u.manufacturer).filter(Boolean);
  const productMfgs = products.map(p => p.manufacturer || "BrakeDiscs Official").filter(Boolean);
  const manufacturers = [...new Set([...registeredMfgs, ...productMfgs])];
  
  let html = `<button class="brand-btn ${activeMfg === 'all' ? 'active' : ''}" data-mfg="all">${currentLang === 'ru' ? 'Все' : 'All'}</button>`;
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
  productGridEl.innerHTML = "";
  if (filtered.length === 0) {
    productGridEl.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:3rem; color:#aaa;">${currentLang === "ru" ? "Товары не найдены" : "No products found"}</div>`;
    return;
  }

  filtered.forEach((p) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.style.cursor = "pointer";
    const textStock = p.stock ? (currentLang === "ru" ? "В наличии" : "In Stock") : (currentLang === "ru" ? "Под заказ" : "On Request");
    const stockClass = p.stock ? "stock-yes" : "stock-no";
    const pMfg = p.manufacturer || "BrakeDiscs Official";

    // Point 4: Hide/disable Buy button for admin and superadmin
    const savedRole = localStorage.getItem("brakeRole") || "user";
    const isAdmin = savedRole === "admin" || savedRole === "superadmin";
    const buttonHtml = isAdmin
      ? `<button class="add-to-cart-btn" style="background:#555; color:#aaa; cursor:default;" disabled>${currentLang === "ru" ? "🔒 Администрирование" : "🔒 Admin Mode"}</button>`
      : `<button class="add-to-cart-btn" data-id="${p.id}">${currentLang === "ru" ? "Купить" : "Buy"}</button>`;

    const priceVal = parseFloat(p.price);
    const displayPrice = isNaN(priceVal) ? "0.00" : priceVal.toFixed(2);

    card.innerHTML = `
      <img src="${p.image || SVG_FALLBACK}" alt="${p.name}" style="width:100%; height:200px; object-fit:cover;" />
      <div class="product-info">
        <div class="product-brand">${p.brand || "---"}</div>
        <h3 class="product-title">${p.name}</h3>
        <!-- Point 6: Render manufacturer brand inside product cards -->
        <div style="font-size:0.75rem; color:#aaa; font-weight:600; margin-top:2px;">🏭 ${pMfg}</div>
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
    
    // Add to cart click event if not admin
    if (!isAdmin) {
      card.querySelector(".add-to-cart-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        addToCart(p.id);
      });
    }
    
    // Navigation to product details
    card.addEventListener("click", () => {
      window.location.href = `product.html?id=${p.id}`;
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
  showToast(currentLang === "ru" ? "Товар добавлен в корзину" : "Product added to cart");
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
    
    cartDrawerItems.innerHTML += `
      <div class="cart-item">
        <img src="${prod.image}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;" />
        <div class="cart-item-details">
          <div class="cart-item-name">${prod.name}</div>
          <div class="cart-item-price-block">$${prod.price.toFixed(2)}</div>
        </div>
        <div class="cart-item-qty-block">
          <input type="number" min="1" value="${qty}" class="cart-item-qty-input" data-id="${prod.id}" style="width:45px; padding:0.1rem; border-radius:4px; border:1px solid #444; background:#111; color:#fff; text-align:center;" />
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
      showToast(currentLang === 'ru' ? 'Товар удален из корзины' : 'Item removed from cart');
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
searchInputEl.addEventListener("input", filterProducts);

// Home click reset
homeLink.addEventListener("click", (e) => {
  e.preventDefault();
  searchSectionEl.style.display = "flex";
  mfgFilterEl.style.display = "flex";
  brandFilterEl.style.display = "flex";
  activeBrand = "all";
  activeMfg = "all";
  init();
});

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
    html += `<option value="Администрация сайта (Суперюзер)">${currentLang === "ru" ? "Администрация (Суперюзер)" : "Administration (Superuser)"}</option>`;
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
    askWarning.textContent = currentLang === "ru" ? "Пожалуйста, войдите в профиль или зарегистрируйтесь, чтобы задать вопрос." : "Please login or register to ask a question.";
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
  const username = user.username || "Гость";
  
  // If simple user, target is automatically the Superuser
  const targetMfg = (!user.role || user.role === "user") 
    ? "Администрация сайта (Суперюзер)" 
    : (askManufacturer ? askManufacturer.value : "Администрация сайта (Суперюзер)");

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

  alert(currentLang === "ru" ? "Ваш вопрос успешно отправлен! Ответ появится в вашем личном кабинете." : "Your question was successfully sent! The reply will appear in your profile.");
  askForm.reset();
  askModal.style.display = "none";
});

// --- Point 10: Custom Individual Disc Form with File/Image support ---
const customDiscsLink = document.getElementById("customDiscsLink");
customDiscsLink.addEventListener("click", (e) => {
  e.preventDefault();
  searchSectionEl.style.display = "none";
  brandFilterEl.style.display = "none";
  mfgFilterEl.style.display = "none";
  
  const customProducts = products.filter(p => p.stock === false);
  
  let html = `
    <div style="grid-column: 1/-1; margin-bottom:2rem; background:var(--color-surface); padding:2rem; border-radius:var(--radius); box-shadow:var(--shadow);">
      <h2 style="color:var(--color-primary-start); margin-bottom:1rem;" id="cdTitle">${currentLang === "ru" ? "Заказать индивидуальный диск" : "Order Custom Disc"}</h2>
      <p style="margin-bottom:1rem; color:#ccc;" id="cdDescText">${currentLang === "ru" ? "Не нашли нужный дизайн или размер? Опишите вашу идею, загрузите фотографию/эскиз, и наши мастера изготовят эксклюзивный тормозной диск специально для вашего мотоцикла." : "Didn't find the perfect size or design? Describe your idea, upload a photograph/blueprint, and we will manufacture an exclusive brake disc specifically for your motorcycle."}</p>
      
      <form id="customDiscForm" style="display:flex; flex-direction:column; gap:1rem;">
        <div style="display:flex; gap:1rem; flex-wrap:wrap;">
          <input type="text" id="cdName" placeholder="${currentLang === 'ru' ? 'Ваше Имя' : 'Your Name'}" required style="flex:1; padding:0.8rem; border-radius:var(--radius); border:1px solid var(--color-muted); background:var(--color-bg); color:var(--color-text);" />
          <input type="text" id="cdMoto" placeholder="${currentLang === 'ru' ? 'Мотоцикл (модель, год)' : 'Motorcycle (model, year)'}" required style="flex:1; padding:0.8rem; border-radius:var(--radius); border:1px solid var(--color-muted); background:var(--color-bg); color:var(--color-text);" />
        </div>
        <textarea id="cdDesc" placeholder="${currentLang === 'ru' ? 'Опишите желаемый дизайн, размеры, диаметр и особенности...' : 'Describe design, diameters, thickness...'}" required style="min-height:100px; padding:0.8rem; border-radius:var(--radius); border:1px solid var(--color-muted); background:var(--color-bg); color:var(--color-text); font-family:inherit;"></textarea>
        
        <!-- Photo/ blueprint attachment upload input -->
        <div style="display:flex; flex-direction:column; gap:0.4rem;">
          <label style="font-size:0.85rem; color:#aaa;" id="lblCdAttach">${currentLang === "ru" ? "Прикрепить эскиз / фотографию (чертеж)" : "Attach blueprint / photograph"}</label>
          <input type="file" id="cdFile" accept="image/*" style="padding:0.6rem; border-radius:var(--radius); border:1px solid var(--color-muted); background:var(--color-bg); color:var(--color-text);" />
          <div id="cdFilePreviewContainer" style="display:none; margin-top:0.5rem;">
            <img id="cdFilePreview" src="" alt="Blueprint Preview" style="max-height:150px; border-radius:8px; border:1px solid #333;" />
          </div>
        </div>
        
        <button type="submit" style="background:linear-gradient(135deg, var(--color-primary-start), var(--color-primary-end)); color:#fff; border:none; padding:0.8rem; border-radius:var(--radius); cursor:pointer; font-weight:bold; font-size:1.1rem; width:100%; max-width:300px;" id="btnSubmitCd">${currentLang === 'ru' ? 'Отправить заявку' : 'Submit Application'}</button>
      </form>
    </div>
  `;
  
  if (customProducts.length === 0) {
    html += `<div style="grid-column: 1/-1; text-align:center; padding:3rem; color:#ccc;">${currentLang === "ru" ? "Эксклюзивных дисков в каталоге пока нет." : "No custom disks in catalog."}</div>`;
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
        <img src="${p.image}" alt="${p.name}" class="product-img" style="width:100%; height:200px; object-fit:cover;" />
        <div style="padding:1rem; text-align:center;">
          <div class="product-brand" style="font-size:0.85rem; color:#aaa; text-transform:uppercase;">${p.brand}</div>
          <div class="product-name" style="font-size:1.2rem; font-weight:600;">${p.name}</div>
          <div class="product-price" style="font-size:1.4rem; color:var(--color-primary-start); margin:0.5rem 0;">$${p.price.toFixed(2)}</div>
          <button class="add-to-cart-btn add-to-cart" data-id="${p.id}">${currentLang === "ru" ? "Купить" : "Buy"}</button>
        </div>
      `;
      card.querySelector('.add-to-cart').addEventListener('click', (e) => { e.stopPropagation(); addToCart(p.id); });
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => { window.location.href = `product.html?id=${p.id}`; });
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
  document.getElementById("customDiscForm").addEventListener("submit", (e) => {
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

    alert(currentLang === 'ru' ? "Ваша заявка на индивидуальный диск отправлена! Мы свяжемся с вами в ближайшее время." : "Your application has been sent successfully!");
    e.target.reset();
    if(cdFilePreviewContainer) cdFilePreviewContainer.style.display = "none";
    cdImgBase64 = "";
  });
});

// --- Point 9: Robust Multilingual Switcher ---
const langToggle = document.getElementById("langToggle");

const i18n = {
  "ru": {
    home: "Главная",
    custom: "Диски на заказ",
    ask: "Задать вопрос",
    search: "Поиск",
    cart: "🛒",
    profile: "👤",
    login: "Войти",
    cartTitle: "Корзина",
    total: "Итого",
    checkout: "Оформить заказ",
    mfgTitle: "Производители:",
    aboutTitle: "О нас",
    linksTitle: "Разделы",
    articlesTitle: "Статьи",
    contactTitle: "Контакты",
    lblAskMfg: "Кому задать вопрос (Производитель)",
    askModalTitle: "Задать вопрос"
  },
  "en": {
    home: "Home",
    custom: "Custom Discs",
    ask: "Ask Question",
    search: "Search",
    cart: "🛒",
    profile: "👤",
    login: "Sign In",
    cartTitle: "Your Cart",
    total: "Subtotal",
    checkout: "Go to Checkout",
    mfgTitle: "Manufacturers:",
    aboutTitle: "About Us",
    linksTitle: "Links",
    articlesTitle: "Articles",
    contactTitle: "Contacts",
    lblAskMfg: "Recipient (Manufacturer)",
    askModalTitle: "Ask a Question"
  }
};

langToggle.addEventListener("click", () => {
  currentLang = currentLang === "ru" ? "en" : "ru";
  langToggle.textContent = currentLang === "ru" ? "🇷🇺" : "🇬🇧";
  
  // Apply translation dictionary
  const t = i18n[currentLang];
  homeLink.textContent = t.home;
  customDiscsLink.textContent = t.custom;
  document.getElementById("cartDrawerTitle").textContent = t.cartTitle;
  document.getElementById("lblCartTotal").textContent = t.total;
  document.getElementById("btnGoCheckout").textContent = t.checkout;
  
  const topAdminLink = document.getElementById("topAdminLink");
  const adminNavText = document.getElementById("adminNav");
  if(topAdminLink) topAdminLink.textContent = currentLang === "ru" ? "Склад" : "Warehouse";
  if(adminNavText) adminNavText.textContent = currentLang === "ru" ? "Склад" : "Warehouse";
  
  const accountNavText = document.getElementById("accountNav");
  if(accountNavText) accountNavText.textContent = currentLang === "ru" ? "Личный кабинет" : "Profile Dashboard";
  
  const logoutBtnText = document.getElementById("logoutBtn");
  if(logoutBtnText) logoutBtnText.textContent = currentLang === "ru" ? "Выход" : "Log Out";
  
  const mfgTitle = document.getElementById("lblMfgTitle");
  if (mfgTitle) mfgTitle.textContent = t.mfgTitle;
  
  // Footer titles
  document.getElementById("footerAboutTitle").textContent = t.aboutTitle;
  document.getElementById("footerLinksTitle").textContent = t.linksTitle;
  document.getElementById("footerArticlesTitle").textContent = t.articlesTitle;
  document.getElementById("footerContactTitle").textContent = t.contactTitle;
  
  document.getElementById("footHome").textContent = t.home;
  document.getElementById("footCustom").textContent = t.custom;
  document.getElementById("footAsk").textContent = t.ask;
  
  // Ask Modal i18n
  document.getElementById("askModalTitle").textContent = t.askModalTitle;
  document.getElementById("lblAskMfg").textContent = t.lblAskMfg;
  document.getElementById("submitAskBtn").textContent = currentLang === "ru" ? "Отправить" : "Send";
  document.getElementById("closeAskBtn").textContent = currentLang === "ru" ? "Отмена" : "Cancel";
  
  // Ask Question Button
  askQuestionBtn.textContent = t.ask;
  
  // Search placeholder
  searchInputEl.placeholder = currentLang === "ru" ? "Поиск товаров (например, Yamaha R1)..." : "Search products (e.g. Yamaha R1)...";

  restoreSession();
  init();
});

// --- Point 12: Superuser Articles and site settings ---
function renderFooterData() {
  const siteEmailEl = document.getElementById("siteEmail");
  const footerArticlesList = document.getElementById("footerArticlesList");
  
  const settings = JSON.parse(localStorage.getItem("brakeSiteSettings") || "{}");
  if (siteEmailEl) {
    siteEmailEl.textContent = settings.contactEmail || "support@brakediscs.com";
  }
  
  const defaultArticles = [
    { id: 1, title_ru: "Выбор тормозных дисков", title_en: "Choosing Brake Discs", content_ru: "Как выбрать тормозные диски для мотоцикла. Опирайтесь на диаметр, состав сплава и толщину диска.", content_en: "Brake disc selection guide. Take into account diameter, metallurgical alloy and total thickness." },
    { id: 2, title_ru: "Правильная обкатка тормозов", title_en: "Brake Break-In Guide", content_ru: "Первые 100 км избегайте резких и затяжных торможений, чтобы колодки равномерно притерлись.", content_en: "Brake breaking-in instructions. Avoid heavy brake cycles during the first 100 km for optimal brake alignment." }
  ];
  const articles = JSON.parse(localStorage.getItem("brakeArticles") || JSON.stringify(defaultArticles));
  
  if (footerArticlesList) {
    footerArticlesList.innerHTML = articles.map(art => {
      const title = currentLang === 'ru' ? (art.title_ru || art.title) : (art.title_en || art.title);
      return `<li><a href="#" class="footer-article-link" data-id="${art.id}">${title}</a></li>`;
    }).join('');
    
    footerArticlesList.querySelectorAll(".footer-article-link").forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const artId = link.dataset.id;
        const a = articles.find(x => x.id == artId);
        if (a) {
          const title = currentLang === 'ru' ? (a.title_ru || a.title) : (a.title_en || a.title);
          const content = currentLang === 'ru' ? (a.content_ru || a.content) : (a.content_en || a.content);
          alert(`📖 ${title}\n\n${content}`);
        }
      });
    });
  }
}

// Initial session restoration and product load
restoreSession();
loadProducts();
renderFooterData();
