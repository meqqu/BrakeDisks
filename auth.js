// auth.js – Lightweight user menu handler for non-shop pages
// Used on: about.html, and any future standalone page that needs the top-right user menu

import { ensureDefaultUsers } from "./db.js";

ensureDefaultUsers();

document.addEventListener("DOMContentLoaded", () => {
  const userMenuBtn    = document.getElementById("userMenuBtn");
  const userDropdown   = document.getElementById("userDropdown");
  const userMenuText   = document.getElementById("userMenuText");
  const userInfo       = document.getElementById("userInfo");
  const logoutBtn      = document.getElementById("logoutBtn");
  const openLoginBtn   = document.getElementById("openLoginBtn");
  const accountNav     = document.getElementById("accountNav");
  const adminNav       = document.getElementById("adminNav");
  const navArticles    = document.getElementById("navArticles");
  const navUsers       = document.getElementById("navUsers");
  const navSettings    = document.getElementById("navSettings");

  if (!userMenuBtn || !userDropdown) return;

  const role      = localStorage.getItem("brakeRole") || "";
  const savedUser = JSON.parse(localStorage.getItem("brakeUser") || "null");
  const isLoggedIn = !!(savedUser && savedUser.username);

  // --- Set username in button text ---
  if (isLoggedIn) {
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
    if (adminNav)     adminNav.style.display = "none";
  }

  // --- Role-based links ---
  if (role === "superadmin") {
    if (adminNav)    adminNav.style.display = "block";
    if (navArticles) navArticles.style.display = "block";
    if (navUsers)    navUsers.style.display = "block";
    if (navSettings) navSettings.style.display = "block";
  } else if (role === "admin") {
    if (adminNav)    adminNav.style.display = "block";
    if (navArticles) navArticles.style.display = "block";
    if (navUsers)    navUsers.style.display = "none";
    if (navSettings) navSettings.style.display = "none";
  } else {
    if (adminNav)    adminNav.style.display = "none";
    if (navArticles) navArticles.style.display = "none";
    if (navUsers)    navUsers.style.display = "none";
    if (navSettings) navSettings.style.display = "none";
  }

  // --- Toggle dropdown on button click ---
  userMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isShown = userDropdown.style.display === "flex";
    userDropdown.style.display = isShown ? "none" : "flex";
  });

  // --- Close dropdown when clicking outside ---
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".user-menu")) {
      userDropdown.style.display = "none";
    }
  });

  // --- Sign In button: redirect to index.html?action=login ---
  if (openLoginBtn) {
    openLoginBtn.addEventListener("click", () => {
      window.location.href = "/index.html?action=login";
    });
  }

  // --- Logout ---
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      } catch (e) {
        console.error("Logout API failed", e);
      }
      localStorage.removeItem("brakeRole");
      localStorage.removeItem("brakeUser");
      window.location.href = "/index.html";
    });
  }
});
