import "./serverSync.js";
import { initCart, addToCart } from "./cart.js";

const productMain = document.getElementById("productMain");

// ===== LIGHTBOX CONTROLLER =====
const lightboxOverlay = document.getElementById("lightboxOverlay");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxClose = document.getElementById("lightboxClose");
const lightboxPrev = document.getElementById("lightboxPrev");
const lightboxNext = document.getElementById("lightboxNext");
const lightboxCounter = document.getElementById("lightboxCounter");
const lightboxThumbs = document.getElementById("lightboxThumbs");

let lightboxImages = [];
let lightboxIndex = 0;

function openLightbox(images, startIdx = 0) {
  lightboxImages = images;
  lightboxIndex = startIdx;
  renderLightbox();
  lightboxOverlay.style.display = "flex";
  requestAnimationFrame(() => {
    lightboxOverlay.classList.add("visible");
  });
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightboxOverlay.classList.remove("visible");
  setTimeout(() => {
    lightboxOverlay.style.display = "none";
  }, 350);
  document.body.style.overflow = "";
}

function renderLightbox() {
  lightboxImage.src = lightboxImages[lightboxIndex];
  lightboxCounter.textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
  
  // Show/hide nav arrows
  lightboxPrev.style.display = lightboxImages.length > 1 ? "flex" : "none";
  lightboxNext.style.display = lightboxImages.length > 1 ? "flex" : "none";
  
  // Render thumbnails
  lightboxThumbs.innerHTML = lightboxImages.map((img, idx) => `
    <img src="${img}" class="lightbox-thumb ${idx === lightboxIndex ? 'active' : ''}" data-idx="${idx}" alt="Photo ${idx + 1}" />
  `).join('');
  
  lightboxThumbs.querySelectorAll('.lightbox-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      lightboxIndex = parseInt(thumb.dataset.idx);
      renderLightbox();
    });
  });
}

function lightboxPrevImg() {
  lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
  renderLightbox();
}

function lightboxNextImg() {
  lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
  renderLightbox();
}

lightboxClose.addEventListener("click", closeLightbox);
lightboxPrev.addEventListener("click", lightboxPrevImg);
lightboxNext.addEventListener("click", lightboxNextImg);

lightboxOverlay.addEventListener("click", (e) => {
  if (e.target === lightboxOverlay) closeLightbox();
});

document.addEventListener("keydown", (e) => {
  if (lightboxOverlay.style.display !== "flex") return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") lightboxPrevImg();
  if (e.key === "ArrowRight") lightboxNextImg();
});

// ===== PRODUCT PAGE RENDER =====
// ===== PRODUCT PAGE RENDER =====
// Language logic removed as site is strictly English
function applyStaticTranslations() {
  const navBack = document.getElementById("navBackLink");
  if (navBack) navBack.textContent = "← Return to Shop";

  const drawerCart = document.getElementById("drawerCartTitle");
  if (drawerCart) drawerCart.textContent = "Your Cart";

  const lblCart = document.getElementById("lblCartTotal");
  if (lblCart) lblCart.textContent = "Subtotal:";

  const btnCheck = document.getElementById("btnCheckout");
  if (btnCheck) btnCheck.textContent = "Go to Checkout";

  const loadText = document.getElementById("productLoadingText");
  if (loadText) loadText.textContent = "Loading product...";
  
  // Modal title and subtitles
  const mfgInfoTitle = document.getElementById("mfgInfoTitle");
  if (mfgInfoTitle) mfgInfoTitle.textContent = "Manufacturer";
  
  const mfgModalSubtitle = document.getElementById("mfgModalSubtitle");
  if (mfgModalSubtitle) mfgModalSubtitle.textContent = "Official workshop profile";
  const mfgLblDesc = document.getElementById("mfgLblDesc");
  if (mfgLblDesc) mfgLblDesc.textContent = "📖 Description & Technologies";
  const mfgLblWorkload = document.getElementById("mfgLblWorkload");
  if (mfgLblWorkload) mfgLblWorkload.textContent = "📊 Workload";
  const mfgLblMaterials = document.getElementById("mfgLblMaterials");
  if (mfgLblMaterials) mfgLblMaterials.textContent = "🛠️ Materials";
  const mfgLblAddress = document.getElementById("mfgLblAddress");
  if (mfgLblAddress) mfgLblAddress.textContent = "📍 Workshop Address";
  const mfgLblContacts = document.getElementById("mfgLblContacts");
  if (mfgLblContacts) mfgLblContacts.textContent = "📞 Contacts";
  const mfgLblArticles = document.getElementById("mfgLblArticles");
  if (mfgLblArticles) mfgLblArticles.textContent = "📝 Workshop Articles & Reviews";

  const btnMfgView = document.getElementById("mfgViewProductsBtn");
  if (btnMfgView) btnMfgView.textContent = "View Products";

  const btnMfgAsk = document.getElementById("mfgAskQuestionBtn");
  if (btnMfgAsk) btnMfgAsk.textContent = "Ask Question";

  const btnMfgClose = document.getElementById("closeMfgInfoBtn");
  if (btnMfgClose) btnMfgClose.textContent = "Close";
}

function injectSchemaOrg(product) {
  let existing = document.getElementById("productSchemaJson");
  if (existing) existing.remove();
  
  const schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "image": product.image || "",
    "description": product.seoDesc || `High-quality brake disc for motorcycle. Compatibility: ${product.brand} ${product.motoModel || ''} (${product.motoYears || ''}).`,
    "brand": {
      "@type": "Brand",
      "name": product.brand || "BrakeDiscs"
    },
    "offers": {
      "@type": "Offer",
      "url": window.location.href,
      "priceCurrency": "USD",
      "price": parseFloat(product.price) || 0.00,
      "itemCondition": "https://schema.org/NewCondition",
      "availability": product.stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    },
    "additionalProperty": [
      {
        "@type": "PropertyValue",
        "name": "Motorcycle Model",
        "value": product.motoModel || ""
      },
      {
        "@type": "PropertyValue",
        "name": "Production Years",
        "value": product.motoYears || ""
      },
      {
        "@type": "PropertyValue",
        "name": "Placement Type",
        "value": (product.placement || 'Front') === 'Front' ? "Front Brake Disc" : "Rear Brake Disc"
      },
      {
        "@type": "PropertyValue",
        "name": "Manufacturer Workshop",
        "value": product.manufacturer || "Garage1"
      }
    ]
  };
  
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `Which motorcycle models is the ${product.name} compatible with?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `The ${product.name} is designed specifically for ${product.brand || 'various'} motorcycles, matching model ${product.motoModel || 'general compatibilities'} and production years ${product.motoYears || 'all years'}.`
        }
      },
      {
        "@type": "Question",
        "name": `Who manufactures the ${product.name} brake disc?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `This high-performance brake disc is manufactured by the professional workshop ${product.manufacturer || 'Garage1'} and is available at MotoBrake Store.`
        }
      }
    ]
  };
  
  const script = document.createElement("script");
  script.id = "productSchemaJson";
  script.type = "application/ld+json";
  script.textContent = JSON.stringify([schema, faqSchema]);
  document.head.appendChild(script);
}

function loadProductDetails() {
  applyStaticTranslations();
  
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId) {
    productMain.innerHTML = `<div style="text-align:center; padding:3rem; color:#ff5555;">Product not found.</div>`;
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
  
  const product = products.find(p => p.id == productId || p.slug === productId);

  if (!product) {
    productMain.innerHTML = `<div style="text-align:center; padding:3rem; color:#ff5555;">Product not found.</div>`;
    return;
  }

  // Inject dynamic JSON-LD SEO schema
  injectSchemaOrg(product);

  const savedRole = localStorage.getItem("brakeRole") || "user";
  const isAdmin = savedRole === "admin" || savedRole === "superadmin";

  if (product.visible === false && !isAdmin) {
    productMain.innerHTML = `<div style="text-align:center; padding:3rem; color:#ff5555; font-size:1.2rem; font-weight:bold;">This product is temporarily hidden by the manufacturer.</div>`;
    return;
  }

  // Update page title
  const pageTitle = (product.seo && product.seo.title) || product.seoTitle || `${product.name} – Brake Discs Store`;
  document.title = pageTitle;
  
  // Update Meta SEO if available
  const desc = (product.seo && product.seo.description) || product.seoDesc;
  if (desc) {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = desc;
  }

  const keywords = (product.seo && product.seo.keywords) || product.seoKeywords;
  if (keywords) {
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.name = "keywords";
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.content = keywords;
  }

  const SVG_FALLBACK = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="100%" height="100%"><defs><radialGradient id="discGrad" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="%23444" /><stop offset="70%" stop-color="%23222" /><stop offset="85%" stop-color="%23666" /><stop offset="95%" stop-color="%23111" /><stop offset="100%" stop-color="%23ff5500" /></radialGradient></defs><rect width="100%" height="100%" fill="%23151518" /><circle cx="150" cy="100" r="75" fill="none" stroke="%23ff5500" stroke-width="2" opacity="0.4" /><circle cx="150" cy="100" r="70" fill="url(%23discGrad)" stroke="%23444" stroke-width="4" /><circle cx="150" cy="100" r="50" fill="none" stroke="%230a0a0c" stroke-width="4" stroke-dasharray="10 15" /><circle cx="150" cy="100" r="35" fill="none" stroke="%230a0a0c" stroke-width="4" stroke-dasharray="8 12" /><circle cx="150" cy="100" r="20" fill="%23111" stroke="%23ff5500" stroke-width="2" /><circle cx="150" cy="88" r="3" fill="%23666" /><circle cx="162" cy="106" r="3" fill="%23666" /><circle cx="138" cy="106" r="3" fill="%23666" /><path d="M 78,55 C 80,45 100,40 120,48 L 115,75 C 100,68 88,68 85,73 Z" fill="%23ff1744" stroke="%23d50000" stroke-width="2" /><text x="100" y="60" fill="%23fff" font-size="8" font-family="Arial" font-weight="bold" transform="rotate(-15, 100, 60)">BREMBO</text><text x="150" y="185" fill="%23aaa" font-size="12" font-family="sans-serif" text-anchor="middle" font-weight="bold">MOTO BRAKE PREMIUM</text></svg>`;

  // Render Product
  const stockClass = product.stock ? "in-stock" : "out-stock";
  const stockText = product.stock ? "In Stock" : "On Request";
  const mfg = product.manufacturer || "Garage1";

  // Gallery of photos
  const gallery = product.gallery || [];
  const allImages = [product.image || SVG_FALLBACK, ...gallery].filter(Boolean);
  
  // Build gallery HTML
  let galleryHtml = "";
  if (allImages.length > 1) {
    const thumbsHtml = allImages.map((img, idx) => `
      <img src="${img}" class="gallery-thumb ${idx === 0 ? 'active' : ''}" data-idx="${idx}" alt="Photo ${idx + 1}" />
    `).join('');
    
    galleryHtml = `
      <div class="product-gallery">
        <div class="gallery-thumbs-col">
          ${thumbsHtml}
        </div>
        <div class="gallery-main-wrap" id="galleryMainWrap">
          <img src="${allImages[0]}" alt="${product.name}" class="product-image-large" id="mainProductImage" />
          <div class="gallery-counter" id="galleryCounter">1 / ${allImages.length}</div>
          <div class="gallery-zoom-hint">🔍 Click to zoom</div>
        </div>
      </div>
    `;
  } else {
    galleryHtml = `
      <div class="product-gallery gallery-single">
        <div class="gallery-main-wrap" id="galleryMainWrap">
          <img src="${allImages[0]}" alt="${product.name}" class="product-image-large" id="mainProductImage" />
          <div class="gallery-zoom-hint">🔍 Click to zoom</div>
        </div>
      </div>
    `;
  }

  // Hide Buy button for admin/superadmin
  let btnHtml = "";
  if (isAdmin) {
    btnHtml = `
      <div style="display:flex; gap:1rem; flex-wrap:wrap; margin-top:1.5rem;">
        <button class="add-to-cart add-to-cart-large" id="detailAddToCartBtn" style="background:var(--color-input-bg); color:var(--color-text); border:1px solid var(--color-border); cursor:default; margin-top:0;" disabled>🔒 Admin Mode</button>
      </div>
    `;
  } else {
    btnHtml = `
      <div style="display:flex; gap:1rem; flex-wrap:wrap; margin-top:1.5rem;">
        <button class="add-to-cart add-to-cart-large" id="detailAddToCartBtn" style="margin-top:0;">🛒 Buy Now</button>
        <button class="ask-mfg-btn" id="detailAskMfgBtn" style="padding:1rem 2rem; font-size:1.2rem; background:transparent; color:var(--color-text-bright); border:2px solid var(--color-primary-start); border-radius:var(--radius); cursor:pointer; font-weight:bold; transition:var(--transition); outline:none;" onmouseover="this.style.background='var(--color-primary-start)'; this.style.borderColor='var(--color-primary-start)';" onmouseout="this.style.background='transparent'; this.style.borderColor='var(--color-primary-start)';">💬 Ask Question</button>
      </div>
    `;
  }
  
  const priceVal = parseFloat(product.price);
  const displayPrice = isNaN(priceVal) ? "0.00" : priceVal.toFixed(2);

  const placementText = (product.placement || 'Front') === 'Front' ? "Front" : "Rear";

  productMain.innerHTML = `
    <div class="product-details-container">
      ${galleryHtml}
      <div class="product-info-large">
        <div class="brand-tag">
          <strong>${product.brand || 'BrakeDiscs'}</strong> 
          <span style="margin-left:1rem; color:#888; font-size:0.9rem;">ID: ${product.id}</span>
        </div>
        <h1 class="product-title" style="margin:0.2rem 0;">${product.name}</h1>
        <div style="font-size:1.05rem; color:var(--color-text-bright); font-weight:bold; margin-bottom:0.3rem; display:flex; align-items:center; gap:0.4rem;">
          <span>🏭 Manufacturer:</span>
          <a href="#" id="mfgDetailsLink" style="color:var(--color-primary-start); text-decoration:underline; font-weight:bold; cursor:pointer; transition:var(--transition);">${mfg}</a>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:1.2rem; font-size:1.05rem; color:var(--color-text); margin-bottom:0.5rem;">
          ${product.motoModel ? `<span>🏍️ <strong>Model:</strong> ${product.motoModel}</span>` : ''}
          ${product.motoYears ? `<span>📅 <strong>Years:</strong> <span style="color:var(--color-primary-start); font-weight:bold;">${product.motoYears}</span></span>` : ''}
          <span>⚙️ <strong>Disc Type:</strong> <span style="color:var(--color-primary-start); font-weight:bold;">${placementText}</span></span>
        </div>
        <div>
          <span class="stock-status ${stockClass}">${stockText}</span>
        </div>
        <div class="product-price-large" style="margin-top:0.5rem;">$${displayPrice}</div>
        <div class="product-desc-large" style="margin-top:1rem; border-top:1px solid var(--color-border); padding-top:1rem;">
          ${product.seoDesc ? product.seoDesc : 'High-quality brake disc for your motorcycle. Description will be added soon.'}
        </div>
        <div id="compatibilitySection" style="margin-top:1rem; border-top:1px solid var(--color-border); padding-top:1rem; display:none;">
          <h3 style="color:var(--color-primary-start); margin-bottom:0.8rem; font-size:1.1rem; text-transform:uppercase; letter-spacing:1px;">🏍️ Compatible Motorcycle Models:</h3>
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
            const idx = p.name.toLowerCase().lastIndexOf(" for ");
            if (idx !== -1) motoName = p.name.substring(idx + 5);
            else motoName = p.name;
          }
          motoName = motoName.trim();
          // Optional: Capitalize first letter if you want
          // motoName = motoName.charAt(0).toUpperCase() + motoName.slice(1);
          
          if (p.visible === false) {
             const hiddenTitle = "Card is currently hidden";
             return `<span style="padding:0.4rem 0.8rem; background:var(--color-input-bg); border:1px dashed rgba(255,255,255,0.1); border-radius:20px; color:#888; font-size:0.9rem; cursor:default;" title="${hiddenTitle}">${motoName}</span>`;
          }
          return `<a href="product.html?id=${p.slug || p.id}" style="padding:0.4rem 0.8rem; background:var(--color-input-bg); border:1px solid var(--color-border); border-radius:20px; color:var(--color-text-bright); text-decoration:none; font-size:0.9rem; transition:background 0.2s; text-transform:capitalize;">${motoName}</a>`;
        }).join("");
      }
    }
  }

  // Bind image error fallback via JS (inline onerror breaks due to SVG quotes)
  const detailImg = document.getElementById("mainProductImage");
  const zoomHint = productMain.querySelector(".gallery-zoom-hint");

  function updateZoomInteractivity() {
    if (!detailImg) return;
    const currentImg = allImages[currentGalleryIdx];
    const isFallback = !currentImg || currentImg.startsWith("data:image/svg+xml") || detailImg.src.startsWith("data:image/svg+xml");
    if (isFallback) {
      detailImg.style.cursor = "default";
      if (zoomHint) zoomHint.style.display = "none";
    } else {
      detailImg.style.cursor = "zoom-in";
      if (zoomHint) zoomHint.style.display = "block";
    }
  }

  if (detailImg) {
    detailImg.addEventListener("error", function() {
      this.onerror = null;
      this.src = SVG_FALLBACK;
      updateZoomInteractivity();
    });
  }

  // Track current gallery index for main view
  let currentGalleryIdx = 0;
  updateZoomInteractivity();

  // Handle gallery thumbnail clicks
  const thumbs = productMain.querySelectorAll(".gallery-thumb");
  thumbs.forEach(thumb => {
    thumb.addEventListener("click", () => {
      currentGalleryIdx = parseInt(thumb.dataset.idx);
      thumbs.forEach(t => {
        t.classList.remove("active");
      });
      thumb.classList.add("active");
      detailImg.src = allImages[currentGalleryIdx];
      updateZoomInteractivity();
      
      // Update counter
      const counterEl = document.getElementById("galleryCounter");
      if (counterEl) {
        counterEl.textContent = `${currentGalleryIdx + 1} / ${allImages.length}`;
      }
    });
  });

  // Handle click on main image → open lightbox
  const galleryMainWrap = document.getElementById("galleryMainWrap");
  if (galleryMainWrap) {
    galleryMainWrap.addEventListener("click", () => {
      const currentImg = allImages[currentGalleryIdx];
      const isFallback = !currentImg || currentImg.startsWith("data:image/svg+xml") || (detailImg && detailImg.src.startsWith("data:image/svg+xml"));
      if (isFallback) return; // Disallow zoom / lightbox for placeholder image
      openLightbox(allImages, currentGalleryIdx);
    });
  }

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
      document.getElementById("mfgInfoDesc").textContent = info.description || "No description filled by the manufacturer yet.";
      
      const rawWorkload = info.workload || "Not specified";
      document.getElementById("mfgInfoWorkload").textContent = rawWorkload;
      
      // Dynamic Workload Badge Styling
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
      if (mfgUser.username) contacts.push(`Email/Login: ${mfgUser.username}@motobrake.com`);
      
      document.getElementById("mfgInfoPhone").textContent = contacts.length > 0 ? contacts.join(", ") : "Contacts not specified";
      
      // Load manufacturer's articles
      const mfgArticlesBlock = document.getElementById("mfgArticlesBlock");
      const mfgArticlesList = document.getElementById("mfgArticlesList");
      if (mfgArticlesBlock && mfgArticlesList) {
        mfgArticlesList.innerHTML = "";
        const allArticles = JSON.parse(localStorage.getItem("brakeRichArticles") || "[]");
        const mfgArticles = allArticles.filter(art => art.author.toLowerCase() === mfg.toLowerCase());
        
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
      
      const mfgViewProductsBtn = document.getElementById("mfgViewProductsBtn");
      if (mfgViewProductsBtn) {
        const newBtn = mfgViewProductsBtn.cloneNode(true);
        mfgViewProductsBtn.parentNode.replaceChild(newBtn, mfgViewProductsBtn);
        newBtn.addEventListener("click", () => {
          window.location.href = `index.html?mfg=${encodeURIComponent(mfg)}`;
        });
      }
      
      mfgModal.style.display = "flex";
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

  const closeReaderBtn = document.getElementById("closeReaderBtn");
  const readerModal = document.getElementById("articleReaderModal");
  if (closeReaderBtn && readerModal) {
    closeReaderBtn.addEventListener("click", () => {
      readerModal.style.display = "none";
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
          askWarning.textContent = "Please log in or register to ask a question.";
          askText.disabled = true;
          submitBtn.disabled = true;
        } else {
          askWarning.style.display = "none";
          askText.disabled = false;
          submitBtn.disabled = false;
          askText.value = `Hello! Question to manufacturer "${mfg}" regarding product "${product.name}" (ID: ${product.id}): `;
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
        askWarning.textContent = "Please log in or register to ask a question.";
        askText.disabled = true;
        submitBtn.disabled = true;
      } else {
        askWarning.style.display = "none";
        askText.disabled = false;
        submitBtn.disabled = false;
        // Pre-fill question field
        askText.value = `Hello! I have a question about product "${product.name}" (ID: ${product.id}): `;
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
      const username = user.username || "Guest";
      
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
      
      alert("Your question has been successfully sent to the manufacturer! The reply will appear in your account dashboard.");
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
