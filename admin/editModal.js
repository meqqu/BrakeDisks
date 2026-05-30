// editModal.js
import { detectBrand, generateSeoName, detectModelName, detectYears, generateSlug } from "./aiHelper.js";

// ── DOM elements ─────────────────────────────────────────────────────────────
const editModal        = document.getElementById("editModal");
const editForm         = document.getElementById("editForm");
const editName         = document.getElementById("editName");
const editBrand        = document.getElementById("editBrand");
const editPrice        = document.getElementById("editPrice");
const editImage        = document.getElementById("editImage");
const editImagePreview = document.getElementById("editImagePreview");
const editStock        = document.getElementById("editStock");
const editSeoTitle     = document.getElementById("editSeoTitle");
const editSeoDesc      = document.getElementById("editSeoDesc");
const editSeoKeywords  = document.getElementById("editSeoKeywords");
const cancelEditBtn    = document.getElementById("cancelEditBtn");
const editStockQty     = document.getElementById("editStockQty");
const editCompatibleMoto = document.getElementById("editCompatibleMoto");
const editMotoModel    = document.getElementById("editMotoModel");
const editMotoYears    = document.getElementById("editMotoYears");
const editGallery      = document.getElementById("editGallery");
const editGalleryFiles = document.getElementById("editGalleryFiles");
const editGalleryUploadBtn = document.getElementById("editGalleryUploadBtn");
const editGalleryPreviews  = document.getElementById("editGalleryPreviews");
const aiTitleBtn       = document.getElementById("aiTitleBtn");
const aiDescBtn        = document.getElementById("aiDescBtn");
const aiKeyBtn         = document.getElementById("aiKeyBtn");
const editImageFile    = document.getElementById("editImageFile");

let currentProductId = null;
let saveCallback = null;

// ── Public API — always exported so admin.js import doesn't break ─────────────
export function openEditModal(productOrId, onSave) {
  if (!editModal || !editImage) return; // no-op on pages without the product modal
  _doOpen(productOrId, onSave);
}

// ── Only initialise when the modal actually exists on the page ────────────────
if (editModal && editImage) {
  initEditModal();
}

function initEditModal() {

  // Image preview update from URL input
  editImage.addEventListener("input", () => {
    editImagePreview.src = editImage.value || "https://via.placeholder.com/60";
  });

  // Click preview image to open file picker
  editImagePreview.addEventListener("click", () => editImageFile.click());

  // File upload → server
  editImageFile.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    editImagePreview.src = "https://via.placeholder.com/60?text=...";
    try {
      const formData = new FormData();
      formData.append("image", file);
      const rawName = editName ? editName.value.trim() : "";
      if (rawName) formData.append("slug", generateSlug(rawName));
      const res  = await fetch("http://0.0.0.0:3000/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) { editImage.value = data.url; editImagePreview.src = data.url; }
      else alert("Upload failed.");
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload image to server.");
    }
  });

  // Gallery helpers
  function renderGalleryPreviews() {
    if (!editGalleryPreviews || !editGallery) return;
    const urls = editGallery.value.split("\n").map(s => s.trim()).filter(Boolean);
    editGalleryPreviews.innerHTML = urls.map((url, idx) => `
      <div style="position:relative; width:40px; height:40px; flex-shrink:0;">
        <img src="${url}" style="width:40px; height:40px; border-radius:4px; object-fit:cover; border:1px solid #555;" />
        <span class="del-gallery-img" data-idx="${idx}" style="position:absolute; top:-4px; right:-4px; background:#ff1744; color:var(--color-text-bright); border-radius:50%; width:14px; height:14px; font-size:10px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; line-height:1;">×</span>
      </div>
    `).join("");
    editGalleryPreviews.querySelectorAll(".del-gallery-img").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.idx);
        const newUrls = urls.filter((_, i) => i !== idx);
        editGallery.value = newUrls.join("\n");
        renderGalleryPreviews();
      });
    });
  }

  if (editGalleryUploadBtn && editGalleryFiles) {
    editGalleryUploadBtn.addEventListener("click", () => editGalleryFiles.click());
    editGalleryFiles.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files);
      editGalleryUploadBtn.textContent = "⏳ Uploading...";
      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append("image", file);
          const rawName = editName ? editName.value.trim() : "";
          if (rawName) formData.append("slug", generateSlug(rawName) + "-gallery");
          const res  = await fetch("http://0.0.0.0:3000/api/upload", { method: "POST", body: formData });
          const data = await res.json();
          if (data.url) {
            const cur = editGallery.value.split("\n").map(s => s.trim()).filter(Boolean);
            cur.push(data.url);
            editGallery.value = cur.join("\n");
          }
        } catch (err) { console.error("Gallery upload error:", err); }
      }
      editGalleryUploadBtn.textContent = "📷 Add Photo";
      renderGalleryPreviews();
    });
  }

  if (editGallery) editGallery.addEventListener("input", renderGalleryPreviews);

  // Close button
  if (cancelEditBtn) cancelEditBtn.addEventListener("click", closeEditModal);

  // Form submit
  if (editForm) {
    editForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (saveCallback) {
        const galleryUrls = editGallery ? editGallery.value.split("\n").map(s => s.trim()).filter(Boolean) : [];
        const placementEl = document.querySelector('input[name="editPlacement"]:checked');
        const placement   = placementEl ? placementEl.value : "Front";
        saveCallback({
          id:          currentProductId,
          slug:        generateSlug(editName.value.trim()),
          name:        editName.value.trim(),
          motoModel:   editMotoModel   ? editMotoModel.value.trim()   : "",
          motoYears:   editMotoYears   ? editMotoYears.value.trim()   : "",
          brand:       editBrand.value.trim(),
          placement,
          price:       parseFloat(editPrice.value),
          image:       editImage.value.trim(),
          stock:       editStock.checked,
          stockCount:  editStockQty ? (parseInt(editStockQty.value) || 0) : 1,
          gallery:     galleryUrls,
          newMotos:    editCompatibleMoto ? editCompatibleMoto.value.trim() : "",
          seoTitle:    editSeoTitle.value.trim(),
          seoDesc:     editSeoDesc.value.trim(),
          seoKeywords: editSeoKeywords.value.trim(),
          seo: {
            title:       editSeoTitle.value.trim(),
            description: editSeoDesc.value.trim(),
            keywords:    editSeoKeywords.value.trim()
          }
        });
      }
      closeEditModal();
    });
  }

  // AI SEO buttons
  function getContext() {
    return { brand: editBrand.value.trim() || "Unknown brand", name: editName.value.trim() || "Brake disc" };
  }
  function aiButtonPulse(btn, success) {
    const origBg = btn.style.background;
    btn.style.background = success ? "linear-gradient(135deg, #00c853, #00e676)" : "linear-gradient(135deg, #ff5252, #ff1744)";
    btn.style.transform = "scale(1.05)";
    setTimeout(() => { btn.style.background = origBg; btn.style.transform = "scale(1)"; }, 600);
  }

  if (aiTitleBtn) aiTitleBtn.addEventListener("click", () => {
    const { brand, name } = getContext();
    editSeoTitle.value = `Buy ${name} by ${brand} | Best price and quality`;
  });
  if (aiDescBtn) aiDescBtn.addEventListener("click", () => {
    const { brand, name } = getContext();
    editSeoDesc.value = `Looking where to buy ${name}? Original disc by ${brand} will provide your motorcycle with reliable braking and a long service life. Order now with delivery!`;
  });
  if (aiKeyBtn) aiKeyBtn.addEventListener("click", () => {
    const { brand, name } = getContext();
    editSeoKeywords.value = `brake disc, ${brand}, ${name}, motorcycle parts, buy brakes, reliable discs`;
  });

  if (editName) {
    editName.addEventListener("input", () => {
      const name = editName.value.trim();
      if (name) {
        const brand = (editBrand && editBrand.value.trim()) || detectBrand(name) || "BrakeDiscs";
        if (editSeoTitle)    editSeoTitle.value    = `Buy brake disc ${name} by ${brand} | Great price`;
        if (editSeoDesc)     editSeoDesc.value     = `High quality brake disc for motorcycle ${name} by ${brand}. Reliable braking, long service life. Order right now!`;
        if (editSeoKeywords) editSeoKeywords.value = `brake disc, ${brand}, ${name}, buy brakes`;
      }
    });
  }

  const aiNameBtn = document.getElementById("aiNameBtn");
  if (aiNameBtn) {
    aiNameBtn.addEventListener("click", () => {
      const raw = editName.value.trim();
      if (!raw) { alert("Please enter the product name first"); return; }
      editName.value = generateSeoName(raw);
      aiButtonPulse(aiNameBtn, true);
      const brand = detectBrand(raw);
      if (brand) editBrand.value = brand;
      const modelName = detectModelName(raw);
      if (modelName && editMotoModel) editMotoModel.value = modelName;
      const years = detectYears(raw);
      if (years && editMotoYears) editMotoYears.value = years;
    });
  }

  const aiBrandBtn = document.getElementById("aiBrandBtn");
  if (aiBrandBtn) {
    aiBrandBtn.addEventListener("click", () => {
      const name = editName.value.trim();
      if (!name) { alert("Please enter the product name first"); return; }
      const brand = detectBrand(name);
      if (brand) {
        editBrand.value = brand;
        aiButtonPulse(aiBrandBtn, true);
        const modelName = detectModelName(name);
        if (modelName && editMotoModel && !editMotoModel.value.trim()) editMotoModel.value = modelName;
        const years = detectYears(name);
        if (years && editMotoYears && !editMotoYears.value.trim()) editMotoYears.value = years;
      } else {
        aiButtonPulse(aiBrandBtn, false);
        alert("Could not detect brand. Try entering the full motorcycle model name.");
      }
    });
  }

} // end initEditModal()

// ── Internal open/close functions ────────────────────────────────────────────
function _doOpen(productOrId, onSave) {
  let product = productOrId;
  if (typeof productOrId === "number" || typeof productOrId === "string") {
    const products = JSON.parse(localStorage.getItem("brakeProducts") || "[]");
    product = products.find(p => p.id == productOrId) || {};
  }

  currentProductId = product.id;
  saveCallback     = onSave;

  editName.value  = product.name  || "";
  editBrand.value = product.brand || "";
  editPrice.value = product.price || 0;
  editImage.value = product.image || "";
  editImagePreview.src = product.image || "https://via.placeholder.com/60";
  editStock.checked = product.stock !== false;

  if (editMotoModel)   editMotoModel.value   = product.motoModel || "";
  if (editMotoYears)   editMotoYears.value   = product.motoYears || "";
  if (editStockQty)    editStockQty.value    = product.stockCount !== undefined ? product.stockCount : 1;

  const placementVal = product.placement || "Front";
  const placementRad = document.querySelector(`input[name="editPlacement"][value="${placementVal}"]`);
  if (placementRad) placementRad.checked = true;

  if (editCompatibleMoto) {
    editCompatibleMoto.value = "";
    let existingEl = document.getElementById("existingCompatibleMotos");
    if (!existingEl) {
      existingEl = document.createElement("div");
      existingEl.id = "existingCompatibleMotos";
      existingEl.style.cssText = "font-size:0.85rem; color:var(--color-muted); margin-top:0.4rem;";
      editCompatibleMoto.parentNode.insertBefore(existingEl, editCompatibleMoto.nextSibling);
    }
    const allProducts = JSON.parse(localStorage.getItem("brakeProducts") || "[]");
    let existingMotos = [];
    if (product.groupId) {
      const groupMates = allProducts.filter(x => x.groupId === product.groupId && x.id !== product.id);
      existingMotos = groupMates.map(x => x.motoModel || x.name).filter(Boolean);
    }
    existingEl.innerHTML = existingMotos.length > 0
      ? `Already added: <span style="color:#00e676;">${existingMotos.join(", ")}</span>`
      : "";
  }

  if (editSeoTitle)    editSeoTitle.value    = product.seoTitle    || (product.seo ? product.seo.title       : "") || "";
  if (editSeoDesc)     editSeoDesc.value     = product.seoDesc     || (product.seo ? product.seo.description : "") || "";
  if (editSeoKeywords) editSeoKeywords.value = product.seoKeywords || (product.seo ? product.seo.keywords    : "") || "";

  if (editGallery) {
    editGallery.value = (product.gallery || []).join("\n");
    // Trigger preview render by dispatching input event
    editGallery.dispatchEvent(new Event("input"));
  }

  editModal.style.display = "flex";
}

function closeEditModal() {
  if (editModal) editModal.style.display = "none";
  currentProductId = null;
  saveCallback = null;
}
