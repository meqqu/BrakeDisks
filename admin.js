// admin.js – handles Products inventory, Support Chats with file attachment, dynamic Orders Table, resizable Excel SpreadSheet, and Superuser management
import { serverSyncReady } from "./serverSync.js";
import { ADMIN_PASSWORD } from "./config.js";
import { openEditModal } from "./admin/editModal.js?v=2";
import { detectBrand, generateSeoName, detectModelName, detectYears, generateSlug } from "./admin/aiHelper.js";
import { initAccounting, renderAccounting, postOrderToAccounting, unpostOrderFromAccounting } from "./admin/accounting.js?v=2";
import DOMPurify from 'https://esm.sh/dompurify';

let currentLang = "ru";

const tableBodyEl = document.getElementById("tableBody");
const adminSearch = document.getElementById("adminSearch");

// Add Product Modal Elements
const openAddProductModalBtn = document.getElementById("openAddProductModalBtn");
const addProductModal = document.getElementById("addProductModal");
const cancelAddProductBtn = document.getElementById("cancelAddProductBtn");
const addProductForm = document.getElementById("addProductForm");

const addName = document.getElementById("addName");
const addBrand = document.getElementById("addBrand");
const addPrice = document.getElementById("addPrice");
const addImage = document.getElementById("addImage");
const addImgPreview = document.getElementById("addImgPreview");
const addImgFile = document.getElementById("addImgFile");
const addStock = document.getElementById("addStock");
const addSeoTitle = document.getElementById("addSeoTitle");
const addSeoDesc = document.getElementById("addSeoDesc");
const addSeoKeywords = document.getElementById("addSeoKeywords");

// New gallery inputs for add product modal
const addGallery = document.getElementById("addGallery");
const addGalleryFiles = document.getElementById("addGalleryFiles");
const addGalleryUploadBtn = document.getElementById("addGalleryUploadBtn");
const addGalleryPreviews = document.getElementById("addGalleryPreviews");

let products = [];
const currentUser = JSON.parse(localStorage.getItem("brakeUser") || "{}");
const userRole = localStorage.getItem("brakeRole") || "user";
const manufacturerName = currentUser.manufacturer || "";

// Force log out if blocked
const allUsersCheck = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
const dbUser = allUsersCheck.find(u => u.username === currentUser.username);
if (dbUser && dbUser.blocked) {
  localStorage.removeItem("brakeUser");
  localStorage.removeItem("brakeRole");
  window.location.href = "index.html";
}

// Superadmin elements
const superFilterContainer = document.getElementById("superadminManufacturerFilter");
const superSelect = document.getElementById("superadminManufacturerSelect");

// Tabs
const productsTab = document.getElementById("productsTab");
const questionsTab = document.getElementById("questionsTab");
const ordersTab = document.getElementById("ordersTab");
const mfgInfoTab = document.getElementById("mfgInfoTab");
const producersTab = document.getElementById("producersTab");
const settingsTab = document.getElementById("settingsTab");

// Article Management DOM
const articlesTableBody = document.getElementById("articlesTableBody");
const openAddArticleModalBtn = document.getElementById("openAddArticleModalBtn");
const articleEditModal = document.getElementById("articleEditModal");
const articleEditForm = document.getElementById("articleEditForm");
const closeArticleModalBtn = document.getElementById("closeArticleModalBtn");
const articleTitleInput = document.getElementById("articleTitleInput");
const articleImageFile = document.getElementById("articleImageFile");
const articleImagePreview = document.getElementById("articleImagePreview");
const articleImageInput = document.getElementById("articleImageInput");
const articleVideoInput = document.getElementById("articleVideoInput");
const articleContentInput = document.getElementById("articleContentInput");
const editArticleId = document.getElementById("editArticleId");
const articleModalTitle = document.getElementById("articleModalTitle");

const accountingTab = document.getElementById("accountingTab");

const showProductsBtn = document.getElementById("showProductsBtn");
const showQuestionsBtn = document.getElementById("showQuestionsBtn");
const showOrdersBtn = document.getElementById("showOrdersBtn");
const showOverallEstimateBtnSidebar = document.getElementById("showOverallEstimateBtnSidebar");
const showMfgInfoBtn = document.getElementById("showMfgInfoBtn");
const showProducersBtn = document.getElementById("showProducersBtn");
const showSettingsBtn = document.getElementById("showSettingsBtn");

const dialogsListEl = document.getElementById("dialogsList");
const adminChatContainer = document.getElementById("adminChatContainer");
const activeChatUser = document.getElementById("activeChatUser");
const adminChatMessages = document.getElementById("adminChatMessages");
const adminChatForm = document.getElementById("adminChatForm");
const adminChatInput = document.getElementById("adminChatInput");
const adminChatFile = document.getElementById("adminChatFile");

let adminAttachedFile = null;

// Toast helper
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

function initSuperadmin() {
  if (userRole === "superadmin") {
    if (superFilterContainer && superSelect) {
      superFilterContainer.style.display = "flex";
      
      updateSuperadminDropdown();
        
      superSelect.addEventListener("change", () => {
        renderTable();
        renderQuestions();
        renderOrders();
        renderAccounting();
        renderArticlesList();
      });
    }
    
    // Show superuser tabs
    loadProducers();
    loadSiteSettings();
    renderArticlesList();
  }
}

function getActiveManufacturer() {
  if (userRole === "superadmin") {
    return superSelect ? superSelect.value : "all";
  }
  return manufacturerName || "Garage1";
}

function updateSuperadminDropdown() {
  if (userRole !== "superadmin" || !superSelect) return;
  const allUsers = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
  const userMfgs = allUsers.filter(u => u.role === 'admin').map(u => u.manufacturer).filter(Boolean);
  const productMfgs = (products || []).map(p => p.manufacturer || "Garage1").filter(Boolean);
  
  const uniqueMfgs = [...new Set([...userMfgs, ...productMfgs, "Garage1"])];
  
  const currentVal = superSelect.value;
  superSelect.innerHTML = '<option value="all">All manufacturers</option>' +
    uniqueMfgs.map(m => `<option value="${m}">${m}</option>`).join('');
  
  if (uniqueMfgs.includes(currentVal) || currentVal === "all") {
    superSelect.value = currentVal;
  } else {
    superSelect.value = "all";
  }
}

function loadProducts() {
  const stored = localStorage.getItem("brakeProducts");
  if (stored) {
    products = JSON.parse(stored);
    renderTable();
    updateSuperadminDropdown();
  } else {
    fetch("/products.json")
      .then(r => r.json())
      .then(data => { 
        products = data; 
        localStorage.setItem("brakeProducts", JSON.stringify(products)); 
        renderTable(); 
        updateSuperadminDropdown();
      })
      .catch(console.error);
  }
}

// Custom prompt to bypass browser blocking native dialogs
function customPrompt(message, defaultVal, callback) {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.6)";
  overlay.style.zIndex = "10000";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  
  const box = document.createElement("div");
  box.style.background = "#1a1e2e";
  box.style.padding = "20px";
  box.style.borderRadius = "8px";
  box.style.border = "1px solid var(--color-primary-start)";
  box.style.minWidth = "300px";
  box.style.display = "flex";
  box.style.flexDirection = "column";
  box.style.gap = "15px";
  box.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)";
  
  const msg = document.createElement("div");
  msg.textContent = message;
  msg.style.color = "#eee";
  msg.style.fontWeight = "bold";
  
  const input = document.createElement("input");
  input.type = "text";
  input.value = defaultVal || "";
  input.style.padding = "10px";
  input.style.borderRadius = "4px";
  input.style.border = "1px solid #444";
  input.style.background = "#0f111a";
  input.style.color = "#fff";
  input.style.outline = "none";
  input.style.fontSize = "1rem";
  
  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.justifyContent = "flex-end";
  btnRow.style.gap = "10px";
  
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.padding = "8px 16px";
  cancelBtn.style.background = "#444";
  cancelBtn.style.color = "#fff";
  cancelBtn.style.border = "none";
  cancelBtn.style.borderRadius = "4px";
  cancelBtn.style.cursor = "pointer";
  
  const okBtn = document.createElement("button");
  okBtn.textContent = "OK";
  okBtn.style.padding = "8px 16px";
  okBtn.style.background = "var(--color-primary-start)";
  okBtn.style.color = "#fff";
  okBtn.style.border = "none";
  okBtn.style.borderRadius = "4px";
  okBtn.style.cursor = "pointer";
  
  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(okBtn);
  
  box.appendChild(msg);
  box.appendChild(input);
  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  
  input.focus();
  input.select();
  
  const close = (val) => {
    document.body.removeChild(overlay);
    if (callback) callback(val);
  };
  
  cancelBtn.addEventListener("click", () => close(null));
  okBtn.addEventListener("click", () => close(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") close(input.value);
    if (e.key === "Escape") close(null);
  });
}

function customConfirm(message, callback) {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.6)";
  overlay.style.zIndex = "10000";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  
  const box = document.createElement("div");
  box.style.background = "#1a1e2e";
  box.style.padding = "20px";
  box.style.borderRadius = "8px";
  box.style.border = "1px solid var(--color-primary-start)";
  box.style.minWidth = "300px";
  box.style.display = "flex";
  box.style.flexDirection = "column";
  box.style.gap = "15px";
  box.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)";
  
  const msg = document.createElement("div");
  msg.textContent = message;
  msg.style.color = "#eee";
  msg.style.fontWeight = "bold";
  
  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.justifyContent = "flex-end";
  btnRow.style.gap = "10px";
  
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.padding = "8px 16px";
  cancelBtn.style.background = "#444";
  cancelBtn.style.color = "#fff";
  cancelBtn.style.border = "none";
  cancelBtn.style.borderRadius = "4px";
  cancelBtn.style.cursor = "pointer";
  
  const okBtn = document.createElement("button");
  okBtn.textContent = "OK";
  okBtn.style.padding = "8px 16px";
  okBtn.style.background = "var(--color-primary-start)";
  okBtn.style.color = "#fff";
  okBtn.style.border = "none";
  okBtn.style.borderRadius = "4px";
  okBtn.style.cursor = "pointer";
  
  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(okBtn);
  
  box.appendChild(msg);
  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  
  okBtn.focus();
  
  const close = (val) => {
    document.body.removeChild(overlay);
    if (callback) callback(val);
  };
  
  cancelBtn.addEventListener("click", () => close(false));
  okBtn.addEventListener("click", () => close(true));
  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Enter") close(true);
    if (e.key === "Escape") close(false);
  });
}

function renderTable() {
  if (!tableBodyEl) return;
  tableBodyEl.innerHTML = "";
  const activeMfg = getActiveManufacturer();
  
  const filteredProducts = products.filter(p => {
    const pMfg = p.manufacturer || "Garage1";
    if (activeMfg === "all") return true;
    return pMfg === activeMfg;
  });
  
  const finalItems = [];
  const childIds = new Set();
  const handledGroups = new Set();
  
  filteredProducts.forEach(p => {
    if (!p.groupId) {
      finalItems.push(p);
    } else {
      if (!handledGroups.has(p.groupId)) {
        handledGroups.add(p.groupId);
        const groupMates = filteredProducts.filter(x => x.groupId === p.groupId);
        groupMates.forEach((item, idx) => {
          if (idx > 0) childIds.add(item.id);
          finalItems.push(item);
        });
      }
    }
  });
  
  finalItems.forEach(p => {
    const tr = document.createElement("tr");
    tr.dataset.id = p.id;
    const isChild = childIds.has(p.id);
    
    if (isChild) {
      tr.style.backgroundColor = "rgba(255, 255, 255, 0.02)";
      tr.style.borderLeft = "3px solid var(--color-primary-start)";
    }
    
    const badgeClass = p.stock ? 'in-stock' : 'out-of-stock';
    const textStock = p.stock ? (p.stockCount !== undefined ? `In stock: ${p.stockCount}` : 'In stock') : 'On order';
    const textMfg = p.manufacturer || "Garage1";
    
    const isVisible = p.visible !== false;
    const visibilityBadge = isVisible
      ? `<span class="stock-badge in-stock" style="font-size:0.75rem; padding:0.15rem 0.4rem; display:inline-block; margin-top:2px;">👁️ Active</span>`
      : `<span class="stock-badge out-of-stock" style="font-size:0.75rem; padding:0.15rem 0.4rem; display:inline-block; margin-top:2px; background:rgba(255,145,0,0.1); color:#ff9100;">🙈 Hidden</span>`;

    tr.innerHTML = `
      <td style="padding-left: ${isChild ? '2rem' : '1rem'}">
        <div style="display:flex; align-items:center; gap:0.5rem;">
          ${isChild ? `<span style="color:var(--color-primary-start); font-size:1.2rem;">↳</span>` : ''}
          <img src="${p.image}" alt="${p.name}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;" />
          <div>
            <div style="font-weight:bold; color:var(--color-text-bright);">${p.name}</div>
            <div style="font-size:0.75rem; color:var(--color-muted); display:flex; align-items:center; gap:0.4rem;">🏭 ${textMfg} ${visibilityBadge}</div>
          </div>
        </div>
      </td>
      <td>${p.brand || '---'}</td>
      <td><span class="stock-badge ${badgeClass}">${textStock}</span></td>
      <td style="font-weight:bold; color:var(--color-primary-start); font-size:1.1rem;">$${(p.price || 0).toFixed(2)}</td>
      <td>
        <button class="edit-btn inline-toggle-visibility-btn" title="${isVisible ? 'Hide from site' : 'Show on site'}" style="margin-right:0.2rem; background:${isVisible ? 'rgba(0,230,118,0.15)' : 'rgba(255,145,0,0.15)'}; border:1px solid ${isVisible ? '#00e676' : '#ff9100'}; padding:0.2rem 0.4rem; border-radius:4px; cursor:pointer;">${isVisible ? '👁️' : '🙈'}</button>
        <button class="edit-btn inline-edit-btn" title="Edit">✏️</button>
        <button class="delete-btn inline-delete-btn" title="Delete">🗑️</button>
      </td>
    `;
    
    tr.querySelector(".inline-toggle-visibility-btn").addEventListener("click", () => {
      p.visible = (p.visible !== false) ? false : true;
      localStorage.setItem("brakeProducts", JSON.stringify(products));
      loadProducts();
      showToast(p.visible ? "Product is now visible on the site!" : "Product hidden from the site!");
    });

    tr.querySelector(".inline-edit-btn").addEventListener("click", () => {
      openEditModal(p, (updated) => {
        const uIdx = products.findIndex(x => x.id === p.id);
        if (uIdx !== -1) {
          products[uIdx] = Object.assign(products[uIdx], updated);
          
          if (updated.newMotos) {
            if (!products[uIdx].groupId) {
               products[uIdx].groupId = "grp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
            }
            const compMotos = updated.newMotos.split(',').map(m => m.trim()).filter(Boolean);
            compMotos.forEach((moto, idx) => {
              const clone = JSON.parse(JSON.stringify(products[uIdx]));
              delete clone.newMotos; // clean up
              
              products.push({
                ...clone,
                id: Date.now() + Math.floor(Math.random() * 1000000) + idx,
                name: moto,
                motoModel: moto,
                visible: false
              });
            });
            delete products[uIdx].newMotos;
          }
          
          const currentGroupId = products[uIdx].groupId;
          
          if (currentGroupId) {
             products.forEach(other => {
               if (other.groupId === currentGroupId && other.id !== p.id) {
                 // Sync everything except name, id, seo, visible
                 other.price = updated.price;
                 other.brand = updated.brand;
                 other.image = updated.image;
                 other.gallery = updated.gallery;
                 other.stock = updated.stock;
                 other.stockCount = updated.stockCount;
               }
             });
          }
          
          localStorage.setItem("brakeProducts", JSON.stringify(products));
        }
        loadProducts();
        showToast("Product successfully saved!");
      });
    });
    
    tr.querySelector(".inline-delete-btn").addEventListener("click", () => {
      customConfirm(`Delete product "${p.name}"?`, (confirmed) => {
        if (confirmed) {
          products = products.filter(x => x.id !== p.id);
          localStorage.setItem("brakeProducts", JSON.stringify(products));
          loadProducts();
          showToast("Product deleted!");
        }
      });
    });
    
    tableBodyEl.appendChild(tr);
  });
}

// Add Product Dialog Form
if (openAddProductModalBtn) {
  openAddProductModalBtn.addEventListener("click", () => {
    addProductForm.reset();
    addImgPreview.src = "https://via.placeholder.com/60?text=+";
    if (addGallery) addGallery.value = "";
    if (addGalleryPreviews) addGalleryPreviews.innerHTML = "";
    
    if (userRole === "superadmin") {
      const addMfgWrapper = document.getElementById("addMfgWrapper");
      const addMfgSelect = document.getElementById("addManufacturer");
      if (addMfgWrapper && addMfgSelect) {
        addMfgWrapper.style.display = "flex";
        const allUsers = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
        const userMfgs = allUsers.filter(u => u.role === 'admin').map(u => u.manufacturer).filter(Boolean);
        const productMfgs = (products || []).map(p => p.manufacturer || "Garage1").filter(Boolean);
        const uniqueMfgs = [...new Set([...userMfgs, ...productMfgs, "Garage1"])];
        addMfgSelect.innerHTML = uniqueMfgs.map(m => `<option value="${m}">${m}</option>`).join('');
      }
    } else {
      const addMfgWrapper = document.getElementById("addMfgWrapper");
      if (addMfgWrapper) addMfgWrapper.style.display = "none";
    }
    
    addProductModal.style.display = "flex";
  });
}

if (cancelAddProductBtn) {
  cancelAddProductBtn.addEventListener("click", () => {
    addProductModal.style.display = "none";
  });
}

if (addImgPreview && addImgFile) {
  addImgPreview.addEventListener("click", () => addImgFile.click());
  addImgFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        addImgPreview.src = event.target.result;
        addImage.value = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });
}

// Helper to update add product modal gallery previews
function renderAddGalleryPreviews() {
  if (!addGalleryPreviews || !addGallery) return;
  const urls = addGallery.value.split('\n').map(s => s.trim()).filter(Boolean);
  addGalleryPreviews.innerHTML = urls.map((url, idx) => `
    <div style="position:relative; width:40px; height:40px; flex-shrink:0;">
      <img src="${url}" style="width:40px; height:40px; border-radius:4px; object-fit:cover; border:1px solid var(--color-border-strong);" />
      <span class="del-add-gallery-img" data-idx="${idx}" style="position:absolute; top:-4px; right:-4px; background:#ff1744; color:var(--color-text-bright); border-radius:50%; width:14px; height:14px; font-size:10px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; line-height:1;">×</span>
    </div>
  `).join('');
  
  addGalleryPreviews.querySelectorAll('.del-add-gallery-img').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const newUrls = urls.filter((_, i) => i !== idx);
      addGallery.value = newUrls.join('\n');
      renderAddGalleryPreviews();
    });
  });
}

if (addGalleryUploadBtn && addGalleryFiles) {
  addGalleryUploadBtn.addEventListener("click", () => addGalleryFiles.click());
  addGalleryFiles.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    let loadedCount = 0;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        const currentUrls = addGallery.value.split('\n').map(s => s.trim()).filter(Boolean);
        currentUrls.push(base64);
        addGallery.value = currentUrls.join('\n');
        loadedCount++;
        if (loadedCount === files.length) {
          renderAddGalleryPreviews();
        }
      };
      reader.readAsDataURL(file);
    });
  });
}

if (addGallery) {
  addGallery.addEventListener("input", renderAddGalleryPreviews);
}

// AI Button visual feedback
function aiButtonPulse(btn, success) {
  const origBg = btn.style.background;
  btn.style.background = success
    ? "linear-gradient(135deg, #00c853, #00e676)"
    : "linear-gradient(135deg, #ff5252, #ff1744)";
  btn.style.transform = "scale(1.05)";
  setTimeout(() => {
    btn.style.background = origBg;
    btn.style.transform = "scale(1)";
  }, 600);
}

const aiAddNameBtn = document.getElementById("aiAddNameBtn");
const aiAddBrandBtn = document.getElementById("aiAddBrandBtn");
const aiAddTitleBtn = document.getElementById("aiAddTitleBtn");
const aiAddDescBtn = document.getElementById("aiAddDescBtn");
const aiAddKeyBtn = document.getElementById("aiAddKeyBtn");
const addMotoModel = document.getElementById("addMotoModel");
const addMotoYears = document.getElementById("addMotoYears");

if (addName) {
  addName.addEventListener("input", () => {
    const name = addName.value.trim();
    if (name) {
      const brand = addBrand.value.trim() || detectBrand(name) || "BrakeDiscs";
      if (addSeoTitle) addSeoTitle.value = `Buy brake disc ${name} by ${brand} | Great price`;
      if (addSeoDesc) addSeoDesc.value = `High quality brake disc for motorcycle ${name} by ${brand}. Reliable braking, long service life. Order right now!`;
      if (addSeoKeywords) addSeoKeywords.value = `brake disc, ${brand}, ${name}, buy brakes`;
    }
  });
}

if (aiAddNameBtn) {
  aiAddNameBtn.addEventListener("click", () => {
    const raw = addName.value.trim();
    if (!raw) { alert("Please enter the product name first"); return; }
    const seoName = generateSeoName(raw);
    addName.value = seoName;
    aiButtonPulse(aiAddNameBtn, true);
    
    // Auto-detect brand, model, years
    const brand = detectBrand(raw);
    if (brand) addBrand.value = brand;

    const modelName = detectModelName(raw);
    if (modelName && addMotoModel) addMotoModel.value = modelName;

    const years = detectYears(raw);
    if (years && addMotoYears) addMotoYears.value = years;
    
    // Trigger SEO generation
    addName.dispatchEvent(new Event("input"));
  });
}

if (aiAddBrandBtn) {
  aiAddBrandBtn.addEventListener("click", () => {
    const name = addName.value.trim();
    if (!name) { alert("Please enter the product name first"); return; }
    const brand = detectBrand(name);
    if (brand) {
      addBrand.value = brand;
      aiButtonPulse(aiAddBrandBtn, true);
      
      const modelName = detectModelName(name);
      if (modelName && addMotoModel && !addMotoModel.value.trim()) {
        addMotoModel.value = modelName;
      }
      const years = detectYears(name);
      if (years && addMotoYears && !addMotoYears.value.trim()) {
        addMotoYears.value = years;
      }
      
      // Trigger SEO generation
      addName.dispatchEvent(new Event("input"));
    } else {
      aiButtonPulse(aiAddBrandBtn, false);
      alert("Could not detect brand. Try entering the full motorcycle model name.");
    }
  });
}

if (aiAddTitleBtn) {
  aiAddTitleBtn.addEventListener("click", () => {
    const name = addName.value.trim() || "Brake disc";
    const brand = addBrand.value.trim() || "Unknown brand";
    addSeoTitle.value = `Buy ${name} by ${brand} | Best price and quality`;
    aiButtonPulse(aiAddTitleBtn, true);
  });
}

if (aiAddDescBtn) {
  aiAddDescBtn.addEventListener("click", () => {
    const name = addName.value.trim() || "Brake disc";
    const brand = addBrand.value.trim() || "Unknown brand";
    addSeoDesc.value = `Looking where to buy ${name}? Original disc by ${brand} will provide your motorcycle with reliable braking and a long service life. Order now with delivery!`;
    aiButtonPulse(aiAddDescBtn, true);
  });
}

if (aiAddKeyBtn) {
  aiAddKeyBtn.addEventListener("click", () => {
    const name = addName.value.trim() || "Brake disc";
    const brand = addBrand.value.trim() || "Unknown brand";
    addSeoKeywords.value = `brake disc, ${brand}, ${name}, motorcycle parts, buy brakes, reliable discs`;
    aiButtonPulse(aiAddKeyBtn, true);
  });
}

if (addProductForm) {
  addProductForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = addName.value.trim();
    const brand = addBrand.value.trim() || "BrakeDiscs";
    const price = parseFloat(addPrice.value) || 0.00;
    const img = addImage.value.trim() || addImgPreview.src;
    const stock = addStock.checked;
    const stockQty = parseInt(document.getElementById("addStockQty").value) || 0;
    const gallery = addGallery ? addGallery.value.split('\n').map(s => s.trim()).filter(Boolean) : [];
    const compMotoStr = document.getElementById("addCompatibleMoto") ? document.getElementById("addCompatibleMoto").value.trim() : "";
    const compMotos = compMotoStr.split(',').map(m => m.trim()).filter(Boolean);
    const groupId = "grp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    
    let resolvedMfg = manufacturerName || "Garage1";
    if (userRole === "superadmin") {
      const addMfgSelect = document.getElementById("addManufacturer");
      if (addMfgSelect && addMfgSelect.value) {
        resolvedMfg = addMfgSelect.value;
      }
    }

    let masterMoto = "";
    const dlaIdx = name.toLowerCase().lastIndexOf(" for ");
    if (dlaIdx !== -1) { 
      masterMoto = name.substring(dlaIdx + 5).trim();
    }
    const explicitMoto = document.getElementById("addMotoModel") ? document.getElementById("addMotoModel").value.trim() : "";
    const finalMoto = explicitMoto || masterMoto;

    const newProduct = {
      id: Date.now(),
      groupId: groupId,
      name,
      slug: generateSlug(name),
      motoModel: finalMoto,
      brand,
      price,
      image: img,
      stock,
      stockCount: stockQty,
      gallery,
      manufacturer: resolvedMfg,
      visible: false, // Default invisible!
      seo: {
        title: addSeoTitle.value.trim() || name,
        description: addSeoDesc.value.trim() || `Brake disc ${name} of high quality.`,
        keywords: addSeoKeywords.value.trim() || `${name}, brake disc`
      }
    };
    
    products.push(newProduct);
    
    compMotos.forEach((moto, idx) => {
      products.push({
        ...JSON.parse(JSON.stringify(newProduct)),
        id: Date.now() + Math.floor(Math.random() * 1000000) + idx,
        name: moto,
        motoModel: moto,
        slug: generateSlug(moto),
        visible: false
      });
    });

    localStorage.setItem("brakeProducts", JSON.stringify(products));
    loadProducts();
    addProductModal.style.display = "none";
    showToast("Product added to warehouse (hidden from site by default)!");
  });
}

// "Add another product" click handler (keeps modal open, resets fields)
const addAndContinueBtn = document.getElementById("addAndContinueBtn");
if (addAndContinueBtn) {
  addAndContinueBtn.addEventListener("click", () => {
    if (!addProductForm.checkValidity()) {
      addProductForm.reportValidity();
      return;
    }
    const name = addName.value.trim();
    const brand = addBrand.value.trim() || "BrakeDiscs";
    const price = parseFloat(addPrice.value) || 0.00;
    const img = addImage.value.trim() || addImgPreview.src;
    const stock = addStock.checked;
    const stockQty = parseInt(document.getElementById("addStockQty").value) || 0;
    const gallery = addGallery ? addGallery.value.split('\n').map(s => s.trim()).filter(Boolean) : [];
    const compMotoStr = document.getElementById("addCompatibleMoto") ? document.getElementById("addCompatibleMoto").value.trim() : "";
    const compMotos = compMotoStr.split(',').map(m => m.trim()).filter(Boolean);
    const groupId = "grp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    
    let resolvedMfg = manufacturerName || "Garage1";
    if (userRole === "superadmin") {
      const addMfgSelect = document.getElementById("addManufacturer");
      if (addMfgSelect && addMfgSelect.value) {
        resolvedMfg = addMfgSelect.value;
      }
    }

    let masterMoto = "";
    const dlaIdx = name.toLowerCase().lastIndexOf(" for ");
    if (dlaIdx !== -1) { 
      masterMoto = name.substring(dlaIdx + 5).trim();
    }
    const explicitMoto = document.getElementById("addMotoModel") ? document.getElementById("addMotoModel").value.trim() : "";
    const finalMoto = explicitMoto || masterMoto;

    const newProduct = {
      id: Date.now(),
      groupId: groupId,
      name,
      motoModel: finalMoto,
      brand,
      price,
      image: img,
      stock,
      stockCount: stockQty,
      gallery,
      manufacturer: resolvedMfg,
      visible: false, // Default invisible!
      seo: {
        title: addSeoTitle.value.trim() || name,
        description: addSeoDesc.value.trim() || `Brake disc ${name} of high quality.`,
        keywords: addSeoKeywords.value.trim() || `${name}, brake disc`
      }
    };
    
    products.push(newProduct);
    
    compMotos.forEach((moto, idx) => {
      products.push({
        ...JSON.parse(JSON.stringify(newProduct)),
        id: Date.now() + Math.floor(Math.random() * 1000000) + idx,
        name: moto,
        motoModel: moto,
        visible: false
      });
    });

    localStorage.setItem("brakeProducts", JSON.stringify(products));
    loadProducts();
    showToast("Product added to warehouse! Fill out the next card.");
    
    // Clear and reset form fields for next item
    addProductForm.reset();
    addImgPreview.src = "https://via.placeholder.com/60?text=+";
    if (addGallery) addGallery.value = "";
    if (addGalleryPreviews) addGalleryPreviews.innerHTML = "";
  });
}

// "Preview" (Preview Card) click handler
const previewAddProductBtn = document.getElementById("previewAddProductBtn");
const productPreviewModal = document.getElementById("productPreviewModal");
const previewCardContainer = document.getElementById("previewCardContainer");
const closePreviewBtn = document.getElementById("closePreviewBtn");

if (previewAddProductBtn && productPreviewModal && previewCardContainer) {
  previewAddProductBtn.addEventListener("click", () => {
    const name = addName.value.trim() || "Example brake disc";
    const brand = addBrand.value.trim() || "Category / Brand";
    const price = parseFloat(addPrice.value) || 0.00;
    const img = addImage.value.trim() || addImgPreview.src;
    const stock = addStock.checked;
    
    const activeMfg = getActiveManufacturer();
    const resolvedMfg = activeMfg === "all" ? "Garage1" : activeMfg;

    const stockText = stock ? "In stock" : "On order";
    const stockClass = stock ? "stock-yes" : "stock-no";

    previewCardContainer.innerHTML = `
      <div class="product-card" style="margin:0 auto; background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow); width:100%;">
        <img src="${img}" alt="${name}" style="width:100%; height:200px; object-fit:cover;" />
        <div class="product-info" style="padding:1.2rem;">
          <div class="product-brand" style="font-size:0.75rem; text-transform:uppercase; color:var(--color-primary-start); font-weight:bold; letter-spacing:1px;">${brand}</div>
          <h3 class="product-title" style="font-size:1.15rem; font-weight:600; color:var(--color-text-bright); margin:0.4rem 0 0.3rem 0; line-height:1.4;">${name}</h3>
          <div style="font-size:0.75rem; color:var(--color-muted); font-weight:600; margin-top:2px;">🏭 ${resolvedMfg}</div>
          <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.5rem;">
            <span class="product-stock ${stockClass}" style="font-size:0.75rem; padding:0.2rem 0.5rem; border-radius:4px; font-weight:bold;">${stockText}</span>
          </div>
          <div class="product-price" style="font-size:1.4rem; font-weight:bold; color:var(--color-primary-start); margin-top:0.8rem;">$${price.toFixed(2)}</div>
        </div>
        <button class="add-to-cart-btn" style="width:100%; padding:0.9rem; background:linear-gradient(135deg, var(--color-primary-start), var(--color-primary-end)); color:#fff; border:none; font-weight:bold; cursor:default;">Buy</button>
      </div>
    `;
    productPreviewModal.style.display = "flex";
  });
}

if (closePreviewBtn && productPreviewModal) {
  closePreviewBtn.addEventListener("click", () => {
    productPreviewModal.style.display = "none";
  });
}

// Tab switcher
const showAiAnalyticsBtn = document.getElementById("showAiAnalyticsBtn");
const aiAnalyticsTab = document.getElementById("aiAnalyticsTab");
const showArticlesBtn = document.getElementById("showArticlesBtn");
const articlesTab = document.getElementById("articlesTab");

function switchTab(tab) {
  if(productsTab) productsTab.style.display = tab === "products" ? "block" : "none";
  if(questionsTab) questionsTab.style.display = tab === "questions" ? "block" : "none";
  if(ordersTab) ordersTab.style.display = tab === "orders" ? "block" : "none";
  
  if(aiAnalyticsTab) aiAnalyticsTab.style.display = tab === "aiAnalytics" ? "block" : "none";
  if(mfgInfoTab) mfgInfoTab.style.display = tab === "mfgInfo" ? "block" : "none";
  if(producersTab) producersTab.style.display = tab === "producers" ? "block" : "none";
  if(settingsTab) settingsTab.style.display = tab === "settings" ? "block" : "none";
  if(articlesTab) articlesTab.style.display = tab === "articles" ? "block" : "none";
  if(accountingTab) accountingTab.style.display = tab === "accounting" ? "block" : "none";
  
  // Highlight active buttons
  const buttons = [showProductsBtn, showQuestionsBtn, showOrdersBtn, showAiAnalyticsBtn, showMfgInfoBtn, showProducersBtn, showSettingsBtn, showArticlesBtn, showOverallEstimateBtnSidebar];
  buttons.forEach(b => {
    if (b) b.classList.remove("active");
  });
  
  if (tab === "products" && showProductsBtn) showProductsBtn.classList.add("active");
  if (tab === "questions" && showQuestionsBtn) showQuestionsBtn.classList.add("active");
  if (tab === "orders" && showOrdersBtn) showOrdersBtn.classList.add("active");
  if (tab === "aiAnalytics" && showAiAnalyticsBtn) showAiAnalyticsBtn.classList.add("active");
  if (tab === "mfgInfo" && showMfgInfoBtn) showMfgInfoBtn.classList.add("active");
  if (tab === "producers" && showProducersBtn) showProducersBtn.classList.add("active");
  if (tab === "settings" && showSettingsBtn) showSettingsBtn.classList.add("active");
  if (tab === "articles" && showArticlesBtn) showArticlesBtn.classList.add("active");
  if (tab === "accounting" && showOverallEstimateBtnSidebar) showOverallEstimateBtnSidebar.classList.add("active");
  
  if (tab === "questions") renderQuestions();
  if (tab === "orders") renderOrders();
  if (tab === "aiAnalytics") renderAiAnalytics();
  if (tab === "mfgInfo") loadMfgInfo();
  if (tab === "producers") loadProducers();
  if (tab === "articles") renderArticlesList();
  if (tab === "accounting") renderAccounting();
}

if (showProductsBtn) showProductsBtn.addEventListener("click", () => switchTab("products"));
if (showQuestionsBtn) showQuestionsBtn.addEventListener("click", () => switchTab("questions"));
if (showOrdersBtn) showOrdersBtn.addEventListener("click", () => switchTab("orders"));
if (showOverallEstimateBtnSidebar) {
  showOverallEstimateBtnSidebar.addEventListener("click", () => {
    switchTab("accounting");
  });
}
if (showAiAnalyticsBtn) showAiAnalyticsBtn.addEventListener("click", () => switchTab("aiAnalytics"));
if (showMfgInfoBtn) showMfgInfoBtn.addEventListener("click", () => switchTab("mfgInfo"));
if (showProducersBtn) showProducersBtn.addEventListener("click", () => switchTab("producers"));
if (showSettingsBtn) showSettingsBtn.addEventListener("click", () => switchTab("settings"));
if (showArticlesBtn) showArticlesBtn.addEventListener("click", () => switchTab("articles"));

// --- Point 7: Support Chats & File Previews ---
let currentActiveUser = null;
let currentActiveMfg = null;

function renderQuestions() {
  if (!dialogsListEl) return;
  fetch('/api/chat', {credentials: 'include'})
    .then(r => r.json())
    .then(allMsgs => {
      const activeMfg = getActiveManufacturer();
  
  const filteredMsgs = allMsgs.filter(m => {
    const mMfg = m.manufacturer || "Garage1";
    if (activeMfg === "all") return true;
    return mMfg === activeMfg;
  });
  
  const usersMap = {};
  filteredMsgs.forEach(m => {
    const mMfg = m.manufacturer || "Garage1";
    const key = `${m.username} ↔ ${mMfg}`;
    if (!usersMap[key]) {
      usersMap[key] = { key, username: m.username, manufacturer: mMfg, msgs: [], unread: 0 };
    }
    usersMap[key].msgs.push(m);
    if (!m.readByAdmin && m.sender === 'user') {
      usersMap[key].unread++;
    }
  });
  
  const dialogKeys = Object.keys(usersMap);
  if (dialogKeys.length === 0) {
    dialogsListEl.innerHTML = `<div style="padding:1rem; color:var(--color-muted); text-align:center;">No dialogs</div>`;
    adminChatContainer.style.visibility = 'hidden';
    return;
  }
  
  dialogsListEl.innerHTML = dialogKeys.map(k => {
    const userObj = usersMap[k];
    const unreadBadge = userObj.unread > 0 ? `<span style="background:#ff5252; color:#fff; border-radius:50%; padding:0.1rem 0.5rem; font-size:0.8rem;">${userObj.unread}</span>` : '';
    const isActive = (userObj.username === currentActiveUser && userObj.manufacturer === currentActiveMfg) ? 'background:var(--color-input-bg);' : '';
    const lastMsg = userObj.msgs[userObj.msgs.length - 1];
    const snippet = lastMsg.text.length > 25 ? lastMsg.text.substring(0, 25) + '...' : lastMsg.text;
    const time = new Date(lastMsg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    return `
      <div class="dialog-item" data-user="${userObj.username}" data-mfg="${userObj.manufacturer}" style="padding:1rem; border-bottom:1px solid var(--color-border); cursor:pointer; display:flex; flex-direction:column; gap:0.4rem; transition:background 0.2s; ${isActive}">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            👤 <strong>${userObj.username}</strong>
            <span style="background:rgba(255,255,255,0.1); color:var(--color-text-bright); font-size:0.75rem; padding:0.15rem 0.4rem; border-radius:4px; margin-left:0.5rem; border:1px solid var(--color-border);">🏭 ${userObj.manufacturer}</span>
          </div>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span style="font-size:0.8rem; color:var(--color-muted);">${time}</span>
            ${unreadBadge}
          </div>
        </div>
        <div style="font-size:0.85rem; color:var(--color-muted);">${lastMsg.sender === 'admin' ? 'You: ' : ''}${snippet}</div>
      </div>
    `;
  }).join("");
  
  document.querySelectorAll('.dialog-item').forEach(item => {
    item.addEventListener('click', () => {
      currentActiveUser = item.dataset.user;
      currentActiveMfg = item.dataset.mfg;
      renderAdminChat();
    });
  });
  
  if (currentActiveUser && currentActiveMfg) {
    renderAdminChat(allMsgs);
  }
  }).catch(console.error);
}

// Chat File attachment selection
if (adminChatFile) {
  adminChatFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File size exceeds 2MB limit!");
        adminChatFile.value = "";
        return;
      }
      const r = new FileReader();
      r.onload = (event) => {
        adminAttachedFile = {
          data: event.target.result,
          name: file.name,
          type: file.type
        };
        showToast(`File attached: ${file.name}`);
      };
      r.readAsDataURL(file);
    } else {
      adminAttachedFile = null;
    }
  });
}

function renderAdminChat(allMsgs) {
  if (!currentActiveUser || !currentActiveMfg) return;
  adminChatContainer.style.visibility = 'visible';
  activeChatUser.innerHTML = `👤 <strong>${currentActiveUser}</strong> <span style="font-size:0.85rem; color:var(--color-muted); margin-left:0.5rem;">dialog with 🏭 ${currentActiveMfg}</span>`;
  
  const proceedRender = (msgs) => {
    const userMsgs = msgs.filter(m => {
      const mMfg = m.manufacturer || "Garage1";
      return m.username === currentActiveUser && mMfg === currentActiveMfg;
    });
    
    adminChatMessages.innerHTML = userMsgs.map(m => {
      let fileHtml = "";
      if (m.file && typeof m.file === 'string' && m.file.startsWith('data:')) {
        const safeFile = DOMPurify.sanitize(m.file, { ALLOWED_ATTR: ['href', 'src', 'download'] });
        const safeName = DOMPurify.sanitize(m.fileName || 'file');
        if (m.fileType && m.fileType.startsWith("image/")) {
          fileHtml = `<div style="margin-top:0.5rem;"><img src="${m.file}" alt="preview" style="max-height:150px; border-radius:var(--radius); border:1px solid var(--color-border); display:block;" /></div>`;
        } else {
          fileHtml = `<div style="margin-top:0.5rem;"><a href="${m.file}" download="${safeName}" style="color:#00b0ff; text-decoration:underline; font-size:0.85rem; display:inline-flex; align-items:center; gap:0.3rem;">📎 ${safeName}</a></div>`;
        }
      }

      const safeText = DOMPurify.sanitize(m.text);
      return `
        <div style="max-width:75%; padding:0.8rem 1.2rem; border-radius:18px; font-size:0.95rem; line-height:1.4; 
                    ${m.sender === 'admin' ? 'align-self:flex-end; background:var(--color-primary-start); color:#fff; border-bottom-right-radius:4px;' 
                                           : 'align-self:flex-start; background:var(--color-border); color:var(--color-text-bright); border-bottom-left-radius:4px;'}">
          <div>${safeText}</div>
          ${fileHtml}
          <div style="font-size:0.75rem; color:var(--color-muted); margin-top:0.4rem; text-align:right;">
            ${new Date(m.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
        </div>
      `;
    }).join("");
    
    adminChatMessages.scrollTop = adminChatMessages.scrollHeight;
  };

  fetch('/api/chat/read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ targetUser: currentActiveUser, manufacturer: currentActiveMfg })
  }).then(() => {
    if (allMsgs) {
      proceedRender(allMsgs);
    } else {
      fetch('/api/chat', {credentials: 'include'}).then(r => r.json()).then(msgs => {
        proceedRender(msgs);
      });
    }
  }).catch(console.error);
}

if (adminChatForm) {
  adminChatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!currentActiveUser || !currentActiveMfg) return;
    const text = adminChatInput.value.trim();
    if (!text && !adminAttachedFile) return;
    
    const payload = {
      text: text,
      targetUser: currentActiveUser,
      manufacturer: currentActiveMfg,
      file: adminAttachedFile ? adminAttachedFile.data : null,
      fileName: adminAttachedFile ? adminAttachedFile.name : null,
      fileType: adminAttachedFile ? adminAttachedFile.type : null
    };
    
    fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    }).then(r => r.json()).then(res => {
      if (res.success) {
        adminChatInput.value = "";
        if (adminChatFile) adminChatFile.value = "";
        adminAttachedFile = null;
        renderAdminChat();
        renderQuestions();
      } else {
        showToast(res.error || "Failed to send message");
      }
    });
  });
}

// --- Orders System & Custom Columns Delete ---
let customCols = JSON.parse(localStorage.getItem("brakeOrderCols") || "[]");
if (customCols && customCols.length > 0) {
  let hasRussian = false;
  const colTranslations = {
    "Трек-номер": "Tracking Number",
    "Телефон": "Phone",
    "Адрес": "Address",
    "Комментарий": "Comment",
    "Статус": "Status",
    "Сумма": "Total",
    "Дата": "Date",
    "Клиент": "Customer"
  };
  customCols = customCols.map(c => {
    if (colTranslations[c.name]) {
      hasRussian = true;
      return { ...c, name: colTranslations[c.name] };
    } else if (/[а-яА-ЯёЁ]/.test(c.name)) {
      hasRussian = true;
      return { ...c, name: c.name.replace(/[а-яА-ЯёЁ]+/g, "Info") };
    }
    return c;
  });
  if (hasRussian) {
    localStorage.setItem("brakeOrderCols", JSON.stringify(customCols));
  }
}
const ordersTableHeader = document.getElementById("ordersTableHeader");
const ordersTableBody = document.getElementById("ordersTableBody");

const clientInfoModal = document.getElementById('clientInfoModal');
const clientModalName = document.getElementById('clientModalName');
const clientModalId = document.getElementById('clientModalId');
const clientDetails = document.getElementById('clientDetails');
const closeClientModal = document.getElementById('closeClientModal');

const orderDetailsModal = document.getElementById('orderDetailsModal');
const orderModalId = document.getElementById('orderModalId');
const orderModalStatus = document.getElementById('orderModalStatus');
const orderDetailsContent = document.getElementById('orderDetailsContent');
const closeOrderModal = document.getElementById('closeOrderModal');

if (closeClientModal) {
  closeClientModal.addEventListener('click', () => { clientInfoModal.style.display = 'none'; });
}
if (closeOrderModal) {
  closeOrderModal.addEventListener('click', () => { orderDetailsModal.style.display = 'none'; });
}

// Direct Chat With Client Initiator
const chatWithClientBtn = document.getElementById("chatWithClientBtn");
if(chatWithClientBtn) {
  chatWithClientBtn.addEventListener("click", () => {
    const clientUsername = clientModalName.dataset.username || clientModalName.textContent.trim();
    clientInfoModal.style.display = 'none';
    switchTab("questions");
    currentActiveUser = clientUsername;
    const activeMfg = getActiveManufacturer();
    currentActiveMfg = activeMfg === "all" ? "Administration (Superuser)" : activeMfg;
    renderQuestions();
  });
}

const statusColorsMap = {
  "paid": "#ffb300",
  "processing": "#1e88e5",
  "shipped": "#43a047",
  "delivered": "#00e676",
  "cancelled": "#ff5252"
};

function openOrderDetails(orderId) {
  const orders = JSON.parse(localStorage.getItem("brakeOrders") || "[]");
  const clients = JSON.parse(localStorage.getItem("brakeClients") || "[]");
  const activeMfg = getActiveManufacturer();
  
  const o = orders.find(x => x.id == orderId);
  if (!o) return;
  
  const cl = clients.find(c => c.id === o.customerId) || o.customer || {};
  const statusLabels = { paid: "Paid", processing: "Processing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };
  const statusColor = statusColorsMap[o.status] || '#555';
  
  orderModalId.textContent = `Order #${o.id}`;
  orderModalStatus.textContent = statusLabels[o.status] || o.status;
  orderModalStatus.style.background = statusColor;
  
  const viewableItems = o.items.filter(item => {
    if (activeMfg === "all") return true;
    const p = products.find(prod => prod.id == item.id);
    const pMfg = p ? (p.manufacturer || "Garage1") : "Garage1";
    return pMfg === activeMfg;
  });
  
  let itemsHtml = viewableItems.map(item => `
    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--color-input-bg); padding:0.8rem; border-radius:var(--radius); border:1px solid var(--color-border);">
      <div>
        <div style="font-weight:bold; color:var(--color-text-bright);">${item.name}</div>
        <div style="font-size:0.8rem; color:var(--color-muted);">Quantity: ${item.qty}</div>
      </div>
      <div style="font-weight:bold; color:var(--color-primary-start);">$${((item.price || 0) * item.qty).toFixed(2)}</div>
    </div>
  `).join("");
  
  let localTotal = o.total;
  if (activeMfg !== "all") {
    const mfgTotal = viewableItems.reduce((sum, it) => sum + ((it.price || 0) * it.qty), 0);
    localTotal = `$${mfgTotal.toFixed(2)} (total ${o.total})`;
  }
  
  let trackingHtml = `
    <div style="margin-top:0.5rem; background:rgba(0,176,255,0.06); border:1px solid rgba(0,176,255,0.2); padding:0.8rem; border-radius:var(--radius);">
      🚚 <strong>Delivery Service:</strong> <input type="text" value="${o.shippingCarrier || ''}" class="order-carrier-edit" data-id="${o.id}" placeholder="e.g. DHL, FedEx, USPS" style="width:120px; padding:0.2rem 0.4rem; background:var(--color-input-bg); color:var(--color-text-bright); border:1px solid var(--color-border); border-radius:4px;" />
      <strong style="margin-left:0.5rem;">Tracking Number:</strong> <input type="text" value="${o.trackingNumber || ''}" class="order-track-edit" data-id="${o.id}" placeholder="Enter tracking..." style="width:140px; padding:0.2rem 0.4rem; background:var(--color-input-bg); color:var(--color-text-bright); border:1px solid var(--color-border); border-radius:4px;" />
    </div>
  `;
  
  orderDetailsContent.innerHTML = `
    <div>
      <h4 style="margin:0 0 0.5rem; color:var(--color-muted); font-size:0.85rem; text-transform:uppercase;">Customer info</h4>
      <div style="line-height:1.6; background:var(--color-input-bg); padding:1rem; border-radius:var(--radius); border:1px solid var(--color-border);">
        <div><strong>Name:</strong> ${cl.name}</div>
        <div><strong>Phone:</strong> ${cl.phone || '—'}</div>
        <div><strong>Email:</strong> ${cl.email || '—'}</div>
        <div><strong>Address:</strong> ${cl.address || '—'}</div>
      </div>
    </div>
    <div>
      <h4 style="margin:0 0 0.5rem; color:var(--color-muted); font-size:0.85rem; text-transform:uppercase;">Products</h4>
      <div style="display:flex; flex-direction:column; gap:0.5rem;">
        ${itemsHtml || '<div style="color:var(--color-muted);">No products (manual order)</div>'}
      </div>
    </div>
    ${trackingHtml}
    <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--color-border); padding-top:1rem; margin-top:0.5rem;">
      <span style="font-weight:bold; font-size:1.1rem; color:var(--color-text-bright);">Total payable:</span>
      <span style="font-weight:bold; font-size:1.4rem; color:var(--color-primary-start);">${localTotal}</span>
    </div>
    <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1rem;">
      <button type="button" class="print-invoice-btn" data-id="${o.id}" style="padding:0.5rem 1rem; background:linear-gradient(135deg, #00b0ff, #0091ea); color:#fff; border:none; border-radius:var(--radius); cursor:pointer; font-weight:bold; font-size:0.85rem; display:flex; align-items:center; gap:0.4rem;">🖨️ Print Invoice</button>
    </div>
  `;
  
  // Event listeners for tracking updates
  const trackInp = orderDetailsContent.querySelector(".order-track-edit");
  const carrierInp = orderDetailsContent.querySelector(".order-carrier-edit");
  
  if(trackInp) {
    trackInp.addEventListener("change", (e) => {
      o.trackingNumber = e.target.value.trim();
      localStorage.setItem("brakeOrders", JSON.stringify(orders));
      showToast("Tracking Number saved!");
    });
  }
  if(carrierInp) {
    carrierInp.addEventListener("change", (e) => {
      o.shippingCarrier = e.target.value.trim();
      localStorage.setItem("brakeOrders", JSON.stringify(orders));
      showToast("Delivery Service saved!");
    });
  }
  
  // Print Invoice handler
  const printBtn = orderDetailsContent.querySelector(".print-invoice-btn");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      const statusLabelsP = { paid: "Paid", processing: "Processing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };
      const itemsTableRows = viewableItems.map(item => `
        <tr>
          <td style="padding:8px; border:1px solid #ddd;">${item.name}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:center;">${item.qty}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:right;">$${((item.price || 0)).toFixed(2)}</td>
          <td style="padding:8px; border:1px solid #ddd; text-align:right;">$${((item.price || 0) * item.qty).toFixed(2)}</td>
        </tr>
      `).join("");
      
      const invoiceHtml = `
        <html><head><title>Invoice #${o.id.toString().slice(-4)}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 3px solid #1a1f35; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #1a1f35; }
          .invoice-title { font-size: 28px; color: #1a1f35; text-align: right; }
          .invoice-num { font-size: 14px; color: #666; }
          .section { margin-bottom: 20px; }
          .section h3 { font-size: 14px; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1a1f35; color:var(--color-text-bright); padding: 10px 8px; text-align: left; font-size: 13px; }
          td { padding: 8px; border: 1px solid #ddd; font-size: 13px; }
          .total-row { font-weight: bold; font-size: 16px; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; color:var(--color-text-bright); background: ${statusColorsMap[o.status] || '#666'}; }
          .footer { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 15px; font-size: 12px; color: #999; text-align: center; }
          @media print { body { padding: 20px; } }
        </style></head><body>
        <div class="header">
          <div>
            <div class="logo">Brake Discs Store</div>
            <div style="font-size:12px; color:#666; margin-top:4px;">Premium motorcycle brake discs</div>
          </div>
          <div style="text-align:right;">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-num">#${o.id.toString().slice(-4)} | ${new Date(o.date).toLocaleDateString()}</div>
            <div style="margin-top:8px;"><span class="status-badge">${statusLabelsP[o.status] || o.status}</span></div>
          </div>
        </div>
        
        <div class="section">
          <h3>Bill To</h3>
          <div><strong>${cl.name}</strong></div>
          <div>${cl.email || ''}</div>
          <div>${cl.phone || ''}</div>
          <div>${cl.address || ''}</div>
        </div>
        
        <div class="section">
          <h3>Order Items</h3>
          <table>
            <thead><tr><th>Product</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Unit Price</th><th style="text-align:right;">Total</th></tr></thead>
            <tbody>${itemsTableRows}</tbody>
          </table>
        </div>
        
        <div style="text-align:right; margin-top:20px;">
          <div class="total-row">Total: ${localTotal}</div>
        </div>
        
        ${o.trackingNumber ? '<div class="section" style="margin-top:20px;"><h3>Shipping</h3><div>Carrier: ' + (o.shippingCarrier || 'N/A') + ' | Tracking: ' + o.trackingNumber + '</div></div>' : ''}
        
        <div class="footer">
          Thank you for your purchase! | Brake Discs Store | Generated ${new Date().toLocaleDateString()}
        </div>
        </body></html>
      `;
      
      const printWin = window.open("", "_blank", "width=800,height=600");
      printWin.document.write(invoiceHtml);
      printWin.document.close();
      setTimeout(() => { printWin.print(); }, 300);
    });
  }
  
  orderDetailsModal.style.display = 'flex';
}
window.openOrderDetails = openOrderDetails;

function renderOrders() {
  const orders = JSON.parse(localStorage.getItem("brakeOrders") || "[]");
  const clients = JSON.parse(localStorage.getItem("brakeClients") || "[]");
  const activeMfg = getActiveManufacturer();
  
  if (!ordersTableBody) return;
  ordersTableBody.innerHTML = "";
  
  // Custom columns table header + point 14 delete custom columns button
  const isSuper = userRole === "superadmin";
  const customThs = customCols.map(c => `
    <th>
      ${c.name} 
      <button class="del-col-btn" data-col="${c.id}" style="background:none; border:none; color:#ff5252; cursor:pointer; font-size:0.85rem; padding:0; margin-left:0.2rem;" title="Delete column">🗑️</button>
    </th>
  `).join("");
  
  ordersTableHeader.innerHTML = `
    <th>№</th>
    <th>Date</th>
    <th>Product</th>
    ${isSuper ? '<th>Manufacturer</th>' : ''}
    <th>Customer</th>
    <th>Address</th>
    <th>Contact</th>
    <th>Comment</th>
    <th>Total</th>
    <th>Status</th>
    ${customThs}
    <th>Action</th>
  `;

  // Attach delete column listeners
  document.querySelectorAll(".del-col-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const colId = btn.dataset.col;
      customCols = customCols.filter(c => c.id !== colId);
      localStorage.setItem("brakeOrderCols", JSON.stringify(customCols));
      renderOrders();
      showToast("Column deleted!");
    });
  });

  const filteredOrders = orders.filter(o => {
    if (activeMfg === "all") return true;
    return o.items.some(item => {
      const p = products.find(prod => prod.id == item.id);
      const pMfg = p ? (p.manufacturer || "Garage1") : "Garage1";
      return pMfg === activeMfg;
    });
  });

  if (filteredOrders.length === 0) {
    ordersTableBody.innerHTML = `<tr><td colspan="${11 + (isSuper ? 1 : 0) + customCols.length}" style="text-align:center;">No orders</td></tr>`;
    return;
  }
  
  const statusColors = {
    "paid": "#ffb300",
    "processing": "#1e88e5",
    "shipped": "#43a047",
    "delivered": "#00e676",
    "cancelled": "#ff5252"
  };
  
  filteredOrders.forEach(o => {
    const tr = document.createElement("tr");
    
    const mfgItems = o.items.filter(item => {
      if (activeMfg === "all") return true;
      const p = products.find(prod => prod.id == item.id);
      const pMfg = p ? (p.manufacturer || "Garage1") : "Garage1";
      return pMfg === activeMfg;
    });
    
    const productInfo = (mfgItems && mfgItems.length) ? mfgItems.map(it => `${it.name} x${it.qty}`).join(', ') : "—";
    
    let displayTotal = o.total;
    if (activeMfg !== "all") {
      const subtotal = mfgItems.reduce((sum, it) => sum + ((it.price || 0) * it.qty), 0);
      displayTotal = `$${subtotal.toFixed(2)} (total ${o.total})`;
    }
    
    const client = clients.find(c => c.id === o.customerId) || o.customer || {};
    const clientName = client.name || "—";
    const clientAddress = client.address || "—";
    
    let mfgCell = "";
    if (isSuper) {
      const orderMfgs = new Set(o.items.map(item => {
        const p = products.find(prod => prod.id == item.id);
        return p ? (p.manufacturer || "Garage1") : "Garage1";
      }));
      mfgCell = `<td style="font-weight:bold; color:var(--color-primary-start); font-size:0.85rem;">🏭 ${Array.from(orderMfgs).join(", ")}</td>`;
    }

    const customTds = customCols.map(c => {
      const val = (o.customData && o.customData[c.id]) ? o.customData[c.id] : "";
      return `<td><input type="text" class="custom-col-input" data-order="${o.id}" data-col="${c.id}" value="${val}" style="width:100px; padding:0.4rem; background:transparent; border:1px dashed #444; color:var(--color-text-bright); border-radius:4px;" placeholder="Enter..."/></td>`;
    }).join("");
    
    tr.innerHTML = `
      <td>#${o.id.toString().slice(-4)}</td>
      <td>${new Date(o.date).toLocaleDateString()}</td>
      <td>${productInfo}</td>
      ${isSuper ? mfgCell : ''}
      <td class="client-cell" data-id="${client.id || o.customerId}" data-username="${o.username || 'guest'}" style="cursor:pointer; color:var(--color-primary-start); text-decoration:underline;">
        ${clientName}
      </td>
      <td style="font-size:0.85rem;">${clientAddress}</td>
      <td>${o.preferredContact ? (o.preferredContact + (o.contactValue ? ': ' + o.contactValue : '')) : '—'}</td>
      <td style="font-size:0.85rem; max-width:150px; overflow:hidden; text-overflow:ellipsis;">${o.comment || '—'}</td>
      <td style="font-weight:bold;">${displayTotal}</td>
      <td>
        <select class="status-select" data-id="${o.id}" style="padding:0.4rem; background:var(--color-bg); color:${statusColors[o.status] || '#fff'}; border:1px solid var(--color-muted); border-radius:4px;">
          <option value="paid" ${o.status === "paid" ? "selected" : ""}>Paid</option>
          <option value="processing" ${o.status === "processing" ? "selected" : ""}>Processing</option>
          <option value="shipped" ${o.status === "shipped" ? "selected" : ""}>Shipped</option>
          <option value="delivered" ${o.status === "delivered" ? "selected" : ""}>Delivered</option>
          <option value="cancelled" ${o.status === "cancelled" ? "selected" : ""}>Cancelled</option>
        </select>
      </td>
      ${customTds}
      <td>
        <div style="display:flex; gap:0.3rem; align-items:center;">
          <button class="edit-btn view-order-btn" data-id="${o.id}" title="Details">👁️</button>
          <button class="edit-btn estimate-order-btn" data-id="${o.id}" title="Accounting Estimate" style="color:#00e676;">📊</button>
          <button class="edit-btn delete-order-btn" data-id="${o.id}" title="Delete order" style="color:#ff5252;">🗑️</button>
        </div>
      </td>
    `;
    ordersTableBody.appendChild(tr);
  });
  
  // Status changes
  document.querySelectorAll(".status-select").forEach(sel => {
    sel.addEventListener("change", (e) => {
      const orderId = e.target.dataset.id;
      const newStatus = e.target.value;
      const idx = orders.findIndex(x => x.id == orderId);
      if (idx !== -1) {
        const prevStatus = orders[idx].status;
        orders[idx].status = newStatus;
        
        // Automatically generate default tracking and shippingCarrier when shipped
        if (newStatus === "shipped" && !orders[idx].trackingNumber) {
          orders[idx].trackingNumber = "TRK-" + Math.floor(Math.random() * 900000 + 100000);
          orders[idx].shippingCarrier = "CDEK / DHL";
        }
        
        localStorage.setItem("brakeOrders", JSON.stringify(orders));
        
        // Automatically sync order status to manufacturer bookkeeping
        const updatedOrder = orders[idx];
        const mfgsSet = new Set(updatedOrder.items.map(item => {
          const p = products.find(prod => prod.id == item.id);
          return p ? (p.manufacturer || "Garage1") : "Garage1";
        }));
        
        mfgsSet.forEach(mfg => {
          if (newStatus === "cancelled") {
            unpostOrderFromAccounting(orderId, mfg);
          } else {
            postOrderToAccounting(updatedOrder, mfg);
          }
        });
        
        // Send status change notification to user via support chat
        const statusLabels = { paid: "Paid", processing: "Processing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };
        const orderUsername = orders[idx].username || "guest";
        if (orderUsername && orderUsername !== "guest" && orderUsername !== "admin_manual") {
          const messages = JSON.parse(localStorage.getItem("brakeMessages") || "[]");
          let statusMsg = `📋 Order #${orderId.toString().slice(-4)} status updated: ${statusLabels[prevStatus] || prevStatus} → ${statusLabels[newStatus] || newStatus}.`;
          if (newStatus === "shipped") {
            statusMsg += ` 🚚 Tracking: ${orders[idx].trackingNumber || 'N/A'} via ${orders[idx].shippingCarrier || 'Post'}.`;
          }
          if (newStatus === "delivered") {
            statusMsg += ` ✅ Your order has been delivered. Thank you for your purchase!`;
          }
          if (newStatus === "cancelled") {
            statusMsg += ` ❌ Please contact support if you have questions about this cancellation.`;
          }
          messages.push({
            id: Date.now(),
            username: orderUsername,
            sender: "admin",
            text: statusMsg,
            date: new Date().toISOString(),
            readByAdmin: true,
            manufacturer: manufacturerName || "Administration (Superuser)"
          });
          localStorage.setItem("brakeMessages", JSON.stringify(messages));
        }
        
        renderOrders();
        showToast("Order status changed!");
      }
    });
  });
  
  // Delete order
  document.querySelectorAll(".delete-order-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const orderId = btn.dataset.id;
      customConfirm(`Are you sure you want to delete order #${orderId.toString().slice(-4)}?`, (yes) => {
        if (!yes) return;
        const idx = orders.findIndex(x => x.id == orderId);
        if (idx !== -1) {
          orders.splice(idx, 1);
          localStorage.setItem("brakeOrders", JSON.stringify(orders));
          renderOrders();
          showToast("Order deleted!");
        }
      });
    });
  });
  
  // Custom columns value changes
  document.querySelectorAll(".custom-col-input").forEach(inp => {
    inp.addEventListener("change", (e) => {
      const orderId = e.target.dataset.order;
      const colId = e.target.dataset.col;
      const val = e.target.value;
      
      const idx = orders.findIndex(x => x.id == orderId);
      if (idx !== -1) {
        if(!orders[idx].customData) orders[idx].customData = {};
        orders[idx].customData[colId] = val;
        localStorage.setItem("brakeOrders", JSON.stringify(orders));
      }
    });
  });
  
  // Detailed Popups
  document.querySelectorAll(".view-order-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      openOrderDetails(btn.dataset.id);
    });
  });

  // Estimate popups
  document.querySelectorAll(".estimate-order-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const orderId = btn.dataset.id;
      openOrderEstimateModal(orderId);
    });
  });
  
  // Client Detail card popup listener
  document.querySelectorAll('.client-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      const cid = Number(cell.dataset.id);
      const cUsername = cell.dataset.username || "guest";
      if (!cid) return;
      const cl = clients.find(c => c.id === cid) || orders.find(o => o.customerId === cid)?.customer;
      if (!cl) return;
      
      clientModalName.textContent = cl.name;
      clientModalName.dataset.username = cUsername; // Preserve client's username for direct dialogue
      clientModalId.textContent = `ID: ${cid}`;
      
      clientDetails.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:0.8rem; background:var(--color-input-bg); padding:1.2rem; border-radius:12px; border:1px solid var(--color-border);">
          <div>
            <span style="color:var(--color-muted); font-size:0.8rem;">Phone:</span>
            <div style="font-weight:600; font-size:0.95rem; color:var(--color-text-bright); margin-top:0.1rem;">${cl.phone || '—'}</div>
          </div>
          <div>
            <span style="color:var(--color-muted); font-size:0.8rem;">Email:</span>
            <div style="font-weight:600; font-size:0.95rem; color:var(--color-text-bright); margin-top:0.1rem;">${cl.email || '—'}</div>
          </div>
          <div>
            <span style="color:var(--color-muted); font-size:0.8rem;">Shipping Address:</span>
            <div style="font-weight:600; font-size:0.95rem; color:var(--color-text-bright); margin-top:0.1rem; line-height:1.4;">${cl.address || '—'}</div>
          </div>
          ${cl.preferredContact ? `
          <div>
            <span style="color:var(--color-muted); font-size:0.8rem;">Contact method:</span>
            <div style="font-weight:600; font-size:0.95rem; color:var(--color-primary-start); margin-top:0.1rem;">
              ${cl.preferredContact} ${cl.contactValue ? ': ' + cl.contactValue : ''}
            </div>
          </div>
          ` : ''}
        </div>
      `;
      clientInfoModal.style.display = 'flex';
    });
  });
}

// Manual Order submission modal forms
const addManualOrderBtn = document.getElementById("addManualOrderBtn");
const addOrderModal = document.getElementById("addOrderModal");
const cancelOrderBtn = document.getElementById("cancelOrderBtn");
const addOrderForm = document.getElementById("addOrderForm");
const dynamicOrderFields = document.getElementById("dynamicOrderFields");

if (addManualOrderBtn) {
  addManualOrderBtn.addEventListener("click", () => {
    const prodOptions = products.map(p => `<option value="${p.id}">${p.name} ($${p.price})</option>`).join('');
    
    let html = `
      <div><label style="font-size:0.85rem;color:var(--color-muted);">Customer name</label><input type="text" id="manualName" required style="width:100%; padding:0.8rem; border-radius:4px; border:1px solid var(--color-border); background:var(--color-bg); color:var(--color-text-bright); margin-top:0.3rem;" /></div>
      <div><label style="font-size:0.85rem;color:var(--color-muted);">Phone</label><input type="text" id="manualPhone" style="width:100%; padding:0.8rem; border-radius:4px; border:1px solid var(--color-border); background:var(--color-bg); color:var(--color-text-bright); margin-top:0.3rem;" /></div>
      <div><label style="font-size:0.85rem;color:var(--color-muted);">Email</label><input type="email" id="manualEmail" style="width:100%; padding:0.8rem; border-radius:4px; border:1px solid var(--color-border); background:var(--color-bg); color:var(--color-text-bright); margin-top:0.3rem;" /></div>
      <div><label style="font-size:0.85rem;color:var(--color-muted);">Shipping Address</label><input type="text" id="manualAddress" style="width:100%; padding:0.8rem; border-radius:4px; border:1px solid var(--color-border); background:var(--color-bg); color:var(--color-text-bright); margin-top:0.3rem;" /></div>
      <div><label style="font-size:0.85rem;color:var(--color-muted);">Order Total ($)</label><input type="number" step="0.01" id="manualTotal" required style="width:100%; padding:0.8rem; border-radius:4px; border:1px solid var(--color-border); background:var(--color-bg); color:var(--color-text-bright); margin-top:0.3rem;" /></div>
    `;
    
    const productSelect = document.getElementById("manualProductSelect");
    if(productSelect) productSelect.innerHTML = prodOptions;
    
    customCols.forEach(c => {
      html += `<div><label style="font-size:0.85rem;color:var(--color-muted);">${c.name}</label><input type="text" class="manual-custom-field" data-id="${c.id}" style="width:100%; padding:0.8rem; border-radius:4px; border:1px solid var(--color-border); background:var(--color-bg); color:var(--color-text-bright); margin-top:0.3rem;" /></div>`;
    });
    
    dynamicOrderFields.innerHTML = html;
    addOrderModal.style.display = "flex";
  });
}

if (cancelOrderBtn) {
  cancelOrderBtn.addEventListener("click", () => { addOrderModal.style.display = "none"; });
}

if (addOrderForm) {
  addOrderForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("manualName").value.trim();
    const phone = document.getElementById("manualPhone").value.trim();
    const email = document.getElementById("manualEmail").value.trim();
    const address = document.getElementById("manualAddress").value.trim();
    const totalRaw = document.getElementById("manualTotal").value.trim();
    const total = totalRaw ? `$${parseFloat(totalRaw).toFixed(2)}` : "$0.00";
    
    const prodSelect = document.getElementById("manualProductSelect");
    const prodId = Number(prodSelect.value);
    const selectedProd = products.find(p => p.id === prodId);
    
    const activeMfg = getActiveManufacturer();
    const resolvedMfg = activeMfg === "all" ? "Garage1" : activeMfg;
    
    const items = selectedProd ? [{ id: prodId, name: selectedProd.name, qty: 1, price: selectedProd.price, manufacturer: resolvedMfg }] : [];
    
    const clientId = Date.now();
    const client = { id: clientId, name, phone, email, address };
    const clients = JSON.parse(localStorage.getItem('brakeClients') || '[]');
    clients.push(client);
    localStorage.setItem('brakeClients', JSON.stringify(clients));
    
    const customData = {};
    document.querySelectorAll(".manual-custom-field").forEach(inp => {
      customData[inp.dataset.id] = inp.value.trim();
    });
    
    const orders = JSON.parse(localStorage.getItem("brakeOrders") || "[]");
    orders.push({
      id: Date.now(),
      date: new Date().toISOString(),
      username: "admin_manual",
      customerId: clientId,
      customer: { name, phone, email, address },
      items: items,
      total: total,
      status: "paid",
      customData: customData
    });
    localStorage.setItem("brakeOrders", JSON.stringify(orders));
    renderOrders();
    addOrderModal.style.display = "none";
    showToast("Manual order added successfully!");
  });
}

// Add Custom Columns Modal logic
const addOrderColBtn = document.getElementById("addOrderColBtn");
const addColModal = document.getElementById("addColModal");
const cancelColBtn = document.getElementById("cancelColBtn");
const addColForm = document.getElementById("addColForm");

if (addOrderColBtn) {
  addOrderColBtn.addEventListener("click", () => {
    document.getElementById("newColName").value = "";
    addColModal.style.display = "flex";
  });
}

if (cancelColBtn) {
  cancelColBtn.addEventListener("click", () => { addColModal.style.display = "none"; });
}

if (addColForm) {
  addColForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const colName = document.getElementById("newColName").value.trim();
    if (!colName) return;
    
    customCols.push({ id: 'col_' + Date.now(), name: colName });
    localStorage.setItem("brakeOrderCols", JSON.stringify(customCols));
    renderOrders();
    addColModal.style.display = "none";
    showToast("Column added!");
  });
}

// --- Manufacturer Info Profile Page ---
const mfgInfoForm = document.getElementById("mfgInfoForm");

function loadMfgInfo() {
  if (!mfgInfoForm) return;
  document.getElementById("mfgWorkshopName").value = manufacturerName || "Garage1";
  
  const key = `brakeMfgDetails_${manufacturerName || 'Garage1'}`;
  const info = JSON.parse(localStorage.getItem(key) || "{}");
  
  document.getElementById("mfgWorkload").value = info.workload || "Average (3-5 days)";
  document.getElementById("mfgDescription").value = info.description || "";
  document.getElementById("mfgPhone").value = info.phone || "";
  document.getElementById("mfgAddress").value = info.address || "";
  document.getElementById("mfgMaterials").value = info.materials || "";
}

if (mfgInfoForm) {
  mfgInfoForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const workload = document.getElementById("mfgWorkload").value;
    const description = document.getElementById("mfgDescription").value.trim();
    const phone = document.getElementById("mfgPhone").value.trim();
    const address = document.getElementById("mfgAddress").value.trim();
    const materials = document.getElementById("mfgMaterials").value.trim();
    
    const key = `brakeMfgDetails_${manufacturerName || 'Garage1'}`;
    localStorage.setItem(key, JSON.stringify({ workload, description, phone, address, materials }));
    showToast("Production profile successfully saved!");
  });
}

// --- Bookkeeping & Estimate System ---
const orderEstimateModal = document.getElementById("orderEstimateModal");
const closeOrderEstimateModal = document.getElementById("closeOrderEstimateModal");
const estimateOrderNum = document.getElementById("estimateOrderNum");
const estimateMfgName = document.getElementById("estimateMfgName");
const estimateItemsTableBody = document.getElementById("estimateItemsTableBody");
const estimateAddItemBtn = document.getElementById("estimateAddItemBtn");
const estimateSellingPrice = document.getElementById("estimateSellingPrice");
const estimateTotalProfit = document.getElementById("estimateTotalProfit");
const orderEstimateForm = document.getElementById("orderEstimateForm");
const estimateSaveTemplateBtn = document.getElementById("estimateSaveTemplateBtn");
const estimateLoadTemplateBtn = document.getElementById("estimateLoadTemplateBtn");
const estimateResetBtn = document.getElementById("estimateResetBtn");

const overallEstimateModal = document.getElementById("overallEstimateModal");
const closeOverallEstimateModal = document.getElementById("closeOverallEstimateModal");
const overallEstimateCloseBtn = document.getElementById("overallEstimateCloseBtn");
const overallTotalRevenue = document.getElementById("overallTotalRevenue");
const overallTotalExpenses = document.getElementById("overallTotalExpenses");
const overallTotalProfit = document.getElementById("overallTotalProfit");
const overallEstimateTableBody = document.getElementById("overallEstimateTableBody");
const showOverallEstimateBtn = document.getElementById("showOverallEstimateBtn");
const showOverallEstimateBtn2 = document.getElementById("showOverallEstimateBtn2");

let activeEstimateOrderId = null;
let activeEstimateMfg = "";
let currentEstimateItems = []; // Array of { name, value }

const DEFAULT_ESTIMATE_ITEMS = [
  { name: "Material costs", value: 0 },
  { name: "Laser cutting costs", value: 0 },
  { name: "Heat treatment costs", value: 0 },
  { name: "Transportation costs", value: 0 },
  { name: "Grinding costs", value: 0 },
  { name: "Turning works", value: 0 },
  { name: "Drawing/design costs", value: 0 },
  { name: "Equipment rental", value: 0 },
  { name: "Space rental", value: 0 },
  { name: "Shipping costs", value: 0 },
  { name: "Tax expenses", value: 0 },
  { name: "Shop fee", value: 0 }
];

function getOrderMfgSubtotal(order, mfg) {
  if (mfg === "all" || !mfg || mfg === "Administration (Superuser)") {
    return order.total ? Number(order.total.toString().replace(/[^0-9.]/g, '')) : 0;
  }
  const mfgItems = order.items.filter(item => {
    const p = products.find(prod => prod.id == item.id);
    const pMfg = p ? (p.manufacturer || "Garage1") : "Garage1";
    return pMfg === mfg;
  });
  return mfgItems.reduce((sum, it) => sum + ((it.price || 0) * it.qty), 0);
}

function openOrderEstimateModal(orderId) {
  const orders = JSON.parse(localStorage.getItem("brakeOrders") || "[]");
  const order = orders.find(o => o.id == orderId);
  if (!order) return;
  
  activeEstimateOrderId = orderId;
  
  let mfg = getActiveManufacturer();
  if (mfg === "all") {
    const firstItem = order.items[0];
    const p = firstItem ? products.find(prod => prod.id == firstItem.id) : null;
    mfg = p ? (p.manufacturer || "Garage1") : "Garage1";
  }
  activeEstimateMfg = mfg;
  
  estimateOrderNum.textContent = `#${order.id.toString().slice(-4)}`;
  estimateMfgName.textContent = mfg;
  
  const savedKey = `brakeOrderEstimate_${orderId}_${mfg}`;
  const savedEstimate = JSON.parse(localStorage.getItem(savedKey) || "null");
  
  if (savedEstimate) {
    currentEstimateItems = savedEstimate;
  } else {
    // Check new multi-template store for a "Default" template
    const multiStoreKey = `brakeMfgEstimateTemplates_${mfg}`;
    const multiStore = JSON.parse(localStorage.getItem(multiStoreKey) || "{}");
    // Also check legacy single-template key
    const legacyKey = `brakeMfgEstimateTemplate_${mfg}`;
    const legacyTemplate = JSON.parse(localStorage.getItem(legacyKey) || "null");
    
    if (multiStore["Default"]) {
      currentEstimateItems = JSON.parse(JSON.stringify(multiStore["Default"]));
    } else if (legacyTemplate) {
      currentEstimateItems = JSON.parse(JSON.stringify(legacyTemplate));
    } else {
      currentEstimateItems = JSON.parse(JSON.stringify(DEFAULT_ESTIMATE_ITEMS));
    }
  }
  
  const sellingPriceValue = getOrderMfgSubtotal(order, mfg);
  estimateSellingPrice.value = sellingPriceValue.toFixed(2);
  
  renderEstimateItems();
  populateTemplateDropdown();
  if (orderEstimateModal) orderEstimateModal.style.display = "flex";
}

function renderEstimateItems() {
  if (!estimateItemsTableBody) return;
  
  estimateItemsTableBody.innerHTML = "";
  currentEstimateItems.forEach((item, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <input type="text" class="estimate-item-name" data-index="${index}" value="${item.name}" style="width:100%; padding:0.4rem; background:transparent; border:1px solid var(--color-border); color:var(--color-text-bright); border-radius:4px; box-sizing:border-box;" />
      </td>
      <td>
        <input type="number" step="0.01" class="estimate-item-value" data-index="${index}" value="${item.value || 0}" style="width:100%; padding:0.4rem; background:transparent; border:1px solid var(--color-border); color:var(--color-text-bright); border-radius:4px; box-sizing:border-box;" />
      </td>
      <td style="text-align:center;">
        <button type="button" class="estimate-item-del-btn" data-index="${index}" style="background:none; border:none; color:#ff5252; cursor:pointer; font-size:1.1rem; padding:0;">🗑️</button>
      </td>
    `;
    
    tr.querySelector(".estimate-item-name").addEventListener("input", (e) => {
      currentEstimateItems[index].name = e.target.value;
    });
    
    tr.querySelector(".estimate-item-value").addEventListener("input", (e) => {
      currentEstimateItems[index].value = parseFloat(e.target.value) || 0;
      calculateEstimateTotals();
    });
    
    tr.querySelector(".estimate-item-del-btn").addEventListener("click", () => {
      currentEstimateItems.splice(index, 1);
      renderEstimateItems();
    });
    
    estimateItemsTableBody.appendChild(tr);
  });
  
  calculateEstimateTotals();
}

function calculateEstimateTotals() {
  const sellingPrice = parseFloat(estimateSellingPrice.value) || 0;
  const totalExpenses = currentEstimateItems.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
  const netProfit = sellingPrice - totalExpenses;
  
  estimateTotalProfit.value = `$${netProfit.toFixed(2)}`;
  if (netProfit >= 0) {
    estimateTotalProfit.style.color = "#00e676";
  } else {
    estimateTotalProfit.style.color = "#ff5252";
  }
}

if (closeOrderEstimateModal) {
  closeOrderEstimateModal.addEventListener("click", () => {
    if (orderEstimateModal) orderEstimateModal.style.display = "none";
  });
}

if (estimateAddItemBtn) {
  estimateAddItemBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    currentEstimateItems.push({ name: "Custom expense", value: 0 });
    renderEstimateItems();
    // Auto-scroll to bottom of items list
    const container = estimateItemsTableBody?.closest("div");
    if (container) setTimeout(() => container.scrollTop = container.scrollHeight, 50);
  });
}

if (estimateResetBtn) {
  estimateResetBtn.addEventListener("click", () => {
    if (confirm("Reset estimate to default items?")) {
      currentEstimateItems = JSON.parse(JSON.stringify(DEFAULT_ESTIMATE_ITEMS));
      renderEstimateItems();
    }
  });
}

// --- Multi-template system ---
const estimateTemplateSelect = document.getElementById("estimateTemplateSelect");
const estimateTemplateNameInput = document.getElementById("estimateTemplateNameInput");
const estimateDeleteTemplateBtn = document.getElementById("estimateDeleteTemplateBtn");

function getTemplatesStore(mfg) {
  const key = `brakeMfgEstimateTemplates_${mfg}`;
  return JSON.parse(localStorage.getItem(key) || "{}");
}

function saveTemplatesStore(mfg, store) {
  const key = `brakeMfgEstimateTemplates_${mfg}`;
  localStorage.setItem(key, JSON.stringify(store));
}

// Migrate old single-template format to new multi-template store
function migrateOldTemplate(mfg) {
  const oldKey = `brakeMfgEstimateTemplate_${mfg}`;
  const oldTemplate = JSON.parse(localStorage.getItem(oldKey) || "null");
  if (oldTemplate) {
    const store = getTemplatesStore(mfg);
    if (!store["Default"]) {
      store["Default"] = oldTemplate;
      saveTemplatesStore(mfg, store);
    }
    localStorage.removeItem(oldKey);
  }
}

function populateTemplateDropdown() {
  if (!estimateTemplateSelect || !activeEstimateMfg) return;
  migrateOldTemplate(activeEstimateMfg);
  const store = getTemplatesStore(activeEstimateMfg);
  const names = Object.keys(store).sort();

  estimateTemplateSelect.innerHTML = '<option value="">— Select Template —</option>';
  names.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    estimateTemplateSelect.appendChild(opt);
  });
}

if (estimateTemplateNameInput) {
  estimateTemplateNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (estimateSaveTemplateBtn) estimateSaveTemplateBtn.click();
    }
  });
}

if (estimateSaveTemplateBtn) {
  estimateSaveTemplateBtn.addEventListener("click", () => {
    if (!activeEstimateMfg) return;
    const nameInput = estimateTemplateNameInput;
    let name = nameInput ? nameInput.value.trim() : "";
    if (!name) {
      name = prompt("Enter a name for this template:");
      if (!name || !name.trim()) return;
      name = name.trim();
    }

    const store = getTemplatesStore(activeEstimateMfg);
    const exists = !!store[name];
    if (exists && !confirm(`Template "${name}" already exists. Overwrite?`)) return;

    store[name] = JSON.parse(JSON.stringify(currentEstimateItems));
    saveTemplatesStore(activeEstimateMfg, store);

    if (nameInput) nameInput.value = "";
    populateTemplateDropdown();
    if (estimateTemplateSelect) estimateTemplateSelect.value = name;
    showToast(`Template "${name}" saved for ${activeEstimateMfg}!`);
  });
}

if (estimateLoadTemplateBtn) {
  estimateLoadTemplateBtn.addEventListener("click", () => {
    if (!activeEstimateMfg || !estimateTemplateSelect) return;
    const name = estimateTemplateSelect.value;
    if (!name) {
      showToast("Select a template from the dropdown first.", false);
      return;
    }
    const store = getTemplatesStore(activeEstimateMfg);
    const template = store[name];
    if (template) {
      currentEstimateItems = JSON.parse(JSON.stringify(template));
      renderEstimateItems();
      showToast(`Template "${name}" loaded!`);
    } else {
      showToast("Template not found.", false);
    }
  });
}

if (estimateDeleteTemplateBtn) {
  estimateDeleteTemplateBtn.addEventListener("click", () => {
    if (!activeEstimateMfg || !estimateTemplateSelect) return;
    const name = estimateTemplateSelect.value;
    if (!name) {
      showToast("Select a template to delete.", false);
      return;
    }
    if (!confirm(`Delete template "${name}"?`)) return;
    const store = getTemplatesStore(activeEstimateMfg);
    delete store[name];
    saveTemplatesStore(activeEstimateMfg, store);
    populateTemplateDropdown();
    showToast(`Template "${name}" deleted.`);
  });
}

if (orderEstimateForm) {
  orderEstimateForm.addEventListener("keydown", (e) => {
    // Prevent Enter from submitting the form, unless focused on a button
    if (e.key === "Enter" && e.target.tagName !== "BUTTON") {
      e.preventDefault();
    }
  });

  orderEstimateForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!activeEstimateOrderId || !activeEstimateMfg) return;
    
    const savedKey = `brakeOrderEstimate_${activeEstimateOrderId}_${activeEstimateMfg}`;
    localStorage.setItem(savedKey, JSON.stringify(currentEstimateItems));
    
    const overallKey = `brakeOrderEstimateSummary_${activeEstimateOrderId}_${activeEstimateMfg}`;
    const sellingPrice = parseFloat(estimateSellingPrice.value) || 0;
    const totalExpenses = currentEstimateItems.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
    const netProfit = sellingPrice - totalExpenses;
    
    localStorage.setItem(overallKey, JSON.stringify({
      orderId: activeEstimateOrderId,
      mfg: activeEstimateMfg,
      sellingPrice,
      totalExpenses,
      netProfit,
      breakdown: currentEstimateItems
    }));
    
    const orders = JSON.parse(localStorage.getItem("brakeOrders") || "[]");
    const targetOrder = orders.find(o => o.id == activeEstimateOrderId);
    if (targetOrder) {
      postOrderToAccounting(targetOrder, activeEstimateMfg);
    }
    
    if (orderEstimateModal) orderEstimateModal.style.display = "none";
    showToast("Order estimate saved successfully!");
  });
}

function openOverallEstimateModal() {
  const orders = JSON.parse(localStorage.getItem("brakeOrders") || "[]");
  const activeMfg = getActiveManufacturer();
  
  let filteredOrders = orders.filter(o => {
    if (activeMfg === "all") return true;
    return o.items.some(item => {
      const p = products.find(prod => prod.id == item.id);
      const pMfg = p ? (p.manufacturer || "Garage1") : "Garage1";
      return pMfg === activeMfg;
    });
  });
  
  if (!overallEstimateTableBody) return;
  overallEstimateTableBody.innerHTML = "";
  
  let sumRevenue = 0;
  let sumExpenses = 0;
  let sumProfit = 0;
  
  filteredOrders.forEach(o => {
    let mfg = activeMfg;
    if (mfg === "all") {
      const firstItem = o.items[0];
      const p = firstItem ? products.find(prod => prod.id == firstItem.id) : null;
      mfg = p ? (p.manufacturer || "Garage1") : "Garage1";
    }
    
    const sellingPrice = getOrderMfgSubtotal(o, mfg);
    
    const summaryKey = `brakeOrderEstimateSummary_${o.id}_${mfg}`;
    let summary = JSON.parse(localStorage.getItem(summaryKey) || "null");
    
    if (!summary) {
      const templateKey = `brakeMfgEstimateTemplate_${mfg}`;
      const mfgTemplate = JSON.parse(localStorage.getItem(templateKey) || "null");
      const currentItems = mfgTemplate || DEFAULT_ESTIMATE_ITEMS;
      const totalExpenses = currentItems.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
      const netProfit = sellingPrice - totalExpenses;
      
      summary = {
        sellingPrice,
        totalExpenses,
        netProfit,
        breakdown: currentItems
      };
    }
    
    sumRevenue += summary.sellingPrice;
    sumExpenses += summary.totalExpenses;
    sumProfit += summary.netProfit;
    
    const breakdownText = summary.breakdown
      .filter(item => (item.value || 0) > 0)
      .map(item => `${item.name}: $${parseFloat(item.value).toFixed(2)}`)
      .join("<br/>") || '<span style="color:var(--color-muted);">No expenses</span>';
      
    const tr = document.createElement("tr");
    const productNames = (o.items || []).map(item => `${item.name} (x${item.qty})`).join("<br/>") || '<span style="color:var(--color-muted);">No products</span>';
    tr.innerHTML = `
      <td style="font-weight:bold; color:var(--color-text-bright);">
        <button class="recon-order-btn" data-id="${o.id}" style="background:none; border:none; color:var(--color-primary-start); cursor:pointer; text-decoration:underline; font-weight:bold; padding:0; font-size:inherit; font-family:inherit;">#${o.id.toString().slice(-4)}</button>
      </td>
      <td>${new Date(o.date).toLocaleDateString()}</td>
      <td style="color:var(--color-muted); font-size:0.85rem; max-width:200px; white-space:normal; word-break:break-word;">${productNames}</td>
      <td style="color:#00e676; font-weight:bold;">$${summary.sellingPrice.toFixed(2)}</td>
      <td style="color:#ff5252;">$${summary.totalExpenses.toFixed(2)}</td>
      <td style="font-weight:bold; color:${summary.netProfit >= 0 ? '#00e676' : '#ff5252'};">$${summary.netProfit.toFixed(2)}</td>
      <td style="font-size:0.8rem; line-height:1.4; color:var(--color-muted);">${breakdownText}</td>
    `;
    overallEstimateTableBody.appendChild(tr);
  });
  
  // Attach click listeners to view details of reconciliation orders
  overallEstimateTableBody.querySelectorAll(".recon-order-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      openOrderDetails(btn.dataset.id);
    });
  });
  
  overallTotalRevenue.textContent = `$${sumRevenue.toFixed(2)}`;
  overallTotalExpenses.textContent = `$${sumExpenses.toFixed(2)}`;
  overallTotalProfit.textContent = `$${sumProfit.toFixed(2)}`;
  overallTotalProfit.style.color = sumProfit >= 0 ? "#00e676" : "#ff5252";
  
  if (overallEstimateModal) overallEstimateModal.style.display = "flex";
}

if (closeOverallEstimateModal) {
  closeOverallEstimateModal.addEventListener("click", () => {
    if (overallEstimateModal) overallEstimateModal.style.display = "none";
  });
}

if (overallEstimateCloseBtn) {
  overallEstimateCloseBtn.addEventListener("click", () => {
    if (overallEstimateModal) overallEstimateModal.style.display = "none";
  });
}

if (showOverallEstimateBtn) {
  showOverallEstimateBtn.addEventListener("click", openOverallEstimateModal);
}

if (showOverallEstimateBtn2) {
  showOverallEstimateBtn2.addEventListener("click", openOverallEstimateModal);
}

// --- Point 15: Superuser Producer/User Register & Site Settings ---
const producersTableBody = document.getElementById("producersTableBody");
const usersTableBody = document.getElementById("usersTableBody");
const openAddProducerModalBtn = document.getElementById("openAddProducerModalBtn");
const openAddUserModalBtn = document.getElementById("openAddUserModalBtn");
const addProducerModal = document.getElementById("addProducerModal");
const addUserModal = document.getElementById("addUserModal");
const addProducerForm = document.getElementById("addProducerForm");
const addUserForm = document.getElementById("addUserForm");
const closeProducerModal = document.getElementById("closeProducerModal");
const closeUserModal = document.getElementById("closeUserModal");

const subTabProducersBtn = document.getElementById("subTabProducersBtn");
const subTabUsersBtn = document.getElementById("subTabUsersBtn");
const subTabProducersContent = document.getElementById("subTabProducersContent");
const subTabUsersContent = document.getElementById("subTabUsersContent");

if (subTabProducersBtn && subTabUsersBtn) {
  subTabProducersBtn.addEventListener("click", () => {
    subTabProducersBtn.style.background = "var(--color-primary-start)";
    subTabProducersBtn.style.color = "#fff";
    subTabUsersBtn.style.background = "#222";
    subTabUsersBtn.style.color = "#aaa";
    if (subTabProducersContent) subTabProducersContent.style.display = "block";
    if (subTabUsersContent) subTabUsersContent.style.display = "none";
  });

  subTabUsersBtn.addEventListener("click", () => {
    subTabUsersBtn.style.background = "#7c3aed";
    subTabUsersBtn.style.color = "#fff";
    subTabProducersBtn.style.background = "#222";
    subTabProducersBtn.style.color = "#aaa";
    if (subTabProducersContent) subTabProducersContent.style.display = "none";
    if (subTabUsersContent) subTabUsersContent.style.display = "block";
  });
}

const editUserModal = document.getElementById("editUserModal");
const editUserForm = document.getElementById("editUserForm");
const editUserOriginalUsername = document.getElementById("editUserOriginalUsername");
const editUserUsernameInput = document.getElementById("editUserUsername");
const editUserPasswordInput = document.getElementById("editUserPassword");
const editUserMfgContainer = document.getElementById("editUserMfgContainer");
const editUserMfgNameInput = document.getElementById("editUserMfgName");
const closeEditUserModal = document.getElementById("closeEditUserModal");

function loadProducers() {
  const allUsers = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
  
  if (producersTableBody) {
    const producers = allUsers.filter(u => u.role === 'admin');
    producersTableBody.innerHTML = producers.map(p => {
      const isBlocked = p.blocked || false;
      const blockBtnText = isBlocked ? "🔓 Unblock" : "🔒 Block";
      const blockBtnColor = isBlocked ? "#4caf50" : "#ff9800";
      const blockBadge = isBlocked ? ` <span style="background:#ff3d00; color:var(--color-text-bright); font-size:0.75rem; padding:0.1rem 0.3rem; border-radius:3px; margin-left:0.5rem;">BLOCKED</span>` : '';
      
      return `
        <tr>
          <td style="font-weight:bold; color:var(--color-text-bright);">👤 ${p.username}${blockBadge}</td>
          <td>🏭 ${p.manufacturer}</td>
          <td><code>${p.password}</code></td>
          <td><span class="stock-badge in-stock" style="background:#2e7d32; color:var(--color-text-bright);">PRODUCER</span></td>
          <td>
            <div style="display:flex; gap:0.5rem;">
              <button class="brand-btn edit-account-btn" data-username="${p.username}" style="padding:0.3rem 0.6rem; font-size:0.8rem; background:#00b0ff; border:none; color:#fff; cursor:pointer;">Edit</button>
              <button class="brand-btn block-account-btn" data-username="${p.username}" data-blocked="${isBlocked}" style="padding:0.3rem 0.6rem; font-size:0.8rem; background:${blockBtnColor}; border:none; color:var(--color-text-bright); cursor:pointer;">${blockBtnText}</button>
              <button class="brand-btn delete-account-btn" data-username="${p.username}" style="padding:0.3rem 0.6rem; font-size:0.8rem; background:#ff5252; border:none; color:#fff; cursor:pointer;">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
  
  if (usersTableBody) {
    const clients = allUsers.filter(u => u.role === 'user' || !u.role);
    usersTableBody.innerHTML = clients.map(u => {
      const isBlocked = u.blocked || false;
      const blockBtnText = isBlocked ? "🔓 Unblock" : "🔒 Block";
      const blockBtnColor = isBlocked ? "#4caf50" : "#ff9800";
      const blockBadge = isBlocked ? ` <span style="background:#ff3d00; color:var(--color-text-bright); font-size:0.75rem; padding:0.1rem 0.3rem; border-radius:3px; margin-left:0.5rem;">BLOCKED</span>` : '';
      
      return `
        <tr>
          <td style="font-weight:bold; color:var(--color-text-bright);">👤 ${u.username}${blockBadge}</td>
          <td><code>${u.password}</code></td>
          <td><span class="stock-badge in-stock" style="background:#7c3aed; color:var(--color-text-bright);">CLIENT</span></td>
          <td>
            <div style="display:flex; gap:0.5rem;">
              <button class="brand-btn edit-account-btn" data-username="${u.username}" style="padding:0.3rem 0.6rem; font-size:0.8rem; background:#00b0ff; border:none; color:#fff; cursor:pointer;">Edit</button>
              <button class="brand-btn block-account-btn" data-username="${u.username}" data-blocked="${isBlocked}" style="padding:0.3rem 0.6rem; font-size:0.8rem; background:${blockBtnColor}; border:none; color:var(--color-text-bright); cursor:pointer;">${blockBtnText}</button>
              <button class="brand-btn delete-account-btn" data-username="${u.username}" style="padding:0.3rem 0.6rem; font-size:0.8rem; background:#ff5252; border:none; color:#fff; cursor:pointer;">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
  
  attachAccountActionListeners();
}

function attachAccountActionListeners() {
  document.querySelectorAll(".edit-account-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const username = btn.dataset.username;
      openEditAccountModal(username);
    });
  });
  
  document.querySelectorAll(".block-account-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const username = btn.dataset.username;
      const isBlocked = btn.dataset.blocked === "true";
      toggleBlockAccount(username, isBlocked);
    });
  });
  
  document.querySelectorAll(".delete-account-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const username = btn.dataset.username;
      deleteAccount(username);
    });
  });
}

function openEditAccountModal(username) {
  const allUsers = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
  const user = allUsers.find(u => u.username === username);
  if (!user) return;
  
  editUserOriginalUsername.value = username;
  editUserUsernameInput.value = user.username;
  editUserPasswordInput.value = user.password;
  
  if (user.role === 'admin') {
    editUserMfgContainer.style.display = "flex";
    editUserMfgNameInput.value = user.manufacturer || "";
    editUserMfgNameInput.required = true;
  } else {
    editUserMfgContainer.style.display = "none";
    editUserMfgNameInput.value = "";
    editUserMfgNameInput.required = false;
  }
  
  if (editUserModal) editUserModal.style.display = "flex";
}

if (closeEditUserModal) {
  closeEditUserModal.addEventListener("click", () => {
    if (editUserModal) editUserModal.style.display = "none";
  });
}

function toggleBlockAccount(username, currentBlocked) {
  const currentUser = JSON.parse(localStorage.getItem("brakeUser") || "{}");
  if (username === currentUser.username) {
    alert("You cannot block your own administrator account!");
    return;
  }
  
  const allUsers = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
  const user = allUsers.find(u => u.username === username);
  if (!user) return;
  
  if (user.role === 'superadmin') {
    alert("You cannot block a superadmin account!");
    return;
  }
  
  user.blocked = !currentBlocked;
  localStorage.setItem("brakeUsers", JSON.stringify(allUsers));
  
  loadProducers();
  showToast(`Account for ${username} has been successfully ${user.blocked ? 'blocked' : 'unblocked'}!`);
}

function deleteAccount(username) {
  const currentUser = JSON.parse(localStorage.getItem("brakeUser") || "{}");
  if (username === currentUser.username) {
    alert("You cannot delete your own administrator account!");
    return;
  }
  
  const allUsers = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
  const userIndex = allUsers.findIndex(u => u.username === username);
  if (userIndex === -1) return;
  
  const user = allUsers[userIndex];
  if (user.role === 'superadmin') {
    alert("You cannot delete a superadmin account!");
    return;
  }
  
  if (!confirm(`Are you sure you want to permanently delete the account for "${username}"? This action cannot be undone.`)) {
    return;
  }
  
  allUsers.splice(userIndex, 1);
  localStorage.setItem("brakeUsers", JSON.stringify(allUsers));
  
  loadProducers();
  showToast(`Account for ${username} has been deleted.`);
}

if (editUserForm) {
  editUserForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const originalUsername = editUserOriginalUsername.value;
    const newUsername = editUserUsernameInput.value.trim().toLowerCase();
    const newPassword = editUserPasswordInput.value.trim();
    const newMfgName = editUserMfgNameInput.value.trim();
    
    if (!newUsername || !newPassword) return;
    
    const allUsers = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
    
    if (newUsername !== originalUsername) {
      const exists = allUsers.find(u => u.username === newUsername);
      if (exists) {
        alert("A user with this login name already exists!");
        return;
      }
    }
    
    const user = allUsers.find(u => u.username === originalUsername);
    if (!user) return;
    
    user.username = newUsername;
    user.password = newPassword;
    if (user.role === 'admin') {
      user.manufacturer = newMfgName;
    }
    
    localStorage.setItem("brakeUsers", JSON.stringify(allUsers));
    
    const currentUser = JSON.parse(localStorage.getItem("brakeUser") || "{}");
    if (originalUsername === currentUser.username) {
      localStorage.setItem("brakeUser", JSON.stringify(user));
      location.reload();
      return;
    }
    
    loadProducers();
    if (editUserModal) editUserModal.style.display = "none";
    showToast("Account successfully updated!");
  });
}

if (openAddProducerModalBtn) {
  openAddProducerModalBtn.addEventListener("click", () => {
    addProducerForm.reset();
    addProducerModal.style.display = "flex";
  });
}

if (closeProducerModal) {
  closeProducerModal.addEventListener("click", () => {
    addProducerModal.style.display = "none";
  });
}

if (openAddUserModalBtn) {
  openAddUserModalBtn.addEventListener("click", () => {
    addUserForm.reset();
    addUserModal.style.display = "flex";
  });
}

if (closeUserModal) {
  closeUserModal.addEventListener("click", () => {
    addUserModal.style.display = "none";
  });
}

if (addProducerForm) {
  addProducerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("prodUsername").value.trim().toLowerCase();
    const password = document.getElementById("prodPassword").value.trim();
    const mfgName = document.getElementById("prodMfgName").value.trim();
    
    if(!username || !password || !mfgName) return;
    
    const allUsers = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
    const exists = allUsers.find(u => u.username === username);
    
    if (exists) {
      alert("User with this name already exists!");
      return;
    }
    
    allUsers.push({ username, password, role: 'admin', manufacturer: mfgName });
    localStorage.setItem("brakeUsers", JSON.stringify(allUsers));
    
    loadProducers();
    addProducerModal.style.display = "none";
    showToast("New manufacturer successfully added!");
  });
}

if (addUserForm) {
  addUserForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("userRegUsername").value.trim().toLowerCase();
    const password = document.getElementById("userRegPassword").value.trim();
    
    if(!username || !password) return;
    
    const allUsers = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
    const exists = allUsers.find(u => u.username === username);
    
    if (exists) {
      alert("User with this name already exists!");
      return;
    }
    
    allUsers.push({ username, password, role: 'user', manufacturer: '' });
    localStorage.setItem("brakeUsers", JSON.stringify(allUsers));
    
    loadProducers();
    addUserModal.style.display = "none";
    showToast("New client user successfully added!");
  });
}



// Superuser Site Articles and foot Settings saving
// Superuser Site Articles and foot Settings saving
const siteSettingsForm = document.getElementById("siteSettingsForm");
function loadSiteSettings() {
  if (!siteSettingsForm) return;
  const settings = JSON.parse(localStorage.getItem("brakeSiteSettings") || "{}");
  
  // Load General Settings
  const safeGet = (id, val) => { const el = document.getElementById(id); if (el) { if (el.type === 'checkbox') el.checked = val; else el.value = val || ""; } };
  
  safeGet("setPlatformName", settings.platformName || "Brake Discs Store");
  safeGet("setContactEmail", settings.contactEmail || "support@brakediscs.com");
  safeGet("setContactPhone", settings.contactPhone || "+1 234 567 8900");
  safeGet("setMaintenanceMode", settings.maintenanceMode || false);
  
  // Commission Settings
  safeGet("setCommissionEnabled", settings.commissionEnabled ?? false);
  safeGet("setCommissionPercent", settings.commissionPercent ?? 5.0);
  safeGet("setCommissionPeriod", settings.commissionPeriod || "monthly");
  
  // SEO & Social Settings
  safeGet("setMetaDescription", settings.metaDescription || "");
  safeGet("setSocialTelegram", settings.socialTelegram || "");
  safeGet("setSocialWhatsApp", settings.socialWhatsApp || "");
  safeGet("setSocialInstagram", settings.socialInstagram || "");

}

if (siteSettingsForm) {
  siteSettingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const safeVal = (id) => { const el = document.getElementById(id); return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : undefined; };
    
    localStorage.setItem("brakeSiteSettings", JSON.stringify({ 
      platformName: safeVal("setPlatformName"),
      contactEmail: safeVal("setContactEmail"),
      contactPhone: safeVal("setContactPhone"),
      maintenanceMode: safeVal("setMaintenanceMode"),
      commissionEnabled: safeVal("setCommissionEnabled"),
      commissionPercent: parseFloat(safeVal("setCommissionPercent")) || 0,
      commissionPeriod: safeVal("setCommissionPeriod"),
      metaDescription: safeVal("setMetaDescription"),
      socialTelegram: safeVal("setSocialTelegram"),
      socialWhatsApp: safeVal("setSocialWhatsApp"),
      socialInstagram: safeVal("setSocialInstagram")
    }));
    showToast("Site settings successfully saved!");
  });
}

function initUserMenu() {
  const userMenuBtn = document.getElementById("userMenuBtn");
  const userDropdown = document.getElementById("userDropdown");
  const userMenuText = document.getElementById("userMenuText");
  const userInfo = document.getElementById("userInfo");
  const logoutBtn = document.getElementById("logoutBtn");
  
  const navArticles = document.getElementById("navArticles");
  const navUsers = document.getElementById("navUsers");
  const navSettings = document.getElementById("navSettings");
  const accountNav = document.getElementById("accountNav");
  const adminNav = document.getElementById("adminNav");

  if (!userMenuBtn || !userDropdown) return;

  // Set hello username text
  if (currentUser && currentUser.username) {
    if (userMenuText) userMenuText.textContent = currentUser.username;
    if (userInfo) {
      userInfo.textContent = `Hello, ${currentUser.username}`;
      userInfo.style.display = "block";
    }
  }

  // Toggle dropdown
  userMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isDisp = userDropdown.style.display === "flex";
    userDropdown.style.display = isDisp ? "none" : "flex";
  });

  // Hide dropdown on click outside
  document.addEventListener("click", () => {
    userDropdown.style.display = "none";
  });

  // Logout button
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("brakeUser");
      localStorage.removeItem("brakeRole");
      window.location.href = "index.html";
    });
    logoutBtn.style.display = "block";
  }

  // Set menu visibility based on role
  if (userRole === "superadmin") {
    if (navArticles) navArticles.style.display = "block";
    if (navUsers) navUsers.style.display = "block";
    if (navSettings) navSettings.style.display = "block";
    if (accountNav) accountNav.style.display = "block";
    if (adminNav) adminNav.style.display = "block";
  } else if (userRole === "admin") {
    if (navArticles) navArticles.style.display = "block";
    if (accountNav) accountNav.style.display = "block";
    if (adminNav) adminNav.style.display = "block";
    if (navUsers) navUsers.style.display = "none";
    if (navSettings) navSettings.style.display = "none";
  }
}

// Initialise Admin dashboard
serverSyncReady.then(() => {
  if (userRole === "admin" || userRole === "superadmin") {
    try { initUserMenu(); } catch (e) { console.error("Failed to initialize user menu:", e); }
    try { initSuperadmin(); } catch (e) { console.error("Failed to initialize superadmin panel:", e); }
    try { initAccounting(showToast); } catch (e) { console.error("Failed to initialize accounting engine:", e); }
    loadProducts();
    
    const currentPath = window.location.pathname;
    let defaultTab = "products";
    if (currentPath.includes("articles.html")) defaultTab = "articles";
    else if (currentPath.includes("users.html")) defaultTab = "producers";
    else if (currentPath.includes("settings.html")) defaultTab = "settings";

    const urlParams = new URLSearchParams(window.location.search);
    const initialTab = urlParams.get("tab") || defaultTab;
    switchTab(initialTab);
  } else {
    window.location.href = "index.html";
  }
});

// --- Dynamic AI Analytics & Charts System ---
function renderAiAnalytics() {
  const salesChart = document.getElementById("analyticsSalesChart");
  const salesLegend = document.getElementById("analyticsSalesLegend");
  const stockChart = document.getElementById("analyticsStockChart");
  const stockLegend = document.getElementById("analyticsStockLegend");
  
  if (!salesChart || !stockChart) return;
  
  const orders = JSON.parse(localStorage.getItem("brakeOrders") || "[]");
  const activeMfg = getActiveManufacturer();
  
  // 1. Calculate Sales Revenue Grouping
  const revenueMap = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      const p = products.find(prod => prod.id == item.id);
      const pMfg = p ? (p.manufacturer || "Garage1") : "Garage1";
      
      // Filter if manufacturer is specified
      if (activeMfg !== "all" && pMfg !== activeMfg) return;
      
      const groupKey = activeMfg === "all" ? pMfg : (p ? (p.brand || "BrakeDiscs") : "BrakeDiscs");
      const rev = (item.price || 0) * item.qty;
      revenueMap[groupKey] = (revenueMap[groupKey] || 0) + rev;
    });
  });
  
  // Render Sales Flexbar Chart
  salesChart.innerHTML = "";
  salesLegend.innerHTML = "";
  const revenueKeys = Object.keys(revenueMap);
  const revenueValues = Object.values(revenueMap);
  
  if (revenueKeys.length === 0) {
    salesChart.innerHTML = `<div style="margin:auto; color:var(--color-muted); font-size:0.85rem;">No sales data</div>`;
  } else {
    const maxRevenue = Math.max(...revenueValues, 1);
    const colors = ["#ff5500", "#00b0ff", "#00e676", "#ffb300", "#d500f9", "#ff4081"];
    
    revenueKeys.forEach((key, i) => {
      const val = revenueMap[key];
      const percent = (val / maxRevenue) * 80 + 10; // min 10% height for visibility
      const color = colors[i % colors.length];
      
      // Create Bar Div
      const bar = document.createElement("div");
      bar.style.display = "flex";
      bar.style.flexDirection = "column";
      bar.style.alignItems = "center";
      bar.style.width = "40px";
      bar.style.height = `${percent}%`;
      bar.style.justifyContent = "flex-end";
      bar.style.position = "relative";
      bar.style.cursor = "pointer";
      bar.title = `${key}: $${val.toFixed(2)}`;
      
      bar.innerHTML = `
        <div style="font-size:0.75rem; font-weight:bold; color:var(--color-text-bright); margin-bottom:0.3rem;">$${Math.round(val)}</div>
        <div style="width:100%; flex:1; background:linear-gradient(to top, ${color} 0%, rgba(255,255,255,0.1) 100%); border-radius:4px 4px 0 0; border:1px solid ${color}; box-shadow:0 0 10px ${color}33;"></div>
      `;
      salesChart.appendChild(bar);
      
      // Create Legend Item
      const leg = document.createElement("div");
      leg.style.display = "flex";
      leg.style.alignItems = "center";
      leg.style.gap = "0.3rem";
      leg.innerHTML = `
        <span style="display:inline-block; width:10px; height:10px; background:${color}; border-radius:50%;"></span>
        <span>${key} ($${val.toFixed(2)})</span>
      `;
      salesLegend.appendChild(leg);
    });
  }
  
  // 2. Calculate Product Stock Grouping by Brand
  const stockMap = {};
  products.forEach(p => {
    const pMfg = p.manufacturer || "Garage1";
    if (activeMfg !== "all" && pMfg !== activeMfg) return;
    
    const brand = p.brand || "BrakeDiscs";
    // Count visible stock items
    stockMap[brand] = (stockMap[brand] || 0) + (p.stock ? 1 : 0);
  });
  
  // Render Stock Flexbar Chart
  stockChart.innerHTML = "";
  stockLegend.innerHTML = "";
  const stockKeys = Object.keys(stockMap);
  const stockValues = Object.values(stockMap);
  
  if (stockKeys.length === 0) {
    stockChart.innerHTML = `<div style="margin:auto; color:var(--color-muted); font-size:0.85rem;">No warehouse data</div>`;
  } else {
    const maxStock = Math.max(...stockValues, 1);
    const colors = ["#00e676", "#00b0ff", "#ffb300", "#ff5500", "#ff4081", "#d500f9"];
    
    stockKeys.forEach((key, i) => {
      const val = stockMap[key];
      const percent = (val / maxStock) * 80 + 10;
      const color = colors[i % colors.length];
      
      const bar = document.createElement("div");
      bar.style.display = "flex";
      bar.style.flexDirection = "column";
      bar.style.alignItems = "center";
      bar.style.width = "40px";
      bar.style.height = `${percent}%`;
      bar.style.justifyContent = "flex-end";
      bar.style.position = "relative";
      bar.style.cursor = "pointer";
      bar.title = `${key}: ${val} pcs`;
      
      bar.innerHTML = `
        <div style="font-size:0.75rem; font-weight:bold; color:var(--color-text-bright); margin-bottom:0.3rem;">${val} pcs</div>
        <div style="width:100%; flex:1; background:linear-gradient(to top, ${color} 0%, rgba(255,255,255,0.1) 100%); border-radius:4px 4px 0 0; border:1px solid ${color}; box-shadow:0 0 10px ${color}33;"></div>
      `;
      stockChart.appendChild(bar);
      
      const leg = document.createElement("div");
      leg.style.display = "flex";
      leg.style.alignItems = "center";
      leg.style.gap = "0.3rem";
      leg.innerHTML = `
        <span style="display:inline-block; width:10px; height:10px; background:${color}; border-radius:50%;"></span>
        <span>${key} (${val} units)</span>
      `;
      stockLegend.appendChild(leg);
    });
  }
}

// --- AI Analyst Chat Form Controller ---
const aiChatForm = document.getElementById("aiChatForm");
const aiChatInput = document.getElementById("aiChatInput");
const aiChatMessages = document.getElementById("aiChatMessages");

if (aiChatForm && aiChatInput && aiChatMessages) {
  aiChatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = aiChatInput.value.trim();
    if (!query) return;
    
    // 1. Render User Message Bubble
    const userMsg = document.createElement("div");
    userMsg.style.alignSelf = "flex-end";
    userMsg.style.background = "var(--color-primary-start)";
    userMsg.style.color = "#fff";
    userMsg.style.padding = "0.6rem 1rem";
    userMsg.style.borderRadius = "8px 8px 0 8px";
    userMsg.style.maxWidth = "80%";
    userMsg.textContent = query;
    
    aiChatMessages.appendChild(userMsg);
    aiChatInput.value = "";
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    
    // 2. Generate and Render Simulated AI Response Bubble
    setTimeout(() => {
      const orders = JSON.parse(localStorage.getItem("brakeOrders") || "[]");
      const activeMfg = getActiveManufacturer();
      
      // Calculate data metrics
      let totalSalesCount = 0;
      let totalRevenue = 0;
      const mfgRevMap = {};
      const brandStockMap = {};
      
      orders.forEach(o => {
        let orderSalesCount = 0;
        let orderRevenue = 0;
        
        o.items.forEach(item => {
          const p = products.find(prod => prod.id == item.id);
          const pMfg = p ? (p.manufacturer || "Garage1") : "Garage1";
          
          if (activeMfg !== "all" && pMfg !== activeMfg) return;
          
          const rev = (item.price || 0) * item.qty;
          orderRevenue += rev;
          orderSalesCount += item.qty;
          mfgRevMap[pMfg] = (mfgRevMap[pMfg] || 0) + rev;
        });
        
        if (orderSalesCount > 0) {
          totalSalesCount += orderSalesCount;
          totalRevenue += orderRevenue;
        }
      });
      
      let totalProductsCount = 0;
      let outOfStockCount = 0;
      let hiddenDraftsCount = 0;
      
      products.forEach(p => {
        const pMfg = p.manufacturer || "Garage1";
        if (activeMfg !== "all" && pMfg !== activeMfg) return;
        
        totalProductsCount++;
        if (!p.stock) outOfStockCount++;
        if (p.visible === false) hiddenDraftsCount++;
        
        const b = p.brand || "BrakeDiscs";
        brandStockMap[b] = (brandStockMap[b] || 0) + (p.stock ? 1 : 0);
      });
      
      let aiText = "";
      const lowerQuery = query.toLowerCase();
      
      if (lowerQuery.includes("total") || lowerQuery.includes("sales") || lowerQuery.includes("analysis")) {
        aiText = `### 📈 Total sales and warehouse analysis<br/>
Here are the aggregated metrics of your store:
* **Total sales:** ${totalSalesCount} pcs discs.
* **Total revenue received:** $${totalRevenue.toFixed(2)}
* **Total products in catalog:** ${totalProductsCount} items.
* **In deficit (on order):** ${outOfStockCount} items.
* **Hidden (drafts):** ${hiddenDraftsCount} items.

**AI Recommendation:** Pay attention to ${outOfStockCount} items with status "On order". Promptly replenishing these stocks will increase your conversion by 15-20%.`;
      } 
      else if (lowerQuery.includes("lead") || lowerQuery.includes("prod") || lowerQuery.includes("master")) {
        let winner = "—";
        let maxRev = -1;
        let breakDown = "";
        
        Object.keys(mfgRevMap).forEach(k => {
          const val = mfgRevMap[k];
          if (val > maxRev) {
            maxRev = val;
            winner = k;
          }
          breakDown += `* **${k}:** $${val.toFixed(2)}<br/>`;
        });
        
        aiText = `### 🏭 Production efficiency analysis<br/>
Here is the revenue statistics by workshops:
${breakDown || "*No recorded sales*<br/>"}
🏆 Leading production: **${winner}** with total result **$${Math.max(maxRev, 0).toFixed(2)}**.

**AI Recommendation:** The sales leader demonstrates high order processing speed. Adopt their logistics experience!`;
      }
      else if (lowerQuery.includes("stock") || lowerQuery.includes("reserve") || lowerQuery.includes("warehouse") || lowerQuery.includes("brand")) {
        let stockList = "";
        Object.keys(brandStockMap).forEach(b => {
          stockList += `* **${b}:** ${brandStockMap[b]} pcs in stock.<br/>`;
        });
        
        aiText = `### 📦 Brand stock analytics<br/>
Current distribution of finished products by disc brands in warehouse:
${stockList || "*No products in stock in warehouse*<br/>"}

**AI Warning:** If a brand has zero stock, be sure to update its status in Excel or cards to not lose buyers.`;
      }
      else {
        aiText = `### 🤖 AI Analytics Response<br/>
I processed your request: *"${query}"* considering the active role **${userRole}** and manufacturer restrictions **${activeMfg}**.

**Brief summary:**
* Current revenue: **$${totalRevenue.toFixed(2)}**
* Total products in warehouse: **${totalProductsCount} units**
* Hidden draft cards: **${hiddenDraftsCount} units**

You can ask me:
1. *"Do a total sales analysis"*
2. *"Which workshop leads?"*
3. *"What is the stock in the warehouse?"*`;
      }
      
      const aiMsg = document.createElement("div");
      aiMsg.style.alignSelf = "flex-start";
      aiMsg.style.background = "rgba(0,176,255,0.1)";
      aiMsg.style.color = "#fff";
      aiMsg.style.border = "1px solid rgba(0,176,255,0.2)";
      aiMsg.style.padding = "0.6rem 1rem";
      aiMsg.style.borderRadius = "8px 8px 8px 0";
      aiMsg.style.maxWidth = "80%";
      aiMsg.innerHTML = aiText;
      
      aiChatMessages.appendChild(aiMsg);
      aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    }, 1000);
  });
}

// Excel handlers removed

// --- Article Management System (Rich blog articles) ---

function renderArticlesList() {
  if (!articlesTableBody) return;
  
  const allArticles = JSON.parse(localStorage.getItem("brakeRichArticles") || "[]");
  const activeMfg = getActiveManufacturer();
  
  const filtered = allArticles.filter(art => {
    if (userRole === "superadmin" && activeMfg === "all") return true;
    const authorVal = art.author || "BrakeDiscs Official";
    const resolvedActive = activeMfg === "all" ? "Garage1" : activeMfg;
    return authorVal === resolvedActive;
  });
  
  articlesTableBody.innerHTML = "";
  if (filtered.length === 0) {
    articlesTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--color-muted);">No articles found. Click "+ Write Article" to create your first article!</td></tr>`;
    return;
  }
  
  filtered.forEach(art => {
    const tr = document.createElement("tr");
    const imgUrl = art.image || "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80";
    
    tr.innerHTML = `
      <td><img src="${imgUrl}" style="width:80px; height:50px; object-fit:cover; border-radius:4px; border:1px solid var(--color-border);" /></td>
      <td style="font-weight:bold; color:var(--color-text-bright);">${art.title}</td>
      <td style="color:var(--color-muted);">${art.author || 'BrakeDiscs Official'}</td>
      <td style="color:#888;">${new Date(art.createdAt).toLocaleDateString()}</td>
      <td>
        <div style="display:flex; gap:0.5rem;">
          <button class="brand-btn edit-art-btn" data-id="${art.id}" style="padding:0.3rem 0.6rem; font-size:0.8rem; background:#00b0ff; border:none; color:#fff;">Edit</button>
          <button class="brand-btn delete-art-btn" data-id="${art.id}" style="padding:0.3rem 0.6rem; font-size:0.8rem; background:#ff5252; border:none; color:#fff;">Delete</button>
        </div>
      </td>
    `;
    
    tr.querySelector(".edit-art-btn").addEventListener("click", () => openEditArticleModal(art));
    tr.querySelector(".delete-art-btn").addEventListener("click", () => deleteArticle(art.id));
    
    articlesTableBody.appendChild(tr);
  });
}

function openEditArticleModal(art) {
  if (!articleEditModal) return;
  
  if (art) {
    articleModalTitle.textContent = "Edit Article";
    editArticleId.value = art.id;
    articleTitleInput.value = art.title;
    articleImageInput.value = art.image || "";
    articleImagePreview.src = art.image || "https://via.placeholder.com/60?text=+";
    articleVideoInput.value = art.video || "";
    articleContentInput.value = art.content || "";
  } else {
    articleModalTitle.textContent = "Write Article";
    editArticleId.value = "";
    articleTitleInput.value = "";
    articleImageInput.value = "";
    articleImagePreview.src = "https://via.placeholder.com/60?text=+";
    articleVideoInput.value = "";
    articleContentInput.value = "";
  }
  
  articleEditModal.style.display = "flex";
}

function deleteArticle(id) {
  if (!confirm("Are you sure you want to delete this article?")) return;
  const allArticles = JSON.parse(localStorage.getItem("brakeRichArticles") || "[]");
  const filtered = allArticles.filter(art => art.id !== id);
  localStorage.setItem("brakeRichArticles", JSON.stringify(filtered));
  showToast("Article successfully deleted!");
  renderArticlesList();
}

if (openAddArticleModalBtn) {
  openAddArticleModalBtn.addEventListener("click", () => openEditArticleModal(null));
}

if (closeArticleModalBtn && articleEditModal) {
  closeArticleModalBtn.addEventListener("click", () => {
    articleEditModal.style.display = "none";
  });
}

if (articleEditForm) {
  articleEditForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const allArticles = JSON.parse(localStorage.getItem("brakeRichArticles") || "[]");
    const activeMfg = getActiveManufacturer();
    const resolvedAuthor = activeMfg === "all" ? "Garage1" : activeMfg;
    
    const artId = editArticleId.value ? Number(editArticleId.value) : Date.now();
    const titleVal = articleTitleInput.value.trim();
    const imageVal = articleImageInput.value.trim();
    const videoVal = articleVideoInput.value.trim();
    const contentVal = articleContentInput.value.trim();
    
    const articleData = {
      id: artId,
      title: titleVal,
      image: imageVal,
      video: videoVal,
      content: contentVal,
      author: resolvedAuthor,
      createdAt: new Date().toISOString()
    };
    
    if (editArticleId.value) {
      const idx = allArticles.findIndex(a => a.id === artId);
      if (idx !== -1) {
        articleData.author = allArticles[idx].author; // Preserve original author
        articleData.createdAt = allArticles[idx].createdAt; // Preserve original date
        allArticles[idx] = articleData;
      }
    } else {
      allArticles.push(articleData);
    }
    
    localStorage.setItem("brakeRichArticles", JSON.stringify(allArticles));
    showToast(editArticleId.value ? "Article updated successfully!" : "Article published successfully!");
    articleEditModal.style.display = "none";
    renderArticlesList();
  });
}

// Hook format buttons inside the text editor
document.querySelectorAll(".format-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const tag = btn.dataset.tag;
    const start = articleContentInput.selectionStart;
    const end = articleContentInput.selectionEnd;
    const text = articleContentInput.value;
    const selected = text.substring(start, end);
    
    let replacement = "";
    if (tag === "h3") replacement = `<h3>${selected || 'Heading'}</h3>`;
    else if (tag === "p") replacement = `<p>${selected || 'Paragraph text'}</p>`;
    else if (tag === "bold") replacement = `<strong>${selected || 'Bold text'}</strong>`;
    else if (tag === "img") replacement = `<img src="${selected || 'https://example.com/image.jpg'}" style="max-width:100%; border-radius:var(--radius); margin:1rem 0;" />`;
    else if (tag === "youtube") replacement = `<iframe width="100%" height="315" src="${selected || 'https://www.youtube.com/embed/dQw4w9WgXcQ'}" frameborder="0" allowfullscreen></iframe>`;
    
    articleContentInput.value = text.substring(0, start) + replacement + text.substring(end);
    articleContentInput.focus();
  });
});

if (articleImagePreview && articleImageFile) {
  articleImagePreview.addEventListener("click", () => articleImageFile.click());
  articleImageFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const r = new FileReader();
      r.onload = (event) => {
        articleImagePreview.src = event.target.result;
        articleImageInput.value = event.target.result;
      };
      r.readAsDataURL(file);
    }
  });
}

// --- AI Features ---
const aiExcelImportBtn = document.getElementById("aiExcelImportBtn");
const aiUrlScrapeBtn = document.getElementById("aiUrlScrapeBtn");
const aiExcelModal = document.getElementById("aiExcelModal");
const aiUrlModal = document.getElementById("aiUrlModal");
const aiExcelCloseBtn = document.getElementById("aiExcelCloseBtn");
const aiUrlCloseBtn = document.getElementById("aiUrlCloseBtn");

// AI Excel Import Logic
const aiExcelStartBtn = document.getElementById("aiExcelStartBtn");
const aiExcelFileInput = document.getElementById("aiExcelFileInput");
const aiExcelProgressArea = document.getElementById("aiExcelProgressArea");
const aiExcelProgressBar = document.getElementById("aiExcelProgressBar");
const aiExcelStatusText = document.getElementById("aiExcelStatusText");

if (aiExcelImportBtn) {
  aiExcelImportBtn.addEventListener("click", () => {
    aiExcelFileInput.value = "";
    aiExcelProgressArea.style.display = "none";
    aiExcelModal.style.display = "flex";
  });
}
if (aiExcelCloseBtn) {
  aiExcelCloseBtn.addEventListener("click", () => aiExcelModal.style.display = "none");
}

if (aiExcelStartBtn) {
  aiExcelStartBtn.addEventListener("click", () => {
    const file = aiExcelFileInput.files[0];
    if (!file) return showToast("Please select an Excel or CSV file first.", false);
    
    aiExcelProgressArea.style.display = "block";
    aiExcelProgressBar.style.width = "10%";
    aiExcelStatusText.textContent = "AI is reading file structure...";
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setTimeout(() => {
        aiExcelProgressBar.style.width = "40%";
        aiExcelStatusText.textContent = "AI analyzing columns and mapping data...";
        try {
          const data = new Uint8Array(e.target.result);
          // Assuming XLSX is loaded globally via CDN
          const workbook = XLSX.read(data, {type: 'array'});
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, {header: 1});
          
          if (json.length < 2) throw new Error("Empty file");
          
          // Heuristics mapping (AI simulation)
          setTimeout(() => {
             aiExcelProgressBar.style.width = "80%";
             aiExcelStatusText.textContent = "AI generating drafts...";
             
             let added = 0;
             const mfg = getActiveManufacturer() !== "all" ? getActiveManufacturer() : "Garage1";
             
             // Very basic AI column mapping simulation
             // Assuming typical columns: Name, Brand, Price, Stock
             for(let i=1; i<json.length; i++) {
               const row = json[i];
               if(!row || !row[0]) continue;
               
               const name = String(row[0]);
               const brand = String(row[1] || "Unknown");
               const price = parseFloat(row[2]) || 0;
               const stockCount = parseInt(row[3]) || 0;
               
               const newProduct = {
                 id: "ai_" + Date.now() + "_" + i,
                 name: name,
                 brand: brand,
                 price: price,
                 stock: stockCount > 0,
                 stockCount: stockCount > 0 ? stockCount : undefined,
                 manufacturer: mfg,
                 visible: false, // draft state
                 image: "https://via.placeholder.com/300?text=AI+Draft"
               };
               products.unshift(newProduct);
               added++;
             }
             
             localStorage.setItem("brakeProducts", JSON.stringify(products));
             
             setTimeout(() => {
               aiExcelProgressBar.style.width = "100%";
               aiExcelStatusText.textContent = "Complete!";
               setTimeout(() => {
                 aiExcelModal.style.display = "none";
                 showToast(`AI successfully parsed ${added} products into drafts!`);
                 loadProducts(); // Refresh table
               }, 1000);
             }, 800);
             
          }, 1500);
          
        } catch (err) {
          aiExcelStatusText.textContent = "Error parsing file.";
          console.error(err);
        }
      }, 1000);
    };
    reader.readAsArrayBuffer(file);
  });
}

// AI URL Scraper Logic
const aiUrlStartBtn = document.getElementById("aiUrlStartBtn");
const aiUrlInput = document.getElementById("aiUrlInput");
const aiUrlProgressArea = document.getElementById("aiUrlProgressArea");
const aiUrlProgressBar = document.getElementById("aiUrlProgressBar");
const aiUrlStatusText = document.getElementById("aiUrlStatusText");

if (aiUrlScrapeBtn) {
  aiUrlScrapeBtn.addEventListener("click", () => {
    aiUrlInput.value = "";
    aiUrlProgressArea.style.display = "none";
    aiUrlProgressBar.style.background = "linear-gradient(90deg, #00b09b, #96c93d)";
    aiUrlModal.style.display = "flex";
  });
}
if (aiUrlCloseBtn) {
  aiUrlCloseBtn.addEventListener("click", () => aiUrlModal.style.display = "none");
}

if (aiUrlStartBtn) {
  aiUrlStartBtn.addEventListener("click", () => {
    const url = aiUrlInput.value.trim();
    if (!url) return showToast("Please enter a valid URL.", false);
    
    aiUrlProgressArea.style.display = "block";
    aiUrlProgressBar.style.width = "15%";
    aiUrlStatusText.textContent = "AI is fetching web page...";
    
    // Use allorigins to bypass CORS
    fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`)
      .then(res => res.json())
      .then(data => {
        if (!data.contents) throw new Error("No contents");
        
        aiUrlProgressBar.style.width = "50%";
        aiUrlStatusText.textContent = "AI is analyzing HTML structure & images...";
        
        setTimeout(() => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(data.contents, "text/html");
          
          let title = doc.querySelector("title")?.textContent || "Scraped Product";
          let image = doc.querySelector("meta[property='og:image']")?.content;
          if (!image) {
            const firstImg = doc.querySelector("img");
            image = firstImg ? firstImg.src : "https://via.placeholder.com/300?text=AI+Draft";
          }
          let desc = doc.querySelector("meta[name='description']")?.content || "";
          
          aiUrlProgressBar.style.width = "85%";
          aiUrlStatusText.textContent = "AI generating SEO description and mapping fields...";
          
          setTimeout(() => {
            const mfg = getActiveManufacturer() !== "all" ? getActiveManufacturer() : "Garage1";
            const newProduct = {
               id: "ai_scrape_" + Date.now(),
               name: title.trim().substring(0, 100),
               brand: "AI Brand",
               price: 0,
               stock: false,
               manufacturer: mfg,
               visible: false, // draft
               image: image,
               description: "AI Generated Description: " + desc
            };
            
            products.unshift(newProduct);
            localStorage.setItem("brakeProducts", JSON.stringify(products));
            
            aiUrlProgressBar.style.width = "100%";
            aiUrlStatusText.textContent = "Product card generated!";
            
            setTimeout(() => {
              aiUrlModal.style.display = "none";
              showToast("AI created draft product from URL!");
              loadProducts();
              
              // Automatically open the edit modal for the generated product
              openEditModal(newProduct, (updated) => {
                const uIdx = products.findIndex(x => x.id === newProduct.id);
                if (uIdx !== -1) {
                  products[uIdx] = Object.assign(products[uIdx], updated);
                  
                  if (updated.newMotos) {
                    if (!products[uIdx].groupId) {
                      products[uIdx].groupId = "g_" + Date.now();
                    }
                    updated.newMotos.forEach(motoName => {
                      const clone = JSON.parse(JSON.stringify(products[uIdx]));
                      clone.id = Date.now() + Math.floor(Math.random() * 10000);
                      clone.name = motoName;
                      clone.motos = [motoName];
                      clone.isClone = true;
                      products.push(clone);
                    });
                    delete products[uIdx].newMotos;
                  }
                  
                  localStorage.setItem("brakeProducts", JSON.stringify(products));
                  loadProducts();
                  showToast("Product updated!");
                }
              });
            }, 1000);
          }, 1500);
        }, 1000);
      })
      .catch(err => {
        console.warn("AI Scraping blocked or failed, generating fallback draft.", err);
        aiUrlStatusText.textContent = "Website is blocking requests. Generating manual draft...";
        aiUrlProgressBar.style.width = "100%";
        
        setTimeout(() => {
          const mfg = getActiveManufacturer() !== "all" ? getActiveManufacturer() : "Garage1";
          const newProduct = {
             id: "ai_scrape_" + Date.now(),
             name: "Scraped Product (Manual Edit Required)",
             brand: "AI Brand",
             price: 0,
             stock: false,
             manufacturer: mfg,
             visible: false,
             image: "https://via.placeholder.com/300?text=AI+Draft",
             description: "Failed to auto-scrape from URL: " + url + "\n\nPlease fill in manually."
          };
          
          products.unshift(newProduct);
          localStorage.setItem("brakeProducts", JSON.stringify(products));
          
          aiUrlModal.style.display = "none";
          showToast("Generated fallback draft product.");
          loadProducts();
          
          // Automatically open the edit modal for the generated product
          openEditModal(newProduct, (updated) => {
            const uIdx = products.findIndex(x => x.id === newProduct.id);
            if (uIdx !== -1) {
              products[uIdx] = Object.assign(products[uIdx], updated);
              
              if (updated.newMotos) {
                if (!products[uIdx].groupId) {
                  products[uIdx].groupId = "g_" + Date.now();
                }
                updated.newMotos.forEach(motoName => {
                  const clone = JSON.parse(JSON.stringify(products[uIdx]));
                  clone.id = Date.now() + Math.floor(Math.random() * 10000);
                  clone.name = motoName;
                  clone.motos = [motoName];
                  clone.isClone = true;
                  products.push(clone);
                });
                delete products[uIdx].newMotos;
              }
              
              localStorage.setItem("brakeProducts", JSON.stringify(products));
              loadProducts();
              showToast("Product updated!");
            }
          });
        }, 1000);
      });
  });
}

// --- SEO Export Logic ---
const exportSeoBtn = document.getElementById("exportSeoBtn");
if (exportSeoBtn) {
  exportSeoBtn.addEventListener("click", async () => {
    exportSeoBtn.textContent = "⏳ Generating...";
    exportSeoBtn.disabled = true;
    
    try {
      const zip = new JSZip();
      const imgFolder = zip.folder("images");
      
      const exportedProducts = JSON.parse(JSON.stringify(products));
      
      // Helper to convert base64 to blob
      const base64ToBlob = (b64Data) => {
        const parts = b64Data.split(',');
        const mime = parts[0].match(/:(.*?);/)[1];
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type: mime});
      };

      for (const p of exportedProducts) {
        // Ensure slug
        if (!p.slug) {
          p.slug = generateSlug(p.name);
        }
        
        // Handle main image
        if (p.image && p.image.startsWith("data:image")) {
          try {
            const blob = base64ToBlob(p.image);
            const ext = blob.type.split('/')[1] || "jpg";
            const filename = `${p.slug}-main.${ext}`;
            imgFolder.file(filename, blob);
            p.image = `/assets/images/${filename}`;
          } catch(e) {
            console.error("Failed to process main image for", p.name, e);
          }
        }
        
        // Handle gallery
        if (p.gallery && Array.isArray(p.gallery)) {
          const newGallery = [];
          for (let i = 0; i < p.gallery.length; i++) {
            const gImg = p.gallery[i];
            if (gImg.startsWith("data:image")) {
               try {
                 const blob = base64ToBlob(gImg);
                 const ext = blob.type.split('/')[1] || "jpg";
                 const filename = `${p.slug}-gallery-${i + 1}.${ext}`;
                 imgFolder.file(filename, blob);
                 newGallery.push(`/assets/images/${filename}`);
               } catch(e) {
                 console.error("Failed to process gallery image", i, "for", p.name, e);
                 newGallery.push(gImg);
               }
            } else {
               newGallery.push(gImg);
            }
          }
          p.gallery = newGallery;
        }
      }
      
      // Save updated products array back to JSON
      zip.file("products.json", JSON.stringify(exportedProducts, null, 2));
      
      // Generate ZIP and trigger download
      const content = await zip.generateAsync({type:"blob"});
      saveAs(content, "BrakeDisks_SEO_Production.zip");
      
      showToast("✅ SEO Data exported successfully!");
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to export data", false);
    } finally {
      exportSeoBtn.textContent = "📦 Export SEO Data";
      exportSeoBtn.disabled = false;
    }
  });
}