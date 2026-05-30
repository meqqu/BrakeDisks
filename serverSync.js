// serverSync.js
// Intercepts localStorage writes and syncs them to the backend server seamlessly.
// Also performs a dynamic load on startup to pull the latest state from the server.

const DB_KEYS = [
  "brakeProducts",
  "brakeOrders",
  "brakeUsers",
  "brakeMessages",
  "brakeSiteSettings",
  "brakeCustomRequests",
  "brakeClients",
  "brakeWithdrawals",
  "brakeCommissionSettlements"
];

// Override localStorage.setItem first to intercept future writes
const originalSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key, value) {
  if (DB_KEYS.includes(key)) {
    fetch(`/api/db/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: value // value is already stringified JSON
    }).catch(err => console.warn(`Server sync save failed for ${key}:`, err));
  }
  originalSetItem(key, value);
};

// Perform initial synchronization from backend — exported so app.js can await it
export const serverSyncReady = (async () => {
  if (typeof window === "undefined") return;
  try {
    const syncPromises = DB_KEYS.map(async (key) => {
      try {
        const res = await fetch(`/api/db/${key}`);
        if (res.ok) {
          const data = await res.json();
          // Use originalSetItem to bypass our interceptor and avoid infinite POST loop
          originalSetItem(key, JSON.stringify(data));
          if (key === "brakeProducts") {
            originalSetItem("brakeProductsVersion", "v2-en");
          }
        }
      } catch (e) {
        // Fall back silently to whatever is already in localStorage
        console.warn(`Initial server sync load failed for ${key}:`, e);
      }
    });
    await Promise.all(syncPromises);
  } catch (err) {
    console.warn("Bootstrap sync failed:", err);
  }
})();
