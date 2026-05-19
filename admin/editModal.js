// editModal.js
const editModal = document.getElementById("editModal");
const editForm = document.getElementById("editForm");
const editName = document.getElementById("editName");
const editBrand = document.getElementById("editBrand");
const editPrice = document.getElementById("editPrice");
const editImage = document.getElementById("editImage");
const editImagePreview = document.getElementById("editImagePreview");
const editStock = document.getElementById("editStock");
const editSeoTitle = document.getElementById("editSeoTitle");
const editSeoDesc = document.getElementById("editSeoDesc");
const editSeoKeywords = document.getElementById("editSeoKeywords");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const editStockQty = document.getElementById("editStockQty");
const editCompatibleMoto = document.getElementById("editCompatibleMoto");
const editMotoModel = document.getElementById("editMotoModel");

// New gallery inputs
const editGallery = document.getElementById("editGallery");
const editGalleryFiles = document.getElementById("editGalleryFiles");
const editGalleryUploadBtn = document.getElementById("editGalleryUploadBtn");
const editGalleryPreviews = document.getElementById("editGalleryPreviews");

const aiTitleBtn = document.getElementById("aiTitleBtn");
const aiDescBtn = document.getElementById("aiDescBtn");
const aiKeyBtn = document.getElementById("aiKeyBtn");

const editImageFile = document.getElementById("editImageFile");

let currentProductId = null;
let saveCallback = null;

// Image preview update from URL
editImage.addEventListener("input", () => {
  editImagePreview.src = editImage.value || "https://via.placeholder.com/60";
});

// Click on preview to upload file
editImagePreview.addEventListener("click", () => {
  editImageFile.click();
});

editImageFile.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      editImage.value = event.target.result; // base64 string
      editImagePreview.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

// Helper to update gallery previews
function renderGalleryPreviews() {
  if (!editGalleryPreviews || !editGallery) return;
  const urls = editGallery.value.split('\n').map(s => s.trim()).filter(Boolean);
  editGalleryPreviews.innerHTML = urls.map((url, idx) => `
    <div style="position:relative; width:40px; height:40px; flex-shrink:0;">
      <img src="${url}" style="width:40px; height:40px; border-radius:4px; object-fit:cover; border:1px solid #555;" />
      <span class="del-gallery-img" data-idx="${idx}" style="position:absolute; top:-4px; right:-4px; background:#ff1744; color:#fff; border-radius:50%; width:14px; height:14px; font-size:10px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; line-height:1;">×</span>
    </div>
  `).join('');
  
  // Bind click handlers to delete individual items
  editGalleryPreviews.querySelectorAll('.del-gallery-img').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const newUrls = urls.filter((_, i) => i !== idx);
      editGallery.value = newUrls.join('\n');
      renderGalleryPreviews();
    });
  });
}

// Bind gallery upload button
if (editGalleryUploadBtn && editGalleryFiles) {
  editGalleryUploadBtn.addEventListener("click", () => editGalleryFiles.click());
  editGalleryFiles.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    let loadedCount = 0;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        const currentUrls = editGallery.value.split('\n').map(s => s.trim()).filter(Boolean);
        currentUrls.push(base64);
        editGallery.value = currentUrls.join('\n');
        loadedCount++;
        if (loadedCount === files.length) {
          renderGalleryPreviews();
        }
      };
      reader.readAsDataURL(file);
    });
  });
}

// Listen for manual URL changes to update previews
if (editGallery) {
  editGallery.addEventListener("input", renderGalleryPreviews);
}

export function openEditModal(productOrId, onSave) {
  let product = productOrId;
  if (typeof productOrId === 'number' || typeof productOrId === 'string') {
    const products = JSON.parse(localStorage.getItem("brakeProducts") || "[]");
    product = products.find(p => p.id == productOrId) || {};
  }
  
  currentProductId = product.id;
  saveCallback = onSave;
  
  editName.value = product.name || "";
  if (editMotoModel) editMotoModel.value = product.motoModel || "";
  editBrand.value = product.brand || "";
  editPrice.value = product.price || 0;
  editImage.value = product.image || "";
  editImagePreview.src = product.image || "https://via.placeholder.com/60";
  editStock.checked = product.stock !== false;
  if (editStockQty) editStockQty.value = product.stockCount !== undefined ? product.stockCount : 1;
  
  if (editCompatibleMoto) {
    editCompatibleMoto.value = "";
    let existingEl = document.getElementById("existingCompatibleMotos");
    if (!existingEl) {
      existingEl = document.createElement("div");
      existingEl.id = "existingCompatibleMotos";
      existingEl.style.fontSize = "0.85rem";
      existingEl.style.color = "#aaa";
      existingEl.style.marginTop = "0.4rem";
      editCompatibleMoto.parentNode.insertBefore(existingEl, editCompatibleMoto.nextSibling);
    }
    const allProducts = JSON.parse(localStorage.getItem("brakeProducts") || "[]");
    let existingMotos = [];
    if (product.groupId) {
       const groupMates = allProducts.filter(x => x.groupId === product.groupId && x.id !== product.id);
       existingMotos = groupMates.map(x => x.motoModel || x.name).filter(Boolean);
    }
    if (existingMotos.length > 0) {
      existingEl.innerHTML = `Уже добавлены: <span style="color:#00e676;">${existingMotos.join(', ')}</span>`;
    } else {
      existingEl.innerHTML = "";
    }
  }

  editSeoTitle.value = product.seoTitle || (product.seo ? product.seo.title : "") || "";
  editSeoDesc.value = product.seoDesc || (product.seo ? product.seo.description : "") || "";
  editSeoKeywords.value = product.seoKeywords || (product.seo ? product.seo.keywords : "") || "";
  
  // Populate gallery
  if (editGallery) {
    editGallery.value = (product.gallery || []).join('\n');
    renderGalleryPreviews();
  }
  
  editModal.style.display = "flex";
}

function closeEditModal() {
  editModal.style.display = "none";
  currentProductId = null;
  saveCallback = null;
}

cancelEditBtn.addEventListener("click", closeEditModal);

editForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (saveCallback) {
    const galleryUrls = editGallery ? editGallery.value.split('\n').map(s => s.trim()).filter(Boolean) : [];
    saveCallback({
      id: currentProductId,
      name: editName.value.trim(),
      motoModel: editMotoModel ? editMotoModel.value.trim() : "",
      brand: editBrand.value.trim(),
      price: parseFloat(editPrice.value),
      image: editImage.value.trim(),
      stock: editStock.checked,
      stockCount: editStockQty ? (parseInt(editStockQty.value) || 0) : 1,
      gallery: galleryUrls,
      newMotos: (typeof editCompatibleMoto !== 'undefined' && editCompatibleMoto) ? editCompatibleMoto.value.trim() : "",
      seoTitle: editSeoTitle.value.trim(),
      seoDesc: editSeoDesc.value.trim(),
      seoKeywords: editSeoKeywords.value.trim(),
      seo: {
        title: editSeoTitle.value.trim(),
        description: editSeoDesc.value.trim(),
        keywords: editSeoKeywords.value.trim()
      }
    });
  }
  closeEditModal();
});

// AI Mock functionality (separate)
function getContext() {
  return { brand: editBrand.value.trim() || "Неизвестный бренд", name: editName.value.trim() || "Тормозной диск" };
}

aiTitleBtn.addEventListener("click", () => {
  const { brand, name } = getContext();
  editSeoTitle.value = `Купить ${name} от ${brand} | Лучшая цена и качество`;
});

aiDescBtn.addEventListener("click", () => {
  const { brand, name } = getContext();
  editSeoDesc.value = `Ищете где купить ${name}? Оригинальный диск от ${brand} обеспечит вашему мотоциклу надежное торможение и долгий срок службы. Закажите сейчас с доставкой!`;
});

aiKeyBtn.addEventListener("click", () => {
  const { brand, name } = getContext();
  editSeoKeywords.value = `тормозной диск, ${brand}, ${name}, мотозапчасти, купить тормоза, надежные диски`;
});
