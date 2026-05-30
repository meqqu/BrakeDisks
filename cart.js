// cart.js – manages shopping cart state and UI drawer

// Note: this module is imported by app.js (or index.html) after the DOM is ready.

const CART_KEY = "brakeCart";

let cartDrawerEl;
let cartItemsContainerEl;
let cartTotalEl;
let cartToggleBtn;

// Exported init function – called from app.js once the page markup exists.
export function initCart() {
  cartDrawerEl = document.getElementById("cartDrawer");
  cartItemsContainerEl = document.getElementById("cartItems");
  cartTotalEl = document.getElementById("cartTotal");
  cartToggleBtn = document.getElementById("cartToggle");

  if (!cartDrawerEl || !cartToggleBtn) {
    console.warn("Cart UI elements not found – ensure markup exists in index.html");
    return;
  }

  cartToggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleCart();
  });
  
  const closeCartBtn = document.getElementById("closeCartBtn");
  if (closeCartBtn) {
    closeCartBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeCart();
    });
  }

  // Close drawer when clicking outside
  document.addEventListener("click", (e) => {
    if (
      cartDrawerEl.classList.contains("open") && 
      !cartDrawerEl.contains(e.target) && 
      !cartToggleBtn.contains(e.target) &&
      (!closeCartBtn || !closeCartBtn.contains(e.target))
    ) {
      closeCart();
    }
  });

  renderCart();
}

function getCart() {
  const raw = localStorage.getItem(CART_KEY);
  return raw ? JSON.parse(raw) : {};
}

function setCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function addToCart(productId) {
  const cart = getCart();
  cart[productId] = (cart[productId] || 0) + 1;
  setCart(cart);
  renderCart();
  
  // Show "Added to Cart" modal
  showAddedToCartModal();
}

function showAddedToCartModal() {
  let modal = document.getElementById("addedToCartModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "addedToCartModal";
    modal.className = "modal";
    modal.style.cssText = "display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:var(--color-modal-bg); z-index:9999; align-items:center; justify-content:center;";
    modal.innerHTML = `
      <div class="modal-content" style="background:var(--color-surface); padding:2rem; border-radius:var(--radius); max-width:400px; width:100%; box-shadow:var(--shadow); text-align:center;">
        <h2 style="color:#00c853; margin-top:0;">Item added to cart</h2>
        <div style="display:flex; gap:1rem; margin-top:2rem;">
          <button id="addedToCartContinueBtn" style="flex:1; padding:0.8rem; background:transparent; border:1px solid var(--color-border); color:var(--color-text-bright); border-radius:4px; cursor:pointer;">Continue</button>
          <button id="addedToCartCheckoutBtn" style="flex:1; padding:0.8rem; background:var(--color-primary-start); border:none; color:#fff; border-radius:4px; cursor:pointer; font-weight:bold;">Go to Checkout</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById("addedToCartContinueBtn").addEventListener("click", () => {
      modal.style.display = "none";
    });
    
    document.getElementById("addedToCartCheckoutBtn").addEventListener("click", () => {
      window.location.href = "checkout.html";
    });
  }
  
  modal.style.display = "flex";
}

export function removeFromCart(productId) {
  const cart = getCart();
  if (cart[productId]) {
    delete cart[productId];
    setCart(cart);
    renderCart();
  }
}

export function updateQuantity(productId, qty) {
  const cart = getCart();
  if (qty <= 0) {
    delete cart[productId];
  } else {
    cart[productId] = qty;
  }
  setCart(cart);
  renderCart();
}

function toggleCart() {
  cartDrawerEl.classList.toggle("open");
}

function closeCart() {
  cartDrawerEl.classList.remove("open");
}

function renderCart() {
  const cart = getCart();
  // Build a quick lookup of products by id – we can reuse the global products array from app.js
  // app.js exposes a getter via window.__brakeProducts (added later)
  const products = window.__brakeProducts || [];
  const productMap = {};
  products.forEach((p) => (productMap[p.id] = p));

  let total = 0;
  const rows = Object.entries(cart).map(([id, qty]) => {
    const prod = productMap[id];
    if (!prod) return null;
    const lineTotal = prod.price * qty;
    total += lineTotal;
    return { id, name: prod.name, price: prod.price, qty, lineTotal };
  }).filter(Boolean);

  cartItemsContainerEl.innerHTML = rows
    .map(
      (r) => `
    <div class="cart-item" data-id="${r.id}">
      <span class="cart-item-name">${r.name}</span>
      <input type="number" min="1" class="cart-item-qty" value="${r.qty}" />
      <span class="cart-item-price">$${r.price.toFixed(2)}</span>
      <span class="cart-item-line">$${r.lineTotal.toFixed(2)}</span>
      <button class="cart-item-remove">✖️</button>
    </div>`
    )
    .join("");

  cartTotalEl.textContent = `$${total.toFixed(2)}`;

  // Hook up quantity change & remove buttons
  cartItemsContainerEl.querySelectorAll('.cart-item-qty').forEach(inp => {
    const id = inp.closest('.cart-item').dataset.id;
    inp.addEventListener('change', () => {
      const newQty = parseInt(inp.value, 10);
      if (isNaN(newQty) || newQty < 1) inp.value = 1;
      updateQuantity(id, parseInt(inp.value, 10));
    });
  });

  cartItemsContainerEl.querySelectorAll('.cart-item-remove').forEach(btn => {
    const id = btn.closest('.cart-item').dataset.id;
    btn.addEventListener('click', () => removeFromCart(id));
  });
}

// Export for potential unit‑tests
export default {
  initCart,
  addToCart,
  removeFromCart,
  updateQuantity,
};
