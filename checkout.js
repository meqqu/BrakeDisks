import "./serverSync.js";
const checkoutItems = document.getElementById("checkoutItems");
const checkoutTotal = document.getElementById("checkoutTotal");
const checkoutForm = document.getElementById("checkoutForm");
const successModal = document.getElementById("successModal");

function escapeHTML(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

const chkFirstName = document.getElementById("chkFirstName");
const chkLastName = document.getElementById("chkLastName");
const chkEmail = document.getElementById("chkEmail");
const chkPhone = document.getElementById("chkPhone");
const chkCountry = document.getElementById("chkCountry");
const chkCity = document.getElementById("chkCity");
const chkStreet = document.getElementById("chkStreet");
const chkHouse = document.getElementById("chkHouse");
const chkZip = document.getElementById("chkZip");
const chkPreferredContact = document.getElementById("chkPreferredContact");
const chkContactValue = document.getElementById("chkContactValue");
const chkComment = document.getElementById("chkComment");

let cart = [];
let products = [];
let savedUser = null;

// Placeholder map for contact methods
const contactPlaceholders = {
  "Telegram": "Your Telegram (@username)",
  "WhatsApp": "Your WhatsApp number",
  "Email": "Your Email for contact",
  "Phone": "Your Phone number",
  "Facebook": "Your Facebook profile"
};

// Map contact method to user profile field
const contactProfileField = {
  "Telegram": "telegram",
  "WhatsApp": "whatsapp",
  "Email": "email",
  "Phone": "phone",
  "Facebook": "facebook"
};

// Dynamic contact input — show/hide and auto-fill from profile
chkPreferredContact.addEventListener("change", () => {
  const method = chkPreferredContact.value;
  if (method && contactPlaceholders[method]) {
    chkContactValue.style.display = "block";
    chkContactValue.placeholder = contactPlaceholders[method];
    chkContactValue.required = true;
    // Auto-fill from profile if available
    if (savedUser) {
      const fieldName = contactProfileField[method];
      chkContactValue.value = savedUser[fieldName] || "";
    }
  } else {
    chkContactValue.style.display = "none";
    chkContactValue.required = false;
    chkContactValue.value = "";
  }
});

function initCheckout() {
  const storedCart = localStorage.getItem("brakeCart");
  const storedProducts = localStorage.getItem("brakeProducts");
  
  if (storedCart) {
    const parsed = JSON.parse(storedCart);
    cart = Object.entries(parsed).map(([id, qty]) => ({ id, qty }));
  }
  if (storedProducts) products = JSON.parse(storedProducts);
  
  // Auto-fill from user profile
  savedUser = JSON.parse(localStorage.getItem("brakeUser"));
  if (savedUser) {
    const nameParts = (savedUser.name || savedUser.username || "").split(" ");
    chkFirstName.value = nameParts[0] || "";
    chkLastName.value = nameParts.slice(1).join(" ") || "";
    chkEmail.value = savedUser.email || "";
    chkPhone.value = savedUser.phone || "";
    if (savedUser.country) chkCountry.value = savedUser.country;
    if (savedUser.city) chkCity.value = savedUser.city;
    if (savedUser.street) chkStreet.value = savedUser.street;
    if (savedUser.house) chkHouse.value = savedUser.house;
    if (savedUser.zip) chkZip.value = savedUser.zip;
    if (savedUser.preferredContact) {
      chkPreferredContact.value = savedUser.preferredContact;
      // Trigger change to show the contact value input
      chkPreferredContact.dispatchEvent(new Event("change"));
    }
  }

  renderCheckoutItems();
}

function renderCheckoutItems() {
  const SVG_FALLBACK = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="100%" height="100%"><defs><radialGradient id="discGrad" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="%23444" /><stop offset="70%" stop-color="%23222" /><stop offset="85%" stop-color="%23666" /><stop offset="95%" stop-color="%23111" /><stop offset="100%" stop-color="%23ff5500" /></radialGradient></defs><rect width="100%" height="100%" fill="%23151518" /><circle cx="150" cy="100" r="75" fill="none" stroke="%23ff5500" stroke-width="2" opacity="0.4" /><circle cx="150" cy="100" r="70" fill="url(%23discGrad)" stroke="%23444" stroke-width="4" /><circle cx="150" cy="100" r="50" fill="none" stroke="%230a0a0c" stroke-width="4" stroke-dasharray="10 15" /><circle cx="150" cy="100" r="35" fill="none" stroke="%230a0a0c" stroke-width="4" stroke-dasharray="8 12" /><circle cx="150" cy="100" r="20" fill="%23111" stroke="%23ff5500" stroke-width="2" /><circle cx="150" cy="88" r="3" fill="%23666" /><circle cx="162" cy="106" r="3" fill="%23666" /><circle cx="138" cy="106" r="3" fill="%23666" /><path d="M 78,55 C 80,45 100,40 120,48 L 115,75 C 100,68 88,68 85,73 Z" fill="%23ff1744" stroke="%23d50000" stroke-width="2" /><text x="100" y="60" fill="%23fff" font-size="8" font-family="Arial" font-weight="bold" transform="rotate(-15, 100, 60)">BREMBO</text><text x="150" y="185" fill="%23aaa" font-size="12" font-family="sans-serif" text-anchor="middle" font-weight="bold">MOTO BRAKE PREMIUM</text></svg>`;

  checkoutItems.innerHTML = "";
  let total = 0;
  
  if (cart.length === 0) {
    checkoutItems.innerHTML = "<div>Cart is empty.</div>";
    checkoutTotal.textContent = "$0.00";
    return;
  }

  cart.forEach(item => {
    const prod = products.find(p => p.id == item.id);
    if (!prod) return;
    const lineTotal = prod.price * item.qty;
    total += lineTotal;
    
    item.name = prod.name;
    item.price = prod.price;
    item.manufacturer = prod.manufacturer || "BrakeDiscs Official";
    item.slug = prod.slug || '';
    
    const safeName = escapeHTML(prod.name);
    const safeImage = escapeHTML(prod.image);
    const safeSlug = escapeHTML(prod.slug || String(prod.id));

    checkoutItems.innerHTML += `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--color-border); padding-bottom:0.8rem; margin-bottom:0.8rem;">
        <div style="display:flex; gap:1rem; align-items:center;">
          <img src="${safeImage || SVG_FALLBACK}" alt="${safeName}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;" onerror="this.onerror=null; this.src='${SVG_FALLBACK}';" />
          <div>
            <a href="product.html?id=${safeSlug}" style="font-weight:bold; color:var(--color-primary-start); text-decoration:none;">${safeName}</a>
            <div style="font-size:0.8rem; color:var(--color-muted);">Qty: ${item.qty} x $${prod.price.toFixed(2)}</div>
          </div>
        </div>
        <div style="font-weight:bold;">$${lineTotal.toFixed(2)}</div>
      </div>
    `;
  });
  
  checkoutTotal.textContent = `$${total.toFixed(2)}`;
}

checkoutForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (cart.length === 0) {
    alert("Cart is empty!");
    return;
  }
  
  // Re-calculate total based on the actual product prices to prevent price manipulation
  let verifiedTotal = 0;
  const verifiedCart = [];
  const productsList = JSON.parse(localStorage.getItem("brakeProducts") || "[]");

  for (const item of cart) {
    const p = productsList.find(prod => prod.id == item.id);
    if (!p) continue; // Skip items that don't exist
    verifiedTotal += p.price * item.qty;
    verifiedCart.push({
      ...item,
      price: p.price // Ensure correct price
    });
  }

  if (verifiedCart.length === 0) {
     alert("Cart contains invalid items.");
     return;
  }

  const fullName = `${chkFirstName.value.trim()} ${chkLastName.value.trim()}`;
  const fullAddress = `${chkZip.value.trim()}, ${chkCountry.value.trim()}, ${chkCity.value.trim()}, st. ${chkStreet.value.trim()}, bldg/apt ${chkHouse.value.trim()}`;
  
  // Create Client
  const clientId = Date.now();
  const client = {
    id: clientId,
    name: fullName,
    phone: chkPhone.value.trim(),
    email: chkEmail.value.trim(),
    address: fullAddress,
    preferredContact: chkPreferredContact.value,
    contactValue: chkContactValue.value.trim()
  };
  const clients = JSON.parse(localStorage.getItem("brakeClients") || "[]");
  clients.push(client);
  localStorage.setItem("brakeClients", JSON.stringify(clients));

  const orders = JSON.parse(localStorage.getItem("brakeOrders") || "[]");
  let nextId = 1;
  if (orders.length > 0) {
    const ids = orders.map(o => Number(o.id)).filter(id => !isNaN(id));
    if (ids.length > 0) {
      nextId = Math.max(...ids) + 1;
    } else {
      nextId = orders.length + 1;
    }
  }

  // Create Order
  const orderData = {
    id: nextId,
    date: new Date().toISOString(),
    userEmail: chkEmail.value.trim(),
    username: (savedUser && savedUser.username) || "guest",
    customerId: clientId,
    customer: {
      name: fullName,
      email: chkEmail.value.trim(),
      phone: chkPhone.value.trim(),
      address: fullAddress
    },
    items: verifiedCart,
    total: `$${verifiedTotal.toFixed(2)}`,
    status: "paid",
    preferredContact: chkPreferredContact.value,
    contactValue: chkContactValue.value.trim(),
    comment: chkComment.value.trim()
  };
  
  orders.push(orderData);
  localStorage.setItem("brakeOrders", JSON.stringify(orders));
  
  // Send notifications to each manufacturer in support chat
  const itemsByMfg = {};
  orderData.items.forEach(item => {
    const mfg = item.manufacturer || "BrakeDiscs Official";
    if (!itemsByMfg[mfg]) itemsByMfg[mfg] = [];
    itemsByMfg[mfg].push(item);
  });
  
  const messages = JSON.parse(localStorage.getItem("brakeMessages") || "[]");
  const orderUsername = (savedUser && savedUser.username) || "guest";
  
  Object.entries(itemsByMfg).forEach(([mfg, items], idx) => {
    const itemsText = items.map(it => `${it.name} (x${it.qty})`).join(", ");
    messages.push({
      id: Date.now() + idx,
      username: orderUsername,
      sender: "user",
      text: `📦 Auto-notification of order #${orderData.id.toString().slice(-4)}: Customer ${fullName} placed an order for: ${itemsText}. Contact method: ${chkPreferredContact.value}${chkContactValue.value ? ' (' + chkContactValue.value.trim() + ')' : ''}.`,
      date: new Date().toISOString(),
      readByAdmin: false,
      manufacturer: mfg
    });
  });
  localStorage.setItem("brakeMessages", JSON.stringify(messages));
  
  // Save data back to user profile so it auto-fills next time
  if (savedUser && savedUser.username) {
    savedUser.name = fullName;
    savedUser.email = chkEmail.value.trim();
    savedUser.phone = chkPhone.value.trim();
    savedUser.address = fullAddress;
    savedUser.country = chkCountry.value.trim();
    savedUser.city = chkCity.value.trim();
    savedUser.street = chkStreet.value.trim();
    savedUser.house = chkHouse.value.trim();
    savedUser.zip = chkZip.value.trim();
    savedUser.preferredContact = chkPreferredContact.value;
    // Save the contact value to the matching profile field
    const fieldName = contactProfileField[chkPreferredContact.value];
    if (fieldName) {
      savedUser[fieldName] = chkContactValue.value.trim();
    }
    localStorage.setItem("brakeUser", JSON.stringify(savedUser));
  }
  
  // Reduce stock for bought items and their group mates
  const updatedProductsList = JSON.parse(localStorage.getItem("brakeProducts") || "[]");
  let stockChanged = false;
  cart.forEach(item => {
    const p = updatedProductsList.find(prod => prod.id == item.id);
    if (p) {
       stockChanged = true;
       const deduct = item.qty || 1;
       if (p.groupId) {
         updatedProductsList.forEach(other => {
           if (other.groupId === p.groupId) {
             other.stockCount = Math.max(0, (other.stockCount || 1) - deduct);
             if (other.stockCount === 0) other.stock = false;
           }
         });
       } else {
         p.stockCount = Math.max(0, (p.stockCount || 1) - deduct);
         if (p.stockCount === 0) p.stock = false;
       }
    }
  });
  if (stockChanged) {
    localStorage.setItem("brakeProducts", JSON.stringify(updatedProductsList));
  }
  
  // Clear cart
  localStorage.removeItem("brakeCart");
  
  // Show success modal with order ID
  document.getElementById("successOrderId").textContent = `#${orderData.id}`;
  successModal.style.display = "flex";
});

initCheckout();
