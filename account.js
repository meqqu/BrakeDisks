// account.js – handles user profile, orders history, and support chat with editable orders and files attachment
import { serverSyncReady } from "./serverSync.js";
import DOMPurify from 'https://esm.sh/dompurify';

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
const tabMfgInfo = document.getElementById("tabMfgInfo");
const tabSecurity = document.getElementById("tabSecurity");

const profileSection = document.getElementById("profileSection");
const ordersSection = document.getElementById("ordersSection");
const supportSection = document.getElementById("supportSection");
const mfgInfoSection = document.getElementById("mfgInfoSection");
const securitySection = document.getElementById("securitySection");
const securityForm = document.getElementById("securityForm");
const securityMsg = document.getElementById("securityMsg");

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
    
    showToast("Profile successfully updated!");
  });
}

// --- Orders History and Editable Orders ---
function loadOrders() {
  const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
  const userOrders = orders.filter(o => o.username === currentUser.username);
  
  if (userOrders.length === 0) {
    ordersListEl.innerHTML = `<div style="text-align:center; color:var(--color-muted); margin-top:2rem;">You haven't made any orders yet.</div>`;
    return;
  }
  
  const statusLabels = {
    paid: "Paid",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled"
  };
  
  const statusColors = {
    paid: "#ffb300",
    processing: "#1e88e5",
    shipped: "#43a047",
    delivered: "#00e676",
    cancelled: "#ff5252"
  };
  
  ordersListEl.innerHTML = userOrders.map(o => {
    const statusText = statusLabels[o.status] || o.status;
    const badgeColor = statusColors[o.status] || "#666";
    
    // Tracking details for shipped/delivered orders
    let shippingHtml = "";
    if (o.status === "shipped" || o.status === "delivered") {
      const carrier = o.shippingCarrier || "Post";
      const track = o.trackingNumber || "N/A";
      const bgColor = o.status === "delivered" ? "rgba(0, 230, 118, 0.15)" : "rgba(0, 230, 118, 0.1)";
      const borderColor = o.status === "delivered" ? "#00e676" : "#00e676";
      const icon = o.status === "delivered" ? "✅" : "🚚";
      const label = o.status === "delivered" ? "Delivered via:" : "Shipped via:";
      shippingHtml = `
        <div style="margin-top: 0.8rem; background:${bgColor}; border:1px solid ${borderColor}; padding:0.8rem; border-radius:8px;">
          ${icon} <strong>${label}</strong> ${carrier} | <strong>Tracking:</strong> <code style="background:var(--color-surface); padding:0.1rem 0.3rem; border-radius:4px;">${track}</code>
        </div>
      `;
    }
    if (o.status === "cancelled") {
      shippingHtml = `
        <div style="margin-top: 0.8rem; background:rgba(255, 82, 82, 0.1); border:1px solid #ff5252; padding:0.8rem; border-radius:8px;">
          ❌ <strong>This order has been cancelled.</strong> Please contact support for more details.
        </div>
      `;
    }
    
    // Edit order button if status is paid (not shipped, processing, delivered or cancelled)
    const canEdit = o.status === "paid";
    const editBtnHtml = canEdit ? `<button class="edit-order-btn" data-id="${o.id}" style="padding:0.4rem 0.8rem; background:none; border:1px solid var(--color-primary-start); color:var(--color-primary-start); font-weight:bold; border-radius:8px; cursor:pointer;">✏️ Edit</button>` : '';

    return `
      <div style="background: var(--color-surface); padding: 1.5rem; border-radius: var(--radius); border:1px solid var(--color-border); display: flex; flex-direction: column; gap: 0.8rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div>
            <span style="font-weight:bold; font-size:1.1rem; color:var(--color-text-bright);">Order #${o.id.toString().slice(-4)}</span>
            <span style="font-size:0.85rem; color:var(--color-muted); margin-left:0.5rem;">on ${new Date(o.date).toLocaleDateString()}</span>
          </div>
          <span style="background:${badgeColor}; color:var(--color-text-bright); padding:0.3rem 0.8rem; border-radius:20px; font-size:0.8rem; font-weight:bold;">${statusText}</span>
        </div>
        
        <div style="margin: 0.5rem 0;">
          <ul style="list-style:none; padding:0; display:flex; flex-direction:column; gap:0.4rem;">
            ${o.items.map(item => `
              <li style="display:flex; justify-content:space-between; align-items:center; font-size:0.95rem; background:var(--color-input-bg); border:1px solid var(--color-border); padding:0.6rem 0.8rem; border-radius:8px; margin-bottom:0.4rem;">
                <div style="display:flex; flex-direction:column; gap:0.2rem;">
                  <a href="product.html?id=${(JSON.parse(localStorage.getItem('brakeProducts') || '[]').find(p => p.id == item.id) || {}).slug || item.id}" style="color:var(--color-primary-start); text-decoration:none; font-weight:500; transition:var(--transition);" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${item.name}</a>
                  <span style="font-size:0.85rem; color:var(--color-muted);">Manufacturer: <strong style="color:var(--color-text-bright);">${item.manufacturer || 'Administration'}</strong> | Qty: <strong style="color:var(--color-primary-start);">x${item.qty}</strong></span>
                </div>
                <div style="display:flex; align-items:center; gap:1rem;">
                  <span style="font-weight:bold; color:var(--color-text-bright);">$${((item.price || 0) * item.qty).toFixed(2)}</span>
                  <button type="button" class="ask-order-mfg-btn" data-mfg="${item.manufacturer || 'Administration (Superuser)'}" data-order="${o.id}" data-product="${item.name}" style="padding:0.3rem 0.6rem; font-size:0.8rem; background:rgba(124, 58, 237, 0.15); border:1px solid rgba(124, 58, 237, 0.3); color:#a78bfa; border-radius:4px; cursor:pointer; font-weight:bold; transition:var(--transition);" onmouseover="this.style.background='rgba(124, 58, 237, 0.25)'" onmouseout="this.style.background='rgba(124, 58, 237, 0.15)'">💬 Ask Seller</button>
                </div>
              </li>
            `).join("")}
          </ul>
        </div>
        
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--color-border); padding-top:0.8rem;">
          <div>
            <div style="font-size:0.85rem; color:var(--color-muted);">Shipping Address: ${o.customer.address}</div>
            ${o.comment ? `<div style="font-size:0.85rem; color:var(--color-muted); margin-top:0.2rem;">Comment: <em>${o.comment}</em></div>` : ''}
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

  // Attach Ask Seller Click listeners
  document.querySelectorAll(".ask-order-mfg-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const mfg = btn.dataset.mfg;
      const orderId = btn.dataset.order;
      const productName = btn.dataset.product;
      
      switchTab("support");
      
      if (chatManufacturerSelect) {
        let optionExists = false;
        for (let i = 0; i < chatManufacturerSelect.options.length; i++) {
          if (chatManufacturerSelect.options[i].value === mfg) {
            optionExists = true;
            chatManufacturerSelect.selectedIndex = i;
            break;
          }
        }
        if (!optionExists) {
          const opt = document.createElement("option");
          opt.value = mfg;
          opt.textContent = mfg;
          chatManufacturerSelect.appendChild(opt);
          chatManufacturerSelect.value = mfg;
        }
        loadChat();
      }
      
      if (chatInput) {
        chatInput.value = `Hello! I have a question regarding my order #${orderId.toString().slice(-4)} and product "${productName}": `;
        chatInput.focus();
      }
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
      showToast("Order successfully edited!");
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
  
  let html = `<option value="Administration (Superuser)">Administration (Superuser)</option>`;
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
      if (file.size > 2 * 1024 * 1024) { // 2MB Limit
        alert("File size exceeds 2MB limit!");
        chatFile.value = "";
        return;
      }
      const r = new FileReader();
      r.onload = (event) => {
        chatAttachedFile = {
          data: event.target.result,
          name: file.name,
          type: file.type
        };
        showToast(`File attached: ${file.name}`);
      };
      r.readAsDataURL(file);
    } else {
      chatAttachedFile = null;
    }
  });
}

function loadChat() {
  const activeMfg = chatManufacturerSelect ? chatManufacturerSelect.value : "Administration (Superuser)";
  fetch('/api/chat', {credentials: 'include'})
    .then(r => r.json())
    .then(data => {
      const userMsgs = data.filter(m => (m.manufacturer || "Garage1") === activeMfg || (!m.manufacturer && activeMfg === "Administration (Superuser)"));
      renderChatMessages(userMsgs);
    })
    .catch(console.error);
}

function renderChatMessages(userMsgs) {
  if (userMsgs.length === 0) {
    chatMessagesEl.innerHTML = `<div style="padding:1rem; color:var(--color-muted); text-align:center;">No messages yet. Send a message to contact support.</div>`;
    return;
  }
  
  chatMessagesEl.innerHTML = userMsgs.map(m => {
    let fileHtml = "";
    if (m.file && typeof m.file === 'string' && m.file.startsWith('data:')) {
      const safeFile = DOMPurify.sanitize(m.file, { ALLOWED_ATTR: ['href', 'src', 'download'] }); 
      const safeName = DOMPurify.sanitize(m.fileName || 'file');
      if (m.fileType && m.fileType.startsWith("image/")) {
        fileHtml = `<div style="margin-top:0.5rem;"><img src="${m.file}" alt="image" style="max-width:100%; max-height:200px; border-radius:8px; border:1px solid #555; display:block;" /></div>`;
      } else {
        fileHtml = `<div style="margin-top:0.5rem;"><a href="${m.file}" download="${safeName}" style="color:#00b0ff; text-decoration:underline; font-size:0.85rem; display:inline-flex; align-items:center; gap:0.3rem;">📎 ${safeName}</a></div>`;
      }
    }

    const safeText = DOMPurify.sanitize(m.text);
    return `
      <div class="chat-msg ${m.sender === 'user' ? 'user' : 'admin'}">
        <div>${safeText}</div>
        ${fileHtml}
        <div class="chat-time">${new Date(m.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
      </div>
    `;
  }).join("");
  
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

if (chatForm) {
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text && !chatAttachedFile) return;
    
    const activeMfg = chatManufacturerSelect ? chatManufacturerSelect.value : "Administration (Superuser)";
    
    const payload = {
      text: text,
      manufacturer: activeMfg,
      file: chatAttachedFile ? chatAttachedFile.data : null,
      fileName: chatAttachedFile ? chatAttachedFile.name : null,
      fileType: chatAttachedFile ? chatAttachedFile.type : null
    };

    fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    }).then(r => r.json()).then(res => {
      if (res.success) {
        chatInput.value = "";
        chatAttachedFile = null;
        chatFile.value = "";
        loadChat();
      } else {
        showToast(res.error || "Failed to send message");
      }
    });
  });
}

// --- Tab Switching ---
function switchTab(tab) {
  tabProfile.classList.toggle("active", tab === "profile");
  tabOrders.classList.toggle("active", tab === "orders");
  tabSupport.classList.toggle("active", tab === "support");
  if(tabMfgInfo) tabMfgInfo.classList.toggle("active", tab === "mfgInfo");
  if(tabSecurity) tabSecurity.classList.toggle("active", tab === "security");
  
  profileSection.style.display = tab === "profile" ? "block" : "none";
  ordersSection.style.display = tab === "orders" ? "block" : "none";
  supportSection.style.display = tab === "support" ? "block" : "none";
  if(mfgInfoSection) mfgInfoSection.style.display = tab === "mfgInfo" ? "block" : "none";
  if(securitySection) securitySection.style.display = tab === "security" ? "block" : "none";
  
  if (tab === "orders") loadOrders();
  if (tab === "support") loadChat();
  if (tab === "mfgInfo") loadMfgInfo();
}

tabProfile.addEventListener("click", () => switchTab("profile"));
tabOrders.addEventListener("click", () => switchTab("orders"));
tabSupport.addEventListener("click", () => switchTab("support"));
if(tabMfgInfo) tabMfgInfo.addEventListener("click", () => switchTab("mfgInfo"));
if(tabSecurity) tabSecurity.addEventListener("click", () => switchTab("security"));

// --- Security (Change Password) ---
if (securityForm) {
  securityForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!securityMsg) return;
    
    const oldPass = document.getElementById("secOldPass").value;
    const newPass = document.getElementById("secNewPass").value;
    const confirmPass = document.getElementById("secConfirmPass").value;
    
    if (newPass !== confirmPass) {
      securityMsg.style.display = "block";
      securityMsg.className = "";
      securityMsg.style.background = "rgba(255,82,82,0.12)";
      securityMsg.style.borderLeft = "4px solid #ff5252";
      securityMsg.style.color = "#ff7070";
      securityMsg.textContent = "❌ New passwords do not match.";
      return;
    }
    
    const btn = document.getElementById("secBtn");
    btn.disabled = true;
    btn.textContent = "Changing...";
    
    const token = localStorage.getItem("brakeAuthToken");
    
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
      });
      const data = await res.json();
      
      securityMsg.style.display = "block";
      securityMsg.className = "";
      
      if (res.ok) {
        securityMsg.style.background = "rgba(0,230,118,0.1)";
        securityMsg.style.borderLeft = "4px solid #00e676";
        securityMsg.style.color = "#00e676";
        securityMsg.textContent = "✅ " + data.message;
        securityForm.reset();
      } else {
        securityMsg.style.background = "rgba(255,82,82,0.12)";
        securityMsg.style.borderLeft = "4px solid #ff5252";
        securityMsg.style.color = "#ff7070";
        securityMsg.textContent = "❌ " + data.error;
      }
    } catch (err) {
      securityMsg.style.display = "block";
      securityMsg.className = "";
      securityMsg.style.background = "rgba(255,82,82,0.12)";
      securityMsg.style.borderLeft = "4px solid #ff5252";
      securityMsg.style.color = "#ff7070";
      securityMsg.textContent = "❌ Server error.";
    }
    
    btn.disabled = false;
    btn.textContent = "Change Password";
  });
}

function initUserMenu() {
  const userMenuBtn = document.getElementById("userMenuBtn");
  const userDropdown = document.getElementById("userDropdown");
  const userMenuText = document.getElementById("userMenuText");
  const userInfo = document.getElementById("userInfo");
  const logoutBtn = document.getElementById("logoutBtn");
  
  const adminNav = document.getElementById("adminNav");
  const navArticles = document.getElementById("navArticles");
  const navUsers = document.getElementById("navUsers");
  const navSettings = document.getElementById("navSettings");
  const navMyAccount = document.getElementById("navMyAccount");

  if (!userMenuBtn || !userDropdown) return;

  const role = localStorage.getItem("brakeRole") || "user";
  if (role === "admin" && tabMfgInfo) {
    tabMfgInfo.style.display = "block";
  }
  if (role === "user" && tabSecurity) {
    tabSecurity.style.display = "block";
  }
  
  const savedUser = JSON.parse(localStorage.getItem("brakeUser") || "{}");
  const openLoginBtn = document.getElementById("openLoginBtn");
  const accountNav = document.getElementById("accountNav");

  if (savedUser && savedUser.username) {
    if (userMenuText) userMenuText.textContent = savedUser.username;
    if (userInfo) {
      userInfo.textContent = `Hello, ${savedUser.username}`;
      userInfo.style.display = "block";
    }
    if (openLoginBtn) openLoginBtn.style.display = "none";
    if (logoutBtn)    logoutBtn.style.display = "block";
    if (accountNav)   accountNav.style.display = "block";
  } else {
    if (userMenuText) userMenuText.textContent = "Sign In";
    if (openLoginBtn) openLoginBtn.style.display = "block";
    if (logoutBtn)    logoutBtn.style.display = "none";
    if (accountNav)   accountNav.style.display = "none";
  }

  userMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isDisp = userDropdown.style.display === "flex";
    userDropdown.style.display = isDisp ? "none" : "flex";
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest('.user-menu')) {
      userDropdown.style.display = "none";
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      } catch (e) {
        console.error("Logout API failed", e);
      }
      localStorage.removeItem("brakeRole");
      localStorage.removeItem("brakeUser");
      window.location.href = "index.html";
    });
  }

  if (role === "admin" || role === "superadmin") {
    if(adminNav) adminNav.style.display = "block";
    
    // Only manufacturers (admin) have a workshop profile
    if(tabMfgInfo) tabMfgInfo.style.display = role === "admin" ? "block" : "none";
    
    // Hide orders, support, and security tabs for admin/superadmin
    if(tabOrders) tabOrders.style.display = "none";
    if(tabSupport) tabSupport.style.display = "none";
    if(tabSecurity) tabSecurity.style.display = "none";
    
    if (role === "superadmin") {
      if(navArticles) navArticles.style.display = "block";
      if(navUsers) navUsers.style.display = "block";
      if(navSettings) navSettings.style.display = "block";
      // Superadmin doesn't have a production profile link
      if(navMyAccount) navMyAccount.style.display = "none";
    } else {
      if(navArticles) navArticles.style.display = "block";
      if(navMyAccount) navMyAccount.style.display = "block";
      if(navUsers) navUsers.style.display = "none";
      if(navSettings) navSettings.style.display = "none";
    }
  } else {
    if(adminNav) adminNav.style.display = "none";
    if(tabMfgInfo) tabMfgInfo.style.display = "none";
    if(tabOrders) tabOrders.style.display = "block";
    if(tabSupport) tabSupport.style.display = "block";
    if(tabSecurity) tabSecurity.style.display = "block";
    if(navArticles) navArticles.style.display = "none";
    if(navUsers) navUsers.style.display = "none";
    if(navSettings) navSettings.style.display = "none";
    if(navMyAccount) navMyAccount.style.display = "none";
  }
}

// --- Manufacturer Info Profile Page ---
const mfgInfoForm = document.getElementById("mfgInfoForm");

function loadMfgInfo() {
  if (!mfgInfoForm) return;
  const savedUser = JSON.parse(localStorage.getItem("brakeUser") || "{}");
  const manufacturerName = savedUser.manufacturer || "Garage1";
  document.getElementById("mfgWorkshopName").value = manufacturerName;
  
  const key = `brakeMfgDetails_${manufacturerName}`;
  const info = JSON.parse(localStorage.getItem(key) || "{}");
  
  document.getElementById("mfgWorkload").value = info.workload || "Medium (Shipment 3-5 days)";
  document.getElementById("mfgDescription").value = info.description || "";
  document.getElementById("mfgPhone").value = info.phone || "";
  document.getElementById("mfgAddress").value = info.address || "";
  document.getElementById("mfgMaterials").value = info.materials || "";
}

if (mfgInfoForm) {
  mfgInfoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const savedUser = JSON.parse(localStorage.getItem("brakeUser") || "{}");
    const manufacturerName = savedUser.manufacturer || "Garage1";
    
    const workload = document.getElementById("mfgWorkload").value;
    const description = document.getElementById("mfgDescription").value.trim();
    const phone = document.getElementById("mfgPhone").value.trim();
    const address = document.getElementById("mfgAddress").value.trim();
    const materials = document.getElementById("mfgMaterials").value.trim();
    
    const key = `brakeMfgDetails_${manufacturerName}`;
    localStorage.setItem(key, JSON.stringify({ workload, description, phone, address, materials }));
    showToast("Production profile successfully saved!");
  });
}

// Initialize Dashboard
serverSyncReady.then(() => {
  loadUser();
  initUserMenu();

  const urlParams = new URLSearchParams(window.location.search);
  const activeTab = urlParams.get("tab") || "profile";
  switchTab(activeTab);
});
