const checkoutItems = document.getElementById("checkoutItems");
const checkoutTotal = document.getElementById("checkoutTotal");
const checkoutForm = document.getElementById("checkoutForm");
const successModal = document.getElementById("successModal");

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
  "Telegram": "Ваш Telegram (@username)",
  "WhatsApp": "Ваш WhatsApp номер",
  "Email": "Ваш Email для связи",
  "Телефон": "Ваш номер телефона",
  "Facebook": "Ваш Facebook профиль"
};

// Map contact method to user profile field
const contactProfileField = {
  "Telegram": "telegram",
  "WhatsApp": "whatsapp",
  "Email": "email",
  "Телефон": "phone",
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
  checkoutItems.innerHTML = "";
  let total = 0;
  
  if (cart.length === 0) {
    checkoutItems.innerHTML = "<div>Корзина пуста.</div>";
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
    
    checkoutItems.innerHTML += `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #444; padding-bottom:0.8rem; margin-bottom:0.8rem;">
        <div style="display:flex; gap:1rem; align-items:center;">
          <img src="${prod.image}" alt="${prod.name}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;" />
          <div>
            <a href="product.html?id=${prod.id}" style="font-weight:bold; color:var(--color-primary-start); text-decoration:none;">${prod.name}</a>
            <div style="font-size:0.8rem; color:#aaa;">Кол-во: ${item.qty} x $${prod.price.toFixed(2)}</div>
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
    alert("Корзина пуста!");
    return;
  }
  
  const fullName = `${chkFirstName.value.trim()} ${chkLastName.value.trim()}`;
  const fullAddress = `${chkZip.value.trim()}, ${chkCountry.value.trim()}, ${chkCity.value.trim()}, ул. ${chkStreet.value.trim()}, д. ${chkHouse.value.trim()}`;
  
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

  // Create Order
  const orderData = {
    id: Date.now(),
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
    items: cart,
    total: document.getElementById("checkoutTotal").textContent,
    status: "paid",
    preferredContact: chkPreferredContact.value,
    contactValue: chkContactValue.value.trim(),
    comment: chkComment.value.trim()
  };
  
  const orders = JSON.parse(localStorage.getItem("brakeOrders") || "[]");
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
      text: `📦 Авто-уведомление о заказе #${orderData.id.toString().slice(-4)}: Покупатель ${fullName} оформил заказ на товары: ${itemsText}. Способ связи: ${chkPreferredContact.value}${chkContactValue.value ? ' (' + chkContactValue.value.trim() + ')' : ''}.`,
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
  const productsList = JSON.parse(localStorage.getItem("brakeProducts") || "[]");
  let stockChanged = false;
  cart.forEach(item => {
    const p = productsList.find(prod => prod.id == item.id);
    if (p) {
       stockChanged = true;
       const deduct = item.qty || 1;
       if (p.groupId) {
         productsList.forEach(other => {
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
    localStorage.setItem("brakeProducts", JSON.stringify(productsList));
  }
  
  // Clear cart
  localStorage.removeItem("brakeCart");
  
  // Show success modal
  successModal.style.display = "flex";
});

initCheckout();
