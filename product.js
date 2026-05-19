import { initCart, addToCart } from "./cart.js?v=3";

const productMain = document.getElementById("productMain");

function loadProductDetails() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId) {
    productMain.innerHTML = `<div style="text-align:center; padding:3rem; color:#ff5555;">Товар не найден.</div>`;
    return;
  }

  // Retrieve products from localStorage
  const stored = localStorage.getItem("brakeProducts");
  if (!stored) {
    window.location.href = "index.html";
    return;
  }

  const products = JSON.parse(stored);
  window.__brakeProducts = products; // expose for cart.js
  
  const product = products.find(p => p.id == productId);

  if (!product) {
    productMain.innerHTML = `<div style="text-align:center; padding:3rem; color:#ff5555;">Товар не найден.</div>`;
    return;
  }

  const savedRole = localStorage.getItem("brakeRole") || "user";
  const isAdmin = savedRole === "admin" || savedRole === "superadmin";

  if (product.visible === false && !isAdmin) {
    productMain.innerHTML = `<div style="text-align:center; padding:3rem; color:#ff5555; font-size:1.2rem; font-weight:bold;">Данный товар временно скрыт производителем.</div>`;
    return;
  }

  // Update page title
  document.title = `${product.name} – Brake Discs Store`;
  
  // Update Meta SEO if available
  if (product.seoDesc) {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = product.seoDesc;
  }

  const SVG_FALLBACK = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="100%" height="100%"><defs><radialGradient id="discGrad" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="%23444" /><stop offset="70%" stop-color="%23222" /><stop offset="85%" stop-color="%23666" /><stop offset="95%" stop-color="%23111" /><stop offset="100%" stop-color="%23ff5500" /></radialGradient></defs><rect width="100%" height="100%" fill="%23151518" /><circle cx="150" cy="100" r="75" fill="none" stroke="%23ff5500" stroke-width="2" opacity="0.4" /><circle cx="150" cy="100" r="70" fill="url(%23discGrad)" stroke="%23444" stroke-width="4" /><circle cx="150" cy="100" r="50" fill="none" stroke="%230a0a0c" stroke-width="4" stroke-dasharray="10 15" /><circle cx="150" cy="100" r="35" fill="none" stroke="%230a0a0c" stroke-width="4" stroke-dasharray="8 12" /><circle cx="150" cy="100" r="20" fill="%23111" stroke="%23ff5500" stroke-width="2" /><circle cx="150" cy="88" r="3" fill="%23666" /><circle cx="162" cy="106" r="3" fill="%23666" /><circle cx="138" cy="106" r="3" fill="%23666" /><path d="M 78,55 C 80,45 100,40 120,48 L 115,75 C 100,68 88,68 85,73 Z" fill="%23ff1744" stroke="%23d50000" stroke-width="2" /><text x="100" y="60" fill="%23fff" font-size="8" font-family="Arial" font-weight="bold" transform="rotate(-15, 100, 60)">BREMBO</text><text x="150" y="185" fill="%23aaa" font-size="12" font-family="sans-serif" text-anchor="middle" font-weight="bold">MOTO BRAKE PREMIUM</text></svg>`;

  // Render Product
  const stockClass = product.stock ? "in-stock" : "out-stock";
  const stockText = product.stock ? "В наличии" : "Под заказ";
  const mfg = product.manufacturer || "Garage1";

  // Gallery of photos
  const gallery = product.gallery || [];
  const allImages = [product.image || SVG_FALLBACK, ...gallery].filter(Boolean);
  
  let galleryHtml = "";
  if (allImages.length > 1) {
    galleryHtml = `
      <div class="product-gallery-thumbnails" style="display:flex; gap:0.6rem; margin-top:0.8rem; overflow-x:auto; padding-bottom:0.4rem; max-width:500px;">
        ${allImages.map((img, idx) => `
          <img src="${img}" class="gallery-thumb ${idx === 0 ? 'active' : ''}" data-idx="${idx}" style="width:65px; height:65px; border-radius:8px; object-fit:cover; border:2px solid ${idx === 0 ? 'var(--color-primary-start)' : 'rgba(255,255,255,0.1)'}; cursor:pointer; transition:var(--transition); background:var(--color-surface);" />
        `).join('')}
      </div>
    `;
  }

  // Point 4: Hide Buy button for admin/superadmin (reuse savedRole & isAdmin from above)
  let btnHtml = "";
  if (isAdmin) {
    btnHtml = `
      <div style="display:flex; gap:1rem; flex-wrap:wrap; margin-top:1.5rem;">
        <button class="add-to-cart add-to-cart-large" id="detailAddToCartBtn" style="background:#555; color:#aaa; cursor:default; border:none; margin-top:0;" disabled>🔒 Администрирование</button>
      </div>
    `;
  } else {
    btnHtml = `
      <div style="display:flex; gap:1rem; flex-wrap:wrap; margin-top:1.5rem;">
        <button class="add-to-cart add-to-cart-large" id="detailAddToCartBtn" style="margin-top:0;">🛒 Добавить в корзину</button>
        <button class="ask-mfg-btn" id="detailAskMfgBtn" style="padding:1rem 2rem; font-size:1.2rem; background:transparent; color:#fff; border:2px solid var(--color-primary-start); border-radius:var(--radius); cursor:pointer; font-weight:bold; transition:var(--transition); outline:none;" onmouseover="this.style.background='var(--color-primary-start)'; this.style.borderColor='var(--color-primary-start)';" onmouseout="this.style.background='transparent'; this.style.borderColor='var(--color-primary-start)';">💬 Задать вопрос о товаре</button>
      </div>
    `;
  }
  
  const priceVal = parseFloat(product.price);
  const displayPrice = isNaN(priceVal) ? "0.00" : priceVal.toFixed(2);

  productMain.innerHTML = `
    <div class="product-details-container">
      <div style="flex:1; max-width:500px; display:flex; flex-direction:column;">
        <img src="${product.image || SVG_FALLBACK}" alt="${product.name}" class="product-image-large" style="width:100%;" />
        ${galleryHtml}
      </div>
      <div class="product-info-large">
        <div class="brand-tag">
          <strong>${product.brand || 'BrakeDiscs'}</strong> 
          <span style="margin-left:1rem; color:#888; font-size:0.9rem;">ID: ${product.id}</span>
        </div>
        <h1 class="product-title" style="margin:0.2rem 0;">${product.name}</h1>
        <!-- Point 6: Render manufacturer brand inside product cards/pages -->
        <div style="font-size:1.05rem; color:#fff; font-weight:bold; margin-bottom:0.5rem; display:flex; align-items:center; gap:0.4rem;">
          <span>🏭 Производитель:</span>
          <a href="#" id="mfgDetailsLink" style="color:var(--color-primary-start); text-decoration:underline; font-weight:bold; cursor:pointer; transition:var(--transition);">${mfg}</a>
        </div>
        <div>
          <span class="stock-status ${stockClass}">${stockText}</span>
        </div>
        <div class="product-price-large" style="margin-top:0.5rem;">$${displayPrice}</div>
        <div class="product-desc-large" style="margin-top:1rem; border-top:1px solid rgba(255,255,255,0.08); padding-top:1rem;">
          ${product.seoDesc ? product.seoDesc : 'Высококачественный тормозной диск для вашего мотоцикла. Описание скоро будет добавлено.'}
        </div>
        <div id="compatibilitySection" style="margin-top:1rem; border-top:1px solid rgba(255,255,255,0.08); padding-top:1rem; display:none;">
          <h3 style="color:var(--color-primary-start); margin-bottom:0.8rem; font-size:1.1rem; text-transform:uppercase; letter-spacing:1px;">🏍️ Совместимость с мотоциклами:</h3>
          <div id="compatibilityList" style="display:flex; flex-wrap:wrap; gap:0.6rem;"></div>
        </div>
        ${btnHtml}
      </div>
    </div>
  `;

  // Handle Compatibility list
  if (product.groupId) {
    const compProducts = products.filter(p => p.groupId === product.groupId && p.id != product.id);
    if (compProducts.length > 0) {
      const compSec = document.getElementById("compatibilitySection");
      if (compSec) compSec.style.display = "block";
      const compListEl = document.getElementById("compatibilityList");
      if (compListEl) {
        compListEl.innerHTML = compProducts.map(p => {
          let motoName = p.motoModel;
          if (!motoName) {
            const idx = p.name.toLowerCase().lastIndexOf(" для ");
            if (idx !== -1) motoName = p.name.substring(idx + 5);
            else motoName = p.name;
          }
          motoName = motoName.trim();
          // Optional: Capitalize first letter if you want
          // motoName = motoName.charAt(0).toUpperCase() + motoName.slice(1);
          
          if (p.visible === false) {
             return `<span style="padding:0.4rem 0.8rem; background:rgba(255,255,255,0.02); border:1px dashed rgba(255,255,255,0.1); border-radius:20px; color:#888; font-size:0.9rem; cursor:default;" title="Карточка пока скрыта">${motoName}</span>`;
          }
          return `<a href="product.html?id=${p.id}" style="padding:0.4rem 0.8rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); border-radius:20px; color:#fff; text-decoration:none; font-size:0.9rem; transition:background 0.2s; text-transform:capitalize;">${motoName}</a>`;
        }).join("");
      }
    }
  }

  // Bind image error fallback via JS (inline onerror breaks due to SVG quotes)
  const detailImg = productMain.querySelector(".product-image-large");
  if (detailImg) {
    detailImg.addEventListener("error", function() {
      this.onerror = null;
      this.src = SVG_FALLBACK;
    });
  }

  // Handle gallery thumbnail clicks
  const thumbs = productMain.querySelectorAll(".gallery-thumb");
  thumbs.forEach(thumb => {
    thumb.addEventListener("click", () => {
      thumbs.forEach(t => {
        t.style.borderColor = "rgba(255,255,255,0.1)";
        t.classList.remove("active");
      });
      thumb.style.borderColor = "var(--color-primary-start)";
      thumb.classList.add("active");
      detailImg.src = thumb.src;
    });
  });

  // Handle Manufacturer Info Modal Link
  const mfgLink = document.getElementById("mfgDetailsLink");
  const mfgModal = document.getElementById("mfgInfoModal");
  const closeMfgBtn = document.getElementById("closeMfgInfoBtn");
  
  if (mfgLink && mfgModal) {
    mfgLink.addEventListener("click", (e) => {
      e.preventDefault();
      const key = `brakeMfgDetails_${mfg}`;
      const info = JSON.parse(localStorage.getItem(key) || "{}");
      
      // Try to find the manufacturer account phone/email from users database too!
      const users = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
      const mfgUser = users.find(u => u.manufacturer === mfg) || {};
      
      document.getElementById("mfgInfoTitle").textContent = `${mfg}`;
      document.getElementById("mfgInfoDesc").textContent = info.description || "Описание пока не заполнено производителем.";
      
      const rawWorkload = info.workload || "Не указана";
      document.getElementById("mfgInfoWorkload").textContent = rawWorkload;
      
      // Dynamic Workload Badge Styling
      const workloadLower = rawWorkload.toLowerCase();
      const badge = document.getElementById("mfgInfoWorkloadBadge");
      if (badge) {
        if (workloadLower.includes("высок") || workloadLower.includes("занят") || workloadLower.includes("high") || /([89]\d|100)%/.test(workloadLower)) {
          badge.style.background = "rgba(239, 68, 68, 0.15)";
          badge.style.border = "1px solid rgba(239, 68, 68, 0.3)";
          badge.style.color = "#ef4444";
        } else if (workloadLower.includes("средн") || workloadLower.includes("med") || /([4567]\d)%/.test(workloadLower)) {
          badge.style.background = "rgba(245, 158, 11, 0.15)";
          badge.style.border = "1px solid rgba(245, 158, 11, 0.3)";
          badge.style.color = "#f59e0b";
        } else {
          badge.style.background = "rgba(16, 185, 129, 0.15)";
          badge.style.border = "1px solid rgba(16, 185, 129, 0.3)";
          badge.style.color = "#10b981";
        }
      }

      document.getElementById("mfgInfoMaterials").textContent = info.materials || "Сталь, карбон, металлокерамика";
      document.getElementById("mfgInfoAddress").textContent = info.address || "Не указан";
      
      const contacts = [];
      if (info.phone) contacts.push(`Тел: ${info.phone}`);
      if (mfgUser.username) contacts.push(`Email/Логин: ${mfgUser.username}@motobrake.ru`);
      
      document.getElementById("mfgInfoPhone").textContent = contacts.length > 0 ? contacts.join(", ") : "Контакты не указаны";
      
      mfgModal.style.display = "flex";
    });
  }
  
  if (closeMfgBtn && mfgModal) {
    closeMfgBtn.addEventListener("click", () => {
      mfgModal.style.display = "none";
    });
  }

  // Hook Ask Manufacturer button from the manufacturer details card
  const mfgAskQuestionBtn = document.getElementById("mfgAskQuestionBtn");
  if (mfgAskQuestionBtn && mfgModal) {
    mfgAskQuestionBtn.addEventListener("click", () => {
      mfgModal.style.display = "none";
      const askModal = document.getElementById("askProductModal");
      const askWarning = document.getElementById("askProductWarning");
      const askText = document.getElementById("askProductText");
      const submitBtn = document.getElementById("submitProductAskBtn");
      
      if (askModal) {
        askModal.style.display = "flex";
        const user = localStorage.getItem("brakeUser");
        if (!user) {
          askWarning.style.display = "block";
          askText.disabled = true;
          submitBtn.disabled = true;
        } else {
          askWarning.style.display = "none";
          askText.disabled = false;
          submitBtn.disabled = false;
          askText.value = `Здравствуйте! Вопрос производителю "${mfg}" касательно товара "${product.name}" (ID: ${product.id}): `;
          document.getElementById("askProductRecipient").value = mfg;
        }
      }
    });
  }

  // Handle Ask Product Modal
  const askBtn = document.getElementById("detailAskMfgBtn");
  const askModal = document.getElementById("askProductModal");
  const closeAskBtn = document.getElementById("closeProductAskBtn");
  const askForm = document.getElementById("askProductForm");
  const askWarning = document.getElementById("askProductWarning");
  const askText = document.getElementById("askProductText");
  const submitBtn = document.getElementById("submitProductAskBtn");
  
  if (askBtn && askModal) {
    askBtn.addEventListener("click", () => {
      askModal.style.display = "flex";
      const user = localStorage.getItem("brakeUser");
      
      if (!user) {
        askWarning.style.display = "block";
        askText.disabled = true;
        submitBtn.disabled = true;
      } else {
        askWarning.style.display = "none";
        askText.disabled = false;
        submitBtn.disabled = false;
        // Pre-fill question field
        askText.value = `Здравствуйте! У меня вопрос о товаре "${product.name}" (ID: ${product.id}): `;
        document.getElementById("askProductRecipient").value = mfg;
      }
    });
  }
  
  if (closeAskBtn && askModal) {
    closeAskBtn.addEventListener("click", () => {
      askModal.style.display = "none";
    });
  }
  
  if (askForm) {
    askForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = askText.value.trim();
      if (!text) return;
      
      const user = JSON.parse(localStorage.getItem("brakeUser") || "{}");
      const username = user.username || "Гость";
      
      const msgs = JSON.parse(localStorage.getItem("brakeMessages") || "[]");
      msgs.push({
        id: Date.now(),
        username: username,
        sender: "user",
        text: text,
        date: new Date().toISOString(),
        readByAdmin: false,
        manufacturer: mfg
      });
      localStorage.setItem("brakeMessages", JSON.stringify(msgs));
      
      alert("Ваш вопрос успешно отправлен производителю! Ответ появится в вашем личном кабинете.");
      askForm.reset();
      askModal.style.display = "none";
    });
  }

  if (!isAdmin) {
    document.getElementById("detailAddToCartBtn").addEventListener("click", () => {
      addToCart(product.id);
    });
  }
}

initCart();
loadProductDetails();
