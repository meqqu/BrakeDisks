// admin.js – handles Products inventory, Support Chats with file attachment, dynamic Orders Table, resizable Excel SpreadSheet, and Superuser management
import { ADMIN_PASSWORD } from "./config.js";
import { openEditModal } from "./admin/editModal.js?v=4";

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

// Superadmin elements
const superFilterContainer = document.getElementById("superadminManufacturerFilter");
const superSelect = document.getElementById("superadminManufacturerSelect");

// Tabs
const productsTab = document.getElementById("productsTab");
const questionsTab = document.getElementById("questionsTab");
const ordersTab = document.getElementById("ordersTab");
const excelTab = document.getElementById("excelTab");
const mfgInfoTab = document.getElementById("mfgInfoTab");
const producersTab = document.getElementById("producersTab");
const settingsTab = document.getElementById("settingsTab");

const showProductsBtn = document.getElementById("showProductsBtn");
const showQuestionsBtn = document.getElementById("showQuestionsBtn");
const showOrdersBtn = document.getElementById("showOrdersBtn");
const showExcelBtn = document.getElementById("showExcelBtn");
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

let excelData = {}; // Stores A1: val, D5: val etc
let activeCellElement = null; // Stores active focus td element inside excel editor
let excelSortState = { column: null, direction: "asc" }; // Interactive column sorting state
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
        renderExcelGrid();
      });
    }
    
    // Show superuser tabs
    if(showProducersBtn) showProducersBtn.style.display = "block";
    if(showSettingsBtn) showSettingsBtn.style.display = "block";
    loadProducers();
    loadSiteSettings();
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
  superSelect.innerHTML = '<option value="all">Все производители</option>' +
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
  cancelBtn.textContent = currentLang === 'ru' ? "Отмена" : "Cancel";
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
  cancelBtn.textContent = currentLang === 'ru' ? "Отмена" : "Cancel";
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
    const textStock = p.stock ? 'В наличии' : 'Под заказ';
    const textMfg = p.manufacturer || "Garage1";
    
    const isVisible = p.visible !== false;
    const visibilityBadge = isVisible
      ? `<span class="stock-badge in-stock" style="font-size:0.75rem; padding:0.15rem 0.4rem; display:inline-block; margin-top:2px;">👁️ Активен</span>`
      : `<span class="stock-badge out-of-stock" style="font-size:0.75rem; padding:0.15rem 0.4rem; display:inline-block; margin-top:2px; background:rgba(255,145,0,0.1); color:#ff9100;">🙈 Скрыт</span>`;

    tr.innerHTML = `
      <td style="padding-left: ${isChild ? '2rem' : '1rem'}">
        <div style="display:flex; align-items:center; gap:0.5rem;">
          ${isChild ? `<span style="color:var(--color-primary-start); font-size:1.2rem;">↳</span>` : ''}
          <img src="${p.image}" alt="${p.name}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;" />
          <div>
            <div style="font-weight:bold; color:#fff;">${p.name}</div>
            <div style="font-size:0.75rem; color:#aaa; display:flex; align-items:center; gap:0.4rem;">🏭 ${textMfg} ${visibilityBadge}</div>
          </div>
        </div>
      </td>
      <td>${p.brand || '---'}</td>
      <td><span class="stock-badge ${badgeClass}">${textStock}</span></td>
      <td style="font-weight:bold; color:var(--color-primary-start); font-size:1.1rem;">$${(p.price || 0).toFixed(2)}</td>
      <td>
        <button class="edit-btn inline-toggle-visibility-btn" title="${isVisible ? 'Скрыть с сайта' : 'Показать на сайте'}" style="margin-right:0.2rem; background:${isVisible ? 'rgba(0,230,118,0.15)' : 'rgba(255,145,0,0.15)'}; border:1px solid ${isVisible ? '#00e676' : '#ff9100'}; padding:0.2rem 0.4rem; border-radius:4px; cursor:pointer;">${isVisible ? '👁️' : '🙈'}</button>
        <button class="edit-btn inline-edit-btn" title="Редактировать">✏️</button>
        <button class="delete-btn inline-delete-btn" title="Удалить">🗑️</button>
      </td>
    `;
    
    tr.querySelector(".inline-toggle-visibility-btn").addEventListener("click", () => {
      p.visible = (p.visible !== false) ? false : true;
      localStorage.setItem("brakeProducts", JSON.stringify(products));
      loadProducts();
      showToast(p.visible ? "Товар теперь виден на сайте!" : "Товар скрыт с сайта!");
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
        showToast("Товар успешно сохранен!");
      });
    });
    
    tr.querySelector(".inline-delete-btn").addEventListener("click", () => {
      customConfirm(currentLang === 'ru' ? `Удалить товар "${p.name}"?` : `Delete product "${p.name}"?`, (confirmed) => {
        if (confirmed) {
          products = products.filter(x => x.id !== p.id);
          localStorage.setItem("brakeProducts", JSON.stringify(products));
          loadProducts();
          showToast("Товар удален!");
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
      <img src="${url}" style="width:40px; height:40px; border-radius:4px; object-fit:cover; border:1px solid #555;" />
      <span class="del-add-gallery-img" data-idx="${idx}" style="position:absolute; top:-4px; right:-4px; background:#ff1744; color:#fff; border-radius:50%; width:14px; height:14px; font-size:10px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; line-height:1;">×</span>
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
    const dlaIdx = name.toLowerCase().lastIndexOf(" для ");
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
        description: addSeoDesc.value.trim() || `Тормозной диск ${name} высокого качества.`,
        keywords: addSeoKeywords.value.trim() || `${name}, тормозной диск`
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
    addProductModal.style.display = "none";
    showToast("Товар добавлен на склад (по умолчанию скрыт с сайта)!");
  });
}

// "Добавить еще товар" click handler (keeps modal open, resets fields)
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
    const dlaIdx = name.toLowerCase().lastIndexOf(" для ");
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
        description: addSeoDesc.value.trim() || `Тормозной диск ${name} высокого качества.`,
        keywords: addSeoKeywords.value.trim() || `${name}, тормозной диск`
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
    showToast("Товар добавлен на склад! Заполните карточку следующего.");
    
    // Clear and reset form fields for next item
    addProductForm.reset();
    addImgPreview.src = "https://via.placeholder.com/60?text=+";
    if (addGallery) addGallery.value = "";
    if (addGalleryPreviews) addGalleryPreviews.innerHTML = "";
  });
}

// "Предварительный просмотр" (Preview Card) click handler
const previewAddProductBtn = document.getElementById("previewAddProductBtn");
const productPreviewModal = document.getElementById("productPreviewModal");
const previewCardContainer = document.getElementById("previewCardContainer");
const closePreviewBtn = document.getElementById("closePreviewBtn");

if (previewAddProductBtn && productPreviewModal && previewCardContainer) {
  previewAddProductBtn.addEventListener("click", () => {
    const name = addName.value.trim() || "Пример тормозного диска";
    const brand = addBrand.value.trim() || "Категория / Бренд";
    const price = parseFloat(addPrice.value) || 0.00;
    const img = addImage.value.trim() || addImgPreview.src;
    const stock = addStock.checked;
    
    const activeMfg = getActiveManufacturer();
    const resolvedMfg = activeMfg === "all" ? "Garage1" : activeMfg;

    const stockText = stock ? "В наличии" : "Под заказ";
    const stockClass = stock ? "stock-yes" : "stock-no";

    previewCardContainer.innerHTML = `
      <div class="product-card" style="margin:0 auto; background:var(--color-surface); border:1px solid rgba(255,255,255,0.15); border-radius:var(--radius); overflow:hidden; box-shadow:var(--shadow); width:100%;">
        <img src="${img}" alt="${name}" style="width:100%; height:200px; object-fit:cover;" />
        <div class="product-info" style="padding:1.2rem;">
          <div class="product-brand" style="font-size:0.75rem; text-transform:uppercase; color:var(--color-primary-start); font-weight:bold; letter-spacing:1px;">${brand}</div>
          <h3 class="product-title" style="font-size:1.15rem; font-weight:600; color:#fff; margin:0.4rem 0 0.3rem 0; line-height:1.4;">${name}</h3>
          <div style="font-size:0.75rem; color:#aaa; font-weight:600; margin-top:2px;">🏭 ${resolvedMfg}</div>
          <div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.5rem;">
            <span class="product-stock ${stockClass}" style="font-size:0.75rem; padding:0.2rem 0.5rem; border-radius:4px; font-weight:bold;">${stockText}</span>
          </div>
          <div class="product-price" style="font-size:1.4rem; font-weight:bold; color:var(--color-primary-start); margin-top:0.8rem;">$${price.toFixed(2)}</div>
        </div>
        <button class="add-to-cart-btn" style="width:100%; padding:0.9rem; background:linear-gradient(135deg, var(--color-primary-start), var(--color-primary-end)); color:#fff; border:none; font-weight:bold; cursor:default;">Купить</button>
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

function switchTab(tab) {
  productsTab.style.display = tab === "products" ? "block" : "none";
  questionsTab.style.display = tab === "questions" ? "block" : "none";
  ordersTab.style.display = tab === "orders" ? "block" : "none";
  excelTab.style.display = tab === "excel" ? "block" : "none";
  
  if(aiAnalyticsTab) aiAnalyticsTab.style.display = tab === "aiAnalytics" ? "block" : "none";
  if(mfgInfoTab) mfgInfoTab.style.display = tab === "mfgInfo" ? "block" : "none";
  if(producersTab) producersTab.style.display = tab === "producers" ? "block" : "none";
  if(settingsTab) settingsTab.style.display = tab === "settings" ? "block" : "none";
  
  // Highlight active buttons
  const buttons = [showProductsBtn, showQuestionsBtn, showOrdersBtn, showExcelBtn, showAiAnalyticsBtn, showMfgInfoBtn, showProducersBtn, showSettingsBtn];
  buttons.forEach(b => {
    if (b) b.classList.remove("active");
  });
  
  if (tab === "products") showProductsBtn.classList.add("active");
  if (tab === "questions") showQuestionsBtn.classList.add("active");
  if (tab === "orders") showOrdersBtn.classList.add("active");
  if (tab === "excel") showExcelBtn.classList.add("active");
  if (tab === "aiAnalytics" && showAiAnalyticsBtn) showAiAnalyticsBtn.classList.add("active");
  if (tab === "mfgInfo" && showMfgInfoBtn) showMfgInfoBtn.classList.add("active");
  if (tab === "producers" && showProducersBtn) showProducersBtn.classList.add("active");
  if (tab === "settings" && showSettingsBtn) showSettingsBtn.classList.add("active");
  
  if (tab === "questions") renderQuestions();
  if (tab === "orders") renderOrders();
  if (tab === "excel") renderExcelGrid();
  if (tab === "aiAnalytics") renderAiAnalytics();
  if (tab === "mfgInfo") loadMfgInfo();
  if (tab === "producers") loadProducers();
}

showProductsBtn.addEventListener("click", () => switchTab("products"));
showQuestionsBtn.addEventListener("click", () => switchTab("questions"));
showOrdersBtn.addEventListener("click", () => switchTab("orders"));
showExcelBtn.addEventListener("click", () => switchTab("excel"));
if (showAiAnalyticsBtn) showAiAnalyticsBtn.addEventListener("click", () => switchTab("aiAnalytics"));
if (showMfgInfoBtn) showMfgInfoBtn.addEventListener("click", () => switchTab("mfgInfo"));
if (showProducersBtn) showProducersBtn.addEventListener("click", () => switchTab("producers"));
if (showSettingsBtn) showSettingsBtn.addEventListener("click", () => switchTab("settings"));

// --- Point 7: Support Chats & File Previews ---
let currentActiveUser = null;

function renderQuestions() {
  const CHAT_KEY = "brakeMessages";
  const allMsgs = JSON.parse(localStorage.getItem(CHAT_KEY) || "[]");
  const activeMfg = getActiveManufacturer();
  
  const filteredMsgs = allMsgs.filter(m => {
    const mMfg = m.manufacturer || "Garage1";
    if (activeMfg === "all") return true;
    return mMfg === activeMfg;
  });
  
  const usersMap = {};
  filteredMsgs.forEach(m => {
    if (!usersMap[m.username]) {
      usersMap[m.username] = { msgs: [], unread: 0 };
    }
    usersMap[m.username].msgs.push(m);
    if (!m.readByAdmin && m.sender === 'user') {
      usersMap[m.username].unread++;
    }
  });
  
  const usernames = Object.keys(usersMap);
  if (usernames.length === 0) {
    dialogsListEl.innerHTML = `<div style="padding:1rem; color:#aaa; text-align:center;">Нет диалогов</div>`;
    adminChatContainer.style.visibility = 'hidden';
    return;
  }
  
  dialogsListEl.innerHTML = usernames.map(u => {
    const userObj = usersMap[u];
    const unreadBadge = userObj.unread > 0 ? `<span style="background:#ff5252; color:#fff; border-radius:50%; padding:0.1rem 0.5rem; font-size:0.8rem;">${userObj.unread}</span>` : '';
    const isActive = u === currentActiveUser ? 'background:rgba(255,255,255,0.08);' : '';
    const lastMsg = userObj.msgs[userObj.msgs.length - 1];
    const snippet = lastMsg.text.length > 25 ? lastMsg.text.substring(0, 25) + '...' : lastMsg.text;
    const time = new Date(lastMsg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    return `
      <div class="dialog-item" data-user="${u}" style="padding:1rem; border-bottom:1px solid rgba(255,255,255,0.08); cursor:pointer; display:flex; flex-direction:column; gap:0.4rem; transition:background 0.2s; ${isActive}">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>👤 <strong>${u}</strong></div>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span style="font-size:0.8rem; color:#aaa;">${time}</span>
            ${unreadBadge}
          </div>
        </div>
        <div style="font-size:0.85rem; color:#ccc;">${lastMsg.sender === 'admin' ? 'Вы: ' : ''}${snippet}</div>
      </div>
    `;
  }).join("");
  
  document.querySelectorAll('.dialog-item').forEach(item => {
    item.addEventListener('click', () => {
      currentActiveUser = item.dataset.user;
      renderAdminChat();
      renderQuestions();
    });
  });
  
  if (currentActiveUser) {
    renderAdminChat();
  }
}

// Chat File attachment selection
if (adminChatFile) {
  adminChatFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const r = new FileReader();
      r.onload = (event) => {
        adminAttachedFile = {
          data: event.target.result,
          name: file.name,
          type: file.type
        };
        showToast(`Файл прикреплен: ${file.name}`);
      };
      r.readAsDataURL(file);
    } else {
      adminAttachedFile = null;
    }
  });
}

function renderAdminChat() {
  if (!currentActiveUser) return;
  adminChatContainer.style.visibility = 'visible';
  activeChatUser.textContent = `Диалог: ${currentActiveUser}`;
  
  const CHAT_KEY = "brakeMessages";
  const allMsgs = JSON.parse(localStorage.getItem(CHAT_KEY) || "[]");
  const activeMfg = getActiveManufacturer();
  
  let changed = false;
  allMsgs.forEach(m => {
    const mMfg = m.manufacturer || "Garage1";
    const matchesMfg = activeMfg === "all" || mMfg === activeMfg;
    if (m.username === currentActiveUser && m.sender === 'user' && !m.readByAdmin && matchesMfg) {
      m.readByAdmin = true;
      changed = true;
    }
  });
  if (changed) {
    localStorage.setItem(CHAT_KEY, JSON.stringify(allMsgs));
  }
  
  const userMsgs = allMsgs.filter(m => {
    const mMfg = m.manufacturer || "Garage1";
    const matchesMfg = activeMfg === "all" || mMfg === activeMfg;
    return m.username === currentActiveUser && matchesMfg;
  });
  
  adminChatMessages.innerHTML = userMsgs.map(m => {
    let fileHtml = "";
    if (m.file) {
      if (m.fileType && m.fileType.startsWith("image/")) {
        fileHtml = `<div style="margin-top:0.5rem;"><img src="${m.file}" alt="preview" style="max-height:150px; border-radius:8px; border:1px solid #444; display:block; cursor:pointer;" onclick="window.open('${m.file}')" /></div>`;
      } else {
        fileHtml = `<div style="margin-top:0.5rem;"><a href="${m.file}" download="${m.fileName || 'file'}" style="color:#00b0ff; text-decoration:underline; font-size:0.85rem; display:inline-flex; align-items:center; gap:0.3rem;">📎 ${m.fileName || 'Файл'}</a></div>`;
      }
    }

    return `
      <div style="max-width:75%; padding:0.8rem 1.2rem; border-radius:18px; font-size:0.95rem; line-height:1.4; 
                  ${m.sender === 'admin' ? 'align-self:flex-end; background:var(--color-primary-start); color:#fff; border-bottom-right-radius:4px;' 
                                         : 'align-self:flex-start; background:#333; color:#fff; border-bottom-left-radius:4px;'}">
        <div>${m.text}</div>
        ${fileHtml}
        <div style="font-size:0.75rem; color:rgba(255,255,255,0.6); margin-top:0.4rem; text-align:right;">
          ${new Date(m.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
      </div>
    `;
  }).join("");
  
  adminChatMessages.scrollTop = adminChatMessages.scrollHeight;
}

if (adminChatForm) {
  adminChatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!currentActiveUser) return;
    const text = adminChatInput.value.trim();
    if (!text && !adminAttachedFile) return;
    
    const CHAT_KEY = "brakeMessages";
    const allMsgs = JSON.parse(localStorage.getItem(CHAT_KEY) || "[]");
    const activeMfg = getActiveManufacturer();
    const resolvedMfg = activeMfg === "all" ? "Garage1" : activeMfg;
    
    allMsgs.push({
      id: Date.now(),
      username: currentActiveUser,
      sender: "admin",
      text: text || (adminAttachedFile ? `Прикреплен файл: ${adminAttachedFile.name}` : ""),
      date: new Date().toISOString(),
      manufacturer: resolvedMfg,
      file: adminAttachedFile ? adminAttachedFile.data : null,
      fileName: adminAttachedFile ? adminAttachedFile.name : null,
      fileType: adminAttachedFile ? adminAttachedFile.type : null
    });
    
    localStorage.setItem(CHAT_KEY, JSON.stringify(allMsgs));
    adminChatInput.value = "";
    if (adminChatFile) adminChatFile.value = "";
    adminAttachedFile = null;
    renderAdminChat();
    renderQuestions();
  });
}

// --- Orders System & Custom Columns Delete ---
let customCols = JSON.parse(localStorage.getItem("brakeOrderCols") || "[]");
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
    renderQuestions();
  });
}

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
      <button class="del-col-btn" data-col="${c.id}" style="background:none; border:none; color:#ff5252; cursor:pointer; font-size:0.85rem; padding:0; margin-left:0.2rem;" title="Удалить столбец">🗑️</button>
    </th>
  `).join("");
  
  ordersTableHeader.innerHTML = `
    <th>№</th>
    <th>Дата</th>
    <th>Товар</th>
    ${isSuper ? '<th>Производитель</th>' : ''}
    <th>Клиент</th>
    <th>Адрес</th>
    <th>Связь</th>
    <th>Комментарий</th>
    <th>Сумма</th>
    <th>Статус</th>
    ${customThs}
    <th>Действие</th>
  `;

  // Attach delete column listeners
  document.querySelectorAll(".del-col-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const colId = btn.dataset.col;
      customCols = customCols.filter(c => c.id !== colId);
      localStorage.setItem("brakeOrderCols", JSON.stringify(customCols));
      renderOrders();
      showToast("Столбец удален!");
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
    ordersTableBody.innerHTML = `<tr><td colspan="${11 + (isSuper ? 1 : 0) + customCols.length}" style="text-align:center;">Нет заказов</td></tr>`;
    return;
  }
  
  const statusColors = {
    "paid": "#ffb300",
    "processing": "#1e88e5",
    "shipped": "#43a047"
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
      displayTotal = `$${subtotal.toFixed(2)} (всего ${o.total})`;
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
      return `<td><input type="text" class="custom-col-input" data-order="${o.id}" data-col="${c.id}" value="${val}" style="width:100px; padding:0.4rem; background:transparent; border:1px dashed #444; color:#fff; border-radius:4px;" placeholder="Ввод..."/></td>`;
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
          <option value="paid" ${o.status === "paid" ? "selected" : ""}>Оплачен</option>
          <option value="processing" ${o.status === "processing" ? "selected" : ""}>В процессе</option>
          <option value="shipped" ${o.status === "shipped" ? "selected" : ""}>Отправлен</option>
        </select>
      </td>
      ${customTds}
      <td>
        <button class="edit-btn view-order-btn" data-id="${o.id}" title="Детали">👁️</button>
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
        orders[idx].status = newStatus;
        
        // Automatically generate default tracking and shippingCarrier when shipped
        if (newStatus === "shipped" && !orders[idx].trackingNumber) {
          orders[idx].trackingNumber = "TRK-" + Math.floor(Math.random() * 900000 + 100000);
          orders[idx].shippingCarrier = "CDEK / DHL";
        }
        
        localStorage.setItem("brakeOrders", JSON.stringify(orders));
        renderOrders();
        showToast("Статус заказа изменен!");
      }
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
      const orderId = btn.dataset.id;
      const o = orders.find(x => x.id == orderId);
      if(o) {
        const cl = clients.find(c => c.id === o.customerId) || o.customer || {};
        const statusLabels = { paid: "Оплачен", processing: "В процессе", shipped: "Отправлен" };
        const statusColor = statusColors[o.status] || '#555';
        
        orderModalId.textContent = `Заказ #${o.id}`;
        orderModalStatus.textContent = statusLabels[o.status] || o.status;
        orderModalStatus.style.background = statusColor;
        
        const viewableItems = o.items.filter(item => {
          if (activeMfg === "all") return true;
          const p = products.find(prod => prod.id == item.id);
          const pMfg = p ? (p.manufacturer || "Garage1") : "Garage1";
          return pMfg === activeMfg;
        });
        
        let itemsHtml = viewableItems.map(item => `
          <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:0.8rem; border-radius:8px; border:1px solid #333;">
            <div>
              <div style="font-weight:bold; color:#fff;">${item.name}</div>
              <div style="font-size:0.8rem; color:#aaa;">Количество: ${item.qty}</div>
            </div>
            <div style="font-weight:bold; color:var(--color-primary-start);">$${((item.price || 0) * item.qty).toFixed(2)}</div>
          </div>
        `).join("");
        
        let localTotal = o.total;
        if (activeMfg !== "all") {
          const mfgTotal = viewableItems.reduce((sum, it) => sum + ((it.price || 0) * it.qty), 0);
          localTotal = `$${mfgTotal.toFixed(2)} (всего ${o.total})`;
        }
        
        let trackingHtml = "";
        if (o.status === "shipped") {
          trackingHtml = `
            <div style="margin-top:0.5rem; background:rgba(0,230,118,0.1); border:1px solid #00e676; padding:0.8rem; border-radius:8px;">
              🚚 <strong>Служба доставки:</strong> <input type="text" value="${o.shippingCarrier || 'CDEK'}" class="order-carrier-edit" data-id="${o.id}" style="width:100px; padding:0.2rem; background:#111; color:#fff; border:1px solid #444;" />
              <strong>Трек-номер:</strong> <input type="text" value="${o.trackingNumber || ''}" class="order-track-edit" data-id="${o.id}" style="width:120px; padding:0.2rem; background:#111; color:#fff; border:1px solid #444;" />
            </div>
          `;
        }
        
        orderDetailsContent.innerHTML = `
          <div>
            <h4 style="margin:0 0 0.5rem; color:#aaa; font-size:0.85rem; text-transform:uppercase;">Информация о клиенте</h4>
            <div style="line-height:1.6; background:rgba(0,0,0,0.2); padding:1rem; border-radius:8px; border:1px solid #333;">
              <div><strong>Имя:</strong> ${cl.name}</div>
              <div><strong>Телефон:</strong> ${cl.phone || '—'}</div>
              <div><strong>Email:</strong> ${cl.email || '—'}</div>
              <div><strong>Адрес:</strong> ${cl.address || '—'}</div>
            </div>
          </div>
          <div>
            <h4 style="margin:0 0 0.5rem; color:#aaa; font-size:0.85rem; text-transform:uppercase;">Товары</h4>
            <div style="display:flex; flex-direction:column; gap:0.5rem;">
              ${itemsHtml || '<div style="color:#aaa;">Нет товаров (ручной заказ)</div>'}
            </div>
          </div>
          ${trackingHtml}
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #444; padding-top:1rem; margin-top:0.5rem;">
            <span style="font-weight:bold; font-size:1.1rem; color:#fff;">Итого к оплате:</span>
            <span style="font-weight:bold; font-size:1.4rem; color:var(--color-primary-start);">${localTotal}</span>
          </div>
        `;
        
        // Event listeners for tracking updates
        const trackInp = orderDetailsContent.querySelector(".order-track-edit");
        const carrierInp = orderDetailsContent.querySelector(".order-carrier-edit");
        
        if(trackInp) {
          trackInp.addEventListener("change", (e) => {
            o.trackingNumber = e.target.value.trim();
            localStorage.setItem("brakeOrders", JSON.stringify(orders));
            showToast("Трек-номер сохранен!");
          });
        }
        if(carrierInp) {
          carrierInp.addEventListener("change", (e) => {
            o.shippingCarrier = e.target.value.trim();
            localStorage.setItem("brakeOrders", JSON.stringify(orders));
            showToast("Служба доставки сохранена!");
          });
        }
        
        orderDetailsModal.style.display = 'flex';
      }
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
        <div style="display:flex; flex-direction:column; gap:0.8rem; background:rgba(0,0,0,0.15); padding:1.2rem; border-radius:12px; border:1px solid #333;">
          <div>
            <span style="color:#aaa; font-size:0.8rem;">Телефон:</span>
            <div style="font-weight:600; font-size:0.95rem; color:#fff; margin-top:0.1rem;">${cl.phone || '—'}</div>
          </div>
          <div>
            <span style="color:#aaa; font-size:0.8rem;">Email:</span>
            <div style="font-weight:600; font-size:0.95rem; color:#fff; margin-top:0.1rem;">${cl.email || '—'}</div>
          </div>
          <div>
            <span style="color:#aaa; font-size:0.8rem;">Адрес доставки:</span>
            <div style="font-weight:600; font-size:0.95rem; color:#fff; margin-top:0.1rem; line-height:1.4;">${cl.address || '—'}</div>
          </div>
          ${cl.preferredContact ? `
          <div>
            <span style="color:#aaa; font-size:0.8rem;">Способ связи:</span>
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
      <div><label style="font-size:0.85rem;color:#aaa;">Имя клиента</label><input type="text" id="manualName" required style="width:100%; padding:0.8rem; border-radius:4px; border:1px solid #444; background:var(--color-bg); color:#fff; margin-top:0.3rem;" /></div>
      <div><label style="font-size:0.85rem;color:#aaa;">Телефон</label><input type="text" id="manualPhone" style="width:100%; padding:0.8rem; border-radius:4px; border:1px solid #444; background:var(--color-bg); color:#fff; margin-top:0.3rem;" /></div>
      <div><label style="font-size:0.85rem;color:#aaa;">Email</label><input type="email" id="manualEmail" style="width:100%; padding:0.8rem; border-radius:4px; border:1px solid #444; background:var(--color-bg); color:#fff; margin-top:0.3rem;" /></div>
      <div><label style="font-size:0.85rem;color:#aaa;">Адрес доставки</label><input type="text" id="manualAddress" style="width:100%; padding:0.8rem; border-radius:4px; border:1px solid #444; background:var(--color-bg); color:#fff; margin-top:0.3rem;" /></div>
      <div><label style="font-size:0.85rem;color:#aaa;">Сумма заказа ($)</label><input type="number" step="0.01" id="manualTotal" required style="width:100%; padding:0.8rem; border-radius:4px; border:1px solid #444; background:var(--color-bg); color:#fff; margin-top:0.3rem;" /></div>
    `;
    
    const productSelect = document.getElementById("manualProductSelect");
    if(productSelect) productSelect.innerHTML = prodOptions;
    
    customCols.forEach(c => {
      html += `<div><label style="font-size:0.85rem;color:#aaa;">${c.name}</label><input type="text" class="manual-custom-field" data-id="${c.id}" style="width:100%; padding:0.8rem; border-radius:4px; border:1px solid #444; background:var(--color-bg); color:#fff; margin-top:0.3rem;" /></div>`;
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
    showToast("Ручной заказ успешно добавлен!");
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
    showToast("Столбец добавлен!");
  });
}

// --- Interactive Excel SpreadSheet System ---
const excelSpreadsheet = document.getElementById("excelSpreadsheet");
const syncExcelBtn = document.getElementById("syncExcelBtn");

// Custom sheets registry loader
const customSheetsList = JSON.parse(localStorage.getItem("brakeExcelCustomSheets") || "[]");
const dsSelectEl = document.getElementById("excelDataSource");
if (dsSelectEl) {
  customSheetsList.forEach(sheet => {
    if (!dsSelectEl.querySelector(`option[value="${sheet.id}"]`)) {
      const opt = document.createElement("option");
      opt.value = sheet.id;
      opt.textContent = sheet.name;
      dsSelectEl.appendChild(opt);
    }
  });
}

// Range Selection State Variables
let isExcelSelecting = false;
let excelSelectStart = null; // { colIdx, rowIdx }
let excelSelectEnd = null;   // { colIdx, rowIdx }
let excelSelectedRange = null; // { rStart, rEnd, cStart, cEnd }
let excelMoveSourceRange = null; // Source of moved range
let isExcelMoveMode = false;

// Undo / Redo history state stacks
let excelUndoStack = [];
let excelRedoStack = [];

// Autofill drag state variables
let isExcelAutofilling = false;
let excelAutofillSourceCellId = null;
let excelAutofillTargetCells = [];

function pushExcelState() {
  const dsSelect = document.getElementById("excelDataSource");
  const dataSource = dsSelect ? dsSelect.value : "orders";
  const stylesKey = `brakeExcelStyles_${dataSource}`;
  const cellStyles = JSON.parse(localStorage.getItem(stylesKey) || "{}");
  
  excelUndoStack.push({
    data: Object.assign({}, excelData),
    styles: Object.assign({}, cellStyles)
  });
  
  excelRedoStack = []; // clear redo stack on new action
  if (excelUndoStack.length > 50) {
    excelUndoStack.shift();
  }
}

function excelUndo() {
  if (excelUndoStack.length === 0) return;
  
  const dsSelect = document.getElementById("excelDataSource");
  const dataSource = dsSelect ? dsSelect.value : "orders";
  const stylesKey = `brakeExcelStyles_${dataSource}`;
  const cellStyles = JSON.parse(localStorage.getItem(stylesKey) || "{}");
  
  excelRedoStack.push({
    data: Object.assign({}, excelData),
    styles: Object.assign({}, cellStyles)
  });
  
  const prevState = excelUndoStack.pop();
  
  // Restore
  excelData = Object.assign({}, prevState.data);
  localStorage.setItem(stylesKey, JSON.stringify(prevState.styles));
  
  renderExcelGrid();
  showToast(currentLang === 'ru' ? "Действие отменено" : "Action undone");
}

function excelRedo() {
  if (excelRedoStack.length === 0) return;
  
  const dsSelect = document.getElementById("excelDataSource");
  const dataSource = dsSelect ? dsSelect.value : "orders";
  const stylesKey = `brakeExcelStyles_${dataSource}`;
  const cellStyles = JSON.parse(localStorage.getItem(stylesKey) || "{}");
  
  excelUndoStack.push({
    data: Object.assign({}, excelData),
    styles: Object.assign({}, cellStyles)
  });
  
  const nextState = excelRedoStack.pop();
  
  // Restore
  excelData = Object.assign({}, nextState.data);
  localStorage.setItem(stylesKey, JSON.stringify(nextState.styles));
  
  renderExcelGrid();
  showToast(currentLang === 'ru' ? "Действие повторено" : "Action redone");
}

function adjustFormula(formula, rowDiff) {
  if (rowDiff === 0) return formula;
  return formula.replace(/([A-Z]+)(\d+)/g, (match, col, row) => {
    const newRow = parseInt(row) + rowDiff;
    return `${col}${newRow}`;
  });
}

function getActiveCols() {
  const dsSelect = document.getElementById("excelDataSource");
  const dataSource = dsSelect ? dsSelect.value : "orders";
  let colsKey = `brakeExcelCols_${dataSource}`;
  return JSON.parse(localStorage.getItem(colsKey) || "[]");
}

function updateVisualSelection(activeCols) {
  const rStart = Math.min(excelSelectStart.rowIdx, excelSelectEnd.rowIdx);
  const rEnd = Math.max(excelSelectStart.rowIdx, excelSelectEnd.rowIdx);
  const cStart = Math.min(excelSelectStart.colIdx, excelSelectEnd.colIdx);
  const cEnd = Math.max(excelSelectStart.colIdx, excelSelectEnd.colIdx);
  
  let minTop = Infinity, minLeft = Infinity;
  let maxBottom = -Infinity, maxRight = -Infinity;
  let selectedCount = 0;

  excelSpreadsheet.querySelectorAll(".excel-cell-edit").forEach(cell => {
    const cid = cell.dataset.cell;
    const match = cid.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      const colLetter = match[1];
      const rowNum = parseInt(match[2]);
      const colIdx = activeCols.indexOf(colLetter);
      
      if (rowNum >= rStart && rowNum <= rEnd && colIdx >= cStart && colIdx <= cEnd) {
        cell.classList.add("excel-cell-selected");
        selectedCount++;
        
        const top = cell.offsetTop;
        const left = cell.offsetLeft;
        const bottom = top + cell.offsetHeight;
        const right = left + cell.offsetWidth;
        
        if (top < minTop) minTop = top;
        if (left < minLeft) minLeft = left;
        if (bottom > maxBottom) maxBottom = bottom;
        if (right > maxRight) maxRight = right;
      } else {
        cell.classList.remove("excel-cell-selected");
      }
    }
  });

  const overlay = document.getElementById("excelSelectionOverlay");
  if (overlay && selectedCount > 0) {
    overlay.style.display = "block";
    overlay.style.top = `${minTop}px`;
    overlay.style.left = `${minLeft}px`;
    overlay.style.width = `${maxRight - minLeft}px`;
    overlay.style.height = `${maxBottom - minTop}px`;
    
    // Set autofill source to bottom-right cell
    const brCol = activeCols[cEnd];
    excelAutofillSourceCellId = `${brCol}${rEnd}`;
  } else if (overlay) {
    overlay.style.display = "none";
  }
}

function showSelectionPopup() {
  const popup = document.getElementById("excelSelectionPopup");
  if (!popup) return;
  
  const selectedCells = excelSpreadsheet.querySelectorAll(".excel-cell-selected");
  if (selectedCells.length === 0) {
    popup.style.display = "none";
    return;
  }
  
  let topMost = Infinity;
  let rightMost = -Infinity;
  let targetCell = null;
  
  selectedCells.forEach(cell => {
    const rect = cell.getBoundingClientRect();
    if (rect.top < topMost) {
      topMost = rect.top;
    }
    if (rect.right > rightMost) {
      rightMost = rect.right;
      targetCell = cell;
    }
  });
  
  if (targetCell) {
    const rect = targetCell.getBoundingClientRect();
    const containerRect = excelSpreadsheet.offsetParent.getBoundingClientRect();
    
    popup.style.left = `${rect.right - containerRect.left - rect.width}px`;
    popup.style.top = `${rect.top - containerRect.top - 40}px`;
    popup.style.display = "flex";
  }
}

function hideSelectionPopup() {
  const popup = document.getElementById("excelSelectionPopup");
  if (popup) popup.style.display = "none";
}

function clearExcelSelection() {
  excelSelectedRange = null;
  excelMoveSourceRange = null;
  isExcelMoveMode = false;
  excelSpreadsheet.style.cursor = "default";
  excelSpreadsheet.querySelectorAll(".excel-cell-edit").forEach(cell => {
    cell.style.cursor = "text";
    cell.classList.remove("excel-cell-selected");
  });
  const overlay = document.getElementById("excelSelectionOverlay");
  if (overlay) overlay.style.display = "none";
}

function pasteMovedRange(destCellId) {
  if (!excelMoveSourceRange) return;
  pushExcelState(); // Save state for Undo
  
  const activeCols = getActiveCols();
  const match = destCellId.match(/^([A-Z]+)(\d+)$/);
  if (!match) return;
  
  const destColLetter = match[1];
  const destRow = parseInt(match[2]);
  const destColIdx = activeCols.indexOf(destColLetter);
  
  const src = excelMoveSourceRange;
  const rowOffset = destRow - src.rStart;
  const colOffset = destColIdx - src.cStart;
  
  const dsSelect = document.getElementById("excelDataSource");
  const dataSource = dsSelect ? dsSelect.value : "orders";
  const stylesKey = `brakeExcelStyles_${dataSource}`;
  const cellStyles = JSON.parse(localStorage.getItem(stylesKey) || "{}");
  
  const tempCells = [];
  
  for (let r = src.rStart; r <= src.rEnd; r++) {
    for (let c = src.cStart; c <= src.cEnd; c++) {
      const colLetter = activeCols[c];
      const cellId = `${colLetter}${r}`;
      
      const val = excelData[cellId] || "";
      const style = cellStyles[cellId] || null;
      
      tempCells.push({
        relRow: r - src.rStart,
        relCol: c - src.cStart,
        val: val,
        style: style,
        sourceCellId: cellId
      });
      
      excelData[cellId] = "";
      delete cellStyles[cellId];
    }
  }
  
  tempCells.forEach(cell => {
    const targetRow = destRow + cell.relRow;
    const targetColIdx = destColIdx + cell.relCol;
    
    if (targetColIdx < activeCols.length && targetRow <= 100) {
      const targetColLetter = activeCols[targetColIdx];
      const targetCellId = `${targetColLetter}${targetRow}`;
      
      excelData[targetCellId] = cell.val;
      if (cell.style) {
        cellStyles[targetCellId] = cell.style;
      }
    }
  });
  
  localStorage.setItem(stylesKey, JSON.stringify(cellStyles));
  clearExcelSelection();
  renderExcelGrid();
  showToast(currentLang === 'ru' ? "Область успешно перемещена!" : "Cell range successfully moved!");
}

function renderExcelSheetTabs() {
  const container = document.getElementById("excelSheetsTabsContainer");
  if (!container) return;
  
  const dsSelect = document.getElementById("excelDataSource");
  const currentDataSource = dsSelect ? dsSelect.value : "orders";
  
  const addBtn = document.getElementById("excelAddSheetBtn");
  container.querySelectorAll(".excel-sheet-tab").forEach(tab => tab.remove());
  
  const stdSheets = [
    { id: "orders", label: "📋 Лист 1: Заказы" },
    { id: "products", label: "📦 Лист 2: Склад товаров" }
  ];
  
  const customSheets = JSON.parse(localStorage.getItem("brakeExcelCustomSheets") || "[]");
  const allSheets = [...stdSheets, ...customSheets];
  
  allSheets.forEach(sheet => {
    const isActive = currentDataSource === sheet.id;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `excel-sheet-tab ${isActive ? 'active' : ''}`;
    btn.dataset.source = sheet.id;
    
    btn.style.padding = "0.6rem 1.2rem";
    btn.style.fontWeight = "bold";
    btn.style.fontSize = "0.85rem";
    btn.style.background = isActive ? "#1a1e2e" : "#0f111a";
    btn.style.color = isActive ? "var(--color-primary-start)" : "#888";
    btn.style.border = "none";
    btn.style.borderRight = "1px solid #2b3040";
    btn.style.borderTop = `3px solid ${isActive ? 'var(--color-primary-start)' : 'transparent'}`;
    btn.style.cursor = "pointer";
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.gap = "0.4rem";
    btn.style.transition = "var(--transition)";
    btn.style.outline = "none";
    
    btn.textContent = sheet.label || sheet.name;
    
    btn.addEventListener("click", () => {
      container.querySelectorAll(".excel-sheet-tab").forEach(t => {
        t.classList.remove("active");
        t.style.background = "#0f111a";
        t.style.color = "#888";
        t.style.borderTopColor = "transparent";
      });
      btn.classList.add("active");
      btn.style.background = "#1a1e2e";
      btn.style.color = "var(--color-primary-start)";
      btn.style.borderTopColor = "var(--color-primary-start)";
      
      if (dsSelect) {
        dsSelect.value = sheet.id;
        excelSortState.column = null;
        renderExcelGrid();
      }
    });
    
    btn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      // Only allow modifying custom sheets, or maybe all? The prompt says "любой пользовательский лист" (any custom sheet).
      if (sheet.id.startsWith("custom_")) {
        showExcelContextMenu(e.clientX, e.clientY, "sheet", sheet.id, { btn, sheetName: sheet.name });
      }
    });
    
    btn.addEventListener("dblclick", (e) => {
      if (sheet.id.startsWith("custom_")) {
        const newName = prompt(currentLang === 'ru' ? "Новое имя листа:" : "New sheet name:", sheet.name);
        if (newName && newName.trim()) {
          const customSheets = JSON.parse(localStorage.getItem("brakeExcelCustomSheets") || "[]");
          const idx = customSheets.findIndex(s => s.id === sheet.id);
          if (idx !== -1) {
            customSheets[idx].name = newName.trim();
            localStorage.setItem("brakeExcelCustomSheets", JSON.stringify(customSheets));
            renderExcelSheetTabs();
            // Update dsSelect option text if needed
            const dsSelect = document.getElementById("excelDataSource");
            if (dsSelect) {
              const opt = Array.from(dsSelect.options).find(o => o.value === sheet.id);
              if (opt) opt.textContent = newName.trim();
            }
          }
        }
      }
    });
    
    if (addBtn) {
      container.insertBefore(btn, addBtn);
    } else {
      container.appendChild(btn);
    }
  });
}

// --- Excel Context Menu Handling ---
let activeContextMenuTarget = null;
let activeContextMenuType = null;
let activeContextMenuExtra = null;

function showExcelContextMenu(x, y, type, targetId, extraData) {
  const menu = document.getElementById("excelContextMenu");
  if (!menu) return;
  
  activeContextMenuTarget = targetId;
  activeContextMenuType = type;
  activeContextMenuExtra = extraData;
  
  // Hide all items first
  menu.querySelectorAll(".context-menu-item").forEach(item => item.style.display = "none");
  
  if (type === "sheet") {
    document.getElementById("ctxRenameSheet").style.display = "block";
    document.getElementById("ctxDeleteSheet").style.display = "block";
  } else if (type === "col") {
    document.getElementById("ctxRenameCol").style.display = "block";
    document.getElementById("ctxInsertColLeft").style.display = "block";
    document.getElementById("ctxInsertColRight").style.display = "block";
    document.getElementById("ctxDeleteCol").style.display = "block";
  } else if (type === "row") {
    document.getElementById("ctxInsertRowAbove").style.display = "block";
    document.getElementById("ctxInsertRowBelow").style.display = "block";
    document.getElementById("ctxDeleteRow").style.display = "block";
  }
  
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.style.display = "block";
}

function hideExcelContextMenu() {
  const menu = document.getElementById("excelContextMenu");
  if (menu) menu.style.display = "none";
}

document.addEventListener("click", (e) => {
  if (!e.target.closest("#excelContextMenu")) {
    hideExcelContextMenu();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const menu = document.getElementById("excelContextMenu");
  if (!menu) return;
  
  document.getElementById("ctxRenameSheet").addEventListener("click", () => {
    if (activeContextMenuType === "sheet" && activeContextMenuTarget) {
      customPrompt(currentLang === 'ru' ? "Новое имя листа:" : "New sheet name:", activeContextMenuExtra.sheetName, (newName) => {
        if (newName && newName.trim()) {
          const customSheets = JSON.parse(localStorage.getItem("brakeExcelCustomSheets") || "[]");
          const idx = customSheets.findIndex(s => s.id === activeContextMenuTarget);
          if (idx !== -1) {
            customSheets[idx].name = newName.trim();
            localStorage.setItem("brakeExcelCustomSheets", JSON.stringify(customSheets));
            renderExcelSheetTabs();
            const dsSelect = document.getElementById("excelDataSource");
            if (dsSelect) {
              const opt = Array.from(dsSelect.options).find(o => o.value === activeContextMenuTarget);
              if (opt) opt.textContent = newName.trim();
            }
          }
        }
      });
    }
    hideExcelContextMenu();
  });
  
  document.getElementById("ctxDeleteSheet").addEventListener("click", () => {
    if (activeContextMenuType === "sheet" && activeContextMenuTarget) {
      customConfirm(currentLang === 'ru' ? "Точно удалить этот лист?" : "Are you sure you want to delete this sheet?", (confirmed) => {
        if (confirmed) {
          const customSheets = JSON.parse(localStorage.getItem("brakeExcelCustomSheets") || "[]");
          const filtered = customSheets.filter(s => s.id !== activeContextMenuTarget);
          localStorage.setItem("brakeExcelCustomSheets", JSON.stringify(filtered));
          
          // Remove from select
          const dsSelect = document.getElementById("excelDataSource");
          if (dsSelect) {
            const opt = Array.from(dsSelect.options).find(o => o.value === activeContextMenuTarget);
            if (opt) opt.remove();
            if (dsSelect.value === activeContextMenuTarget) {
              dsSelect.value = "orders";
            }
          }
          
          // Clean up data
          localStorage.removeItem(`brakeExcelCols_${activeContextMenuTarget}`);
          localStorage.removeItem(`brakeExcelColNames_${activeContextMenuTarget}`);
          localStorage.removeItem(`brakeExcelData_${activeContextMenuTarget}`);
          localStorage.removeItem(`brakeExcelStyles_${activeContextMenuTarget}`);
          
          renderExcelSheetTabs();
          renderExcelGrid();
        }
      });
    }
    hideExcelContextMenu();
  });
  
  document.getElementById("ctxRenameCol").addEventListener("click", () => {
    if (activeContextMenuType === "col" && activeContextMenuTarget && activeContextMenuExtra) {
      const col = activeContextMenuTarget;
      const { colNames, namesKey } = activeContextMenuExtra;
      customPrompt(currentLang === 'ru' ? `Новое имя для столбца ${col}:` : `New name for column ${col}:`, colNames[col] || '', (newName) => {
        if (newName !== null) {
          colNames[col] = newName.trim();
          localStorage.setItem(namesKey, JSON.stringify(colNames));
          renderExcelGrid();
        }
      });
    }
    hideExcelContextMenu();
  });

  document.getElementById("ctxDeleteCol").addEventListener("click", () => {
    if (activeContextMenuType === "col" && activeContextMenuTarget && activeContextMenuExtra) {
      customConfirm(currentLang === 'ru' ? "Удалить столбец?" : "Delete column?", (confirmed) => {
        if (confirmed) {
          const col = activeContextMenuTarget;
          let { cols, colsKey } = activeContextMenuExtra;
          cols = cols.filter(c => c !== col);
          localStorage.setItem(colsKey, JSON.stringify(cols));
          renderExcelGrid();
        }
      });
    }
    hideExcelContextMenu();
  });

  // Basic row deletion (just shifts data up visually or clears it)
  document.getElementById("ctxDeleteRow").addEventListener("click", () => {
    if (activeContextMenuType === "row" && activeContextMenuTarget) {
      customConfirm(currentLang === 'ru' ? "Очистить строку?" : "Clear row?", (confirmed) => {
        if (confirmed) {
          const row = parseInt(activeContextMenuTarget);
          const activeCols = getActiveCols();
          activeCols.forEach(c => {
            delete excelData[`${c}${row}`];
          });
          renderExcelGrid();
        }
      });
    }
    hideExcelContextMenu();
  });
});


function resolveCellVal(cellId, visited) {
  const raw = excelData[cellId] || "0";
  if (raw.startsWith("=")) {
    return parseExcelFormula(raw, cellId, new Set(visited));
  }
  return raw;
}

function parseExcelFormula(val, activeCellId = null, visited = new Set()) {
  if (typeof val === 'string' && val.startsWith("=")) {
    if (activeCellId) {
      if (visited.has(activeCellId)) {
        return "#CYCLE!";
      }
      visited.add(activeCellId);
    }
    const upperVal = val.toUpperCase();
    
    // Σ SUM
    const sumMatch = upperVal.match(/=SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
    if (sumMatch) {
      const colStart = sumMatch[1];
      const rStart = parseInt(sumMatch[2]);
      const colEnd = sumMatch[3];
      const rEnd = parseInt(sumMatch[4]);
      
      let sum = 0;
      for (let r = rStart; r <= rEnd; r++) {
        const cellId = `${colStart}${r}`;
        const cellVal = resolveCellVal(cellId, visited);
        if (cellVal === "#CYCLE!") return "#CYCLE!";
        const numeric = parseFloat(cellVal.replace(/[^0-9.-]/g, "")) || 0;
        sum += numeric;
      }
      return `$${sum.toFixed(2)}`;
    }
    
    // Avg AVERAGE
    const avgMatch = upperVal.match(/=AVERAGE\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
    if (avgMatch) {
      const colStart = avgMatch[1];
      const rStart = parseInt(avgMatch[2]);
      const colEnd = avgMatch[3];
      const rEnd = parseInt(avgMatch[4]);
      
      let sum = 0, count = 0;
      for (let r = rStart; r <= rEnd; r++) {
        const cellId = `${colStart}${r}`;
        const cellVal = resolveCellVal(cellId, visited);
        if (cellVal === "#CYCLE!") return "#CYCLE!";
        const numeric = parseFloat(cellVal.replace(/[^0-9.-]/g, "")) || 0;
        sum += numeric;
        count++;
      }
      return `$${(count > 0 ? sum / count : 0).toFixed(2)}`;
    }
    
    // Min MIN
    const minMatch = upperVal.match(/=MIN\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
    if (minMatch) {
      const colStart = minMatch[1];
      const rStart = parseInt(minMatch[2]);
      const colEnd = minMatch[3];
      const rEnd = parseInt(minMatch[4]);
      
      let minVal = Infinity;
      for (let r = rStart; r <= rEnd; r++) {
        const cellId = `${colStart}${r}`;
        const cellVal = resolveCellVal(cellId, visited);
        if (cellVal === "#CYCLE!") return "#CYCLE!";
        const numeric = parseFloat(cellVal.replace(/[^0-9.-]/g, "")) || 0;
        if (numeric < minVal) minVal = numeric;
      }
      return `$${(minVal === Infinity ? 0 : minVal).toFixed(2)}`;
    }
    
    // Max MAX
    const maxMatch = upperVal.match(/=MAX\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
    if (maxMatch) {
      const colStart = maxMatch[1];
      const rStart = parseInt(maxMatch[2]);
      const colEnd = maxMatch[3];
      const rEnd = parseInt(maxMatch[4]);
      
      let maxVal = -Infinity;
      for (let r = rStart; r <= rEnd; r++) {
        const cellId = `${colStart}${r}`;
        const cellVal = resolveCellVal(cellId, visited);
        if (cellVal === "#CYCLE!") return "#CYCLE!";
        const numeric = parseFloat(cellVal.replace(/[^0-9.-]/g, "")) || 0;
        if (numeric > maxVal) maxVal = numeric;
      }
      return `$${(maxVal === -Infinity ? 0 : maxVal).toFixed(2)}`;
    }

    // COUNT
    const countMatch = upperVal.match(/=COUNT\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
    if (countMatch) {
      const colStart = countMatch[1];
      const rStart = parseInt(countMatch[2]);
      const colEnd = countMatch[3];
      const rEnd = parseInt(countMatch[4]);
      
      let count = 0;
      for (let r = rStart; r <= rEnd; r++) {
        const cellId = `${colStart}${r}`;
        const cellVal = resolveCellVal(cellId, visited);
        if (cellVal === "#CYCLE!") return "#CYCLE!";
        if (cellVal && !isNaN(parseFloat(cellVal.replace(/[^0-9.-]/g, "")))) {
          count++;
        }
      }
      return count.toString();
    }
    
    // PRODUCT
    const prodMatch = upperVal.match(/=PRODUCT\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
    if (prodMatch) {
      const colStart = prodMatch[1];
      const rStart = parseInt(prodMatch[2]);
      const colEnd = prodMatch[3];
      const rEnd = parseInt(prodMatch[4]);
      
      let prod = 1;
      let hasVal = false;
      for (let r = rStart; r <= rEnd; r++) {
        const cellId = `${colStart}${r}`;
        const cellVal = resolveCellVal(cellId, visited);
        if (cellVal === "#CYCLE!") return "#CYCLE!";
        if (cellVal) {
          const numeric = parseFloat(cellVal.replace(/[^0-9.-]/g, "")) || 0;
          prod *= numeric;
          hasVal = true;
        }
      }
      return `$${(hasVal ? prod : 0).toFixed(2)}`;
    }

    // Safe Arithmetic Math Operators (e.g., =E1*F1 or =E1*1.2 or =E1-E2)
    if (/^[=0-9A-Z\+\-\*\/\(\)\.\s]+$/.test(upperVal)) {
      let expression = upperVal.substring(1); // remove "="
      const cellRefRegex = /[A-Z]+\d+/g;
      
      let containsCycle = false;
      expression = expression.replace(cellRefRegex, (cellId) => {
        const cellVal = resolveCellVal(cellId, visited);
        if (cellVal === "#CYCLE!") {
          containsCycle = true;
          return "0";
        }
        let numeric = parseFloat(cellVal.toString().replace(/[^0-9.-]/g, "")) || 0;
        return numeric.toString();
      });
      
      if (containsCycle) return "#CYCLE!";
      
      if (/^[0-9\+\-\*\/\(\)\.\s]+$/.test(expression)) {
        try {
          const result = new Function(`return (${expression})`)();
          if (typeof result === 'number' && !isNaN(result)) {
            return result % 1 === 0 ? result.toString() : `$${result.toFixed(2)}`;
          }
        } catch (err) {
          return "#VALUE!";
        }
      }
    }
    
    return "#ERROR";
  }
  return val;
}

function renderExcelGrid() {
  if (!excelSpreadsheet) return;
  
  const activeMfg = getActiveManufacturer();
  const dsSelect = document.getElementById("excelDataSource");
  const dataSource = dsSelect ? dsSelect.value : "orders";
  
  excelSpreadsheet.innerHTML = "";
  
  let defaultCols, defaultColNames;
  
  if (dataSource === "products") {
    defaultCols = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    defaultColNames = {
      A: "ID Товара",
      B: "Название",
      C: "Бренд",
      D: "Производитель",
      E: "Цена ($)",
      F: "В наличии",
      G: "Видим (👁️)",
      H: "SEO Заголовок",
      I: "SEO Описание",
      J: "SEO Ключи"
    };
  } else if (dataSource === "orders") {
    defaultCols = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];
    defaultColNames = {
      A: "ID Заказа",
      B: "Дата",
      C: "Клиент",
      D: "Сумма ($)",
      E: "Статус",
      F: "Адрес",
      G: "Комментарий",
      H: "Способ связи",
      I: "Контакт",
      J: "Служба доставки",
      K: "Трек-номер"
    };
  } else {
    // Custom Sheets default structure
    defaultCols = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];
    defaultColNames = {
      A: "Колонка 1", B: "Колонка 2", C: "Колонка 3", D: "Колонка 4", E: "Колонка 5",
      F: "Колонка 6", G: "Колонка 7", H: "Колонка 8", I: "Колонка 9", J: "Колонка 10", K: "Колонка 11"
    };
  }

  let colsKey = `brakeExcelCols_${dataSource}`;
  let namesKey = `brakeExcelColNames_${dataSource}`;

  let cols = JSON.parse(localStorage.getItem(colsKey) || "null");
  let colNames = JSON.parse(localStorage.getItem(namesKey) || "null");
  
  if (!cols || !colNames) {
    cols = defaultCols;
    colNames = defaultColNames;
    localStorage.setItem(colsKey, JSON.stringify(cols));
    localStorage.setItem(namesKey, JSON.stringify(colNames));
  }
  
  // Render Headers with Sort Buttons
  let headerHtml = `<tr><th style="width:40px;" class="excel-corner-header"></th>`;
  cols.forEach(c => {
    const isSorted = excelSortState.column === c;
    const sortIcon = isSorted ? (excelSortState.direction === "asc" ? " 🔼" : " 🔽") : " ⇅";
    headerHtml += `<th style="padding:0; z-index:10; cursor:pointer;" class="excel-header-sort" data-col="${c}">
      <div class="excel-resizable-header" style="resize:horizontal; overflow:auto; min-width:110px; padding:0.4rem 0.8rem; box-sizing:border-box; display:flex; justify-content:space-between; align-items:center; user-select:none;">
        <span>${c} <span class="col-name">(${colNames[c] || ''})</span></span>
        <span style="font-size:0.75rem; color:${isSorted ? 'var(--color-primary-start)' : '#666'};">${sortIcon}</span>
      </div>
    </th>`;
  });
  headerHtml += `</tr>`;
  excelSpreadsheet.innerHTML += headerHtml;
  
  let rowCount = 0;
  let filteredProducts = [];
  let filteredOrders = [];
  
  if (dataSource === "products") {
    filteredProducts = products.filter(p => {
      const pMfg = p.manufacturer || "Garage1";
      if (activeMfg === "all") return true;
      return pMfg === activeMfg;
    });
    
    // Group products so Excel shows only one entry per groupId
    const handledGroups = new Set();
    const excelProducts = [];
    filteredProducts.forEach(p => {
      if (!p.groupId) {
        excelProducts.push(p);
      } else {
        if (!handledGroups.has(p.groupId)) {
          handledGroups.add(p.groupId);
          excelProducts.push(p);
        }
      }
    });
    
    // Sort columns if requested
    if (excelSortState.column) {
      const col = excelSortState.column;
      const dir = excelSortState.direction === "asc" ? 1 : -1;
      excelProducts.sort((a, b) => {
        let valA, valB;
        if (col === "A") { valA = a.id; valB = b.id; }
        else if (col === "B") { valA = (a.name || "").toLowerCase(); valB = (b.name || "").toLowerCase(); }
        else if (col === "C") { valA = (a.brand || "").toLowerCase(); valB = (b.brand || "").toLowerCase(); }
        else if (col === "D") { valA = (a.manufacturer || "").toLowerCase(); valB = (b.manufacturer || "").toLowerCase(); }
        else if (col === "E") { valA = parseFloat(a.price) || 0; valB = parseFloat(b.price) || 0; }
        else if (col === "F") { valA = a.stock ? 1 : 0; valB = b.stock ? 1 : 0; }
        else if (col === "G") { valA = a.visible !== false ? 1 : 0; valB = b.visible !== false ? 1 : 0; }
        else if (col === "H") { valA = (a.seoTitle || "").toLowerCase(); valB = (b.seoTitle || "").toLowerCase(); }
        else if (col === "I") { valA = (a.seoDesc || "").toLowerCase(); valB = (b.seoDesc || "").toLowerCase(); }
        else if (col === "J") { valA = (a.seoKeywords || "").toLowerCase(); valB = (b.seoKeywords || "").toLowerCase(); }
        else { return 0; }
        
        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
      });
    }
    
    rowCount = excelProducts.length;
    
    excelProducts.forEach((p, index) => {
      const rowIdx = index + 1;
      excelData[`A${rowIdx}`] = p.id.toString();
      excelData[`B${rowIdx}`] = p.name || "";
      excelData[`C${rowIdx}`] = p.brand || "";
      excelData[`D${rowIdx}`] = p.manufacturer || "Garage1";
      excelData[`E${rowIdx}`] = (p.price || 0).toString();
      excelData[`F${rowIdx}`] = p.stock ? "true" : "false";
      excelData[`G${rowIdx}`] = p.visible !== false ? "true" : "false";
      excelData[`H${rowIdx}`] = p.seoTitle || "";
      excelData[`I${rowIdx}`] = p.seoDesc || "";
      excelData[`J${rowIdx}`] = p.seoKeywords || "";
    });
  } else if (dataSource === "orders") {
    const orders = JSON.parse(localStorage.getItem("brakeOrders") || "[]");
    
    filteredOrders = orders.filter(o => {
      if (activeMfg === "all") return true;
      return o.items.some(item => {
        const p = products.find(prod => prod.id == item.id);
        const pMfg = p ? (p.manufacturer || "Garage1") : "Garage1";
        return pMfg === activeMfg;
      });
    });
    
    // Sort columns if requested
    if (excelSortState.column) {
      const col = excelSortState.column;
      const dir = excelSortState.direction === "asc" ? 1 : -1;
      filteredOrders.sort((a, b) => {
        let valA, valB;
        if (col === "A") { valA = a.id; valB = b.id; }
        else if (col === "B") { valA = new Date(a.date).getTime(); valB = new Date(b.date).getTime(); }
        else if (col === "C") { valA = (a.customer?.name || "").toLowerCase(); valB = (b.customer?.name || "").toLowerCase(); }
        else if (col === "D") {
          const totalA = parseFloat((a.total || "0").replace(/[^0-9.-]/g, "")) || 0;
          const totalB = parseFloat((b.total || "0").replace(/[^0-9.-]/g, "")) || 0;
          valA = totalA; valB = totalB;
        }
        else if (col === "E") { valA = (a.status || "").toLowerCase(); valB = (b.status || "").toLowerCase(); }
        else if (col === "F") { valA = (a.customer?.address || "").toLowerCase(); valB = (b.customer?.address || "").toLowerCase(); }
        else if (col === "G") { valA = (a.comment || "").toLowerCase(); valB = (b.comment || "").toLowerCase(); }
        else if (col === "H") { valA = (a.preferredContact || "").toLowerCase(); valB = (b.preferredContact || "").toLowerCase(); }
        else if (col === "I") { valA = (a.contactValue || "").toLowerCase(); valB = (b.contactValue || "").toLowerCase(); }
        else if (col === "J") { valA = (a.shippingCarrier || "").toLowerCase(); valB = (b.shippingCarrier || "").toLowerCase(); }
        else if (col === "K") { valA = (a.trackingNumber || "").toLowerCase(); valB = (b.trackingNumber || "").toLowerCase(); }
        else { return 0; }
        
        if (valA < valB) return -1 * dir;
        if (valA > valB) return 1 * dir;
        return 0;
      });
    }
    
    rowCount = filteredOrders.length;
    
    filteredOrders.forEach((o, index) => {
      const rowIdx = index + 1;
      excelData[`A${rowIdx}`] = o.id.toString();
      excelData[`B${rowIdx}`] = new Date(o.date).toLocaleDateString();
      excelData[`C${rowIdx}`] = o.customer?.name || "—";
      
      let subtotal = o.total;
      if (activeMfg !== "all") {
        const mfgItems = o.items.filter(item => {
          const p = products.find(prod => prod.id == item.id);
          const pMfg = p ? (p.manufacturer || "Garage1") : "Garage1";
          return pMfg === activeMfg;
        });
        const numericSub = mfgItems.reduce((sum, it) => sum + ((it.price || 0) * it.qty), 0);
        subtotal = numericSub.toFixed(2);
      } else {
        subtotal = parseFloat(o.total.replace(/[^0-9.-]/g, "")) || 0;
      }
      
      excelData[`D${rowIdx}`] = subtotal.toString();
      excelData[`E${rowIdx}`] = o.status || "paid";
      excelData[`F${rowIdx}`] = o.customer?.address || "—";
      excelData[`G${rowIdx}`] = o.comment || "";
      excelData[`H${rowIdx}`] = o.preferredContact || "—";
      excelData[`I${rowIdx}`] = o.contactValue || "";
      excelData[`J${rowIdx}`] = o.shippingCarrier || "";
      excelData[`K${rowIdx}`] = o.trackingNumber || "";
    });
  } else {
    // Custom sheets datasource (e.g. custom_123)
    const customData = JSON.parse(localStorage.getItem(`brakeExcelData_${dataSource}`) || "{}");
    Object.assign(excelData, customData);
    rowCount = 15;
  }
  
  // Render Rows: populated rows + 5 empty slots at the bottom for calculations
  const totalRowsCount = rowCount + 5;
  const cellStyles = JSON.parse(localStorage.getItem(`brakeExcelStyles_${dataSource}`) || "{}");
  
  for (let r = 1; r <= totalRowsCount; r++) {
    let rowHtml = `<tr><td style="background:#1a1e2e; text-align:center; font-weight:bold; color:#888; padding:0;" class="excel-row-header" data-row="${r}"><div class="excel-resizable-row" style="resize:vertical; overflow:auto; min-height:25px; display:flex; align-items:center; justify-content:center; box-sizing:border-box; user-select:none;">${r}</div></td>`;
    cols.forEach(c => {
      const cellId = `${c}${r}`;
      const cellValue = excelData[cellId] || "";
      const displayVal = parseExcelFormula(cellValue, cellId);
      
      // Load saved styles
      let styleAttr = "";
      const s = cellStyles[cellId];
      if (s) {
        styleAttr = `style="${s.bold ? 'font-weight:bold;' : ''} ${s.italic ? 'font-style:italic;' : ''} ${s.underline ? 'text-decoration:underline;' : ''} ${s.background ? 'background-color:' + s.background + ';' : ''} ${s.color ? 'color:' + s.color + ';' : ''}"`;
      }
      
      rowHtml += `<td contenteditable="true" class="excel-cell-edit" data-cell="${cellId}" ${styleAttr}>${displayVal}</td>`;
    });
    rowHtml += `</tr>`;
    excelSpreadsheet.innerHTML += rowHtml;
  }
  
  // Attach Sort Listeners and Context Menu for Columns
  excelSpreadsheet.querySelectorAll(".excel-header-sort").forEach(th => {
    th.addEventListener("click", (e) => {
      // Don't sort if clicking on context menu or dragging resize (simple check: if not a direct click on header div)
      const col = th.dataset.col;
      if (excelSortState.column === col) {
        excelSortState.direction = excelSortState.direction === "asc" ? "desc" : "asc";
      } else {
        excelSortState.column = col;
        excelSortState.direction = "asc";
      }
      renderExcelGrid();
    });
    
    th.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      const col = th.dataset.col;
      const currentName = colNames[col] || '';
      customPrompt(currentLang === 'ru' ? `Новое имя для столбца ${col}:` : `New name for column ${col}:`, currentName, (newName) => {
        if (newName !== null) {
          colNames[col] = newName.trim();
          localStorage.setItem(namesKey, JSON.stringify(colNames));
          renderExcelGrid();
        }
      });
    });

    th.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showExcelContextMenu(e.clientX, e.clientY, "col", th.dataset.col, { colNames, cols, namesKey, colsKey });
    });
  });

  // Attach Context Menu for Rows
  excelSpreadsheet.querySelectorAll(".excel-row-header").forEach(td => {
    td.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showExcelContextMenu(e.clientX, e.clientY, "row", td.dataset.row, null);
    });
  });
  
  // Attach cell change and focus handlers
  excelSpreadsheet.querySelectorAll(".excel-cell-edit").forEach(td => {
    const cellId = td.dataset.cell;
    
    // Focus displays exact formula/raw value
    td.addEventListener("focus", () => {
      // Record original value to check if it changed on blur
      td.dataset.originalVal = excelData[cellId] || "";
      
      const rawVal = excelData[cellId] || "";
      td.textContent = rawVal;
      activeCellElement = td; // track selected cell
      
      // Update Formula Bar UI
      const fInput = document.getElementById("excelFormulaInput");
      const fActiveCell = document.getElementById("excelActiveCellId");
      if (fInput) fInput.value = rawVal;
      if (fActiveCell) fActiveCell.textContent = cellId;
      
      // Highlight toolbar elements to match styles
      const cellStyles = JSON.parse(localStorage.getItem(`brakeExcelStyles_${dataSource}`) || "{}");
      const s = cellStyles[cellId] || {};
      document.getElementById("excelFormatBold").style.background = s.bold ? "var(--color-primary-start)" : "#444";
      document.getElementById("excelFormatItalic").style.background = s.italic ? "var(--color-primary-start)" : "#444";
      document.getElementById("excelFormatUnderline").style.background = s.underline ? "var(--color-primary-start)" : "#444";
      document.getElementById("excelBgColor").value = s.background || "transparent";
      document.getElementById("excelTextColor").value = s.color || "#ffffff";
    });
    
    // Autocomplete on cell keyup/input
    td.addEventListener("input", (e) => {
      const txt = td.textContent;
      
      // Sync to Formula Bar
      const fInput = document.getElementById("excelFormulaInput");
      if (fInput) fInput.value = txt;
      
      if (txt.startsWith("=")) {
        showFormulaSuggestions(td, txt);
      } else {
        hideFormulaSuggestions();
      }
    });

    td.addEventListener("keydown", (e) => {
      if (e.key === "Escape" || e.key === "Enter") {
        hideFormulaSuggestions();
      }
    });

    // Blur recalculates spreadsheet
    td.addEventListener("blur", () => {
      const newVal = td.textContent.trim();
      if (newVal !== (td.dataset.originalVal || "")) {
        pushExcelState(); // Save state before updating excelData
      }
      excelData[cellId] = newVal;
      
      // Delay blur evaluation slightly to allow autocomplete click to complete
      setTimeout(() => {
        hideFormulaSuggestions();
        
        // Full grid evaluation
        excelSpreadsheet.querySelectorAll(".excel-cell-edit").forEach(cell => {
          const cid = cell.dataset.cell;
          const rawVal = excelData[cid] || "";
          if (cell !== td) {
            cell.textContent = parseExcelFormula(rawVal, cid);
          }
        });
        
        // Update our own displayed val
        td.textContent = parseExcelFormula(excelData[cellId], cellId);
      }, 200);
    });

    td.addEventListener("mousedown", (e) => {
      if (isExcelMoveMode) {
        e.preventDefault();
        pasteMovedRange(cellId);
        return;
      }
      
      if (td.classList.contains("excel-cell-selected") && excelSelectedRange) {
        // If clicking on the only selected cell, let native mousedown place the caret (don't block selectstart)
        if (excelSelectedRange.rStart === excelSelectedRange.rEnd && excelSelectedRange.cStart === excelSelectedRange.cEnd) {
          return;
        }
      }
      
      if (e.button === 0) { // left button
        isExcelSelecting = true;
        const activeCols = getActiveCols();
        const match = cellId.match(/^([A-Z]+)(\d+)$/);
        if (match) {
          const colLetter = match[1];
          const rowNum = parseInt(match[2]);
          excelSelectStart = { colIdx: activeCols.indexOf(colLetter), rowIdx: rowNum };
          excelSelectEnd = Object.assign({}, excelSelectStart);
          updateVisualSelection(activeCols);
        }
      }
    });

    td.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });

    td.addEventListener("drop", (e) => {
      e.preventDefault();
      if (isExcelMoveMode && excelMoveSourceRange) {
        pasteMovedRange(cellId);
      }
    });

    td.addEventListener("mouseenter", () => {
      if (isExcelAutofilling && excelAutofillSourceCellId) {
        const srcCol = excelAutofillSourceCellId.match(/^([A-Z]+)/)[1];
        const targetMatch = cellId.match(/^([A-Z]+)(\d+)/);
        if (targetMatch && targetMatch[1] === srcCol) {
          const srcRow = parseInt(excelAutofillSourceCellId.match(/\d+/)[0]);
          const targetRow = parseInt(targetMatch[2]);
          
          if (targetRow >= srcRow) {
            excelAutofillTargetCells = [];
            excelSpreadsheet.querySelectorAll(".excel-cell-edit").forEach(cell => {
              const cid = cell.dataset.cell;
              const match = cid.match(/^([A-Z]+)(\d+)$/);
              if (match && match[1] === srcCol) {
                const r = parseInt(match[2]);
                if (r > srcRow && r <= targetRow) {
                  cell.classList.add("excel-cell-selected");
                  excelAutofillTargetCells.push(cid);
                } else if (cid !== excelAutofillSourceCellId) {
                  cell.classList.remove("excel-cell-selected");
                }
              }
            });
          }
        }
        return;
      }
      
      if (!isExcelSelecting || !excelSelectStart) return;
      const activeCols = getActiveCols();
      const match = cellId.match(/^([A-Z]+)(\d+)$/);
      if (match) {
        const colLetter = match[1];
        const rowNum = parseInt(match[2]);
        excelSelectEnd = { colIdx: activeCols.indexOf(colLetter), rowIdx: rowNum };
        updateVisualSelection(activeCols);
      }
    });
  });

  // Dynamically render custom sheet tabs and highlight active sheet
  renderExcelSheetTabs();
}

// Floating Autocomplete Suggestion Controller
const formulaSuggestionsEl = document.getElementById("excelFormulaSuggestions");

const STANDARD_FORMULAS = [
  { name: "SUM", desc: "Сумма ячеек: =SUM(D1:D5)", snippet: "=SUM(D1:D5)" },
  { name: "AVERAGE", desc: "Среднее значение: =AVERAGE(D1:D5)", snippet: "=AVERAGE(D1:D5)" },
  { name: "MIN", desc: "Минимальное значение: =MIN(D1:D5)", snippet: "=MIN(D1:D5)" },
  { name: "MAX", desc: "Максимальное значение: =MAX(D1:D5)", snippet: "=MAX(D1:D5)" },
  { name: "COUNT", desc: "Количество числовых ячеек: =COUNT(D1:D5)", snippet: "=COUNT(D1:D5)" },
  { name: "PRODUCT", desc: "Произведение ячеек: =PRODUCT(D1:D5)", snippet: "=PRODUCT(D1:D5)" }
];

function showFormulaSuggestions(cellTd, val) {
  if (!formulaSuggestionsEl) return;
  
  const query = val.slice(1).toUpperCase(); // remove '='
  const matches = STANDARD_FORMULAS.filter(f => f.name.startsWith(query) || query === "");
  
  if (matches.length === 0) {
    formulaSuggestionsEl.style.display = "none";
    return;
  }
  
  formulaSuggestionsEl.innerHTML = "";
  
  matches.forEach(f => {
    const div = document.createElement("div");
    div.style.padding = "0.5rem 1rem";
    div.style.cursor = "pointer";
    div.style.borderBottom = "1px solid rgba(255,255,255,0.03)";
    div.style.color = "#fff";
    div.style.transition = "background 0.2s";
    
    div.innerHTML = `
      <div style="font-weight:bold; color:var(--color-primary-start);">${f.name}</div>
      <div style="font-size:0.7rem; color:#aaa;">${f.desc}</div>
    `;
    
    div.addEventListener("mouseover", () => {
      div.style.background = "rgba(255,85,0,0.15)";
    });
    div.addEventListener("mouseout", () => {
      div.style.background = "transparent";
    });
    
    div.addEventListener("mousedown", (e) => {
      e.preventDefault(); // prevent losing focus from cellTd
      cellTd.textContent = f.snippet;
      excelData[cellTd.dataset.cell] = f.snippet;
      cellTd.focus();
      hideFormulaSuggestions();
    });
    
    formulaSuggestionsEl.appendChild(div);
  });
  
  // Position Floating Autocomplete below the cell
  const rect = cellTd.getBoundingClientRect();
  const containerRect = cellTd.offsetParent.getBoundingClientRect();
  
  formulaSuggestionsEl.style.left = `${rect.left - containerRect.left}px`;
  formulaSuggestionsEl.style.top = `${rect.bottom - containerRect.top}px`;
  formulaSuggestionsEl.style.display = "block";
}

function hideFormulaSuggestions() {
  if (formulaSuggestionsEl) {
    formulaSuggestionsEl.style.display = "none";
  }
}

// Hook Excel DataSource Switcher
const excelDataSourceEl = document.getElementById("excelDataSource");
if (excelDataSourceEl) {
  excelDataSourceEl.addEventListener("change", () => {
    renderExcelGrid();
  });
}

// Hook Excel Custom Sheet Creator (+) Button
const addSheetBtn = document.getElementById("excelAddSheetBtn");
if (addSheetBtn) {
  addSheetBtn.addEventListener("click", () => {
    customPrompt(currentLang === 'ru' ? "Введите название нового листа (например: Лист 3: Цены):" : "Enter a name for the new sheet:", "", (sheetName) => {
      if (!sheetName || !sheetName.trim()) return;
      
      const sheetId = "custom_" + Date.now();
      const customSheets = JSON.parse(localStorage.getItem("brakeExcelCustomSheets") || "[]");
      customSheets.push({ id: sheetId, name: sheetName.trim() });
      localStorage.setItem("brakeExcelCustomSheets", JSON.stringify(customSheets));
      
      // Default columns layout configuration for the new custom sheet
      const colsKey = `brakeExcelCols_${sheetId}`;
      const namesKey = `brakeExcelColNames_${sheetId}`;
      localStorage.setItem(colsKey, JSON.stringify(["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"]));
      localStorage.setItem(namesKey, JSON.stringify({
        A: "Колонка 1", B: "Колонка 2", C: "Колонка 3", D: "Колонка 4", E: "Колонка 5",
        F: "Колонка 6", G: "Колонка 7", H: "Колонка 8", I: "Колонка 9", J: "Колонка 10", K: "Колонка 11"
      }));
      
      const dsSelect = document.getElementById("excelDataSource");
      if (dsSelect) {
        const opt = document.createElement("option");
        opt.value = sheetId;
        opt.textContent = sheetName;
        dsSelect.appendChild(opt);
        dsSelect.value = sheetId;
      }
      
      renderExcelSheetTabs();
      renderExcelGrid();
      showToast(currentLang === 'ru' ? `Новый лист "${sheetName}" успешно создан!` : `New sheet "${sheetName}" successfully created!`);
    });
  });
}

// Range Selection and Autofill mouseup global listener
document.addEventListener("mouseup", () => {
  if (isExcelAutofilling) {
    isExcelAutofilling = false;
    if (excelAutofillSourceCellId && excelAutofillTargetCells.length > 0) {
      pushExcelState(); // Save state for Undo before copying!
      
      const rawVal = excelData[excelAutofillSourceCellId] || "";
      const sourceMatch = excelAutofillSourceCellId.match(/^([A-Z]+)(\d+)$/);
      const sourceRow = sourceMatch ? parseInt(sourceMatch[2]) : 0;
      
      excelAutofillTargetCells.forEach(targetCellId => {
        const targetMatch = targetCellId.match(/^([A-Z]+)(\d+)$/);
        if (targetMatch) {
          const targetRow = parseInt(targetMatch[2]);
          const rowDiff = targetRow - sourceRow;
          
          if (rawVal.startsWith("=")) {
            excelData[targetCellId] = adjustFormula(rawVal, rowDiff);
          } else {
            excelData[targetCellId] = rawVal;
          }
        }
      });
      
      renderExcelGrid();
      showToast(currentLang === 'ru' ? "Формулы автозаполнены!" : "Formulas autofilled!");
    }
    
    // Clear selection highlights
    excelSpreadsheet.querySelectorAll(".excel-cell-edit").forEach(cell => {
      cell.classList.remove("excel-cell-selected");
    });
    
    excelAutofillSourceCellId = null;
    excelAutofillTargetCells = [];
    return;
  }

  if (isExcelSelecting) {
    isExcelSelecting = false;
    if (!excelSelectStart || !excelSelectEnd) return;
    
    const rStart = Math.min(excelSelectStart.rowIdx, excelSelectEnd.rowIdx);
    const rEnd = Math.max(excelSelectStart.rowIdx, excelSelectEnd.rowIdx);
    const cStart = Math.min(excelSelectStart.colIdx, excelSelectEnd.colIdx);
    const cEnd = Math.max(excelSelectStart.colIdx, excelSelectEnd.colIdx);
    
    excelSelectedRange = { rStart, rEnd, cStart, cEnd };
    
    const totalCells = (rEnd - rStart + 1) * (cEnd - cStart + 1);
    if (totalCells >= 1) {
      showSelectionPopup();
    } else {
      hideSelectionPopup();
    }
  }
});

// Prevent standard text selections when click-and-dragging cells
excelSpreadsheet.addEventListener("selectstart", (e) => {
  if (isExcelSelecting) {
    e.preventDefault();
  }
});

// Copy / Paste support
document.addEventListener("copy", (e) => {
  // Check if we have an active excel selection, and focus is not inside an active cell formula input
  if (excelSelectedRange && !document.getElementById("excelFormulaInput").matches(":focus")) {
    const activeCols = getActiveCols();
    const { rStart, rEnd, cStart, cEnd } = excelSelectedRange;
    let tsv = "";
    for (let r = rStart; r <= rEnd; r++) {
      let rowVals = [];
      for (let c = cStart; c <= cEnd; c++) {
        if (c < activeCols.length) {
          const colLetter = activeCols[c];
          const cellId = `${colLetter}${r}`;
          const val = excelData[cellId] || "";
          rowVals.push(val);
        }
      }
      tsv += rowVals.join("\t") + "\n";
    }
    if (tsv) {
      e.preventDefault();
      e.clipboardData.setData("text/plain", tsv);
      showToast(currentLang === 'ru' ? "Диапазон скопирован" : "Range copied");
    }
  }
});

document.addEventListener("paste", (e) => {
  if (activeCellElement || excelSelectedRange) {
    // If formula input is focused, let native paste happen
    if (document.getElementById("excelFormulaInput").matches(":focus")) return;
    
    const txt = (e.clipboardData || window.clipboardData).getData("text");
    if (!txt) return;
    
    // Only intercept if we are pasting a grid (contains tabs or multiple lines) 
    // or if we have an active selection we want to overwrite
    e.preventDefault();
    pushExcelState(); // save for undo
    
    const rows = txt.trimEnd().split(/\r?\n/).map(r => r.split("\t"));
    const activeCols = getActiveCols();
    let startRow, startColIdx;
    
    if (activeCellElement) {
      const match = activeCellElement.dataset.cell.match(/^([A-Z]+)(\d+)$/);
      if (match) {
        startColIdx = activeCols.indexOf(match[1]);
        startRow = parseInt(match[2]);
      }
    } else if (excelSelectedRange) {
      startRow = Math.min(excelSelectedRange.rStart, excelSelectedRange.rEnd);
      startColIdx = Math.min(excelSelectedRange.cStart, excelSelectedRange.cEnd);
    }
    
    if (startRow && startColIdx !== -1) {
      for (let i = 0; i < rows.length; i++) {
        for (let j = 0; j < rows[i].length; j++) {
          const r = startRow + i;
          const cIdx = startColIdx + j;
          if (cIdx < activeCols.length) {
            const colLetter = activeCols[cIdx];
            const cellId = `${colLetter}${r}`;
            excelData[cellId] = rows[i][j];
          }
        }
      }
      renderExcelGrid();
      showToast(currentLang === 'ru' ? "Вставлено из буфера" : "Pasted from clipboard");
    }
  }
});

// Hook Move selection action
const moveRangeBtn = document.getElementById("excelMoveRangeBtn");
if (moveRangeBtn) {
  moveRangeBtn.addEventListener("click", () => {
    if (!excelSelectedRange) return;
    
    excelMoveSourceRange = Object.assign({}, excelSelectedRange);
    isExcelMoveMode = true;
    hideSelectionPopup();
    
    excelSpreadsheet.style.cursor = "grabbing";
    excelSpreadsheet.querySelectorAll(".excel-cell-edit").forEach(cell => {
      cell.style.cursor = "grabbing";
    });
    
    showToast(currentLang === 'ru' ? "Интерактивный перенос: Выберите левую верхнюю ячейку для вставки области" : "Interactive Move: Click the top-left destination cell to paste the selected range");
  });
}

// Hook Cancel selection action
const clearSelectionBtn = document.getElementById("excelClearSelectionBtn");
if (clearSelectionBtn) {
  clearSelectionBtn.addEventListener("click", () => {
    clearExcelSelection();
  });
}

// Hook Formula Bar Input events
const formulaInput = document.getElementById("excelFormulaInput");
if (formulaInput) {
  formulaInput.addEventListener("input", () => {
    if (!activeCellElement) return;
    const cellId = activeCellElement.dataset.cell;
    const txt = formulaInput.value;
    excelData[cellId] = txt;
    activeCellElement.textContent = txt; // dynamic cell update
  });

  formulaInput.addEventListener("blur", () => {
    if (!activeCellElement) return;
    const cellId = activeCellElement.dataset.cell;
    
    // Evaluate formulas across all cells
    excelSpreadsheet.querySelectorAll(".excel-cell-edit").forEach(cell => {
      const cid = cell.dataset.cell;
      const rawVal = excelData[cid] || "";
      if (cell !== activeCellElement) {
        cell.textContent = parseExcelFormula(rawVal);
      }
    });
    
    activeCellElement.textContent = parseExcelFormula(excelData[cellId]);
  });

  formulaInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      formulaInput.blur();
      activeCellElement?.blur();
    }
  });
}

// Hook CSV Export & Import actions
const exportBtn = document.getElementById("excelExportCsvBtn");
if (exportBtn) {
  exportBtn.addEventListener("click", () => {
    const dataSource = excelDataSourceEl ? excelDataSourceEl.value : "orders";
    let colsKey = `brakeExcelCols_${dataSource}`;
    let namesKey = `brakeExcelColNames_${dataSource}`;
    let cols = JSON.parse(localStorage.getItem(colsKey) || "[]");
    let colNames = JSON.parse(localStorage.getItem(namesKey) || "{}");
    
    let maxRow = 0;
    Object.keys(excelData).forEach(key => {
      const match = key.match(/[A-Z]+(\d+)/);
      if (match) {
        const r = parseInt(match[1]);
        if (r > maxRow) maxRow = r;
      }
    });
    
    let csvRows = [];
    let header = cols.map(c => `"${c} (${colNames[c] || ''})"`).join(",");
    csvRows.push(header);
    
    for (let r = 1; r <= maxRow; r++) {
      let rowVal = cols.map(c => {
        let val = excelData[`${c}${r}`] || "";
        return `"${val.replace(/"/g, '""')}"`;
      }).join(",");
      csvRows.push(rowVal);
    }
    
    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `brake_${dataSource}_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(currentLang === 'ru' ? 'Таблица экспортирована в CSV!' : 'Table successfully exported to CSV!');
  });
}

const importBtn = document.getElementById("excelImportCsvBtn");
const fileInput = document.getElementById("excelCsvFileInput");
if (importBtn && fileInput) {
  importBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        pushExcelState(); // Save state for Undo
        const text = event.target.result;
        const lines = text.split(/\r?\n/);
        if (lines.length <= 1) return;
        
        const dataSource = excelDataSourceEl ? excelDataSourceEl.value : "orders";
        let colsKey = `brakeExcelCols_${dataSource}`;
        let cols = JSON.parse(localStorage.getItem(colsKey) || "[]");
        
        let rowIdx = 1;
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          let matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
          if (matches.length === 0) {
            matches = line.split(",");
          }
          
          matches.forEach((val, colIdx) => {
            if (colIdx >= cols.length) return;
            const colLetter = cols[colIdx];
            const cellId = `${colLetter}${rowIdx}`;
            let cleaned = val.replace(/^"|"$/g, "").replace(/""/g, '"');
            excelData[cellId] = cleaned;
          });
          rowIdx++;
        }
        
        renderExcelGrid();
        showToast(currentLang === 'ru' ? `Импортировано ${rowIdx - 1} строк! Нажмите "Синхронизировать с Базой" для сохранения.` : `Successfully imported ${rowIdx - 1} rows! Click "Sync with Database" to save.`);
      };
      reader.readAsText(file);
    }
  });
}

// Hook Excel Toolbar Formatting elements
function saveCellStyles(cellId, styleObj) {
  const dsSelect = document.getElementById("excelDataSource");
  const dataSource = dsSelect ? dsSelect.value : "orders";
  const stylesKey = `brakeExcelStyles_${dataSource}`;
  
  const cellStyles = JSON.parse(localStorage.getItem(stylesKey) || "{}");
  cellStyles[cellId] = Object.assign({}, cellStyles[cellId] || {}, styleObj);
  localStorage.setItem(stylesKey, JSON.stringify(cellStyles));
}

// Undo / Redo Toolbar buttons click event listeners
const undoBtnEl = document.getElementById("excelUndoBtn");
if (undoBtnEl) {
  undoBtnEl.addEventListener("click", () => {
    excelUndo();
  });
}
const redoBtnEl = document.getElementById("excelRedoBtn");
if (redoBtnEl) {
  redoBtnEl.addEventListener("click", () => {
    excelRedo();
  });
}

// Global Keyboard shortcuts for Ctrl+Z and Ctrl+Y
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key.toLowerCase() === "z") {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.classList.contains("excel-cell-edit") || activeEl.id === "excelFormulaInput")) {
      return; 
    }
    e.preventDefault();
    excelUndo();
  }
  if (e.ctrlKey && e.key.toLowerCase() === "y") {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.classList.contains("excel-cell-edit") || activeEl.id === "excelFormulaInput")) {
      return; 
    }
    e.preventDefault();
    excelRedo();
  }
});

document.getElementById("excelFormatBold").addEventListener("click", () => {
  if (!activeCellElement) return;
  pushExcelState(); // Save state for Undo
  const isBold = activeCellElement.style.fontWeight === "bold";
  activeCellElement.style.fontWeight = isBold ? "normal" : "bold";
  saveCellStyles(activeCellElement.dataset.cell, { bold: !isBold });
  document.getElementById("excelFormatBold").style.background = !isBold ? "var(--color-primary-start)" : "#444";
});

document.getElementById("excelFormatItalic").addEventListener("click", () => {
  if (!activeCellElement) return;
  pushExcelState(); // Save state for Undo
  const isItalic = activeCellElement.style.fontStyle === "italic";
  activeCellElement.style.fontStyle = isItalic ? "normal" : "italic";
  saveCellStyles(activeCellElement.dataset.cell, { italic: !isItalic });
  document.getElementById("excelFormatItalic").style.background = !isItalic ? "var(--color-primary-start)" : "#444";
});

document.getElementById("excelFormatUnderline").addEventListener("click", () => {
  if (!activeCellElement) return;
  pushExcelState(); // Save state for Undo
  const isUnder = activeCellElement.style.textDecoration === "underline";
  activeCellElement.style.textDecoration = isUnder ? "none" : "underline";
  saveCellStyles(activeCellElement.dataset.cell, { underline: !isUnder });
  document.getElementById("excelFormatUnderline").style.background = !isUnder ? "var(--color-primary-start)" : "#444";
});

document.getElementById("excelBgColor").addEventListener("change", (e) => {
  if (!activeCellElement) return;
  pushExcelState(); // Save state for Undo
  const bg = e.target.value;
  activeCellElement.style.backgroundColor = bg;
  saveCellStyles(activeCellElement.dataset.cell, { background: bg });
});

document.getElementById("excelTextColor").addEventListener("change", (e) => {
  if (!activeCellElement) return;
  pushExcelState(); // Save state for Undo
  const tc = e.target.value;
  activeCellElement.style.color = tc;
  saveCellStyles(activeCellElement.dataset.cell, { color: tc });
});

// Quick Formulas implementation
document.getElementById("excelFormulaSum").addEventListener("click", () => {
  if (!activeCellElement) return;
  activeCellElement.textContent = "=SUM(D1:D10)";
  activeCellElement.focus();
});

document.getElementById("excelFormulaAvg").addEventListener("click", () => {
  if (!activeCellElement) return;
  activeCellElement.textContent = "=AVERAGE(D1:D10)";
  activeCellElement.focus();
});

document.getElementById("excelFormulaMin").addEventListener("click", () => {
  if (!activeCellElement) return;
  activeCellElement.textContent = "=MIN(D1:D10)";
  activeCellElement.focus();
});

document.getElementById("excelFormulaMax").addEventListener("click", () => {
  if (!activeCellElement) return;
  activeCellElement.textContent = "=MAX(D1:D10)";
  activeCellElement.focus();
});

const excelAddColumnBtn = document.getElementById("excelAddColumnBtn");
if (excelAddColumnBtn) {
  excelAddColumnBtn.addEventListener("click", () => {
    pushExcelState(); // Save state for Undo
    const dsSelect = document.getElementById("excelDataSource");
    const dataSource = dsSelect ? dsSelect.value : "orders";
    
    let colsKey = `brakeExcelCols_${dataSource}`;
    let namesKey = `brakeExcelColNames_${dataSource}`;
    
    let cols = JSON.parse(localStorage.getItem(colsKey) || "[]");
    let colNames = JSON.parse(localStorage.getItem(namesKey) || "{}");
    
    const colLabel = prompt(currentLang === 'ru' ? "Введите описание нового столбца (например: Заводская отгрузка):" : "Enter a description for the new column:");
    if (colLabel === null) return; // cancelled
    
    // Determine next letter
    const lastLetter = cols.length > 0 ? cols[cols.length - 1] : "@";
    const nextCharCode = lastLetter.charCodeAt(0) + 1;
    if (nextCharCode > 90) { // beyond 'Z'
      alert(currentLang === 'ru' ? "Достигнуто максимальное количество столбцов (Z)!" : "Maximum column limit reached (Z)!");
      return;
    }
    const nextLetter = String.fromCharCode(nextCharCode);
    
    cols.push(nextLetter);
    colNames[nextLetter] = colLabel.trim() || `Свободный (${nextLetter})`;
    
    localStorage.setItem(colsKey, JSON.stringify(cols));
    localStorage.setItem(namesKey, JSON.stringify(colNames));
    
    renderExcelGrid();
    showToast(currentLang === 'ru' ? `Столбец ${nextLetter} (${colNames[nextLetter]}) успешно добавлен!` : `Column ${nextLetter} (${colNames[nextLetter]}) successfully added!`);
  });
}

if (syncExcelBtn) {
  syncExcelBtn.addEventListener("click", () => {
    const activeMfg = getActiveManufacturer();
    const dsSelect = document.getElementById("excelDataSource");
    const dataSource = dsSelect ? dsSelect.value : "orders";
    
    if (dataSource.startsWith("custom_")) {
      const customData = {};
      Object.keys(excelData).forEach(key => {
        if (/^[A-Z]+\d+$/.test(key)) {
          customData[key] = excelData[key];
        }
      });
      localStorage.setItem(`brakeExcelData_${dataSource}`, JSON.stringify(customData));
      showToast(currentLang === 'ru' ? "Лист успешно сохранен в базе данных!" : "Sheet successfully saved in database!");
      return;
    }

    if (dataSource === "products") {
      let counter = 0;
      const filteredProducts = products.filter(p => {
        const pMfg = p.manufacturer || "Garage1";
        if (activeMfg === "all") return true;
        return pMfg === activeMfg;
      });
      
      // Group products so we match the displayed rows
      const handledGroups = new Set();
      const excelProducts = [];
      filteredProducts.forEach(p => {
        if (!p.groupId) {
          excelProducts.push(p);
        } else {
          if (!handledGroups.has(p.groupId)) {
            handledGroups.add(p.groupId);
            excelProducts.push(p);
          }
        }
      });
      
      excelProducts.forEach((p, idx) => {
        const rowIdx = idx + 1;
        const productIdStr = excelData[`A${rowIdx}`];
        if (!productIdStr) return;
        
        const pIdx = products.findIndex(x => x.id.toString() === productIdStr);
        if (pIdx !== -1) {
          const parent = products[pIdx];
          parent.name = excelData[`B${rowIdx}`] || parent.name;
          parent.brand = excelData[`C${rowIdx}`] || parent.brand;
          parent.manufacturer = excelData[`D${rowIdx}`] || parent.manufacturer;
          
          const priceVal = excelData[`E${rowIdx}`];
          if (priceVal && !priceVal.startsWith("=")) {
            parent.price = parseFloat(priceVal) || 0;
          }
          
          parent.stock = excelData[`F${rowIdx}`] === "true";
          parent.visible = excelData[`G${rowIdx}`] === "true";
          parent.seoTitle = excelData[`H${rowIdx}`] || parent.seoTitle || "";
          parent.seoDesc = excelData[`I${rowIdx}`] || parent.seoDesc || "";
          parent.seoKeywords = excelData[`J${rowIdx}`] || parent.seoKeywords || "";
          
          // Propagate changes to the entire group
          if (parent.groupId) {
            products.forEach(other => {
              if (other.groupId === parent.groupId && other.id !== parent.id) {
                other.brand = parent.brand;
                other.manufacturer = parent.manufacturer;
                other.price = parent.price;
                other.stock = parent.stock;
                other.stockCount = parent.stockCount;
              }
            });
          }
          counter++;
        }
      });
      
      localStorage.setItem("brakeProducts", JSON.stringify(products));
      showToast(`Успешно синхронизировано ${counter} товаров на складе!`);
      renderTable();
    } else {
      const orders = JSON.parse(localStorage.getItem("brakeOrders") || "[]");
      const syncedOrdersCount = orders.length;
      let counter = 0;
      
      for (let r = 1; r <= syncedOrdersCount; r++) {
        const orderIdStr = excelData[`A${r}`];
        if (!orderIdStr) continue;
        
        const orderId = Number(orderIdStr);
        const oIdx = orders.findIndex(x => x.id === orderId);
        
        if (oIdx !== -1) {
          orders[oIdx].customer.name = excelData[`C${r}`] || orders[oIdx].customer.name;
          
          const priceVal = excelData[`D${r}`];
          if (priceVal && !priceVal.startsWith("=")) {
            orders[oIdx].total = `$${parseFloat(priceVal).toFixed(2)}`;
          }
          
          orders[oIdx].status = excelData[`E${r}`] || orders[oIdx].status;
          orders[oIdx].customer.address = excelData[`F${r}`] || orders[oIdx].customer.address;
          orders[oIdx].comment = excelData[`G${r}`] || orders[oIdx].comment;
          orders[oIdx].preferredContact = excelData[`H${r}`] || orders[oIdx].preferredContact;
          orders[oIdx].contactValue = excelData[`I${r}`] || orders[oIdx].contactValue;
          orders[oIdx].shippingCarrier = excelData[`J${r}`] || orders[oIdx].shippingCarrier;
          orders[oIdx].trackingNumber = excelData[`K${r}`] || orders[oIdx].trackingNumber;
          counter++;
        }
      }
      
      localStorage.setItem("brakeOrders", JSON.stringify(orders));
      showToast(`Успешно синхронизировано ${counter} заказов с базой данных!`);
      renderOrders();
    }
  });
}

// --- Manufacturer Info Profile Page ---
const mfgInfoForm = document.getElementById("mfgInfoForm");

function loadMfgInfo() {
  if (!mfgInfoForm) return;
  document.getElementById("mfgWorkshopName").value = manufacturerName || "Garage1";
  
  const key = `brakeMfgDetails_${manufacturerName || 'Garage1'}`;
  const info = JSON.parse(localStorage.getItem(key) || "{}");
  
  document.getElementById("mfgWorkload").value = info.workload || "Средняя (3-5 дней)";
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
    showToast("Профиль производства успешно сохранен!");
  });
}

// --- Point 15: Superuser Producer Register & Site Settings ---
const producersTableBody = document.getElementById("producersTableBody");
const openAddProducerModalBtn = document.getElementById("openAddProducerModalBtn");
const addProducerModal = document.getElementById("addProducerModal");
const addProducerForm = document.getElementById("addProducerForm");
const closeProducerModal = document.getElementById("closeProducerModal");

function loadProducers() {
  if (!producersTableBody) return;
  const allUsers = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
  const producers = allUsers.filter(u => u.role === 'admin');
  
  producersTableBody.innerHTML = producers.map(p => `
    <tr>
      <td style="font-weight:bold; color:#fff;">👤 ${p.username}</td>
      <td>🏭 ${p.manufacturer}</td>
      <td><code>${p.password}</code></td>
      <td><span class="stock-badge in-stock" style="background:#2e7d32; color:#fff;">PRODUCER</span></td>
    </tr>
  `).join('');
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
      alert("Пользователь с таким именем уже существует!");
      return;
    }
    
    allUsers.push({ username, password, role: 'admin', manufacturer: mfgName });
    localStorage.setItem("brakeUsers", JSON.stringify(allUsers));
    
    loadProducers();
    addProducerModal.style.display = "none";
    showToast("Новый производитель успешно добавлен!");
  });
}

// Superuser Site Articles and foot Settings saving
const siteSettingsForm = document.getElementById("siteSettingsForm");
function loadSiteSettings() {
  if (!siteSettingsForm) return;
  const settings = JSON.parse(localStorage.getItem("brakeSiteSettings") || "{}");
  document.getElementById("setContactEmail").value = settings.contactEmail || "support@brakediscs.com";
  
  const defaultArticles = [
    { id: 1, title_ru: "Выбор тормозных дисков", title_en: "Choosing Brake Discs", content_ru: "Как выбрать тормозные диски для мотоцикла. Опирайтесь на диаметр, состав сплава и толщину диска.", content_en: "Brake disc selection guide. Take into account diameter, metallurgical alloy and total thickness." },
    { id: 2, title_ru: "Правильная обкатка тормозов", title_en: "Brake Break-In Guide", content_ru: "Первые 100 км избегайте резких и затяжных торможений, чтобы колодки равномерно притерлись.", content_en: "Brake breaking-in instructions. Avoid heavy brake cycles during the first 100 km for optimal brake alignment." }
  ];
  const articles = JSON.parse(localStorage.getItem("brakeArticles") || JSON.stringify(defaultArticles));
  
  document.getElementById("art1TitleRu").value = articles[0]?.title_ru || "";
  document.getElementById("art1TitleEn").value = articles[0]?.title_en || "";
  document.getElementById("art1ContentRu").value = articles[0]?.content_ru || "";
  document.getElementById("art1ContentEn").value = articles[0]?.content_en || "";
  
  document.getElementById("art2TitleRu").value = articles[1]?.title_ru || "";
  document.getElementById("art2TitleEn").value = articles[1]?.title_en || "";
  document.getElementById("art2ContentRu").value = articles[1]?.content_ru || "";
  document.getElementById("art2ContentEn").value = articles[1]?.content_en || "";
}

if (siteSettingsForm) {
  siteSettingsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const contactEmail = document.getElementById("setContactEmail").value.trim();
    localStorage.setItem("brakeSiteSettings", JSON.stringify({ contactEmail }));
    
    const articles = [
      {
        id: 1,
        title_ru: document.getElementById("art1TitleRu").value.trim(),
        title_en: document.getElementById("art1TitleEn").value.trim(),
        content_ru: document.getElementById("art1ContentRu").value.trim(),
        content_en: document.getElementById("art1ContentEn").value.trim()
      },
      {
        id: 2,
        title_ru: document.getElementById("art2TitleRu").value.trim(),
        title_en: document.getElementById("art2TitleEn").value.trim(),
        content_ru: document.getElementById("art2ContentRu").value.trim(),
        content_en: document.getElementById("art2ContentEn").value.trim()
      }
    ];
    localStorage.setItem("brakeArticles", JSON.stringify(articles));
    showToast("Настройки сайта успешно сохранены!");
  });
}

// Initialise Admin dashboard
if (userRole === "admin" || userRole === "superadmin") {
  initSuperadmin();
  if (userRole === "admin" && showMfgInfoBtn) {
    showMfgInfoBtn.style.display = "block";
  }
  loadProducts();
  
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab") || "products";
  switchTab(initialTab);
} else {
  window.location.href = "index.html";
}

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
    salesChart.innerHTML = `<div style="margin:auto; color:#aaa; font-size:0.85rem;">Нет данных о продажах</div>`;
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
        <div style="font-size:0.75rem; font-weight:bold; color:#fff; margin-bottom:0.3rem;">$${Math.round(val)}</div>
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
    stockChart.innerHTML = `<div style="margin:auto; color:#aaa; font-size:0.85rem;">Нет данных о складе</div>`;
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
      bar.title = `${key}: ${val} шт.`;
      
      bar.innerHTML = `
        <div style="font-size:0.75rem; font-weight:bold; color:#fff; margin-bottom:0.3rem;">${val} шт</div>
        <div style="width:100%; flex:1; background:linear-gradient(to top, ${color} 0%, rgba(255,255,255,0.1) 100%); border-radius:4px 4px 0 0; border:1px solid ${color}; box-shadow:0 0 10px ${color}33;"></div>
      `;
      stockChart.appendChild(bar);
      
      const leg = document.createElement("div");
      leg.style.display = "flex";
      leg.style.alignItems = "center";
      leg.style.gap = "0.3rem";
      leg.innerHTML = `
        <span style="display:inline-block; width:10px; height:10px; background:${color}; border-radius:50%;"></span>
        <span>${key} (${val} ед.)</span>
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
      
      if (lowerQuery.includes("общ") || lowerQuery.includes("продаж") || lowerQuery.includes("анализ")) {
        aiText = `### 📈 Общий анализ продаж и склада<br/>
Здесь представлены агрегированные метрики вашего магазина:
* **Всего совершено продаж:** ${totalSalesCount} шт. дисков.
* **Общая полученная выручка:** $${totalRevenue.toFixed(2)}
* **Всего товаров в каталоге:** ${totalProductsCount} наименований.
* **В дефиците (под заказ):** ${outOfStockCount} позиций.
* **Скрыто (черновики):** ${hiddenDraftsCount} позиций.

**Рекомендация ИИ:** Обратите внимание на ${outOfStockCount} позиций со статусом "Под заказ". Оперативное пополнение этих запасов увеличит вашу конверсию на 15-20%.`;
      } 
      else if (lowerQuery.includes("лидир") || lowerQuery.includes("производ") || lowerQuery.includes("мастер")) {
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
        
        aiText = `### 🏭 Анализ эффективности производства<br/>
Вот статистика выручки по мастерским:
${breakDown || "*Нет зафиксированных продаж*<br/>"}
🏆 Лидирующее производство: **${winner}** с суммарным результатом **$${Math.max(maxRev, 0).toFixed(2)}**.

**Рекомендация ИИ:** Лидер продаж демонстрирует высокую скорость обработки заказов. Перенимайте их опыт по логистике!`;
      }
      else if (lowerQuery.includes("остат") || lowerQuery.includes("запас") || lowerQuery.includes("склад") || lowerQuery.includes("бренд")) {
        let stockList = "";
        Object.keys(brandStockMap).forEach(b => {
          stockList += `* **${b}:** ${brandStockMap[b]} шт. в наличии.<br/>`;
        });
        
        aiText = `### 📦 Аналитика запасов брендов<br/>
Текущее распределение готовой продукции по маркам дисков на складе:
${stockList || "*На складе отсутствуют товары в наличии*<br/>"}

**Предупреждение ИИ:** Если у какого-то бренда нулевой остаток, обязательно обновите его статус в Excel или карточках, чтобы не терять покупателей.`;
      }
      else {
        aiText = `### 🤖 Ответ ИИ-Аналитика<br/>
Я обработал ваш запрос: *"${query}"* с учетом активной роли **${userRole}** и ограничений производителя **${activeMfg}**.

**Краткая сводка:**
* Текущая выручка: **$${totalRevenue.toFixed(2)}**
* Всего товаров на складе: **${totalProductsCount} ед.**
* Скрытых карточек-черновиков: **${hiddenDraftsCount} ед.**

Вы можете спросить меня:
1. *"Сделай общий анализ продаж"*
2. *"Какая мастерская лидирует?"*
3. *"Каковы остатки на складе?"*`;
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

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".excel-sel-edge").forEach(edge => {
    edge.addEventListener("dragstart", (e) => {
      if (!excelSelectedRange) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "move_range");
      excelMoveSourceRange = Object.assign({}, excelSelectedRange);
      isExcelMoveMode = true;
    });
  });

  const autofillHandle = document.getElementById("excelAutofillHandle");
  if (autofillHandle) {
    autofillHandle.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      e.preventDefault();
      isExcelAutofilling = true;
      excelAutofillTargetCells = [];
      showToast(currentLang === 'ru' ? "Автозаполнение: Протяните курсор мыши вниз по колонке" : "Autofill: Drag your mouse down the column");
    });
  }
});
