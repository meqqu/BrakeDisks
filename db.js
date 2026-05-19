// db.js – Centralized data persistence layer
// All localStorage access goes through here.
// Ensures admin account always exists and data survives code updates.

import { USERS } from "./config.js";

const KEYS = {
  users: "brakeUsers",
  products: "brakeProducts",
  orders: "brakeOrders",
  clients: "brakeClients",
  cart: "brakeCart",
  user: "brakeUser",
  role: "brakeRole",
  messages: "brakeMessages",
  orderCols: "brakeOrderCols",
};

// --- Safe getters / setters ---
export function getJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function setJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// --- Users ---
/** Ensure built-in accounts (admin) always exist, without wiping user-registered accounts */
export function ensureDefaultUsers() {
  let allUsers = getJSON(KEYS.users, []);

  // Make sure every default user from config exists
  for (const def of USERS) {
    const exists = allUsers.find(u => u.username === def.username);
    if (!exists) {
      allUsers.push({ ...def });
    } else {
      // Ensure role is correct (in case it was corrupted)
      exists.role = def.role;
      exists.password = def.password;
    }
  }

  setJSON(KEYS.users, allUsers);
  return allUsers;
}

export function getAllUsers() {
  return getJSON(KEYS.users, []);
}

export function saveAllUsers(users) {
  setJSON(KEYS.users, users);
}

// --- Products ---
export function getProducts() {
  return getJSON(KEYS.products, []);
}

export function saveProducts(products) {
  setJSON(KEYS.products, products);
}

// --- Orders ---
export function getOrders() {
  return getJSON(KEYS.orders, []);
}

export function saveOrders(orders) {
  setJSON(KEYS.orders, orders);
}

// --- Clients ---
export function getClients() {
  return getJSON(KEYS.clients, []);
}

export function saveClients(clients) {
  setJSON(KEYS.clients, clients);
}

// --- Cart ---
export function getCart() {
  return getJSON(KEYS.cart, {});
}

export function saveCart(cart) {
  setJSON(KEYS.cart, cart);
}

export function clearCart() {
  localStorage.removeItem(KEYS.cart);
}

// --- Current user session ---
export function getCurrentUser() {
  return getJSON(KEYS.user, null);
}

export function saveCurrentUser(user) {
  setJSON(KEYS.user, user);
}

export function getCurrentRole() {
  return localStorage.getItem(KEYS.role) || "user";
}

export function setCurrentRole(role) {
  localStorage.setItem(KEYS.role, role);
}

export function logout() {
  localStorage.removeItem(KEYS.user);
  localStorage.removeItem(KEYS.role);
}

// --- Messages ---
export function getMessages() {
  return getJSON(KEYS.messages, []);
}

export function saveMessages(msgs) {
  setJSON(KEYS.messages, msgs);
}

// --- Custom Order Columns ---
export function getOrderCols() {
  return getJSON(KEYS.orderCols, []);
}

export function saveOrderCols(cols) {
  setJSON(KEYS.orderCols, cols);
}

// --- KEYS export for storage event listeners ---
export { KEYS };
