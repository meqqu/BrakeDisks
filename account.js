// account.js – handles user profile, orders history, and support chat with editable orders and files attachment
const USER_KEY = "brakeUser";
const ORDERS_KEY = "brakeOrders";
const CHAT_KEY = "brakeMessages";

const profileForm = document.getElementById("profileForm");
const firstNameInput = document.getElementById("userFirstName");
const lastNameInput = document.getElementById("userLastName");
const emailInput = document.getElementById("userEmail");
const phoneInput = document.getElementById("userPhone");
const facebookInput = document.getElementById("userFacebook");
const whatsappInput = document.getElementById("userWhatsApp");
const telegramInput = document.getElementById("userTelegram");
const preferredContactInput = document.getElementById("userPreferredContact");
const addressInput = document.getElementById("userAddress");

const ordersListEl = document.getElementById("ordersList");

// Tabs
const tabProfile = document.getElementById("tabProfile");
const tabOrders = document.getElementById("tabOrders");
const tabSupport = document.getElementById("tabSupport");
const profileSection = document.getElementById("profileSection");
const ordersSection = document.getElementById("ordersSection");
const supportSection = document.getElementById("supportSection");

// Chat
const chatMessagesEl = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatFile = document.getElementById("chatFile");
const chatManufacturerSelect = document.getElementById("chatManufacturerSelect");

let currentUser = null;
let chatAttachedFile = null;

// Toast notification
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

function loadUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (raw) {
    currentUser = JSON.parse(raw);
    
    // Split first and last name
    if (currentUser.firstName && currentUser.lastName) {
      firstNameInput.value = currentUser.firstName;
      lastNameInput.value = currentUser.lastName;
    } else if (currentUser.name) {
      const parts = currentUser.name.split(" ");
      firstNameInput.value = parts[0] || "";
      lastNameInput.value = parts.slice(1).join(" ") || "";
    } else {
      firstNameInput.value = currentUser.username || "";
      lastNameInput.value = "";
    }
    
    emailInput.value = currentUser.email || "";
    phoneInput.value = currentUser.phone || "";
    facebookInput.value = currentUser.facebook || "";
    whatsappInput.value = currentUser.whatsapp || "";
    telegramInput.value = currentUser.telegram || "";
    preferredContactInput.value = currentUser.preferredContact || "";
    addressInput.value = currentUser.address || "";
    populateManufacturers();
  } else {
    window.location.href = "index.html";
  }
}

// Save Profile changes
if (profileForm) {
  profileForm.addEventListener("submit", (e) => {
    e.preventDefault();
    currentUser.firstName = firstNameInput.value.trim();
    currentUser.lastName = lastNameInput.value.trim();
    currentUser.name = `${currentUser.firstName} ${currentUser.lastName}`.trim();
    currentUser.email = emailInput.value.trim();
    currentUser.phone = phoneInput.value.trim();
    currentUser.facebook = facebookInput.value.trim();
    currentUser.whatsapp = whatsappInput.value.trim();
    currentUser.telegram = telegramInput.value.trim();
    currentUser.preferredContact = preferredContactInput.value;
    currentUser.address = addressInput.value.trim();
    
    localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    
    // Also save in brakeUsers database array
    const allUsers = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
    const idx = allUsers.findIndex(u => u.username === currentUser.username);
    if (idx !== -1) {
      allUsers[idx] = { ...allUsers[idx], ...currentUser };
      localStorage.setItem("brakeUsers", JSON.stringify(allUsers));
    }
    
    showToast("Профиль успешно обновлен!");
  });
}

// --- Orders History and Editable Orders ---
function loadOrders() {
  const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
  const userOrders = orders.filter(o => o.username === currentUser.username);
  
  if (userOrders.length === 0) {
    ordersListEl.innerHTML = `<div style="text-align:center; color:#aaa; margin-top:2rem;">Вы еще не сделали ни одного заказа.</div>`;
    return;
  }
  
  const statusLabels = {
    paid: "Оплачен",
    processing: "В процессе",
    shipped: "Отправлен"
  };
  
  const statusColors = {
    paid: "#ffb300",
    processing: "#1e88e5",
    shipped: "#43a047"
  };
  
  ordersListEl.innerHTML = userOrders.map(o => {
    const statusText = statusLabels[o.status] || o.status;
    const badgeColor = statusColors[o.status] || "#666";
    
    // Tracking details for shipped orders
    let shippingHtml = "";
    if (o.status === "shipped") {
      const carrier = o.shippingCarrier || "Почта";
      const track = o.trackingNumber || "TRK-GEN-992";
      shippingHtml = `
        <div style="margin-top: 0.8rem; background:rgba(0, 230, 118, 0.1); border:1px solid #00e676; padding:0.8rem; border-radius:8px;">
          🚚 <strong>Отправлено:</strong> ${carrier} | <strong>Трек-номер:</strong> <code style="background:#222; padding:0.1rem 0.3rem; border-radius:4px;">${track}</code>
        </div>
      `;
    }
    
    // Edit order button if status is paid (not shipped or processing)
    const canEdit = o.status === "paid";
    const editBtnHtml = canEdit ? `<button class="edit-order-btn" data-id="${o.id}" style="padding:0.4rem 0.8rem; background:none; border:1px solid var(--color-primary-start); color:var(--color-primary-start); font-weight:bold; border-radius:8px; cursor:pointer;">✏️ Редактировать</button>` : '';

    return `
      <div style="background: var(--color-surface); padding: 1.5rem; border-radius: var(--radius); border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 0.8rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div>
            <span style="font-weight:bold; font-size:1.1rem; color:#fff;">Заказ #${o.id.toString().slice(-4)}</span>
            <span style="font-size:0.85rem; color:#aaa; margin-left:0.5rem;">от ${new Date(o.date).toLocaleDateString()}</span>
          </div>
          <span style="background:${badgeColor}; color:#fff; padding:0.3rem 0.8rem; border-radius:20px; font-size:0.8rem; font-weight:bold;">${statusText}</span>
        </div>
        
        <div style="margin: 0.5rem 0;">
          <ul style="list-style:none; padding:0; display:flex; flex-direction:column; gap:0.4rem;">
            ${o.items.map(item => `
              <li style="display:flex; justify-content:space-between; font-size:0.95rem;">
                <span>${item.name} <strong style="color:var(--color-primary-start);">x${item.qty}</strong></span>
                <span style="font-weight:bold;">$${((item.price || 0) * item.qty).toFixed(2)}</span>
              </li>
            `).join("")}
          </ul>
        </div>
        
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.08); padding-top:0.8rem;">
          <div>
            <div style="font-size:0.85rem; color:#aaa;">Адрес доставки: ${o.customer.address}</div>
            ${o.comment ? `<div style="font-size:0.85rem; color:#aaa; margin-top:0.2rem;">Комментарий: <em>${o.comment}</em></div>` : ''}
          </div>
          <div style="font-weight:bold; font-size:1.2rem; color:var(--color-primary-start);">${o.total}</div>
        </div>
        
        ${shippingHtml}
        
        <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:0.5rem;">
          ${editBtnHtml}
        </div>
      </div>
    `;
  }).join("");
  
  // Attach Edit Click listeners
  document.querySelectorAll(".edit-order-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const orderId = Number(btn.dataset.id);
      openEditOrderModal(orderId);
    });
  });
}

// Edit Order Modal logic
const editOrderModal = document.getElementById("editOrderModal");
const editOrderForm = document.getElementById("editOrderForm");
const editOrderId = document.getElementById("editOrderId");
const editOrderAddress = document.getElementById("editOrderAddress");
const editOrderComment = document.getElementById("editOrderComment");
const editOrderPreferred = document.getElementById("editOrderPreferred");
const editOrderContactValue = document.getElementById("editOrderContactValue");
const closeEditOrderModal = document.getElementById("closeEditOrderModal");

function openEditOrderModal(id) {
  const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
  const o = orders.find(x => x.id === id);
  if (!o) return;
  
  editOrderId.value = o.id;
  editOrderAddress.value = o.customer.address || "";
  editOrderComment.value = o.comment || "";
  editOrderPreferred.value = o.preferredContact || "Telegram";
  editOrderContactValue.value = o.contactValue || "";
  
  editOrderModal.style.display = "flex";
}

if (closeEditOrderModal) {
  closeEditOrderModal.addEventListener("click", () => {
    editOrderModal.style.display = "none";
  });
}

if (editOrderForm) {
  editOrderForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = Number(editOrderId.value);
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    const idx = orders.findIndex(o => o.id === id);
    
    if (idx !== -1) {
      orders[idx].customer.address = editOrderAddress.value.trim();
      orders[idx].comment = editOrderComment.value.trim();
      orders[idx].preferredContact = editOrderPreferred.value;
      orders[idx].contactValue = editOrderContactValue.value.trim();
      
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
      showToast("Заказ успешно отредактирован!");
      editOrderModal.style.display = "none";
      loadOrders();
    }
  });
}

// --- Dynamic Support Chat with File upload support ---
function populateManufacturers() {
  if (!chatManufacturerSelect) return;
  const allUsers = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
  const manufacturers = allUsers.filter(u => u.role === 'admin').map(u => u.manufacturer).filter(Boolean);
  
  let html = `<option value="Администрация сайта (Суперюзер)">Администрация (Суперюзер)</option>`;
  html += manufacturers.map(m => `<option value="${m}">${m}</option>`).join('');
  chatManufacturerSelect.innerHTML = html;
}

if (chatManufacturerSelect) {
  chatManufacturerSelect.addEventListener("change", loadChat);
}

// Read attached file as base64 on change
if (chatFile) {
  chatFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const r = new FileReader();
      r.onload = (event) => {
        chatAttachedFile = {
          data: event.target.result,
          name: file.name,
          type: file.type
        };
        showToast(`Файл прикреплен: ${file.name}`);
      };
      r.readAsDataURL(file);
    } else {
      chatAttachedFile = null;
    }
  });
}

function loadChat() {
  const selectedManufacturer = chatManufacturerSelect ? chatManufacturerSelect.value : "Администрация сайта (Суперюзер)";
  const allMsgs = JSON.parse(localStorage.getItem(CHAT_KEY) || "[]");
  const userMsgs = allMsgs.filter(m => m.username === currentUser.username && (m.manufacturer === selectedManufacturer || (!m.manufacturer && selectedManufacturer === "Администрация сайта (Суперюзер)")));
  
  if (userMsgs.length === 0) {
    chatMessagesEl.innerHTML = `<div style="text-align:center; color:#aaa; margin-top:2rem;">У вас пока нет сообщений с ${selectedManufacturer}. Напишите сообщение ниже!</div>`;
    return;
  }
  
  chatMessagesEl.innerHTML = userMsgs.map(m => {
    let fileHtml = "";
    if (m.file) {
      if (m.fileType && m.fileType.startsWith("image/")) {
        fileHtml = `<div style="margin-top:0.5rem;"><img src="${m.file}" alt="image" style="max-width:100%; max-height:200px; border-radius:8px; border:1px solid #555; display:block; cursor:pointer;" onclick="window.open('${m.file}')" /></div>`;
      } else {
        fileHtml = `<div style="margin-top:0.5rem;"><a href="${m.file}" download="${m.fileName || 'file'}" style="color:#00b0ff; text-decoration:underline; font-size:0.85rem; display:inline-flex; align-items:center; gap:0.3rem;">📎 ${m.fileName || 'Загрузить файл'}</a></div>`;
      }
    }

    return `
      <div class="chat-msg ${m.sender === 'user' ? 'user' : 'admin'}">
        <div>${m.text}</div>
        ${fileHtml}
        <div class="chat-time">${new Date(m.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
      </div>
    `;
  }).join("");
  
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text && !chatAttachedFile) return;
  
  const selectedManufacturer = chatManufacturerSelect ? chatManufacturerSelect.value : "Администрация сайта (Суперюзер)";
  const allMsgs = JSON.parse(localStorage.getItem(CHAT_KEY) || "[]");
  
  allMsgs.push({
    id: Date.now(),
    username: currentUser.username,
    sender: "user",
    text: text || (chatAttachedFile ? `Прикрепленный файл: ${chatAttachedFile.name}` : ""),
    date: new Date().toISOString(),
    readByAdmin: false,
    manufacturer: selectedManufacturer,
    file: chatAttachedFile ? chatAttachedFile.data : null,
    fileName: chatAttachedFile ? chatAttachedFile.name : null,
    fileType: chatAttachedFile ? chatAttachedFile.type : null
  });
  
  localStorage.setItem(CHAT_KEY, JSON.stringify(allMsgs));
  chatInput.value = "";
  if (chatFile) chatFile.value = "";
  chatAttachedFile = null;
  loadChat();
});

// --- Tab Switching ---
function switchTab(tab) {
  tabProfile.classList.toggle("active", tab === "profile");
  tabOrders.classList.toggle("active", tab === "orders");
  tabSupport.classList.toggle("active", tab === "support");
  
  profileSection.style.display = tab === "profile" ? "block" : "none";
  ordersSection.style.display = tab === "orders" ? "block" : "none";
  supportSection.style.display = tab === "support" ? "block" : "none";
  
  if (tab === "orders") loadOrders();
  if (tab === "support") loadChat();
}

tabProfile.addEventListener("click", () => switchTab("profile"));
tabOrders.addEventListener("click", () => switchTab("orders"));
tabSupport.addEventListener("click", () => switchTab("support"));

// Initialize Dashboard
loadUser();
switchTab("profile");
