// admin/accounting.js – Double-Entry Bookkeeping and Ledger engine

export const DEFAULT_ACCOUNTS = [
  { code: "1010", name: "Cash on Hand", type: "Asset", balance: 0 },
  { code: "1020", name: "Accounts Receivable", type: "Asset", balance: 0 },
  { code: "1030", name: "Inventory", type: "Asset", balance: 0 },
  { code: "2010", name: "Accounts Payable", type: "Liability", balance: 0 },
  { code: "2020", name: "Tax Payable", type: "Liability", balance: 0 },
  { code: "3010", name: "Owner's Equity", type: "Equity", balance: 0 },
  { code: "4010", name: "Sales Revenue", type: "Revenue", balance: 0 },
  { code: "5010", name: "Material Costs", type: "Expense", balance: 0 },
  { code: "5020", name: "Laser Cutting Costs", type: "Expense", balance: 0 },
  { code: "5030", name: "Heat Treatment Costs", type: "Expense", balance: 0 },
  { code: "5040", name: "Transportation Costs", type: "Expense", balance: 0 },
  { code: "5050", name: "Grinding Costs", type: "Expense", balance: 0 },
  { code: "5060", name: "Turning Works", type: "Expense", balance: 0 },
  { code: "5070", name: "Design/Drawing Costs", type: "Expense", balance: 0 },
  { code: "5080", name: "Rent Expense", type: "Expense", balance: 0 },
  { code: "5090", name: "Shipping Costs", type: "Expense", balance: 0 },
  { code: "5100", name: "Tax Expenses", type: "Expense", balance: 0 },
  { code: "5110", name: "Shop Fees", type: "Expense", balance: 0 },
  { code: "5200", name: "Other Expenses", type: "Expense", balance: 0 }
];

export const DEFAULT_ESTIMATE_ITEMS = [
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

// Helper to translate cost estimates into standard expense accounts
export function mapExpenseNameToCode(name, mfg) {
  const norm = name.toLowerCase().trim();
  if (norm.includes("material")) return "5010";
  if (norm.includes("laser")) return "5020";
  if (norm.includes("heat")) return "5030";
  if (norm.includes("transport")) return "5040";
  if (norm.includes("grind") || norm.includes("grinding")) return "5050";
  if (norm.includes("turn") || norm.includes("turning")) return "5060";
  if (norm.includes("design") || norm.includes("draw") || norm.includes("drawing")) return "5070";
  if (norm.includes("rent") || norm.includes("space") || norm.includes("equipment")) return "5080";
  if (norm.includes("ship") || norm.includes("post") || norm.includes("shipping")) return "5090";
  if (norm.includes("tax")) return "5100";
  if (norm.includes("fee") || norm.includes("shop")) return "5110";
  
  if (!mfg || mfg === "all") return "5200";

  // Check if there is already a custom account with this name
  const accounts = getOrCreateAccounts(mfg);
  const existing = accounts.find(a => a.name.toLowerCase().trim() === norm);
  if (existing) return existing.code;
  
  // Create a new expense account
  const expenseAccounts = accounts.filter(a => a.code.startsWith("5"));
  let maxCode = 5200;
  expenseAccounts.forEach(a => {
    const codeNum = parseInt(a.code, 10);
    if (!isNaN(codeNum) && codeNum > maxCode) {
      maxCode = codeNum;
    }
  });
  
  const newCode = (maxCode + 10).toString();
  accounts.push({
    code: newCode,
    name: name.trim() || "Custom Expense",
    type: "Expense",
    balance: 0
  });
  
  const key = `brakeAccountingAccounts_${mfg}`;
  localStorage.setItem(key, JSON.stringify(accounts));
  
  return newCode;
}

// Get active manufacturer based on dropdown or role
export function getActiveManufacturer() {
  const role = localStorage.getItem("brakeRole") || "user";
  if (role === "superadmin") {
    const superSelect = document.getElementById("superadminManufacturerSelect");
    return superSelect ? superSelect.value : "all";
  }
  const currentUser = JSON.parse(localStorage.getItem("brakeUser") || "{}");
  return currentUser.manufacturer || "Garage1";
}

export function getAllManufacturers() {
  const allUsers = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
  const userMfgs = allUsers.filter(u => u.role === 'admin').map(u => u.manufacturer).filter(Boolean);
  const products = JSON.parse(localStorage.getItem("brakeProducts") || "[]");
  const productMfgs = products.map(p => p.manufacturer || "Garage1").filter(Boolean);
  return [...new Set([...userMfgs, ...productMfgs, "Garage1"])];
}

// Load products
function getProductFromStorage(id) {
  const products = JSON.parse(localStorage.getItem("brakeProducts") || "[]");
  return products.find(p => p.id == id);
}

// Load manufacturer order subtotal
function getOrderMfgSubtotal(order, mfg) {
  const mfgItems = order.items.filter(item => {
    const p = getProductFromStorage(item.id);
    const pMfg = p ? (p.manufacturer || "Garage1") : "Garage1";
    return pMfg === mfg;
  });
  return mfgItems.reduce((sum, it) => sum + ((it.price || 0) * it.qty), 0);
}

export function getOrCreateAccounts(mfg) {
  if (mfg === "all") return DEFAULT_ACCOUNTS; // Fallback read-only default
  const key = `brakeAccountingAccounts_${mfg}`;
  let accounts = JSON.parse(localStorage.getItem(key));
  if (!accounts) {
    accounts = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
    localStorage.setItem(key, JSON.stringify(accounts));
  }
  return accounts;
}

export function getOrCreateTransactions(mfg) {
  if (mfg === "all") {
    // Consolidated ledger
    const mfgs = getAllManufacturers();
    let combined = [];
    mfgs.forEach(m => {
      const txs = getOrCreateTransactions(m);
      // Add manufacturer field for identification
      txs.forEach(t => t.mfg = m);
      combined.push(...txs);
    });
    return combined.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  
  const key = `brakeAccountingTransactions_${mfg}`;
  let transactions = JSON.parse(localStorage.getItem(key));
  
  const orders = JSON.parse(localStorage.getItem("brakeOrders") || "[]");
  const orderIds = new Set(orders.map(o => o.id.toString()));

  if (transactions) {
    const originalLength = transactions.length;
    transactions = transactions.filter(t => {
      if (t.type === "system" && t.orderId) {
        return orderIds.has(t.orderId.toString());
      }
      return true;
    });
    if (transactions.length !== originalLength) {
      localStorage.setItem(key, JSON.stringify(transactions));
      recalculateBalances(mfg);
    }
  }

  if (!transactions) {
    transactions = [];
    // Migration: automatically create entries for existing orders
    const settings = JSON.parse(localStorage.getItem("brakeSiteSettings") || "{}");
    const commissionEnabled = settings.commissionEnabled ?? false;
    const debitAccount = commissionEnabled ? "1020" : "1010";

    orders.forEach(order => {
      const sub = getOrderMfgSubtotal(order, mfg);
      if (sub > 0 && ["paid", "processing", "shipped", "delivered"].includes(order.status)) {
        const orderRef = `Order #${order.id.toString().slice(-4)}`;
        // Revenue transaction
        transactions.push({
          id: `tx_rev_${order.id}`,
          date: order.date,
          description: `Order #${order.id.toString().slice(-4)} Revenue`,
          ref: orderRef,
          orderId: order.id,
          type: "system",
          debits: [{ accountCode: debitAccount, amount: sub }],
          credits: [{ accountCode: "4010", amount: sub }]
        });
        
        // Expenses transaction (if estimate summary exists, fallback to template / default items)
        const estimateKey = `brakeOrderEstimateSummary_${order.id}_${mfg}`;
        let estimate = JSON.parse(localStorage.getItem(estimateKey));
        if (!estimate) {
          const templateKey = `brakeMfgEstimateTemplate_${mfg}`;
          const mfgTemplate = JSON.parse(localStorage.getItem(templateKey) || "null");
          const currentItems = mfgTemplate || DEFAULT_ESTIMATE_ITEMS;
          const totalExpenses = currentItems.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
          estimate = {
            totalExpenses: totalExpenses,
            breakdown: currentItems
          };
        }
        if (estimate && estimate.breakdown) {
          const debits = [];
          let totalExpenses = 0;
          estimate.breakdown.forEach(item => {
            const val = parseFloat(item.value) || 0;
            if (val > 0) {
              debits.push({ accountCode: mapExpenseNameToCode(item.name, mfg), amount: val });
              totalExpenses += val;
            }
          });
          if (totalExpenses > 0) {
            transactions.push({
              id: `tx_exp_${order.id}`,
              date: order.date,
              description: `Order #${order.id.toString().slice(-4)} Cost Estimate`,
              ref: orderRef,
              orderId: order.id,
              type: "system",
              debits: debits,
              credits: [{ accountCode: "1010", amount: totalExpenses }]
            });
          }
        }
      }
    });
    localStorage.setItem(key, JSON.stringify(transactions));
  }
  return transactions;
}

export function recalculateBalances(mfg) {
  if (mfg === "all") {
    // Consolidated calculation
    const mfgs = getAllManufacturers();
    const consolidatedAccounts = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
    consolidatedAccounts.forEach(acc => acc.balance = 0);
    
    mfgs.forEach(m => {
      const accounts = getOrCreateAccounts(m);
      recalculateBalances(m); // Force single recalculate
      const freshAccounts = getOrCreateAccounts(m);
      freshAccounts.forEach(fa => {
        const ca = consolidatedAccounts.find(x => x.code === fa.code);
        if (ca) ca.balance += (fa.balance || 0);
      });
    });
    return consolidatedAccounts;
  }
  
  const accounts = getOrCreateAccounts(mfg);
  const transactions = getOrCreateTransactions(mfg);
  
  // Reset balances
  accounts.forEach(acc => acc.balance = 0);
  
  // Calculate from ledger
  transactions.forEach(t => {
    t.debits.forEach(deb => {
      const acc = accounts.find(a => a.code === deb.accountCode);
      if (acc) {
        // Assets and Expenses increase on DEBIT
        if (acc.type === "Asset" || acc.type === "Expense") {
          acc.balance += deb.amount;
        } else {
          // Liabilities, Equity, Revenue decrease on DEBIT
          acc.balance -= deb.amount;
        }
      }
    });
    
    t.credits.forEach(cred => {
      const acc = accounts.find(a => a.code === cred.accountCode);
      if (acc) {
        // Liabilities, Equity, Revenue increase on CREDIT
        if (acc.type === "Liability" || acc.type === "Equity" || acc.type === "Revenue") {
          acc.balance += cred.amount;
        } else {
          // Assets and Expenses decrease on CREDIT
          acc.balance -= cred.amount;
        }
      }
    });
  });
  
  localStorage.setItem(`brakeAccountingAccounts_${mfg}`, JSON.stringify(accounts));
  return accounts;
}

export function postOrderToAccounting(order, mfg) {
  if (!order || !mfg) return;
  const txsKey = `brakeAccountingTransactions_${mfg}`;
  let transactions = JSON.parse(localStorage.getItem(txsKey) || "[]");
  
  // Remove any existing transactions for this order
  const orderRef = `Order #${order.id.toString().slice(-4)}`;
  transactions = transactions.filter(t => t.ref !== orderRef);
  
  if (["paid", "processing", "shipped", "delivered"].includes(order.status)) {
    const subtotal = getOrderMfgSubtotal(order, mfg);
    if (subtotal > 0) {
      const settings = JSON.parse(localStorage.getItem("brakeSiteSettings") || "{}");
      const commissionEnabled = settings.commissionEnabled ?? false;
      const debitAccount = commissionEnabled ? "1020" : "1010";

      // 1. Revenue
      transactions.push({
        id: `tx_rev_${order.id}`,
        date: order.date,
        description: `Order #${order.id.toString().slice(-4)} Revenue`,
        ref: orderRef,
        orderId: order.id,
        type: "system",
        debits: [{ accountCode: debitAccount, amount: subtotal }],
        credits: [{ accountCode: "4010", amount: subtotal }]
      });
      
      // 2. Expenses (fallback to template / default items)
      const estimateKey = `brakeOrderEstimateSummary_${order.id}_${mfg}`;
      let estimate = JSON.parse(localStorage.getItem(estimateKey));
      if (!estimate) {
        const templateKey = `brakeMfgEstimateTemplate_${mfg}`;
        const mfgTemplate = JSON.parse(localStorage.getItem(templateKey) || "null");
        const currentItems = mfgTemplate || DEFAULT_ESTIMATE_ITEMS;
        const totalExpenses = currentItems.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
        estimate = {
          totalExpenses: totalExpenses,
          breakdown: currentItems
        };
      }
      if (estimate && estimate.breakdown) {
        const debits = [];
        let totalExpenses = 0;
        estimate.breakdown.forEach(item => {
          const val = parseFloat(item.value) || 0;
          if (val > 0) {
            debits.push({ accountCode: mapExpenseNameToCode(item.name, mfg), amount: val });
            totalExpenses += val;
          }
        });
        
        if (totalExpenses > 0) {
          transactions.push({
            id: `tx_exp_${order.id}`,
            date: order.date,
            description: `Order #${order.id.toString().slice(-4)} Cost Estimate`,
            ref: orderRef,
            orderId: order.id,
            type: "system",
            debits: debits,
            credits: [{ accountCode: "1010", amount: totalExpenses }]
          });
        }
      }
    }
  }
  
  localStorage.setItem(txsKey, JSON.stringify(transactions));
  recalculateBalances(mfg);
}

export function unpostOrderFromAccounting(orderId, mfg) {
  const txsKey = `brakeAccountingTransactions_${mfg}`;
  let transactions = JSON.parse(localStorage.getItem(txsKey) || "[]");
  const orderRef = `Order #${orderId.toString().slice(-4)}`;
  transactions = transactions.filter(t => t.ref !== orderRef);
  localStorage.setItem(txsKey, JSON.stringify(transactions));
  recalculateBalances(mfg);
}

// UI Controllers
let currentSubTab = "dashboard";

export function initAccounting(showToast) {
  // Elements
  const tabDashboardBtn = document.getElementById("accTabDashboardBtn");
  const tabAccountsBtn = document.getElementById("accTabAccountsBtn");
  const tabLedgerBtn = document.getElementById("accTabLedgerBtn");
  const tabOrdersBtn = document.getElementById("accTabOrdersBtn");
  const tabWalletBtn = document.getElementById("accTabWalletBtn");
  
  const contentDashboard = document.getElementById("accTabDashboardContent");
  const contentAccounts = document.getElementById("accTabAccountsContent");
  const contentLedger = document.getElementById("accTabLedgerContent");
  const contentOrders = document.getElementById("accTabOrdersContent");
  const contentWallet = document.getElementById("accTabWalletContent");

  const addAccountBtn = document.getElementById("addAccountBtn");
  const addAccountModal = document.getElementById("addAccountModal");
  const closeAddAccountModal = document.getElementById("closeAddAccountModal");
  const addAccountForm = document.getElementById("addAccountForm");
  const closeAccountBtn = document.getElementById("closeAccountBtn");

  const recordJournalBtn = document.getElementById("recordJournalBtn");
  const recordJournalModal = document.getElementById("recordJournalModal");
  const closeRecordJournalModal = document.getElementById("closeRecordJournalModal");
  const recordJournalForm = document.getElementById("recordJournalForm");
  const closeJournalBtn = document.getElementById("closeJournalBtn");
  const journalDate = document.getElementById("journalDate");

  // Sub tab switcher
  const switchSubTab = (tab) => {
    currentSubTab = tab;
    
    // Highlight using classes
    const btns = [tabDashboardBtn, tabAccountsBtn, tabLedgerBtn, tabOrdersBtn, tabWalletBtn];
    btns.forEach(b => { if(b) b.classList.remove("active"); });
    
    if (tab === "dashboard" && tabDashboardBtn) {
      tabDashboardBtn.classList.add("active");
    } else if (tab === "accounts" && tabAccountsBtn) {
      tabAccountsBtn.classList.add("active");
    } else if (tab === "ledger" && tabLedgerBtn) {
      tabLedgerBtn.classList.add("active");
    } else if (tab === "orders" && tabOrdersBtn) {
      tabOrdersBtn.classList.add("active");
    } else if (tab === "wallet" && tabWalletBtn) {
      tabWalletBtn.classList.add("active");
    }

    if (contentDashboard) contentDashboard.style.display = tab === "dashboard" ? "block" : "none";
    if (contentAccounts) contentAccounts.style.display = tab === "accounts" ? "block" : "none";
    if (contentLedger) contentLedger.style.display = tab === "ledger" ? "block" : "none";
    if (contentOrders) contentOrders.style.display = tab === "orders" ? "block" : "none";
    if (contentWallet) contentWallet.style.display = tab === "wallet" ? "block" : "none";
    
    renderAccounting();
  };

  if(tabDashboardBtn) tabDashboardBtn.addEventListener("click", () => switchSubTab("dashboard"));
  if(tabAccountsBtn) tabAccountsBtn.addEventListener("click", () => switchSubTab("accounts"));
  if(tabLedgerBtn) tabLedgerBtn.addEventListener("click", () => switchSubTab("ledger"));
  if(tabOrdersBtn) tabOrdersBtn.addEventListener("click", () => switchSubTab("orders"));
  if(tabWalletBtn) tabWalletBtn.addEventListener("click", () => switchSubTab("wallet"));

  // Modals logic: Add Account
  if (addAccountBtn && addAccountModal) {
    addAccountBtn.addEventListener("click", () => {
      addAccountForm.reset();
      addAccountModal.style.display = "flex";
    });
  }
  
  const hideAddAccountModal = () => { if(addAccountModal) addAccountModal.style.display = "none"; };
  if (closeAddAccountModal) closeAddAccountModal.addEventListener("click", hideAddAccountModal);
  if (closeAccountBtn) closeAccountBtn.addEventListener("click", hideAddAccountModal);

  if (addAccountForm) {
    addAccountForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const mfg = getActiveManufacturer();
      if (mfg === "all") {
        alert("Cannot add custom accounts in consolidated view. Switch to a specific manufacturer first.");
        return;
      }
      
      const type = document.getElementById("newAccountType").value;
      const code = document.getElementById("newAccountCode").value.trim();
      const name = document.getElementById("newAccountName").value.trim();
      
      const accounts = getOrCreateAccounts(mfg);
      const exists = accounts.find(a => a.code === code);
      if (exists) {
        alert(`Account code ${code} is already registered!`);
        return;
      }
      
      accounts.push({ code, name, type, balance: 0 });
      localStorage.setItem(`brakeAccountingAccounts_${mfg}`, JSON.stringify(accounts));
      hideAddAccountModal();
      showToast("Account successfully created!");
      renderAccounting();
    });
  }

  // Modals logic: Record Journal Entry
  let manualDebits = [];
  let manualCredits = [];

  const renderJournalEntryRows = () => {
    const debitsContainer = document.getElementById("journalDebitsContainer");
    const creditsContainer = document.getElementById("journalCreditsContainer");
    const mfg = getActiveManufacturer();
    const accounts = getOrCreateAccounts(mfg);
    
    // Fill select options
    const accOptions = accounts.map(a => `<option value="${a.code}">${a.code} - ${a.name}</option>`).join('');

    // Debits
    debitsContainer.innerHTML = manualDebits.map((d, index) => `
      <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom: 0.5rem; flex-wrap: wrap;">
        <select class="debit-acc-select acc-form-select" data-index="${index}" style="flex:1; min-width:140px;">
          ${accOptions}
        </select>
        <input type="number" step="0.01" class="debit-amt-input acc-form-input" data-index="${index}" value="${d.amount || 0}" style="width:100px;" />
        <button type="button" class="del-deb-row" data-index="${index}" style="background:none; border:none; color:#ff5252; cursor:pointer; font-size: 1.1rem; padding: 0.2rem;" title="Delete Row">🗑️</button>
      </div>
    `).join('');

    // Credits
    creditsContainer.innerHTML = manualCredits.map((c, index) => `
      <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom: 0.5rem; flex-wrap: wrap;">
        <select class="credit-acc-select acc-form-select" data-index="${index}" style="flex:1; min-width:140px;">
          ${accOptions}
        </select>
        <input type="number" step="0.01" class="credit-amt-input acc-form-input" data-index="${index}" value="${c.amount || 0}" style="width:100px;" />
        <button type="button" class="del-cred-row" data-index="${index}" style="background:none; border:none; color:#ff5252; cursor:pointer; font-size: 1.1rem; padding: 0.2rem;" title="Delete Row">🗑️</button>
      </div>
    `).join('');

    // Sync elements
    document.querySelectorAll(".debit-acc-select").forEach(sel => {
      sel.value = manualDebits[sel.dataset.index].accountCode;
      sel.addEventListener("change", (e) => {
        manualDebits[e.target.dataset.index].accountCode = e.target.value;
      });
    });
    
    document.querySelectorAll(".debit-amt-input").forEach(inp => {
      inp.addEventListener("input", (e) => {
        manualDebits[e.target.dataset.index].amount = parseFloat(e.target.value) || 0;
        validateJournalBalances();
      });
    });

    document.querySelectorAll(".credit-acc-select").forEach(sel => {
      sel.value = manualCredits[sel.dataset.index].accountCode;
      sel.addEventListener("change", (e) => {
        manualCredits[e.target.dataset.index].accountCode = e.target.value;
      });
    });
    
    document.querySelectorAll(".credit-amt-input").forEach(inp => {
      inp.addEventListener("input", (e) => {
        manualCredits[e.target.dataset.index].amount = parseFloat(e.target.value) || 0;
        validateJournalBalances();
      });
    });

    // Delete handlers
    document.querySelectorAll(".del-deb-row").forEach(btn => {
      btn.addEventListener("click", () => {
        manualDebits.splice(btn.dataset.index, 1);
        renderJournalEntryRows();
        validateJournalBalances();
      });
    });
    document.querySelectorAll(".del-cred-row").forEach(btn => {
      btn.addEventListener("click", () => {
        manualCredits.splice(btn.dataset.index, 1);
        renderJournalEntryRows();
        validateJournalBalances();
      });
    });

    validateJournalBalances();
  };

  const validateJournalBalances = () => {
    const totalDebits = manualDebits.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalCredits = manualCredits.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    document.getElementById("journalTotalDebitsText").textContent = `$${totalDebits.toFixed(2)}`;
    document.getElementById("journalTotalCreditsText").textContent = `$${totalCredits.toFixed(2)}`;

    const statusEl = document.getElementById("journalBalanceStatus");
    const saveBtn = document.getElementById("saveJournalBtn");

    const diff = Math.abs(totalDebits - totalCredits);
    if (diff < 0.01 && totalDebits > 0) {
      statusEl.textContent = "BALANCED";
      statusEl.style.color = "#00e676";
      saveBtn.disabled = false;
      saveBtn.style.opacity = "1";
      saveBtn.style.cursor = "pointer";
    } else {
      statusEl.textContent = `UNBALANCED (Diff: $${diff.toFixed(2)})`;
      statusEl.style.color = "#ff5252";
      saveBtn.disabled = true;
      saveBtn.style.opacity = "0.5";
      saveBtn.style.cursor = "not-allowed";
    }
  };

  if (recordJournalBtn && recordJournalModal) {
    recordJournalBtn.addEventListener("click", () => {
      const mfg = getActiveManufacturer();
      if (mfg === "all") {
        alert("Cannot record journal entries in consolidated view. Switch to a specific manufacturer first.");
        return;
      }
      
      recordJournalForm.reset();
      journalDate.value = new Date().toISOString().split('T')[0];
      
      const accounts = getOrCreateAccounts(mfg);
      manualDebits = [{ accountCode: accounts[7]?.code || "5010", amount: 0 }];
      manualCredits = [{ accountCode: accounts[0]?.code || "1010", amount: 0 }];
      
      recordJournalModal.style.display = "flex";
      renderJournalEntryRows();
    });
  }

  const hideJournalModal = () => { if(recordJournalModal) recordJournalModal.style.display = "none"; };
  if (closeRecordJournalModal) closeRecordJournalModal.addEventListener("click", hideJournalModal);
  if (closeJournalBtn) closeJournalBtn.addEventListener("click", hideJournalModal);

  const journalAddDebitBtn = document.getElementById("journalAddDebitBtn");
  if (journalAddDebitBtn) {
    journalAddDebitBtn.addEventListener("click", () => {
      const mfg = getActiveManufacturer();
      const accounts = getOrCreateAccounts(mfg);
      manualDebits.push({ accountCode: accounts[7]?.code || "5010", amount: 0 });
      renderJournalEntryRows();
    });
  }

  const journalAddCreditBtn = document.getElementById("journalAddCreditBtn");
  if (journalAddCreditBtn) {
    journalAddCreditBtn.addEventListener("click", () => {
      const mfg = getActiveManufacturer();
      const accounts = getOrCreateAccounts(mfg);
      manualCredits.push({ accountCode: accounts[0]?.code || "1010", amount: 0 });
      renderJournalEntryRows();
    });
  }

  if (recordJournalForm) {
    recordJournalForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const mfg = getActiveManufacturer();
      const txsKey = `brakeAccountingTransactions_${mfg}`;
      const transactions = getOrCreateTransactions(mfg);

      const date = journalDate.value;
      const ref = document.getElementById("journalRef").value.trim();
      const desc = document.getElementById("journalDesc").value.trim();

      const newTx = {
        id: `tx_man_${Date.now()}`,
        date: new Date(date).toISOString(),
        description: desc,
        ref: ref || "Manual Entry",
        type: "manual",
        debits: manualDebits.filter(d => d.amount > 0),
        credits: manualCredits.filter(c => c.amount > 0)
      };

      transactions.push(newTx);
      localStorage.setItem(txsKey, JSON.stringify(transactions));
      
      hideJournalModal();
      showToast("Journal entry recorded successfully!");
      renderAccounting();
    });
  }

  const ledgerFilter = document.getElementById("accLedgerAccountFilter");
  const ledgerSearch = document.getElementById("accLedgerSearch");
  if (ledgerFilter) ledgerFilter.addEventListener("change", renderJournalLedger);
  if (ledgerSearch) ledgerSearch.addEventListener("input", renderJournalLedger);

  window.addEventListener("resize", () => {
    const accTab = document.getElementById("accountingTab");
    if (accTab && accTab.style.display !== "none" && currentSubTab === "dashboard") {
      renderAccounting();
    }
  });
}

export function renderAccounting() {
  const mfg = getActiveManufacturer();
  
  // Recalculate
  recalculateBalances(mfg);
  
  // Load tables
  if (currentSubTab === "dashboard") {
    renderAccountingDashboard(mfg);
  } else if (currentSubTab === "accounts") {
    renderChartOfAccounts(mfg);
  } else if (currentSubTab === "ledger") {
    renderJournalLedger();
  } else if (currentSubTab === "orders") {
    renderOrderReconciliation();
  } else if (currentSubTab === "wallet") {
    renderWalletTab(mfg);
  }
}

// 1. Render Dashboard
function renderAccountingDashboard(mfg) {
  const accounts = recalculateBalances(mfg);
  const transactions = getOrCreateTransactions(mfg);
  
  // Cash
  const cashAcc = accounts.find(a => a.code === "1010");
  const cashBalance = cashAcc ? (cashAcc.balance || 0) : 0;
  
  // Revenue
  const revAccounts = accounts.filter(a => a.type === "Revenue");
  const totalRevenue = revAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  
  // Expenses
  const expAccounts = accounts.filter(a => a.type === "Expense");
  const totalExpenses = expAccounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  
  // Net Profit
  const netProfit = totalRevenue - totalExpenses;
  const marginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  
  // Assets & Liabilities
  const assets = accounts.filter(a => a.type === "Asset");
  const liabilities = accounts.filter(a => a.type === "Liability");
  
  const totalAssets = assets.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + (a.balance || 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  // Set KPIs
  document.getElementById("accKpiCash").textContent = `$${cashBalance.toFixed(2)}`;
  document.getElementById("accKpiRevenue").textContent = `$${totalRevenue.toFixed(2)}`;
  document.getElementById("accKpiExpenses").textContent = `$${totalExpenses.toFixed(2)}`;
  
  const profitKpi = document.getElementById("accKpiProfit");
  profitKpi.textContent = `$${netProfit.toFixed(2)}`;
  profitKpi.style.color = netProfit >= 0 ? "#00e676" : "#ff5252";
  document.getElementById("accKpiProfitPct").textContent = `Margin: ${marginPct.toFixed(1)}%`;
  
  const netWorthKpi = document.getElementById("accKpiNetWorth");
  netWorthKpi.textContent = `$${netWorth.toFixed(2)}`;
  netWorthKpi.style.color = netWorth >= 0 ? "#ffb300" : "#ff5252";

  // Orders KPIs
  const orders = JSON.parse(localStorage.getItem("brakeOrders") || "[]");
  const filteredOrders = orders.filter(o => {
    if (mfg === "all") return true;
    return o.items.some(item => {
      const p = getProductFromStorage(item.id);
      const pMfg = p ? (p.manufacturer || "Garage1") : "Garage1";
      return pMfg === mfg;
    });
  });
  
  const totalOrders = filteredOrders.length;
  const shippedOrders = filteredOrders.filter(o => o.status === "shipped" || o.status === "delivered").length;
  const processingOrders = filteredOrders.filter(o => o.status === "processing" || o.status === "paid").length;
  
  const kpiTotalOrders = document.getElementById("accKpiTotalOrders");
  const kpiShippedOrders = document.getElementById("accKpiShippedOrders");
  const kpiProcessingOrders = document.getElementById("accKpiProcessingOrders");
  
  if (kpiTotalOrders) kpiTotalOrders.textContent = totalOrders;
  if (kpiShippedOrders) kpiShippedOrders.textContent = shippedOrders;
  if (kpiProcessingOrders) kpiProcessingOrders.textContent = processingOrders;

  // Draw chart
  drawProfitLossChart(transactions);

  // Render expenses breakdown progress list
  const breakdownContainer = document.getElementById("accExpenseBreakdownList");
  if (breakdownContainer) {
    const sortedExpenses = [...expAccounts].sort((a, b) => (b.balance || 0) - (a.balance || 0));
    const activeExpenses = sortedExpenses.filter(e => (e.balance || 0) > 0);
    
    if (activeExpenses.length === 0) {
      breakdownContainer.innerHTML = `<div style="text-align:center; padding:2rem 0; color:var(--color-muted); font-size:0.85rem;">No expenses logged yet</div>`;
    } else {
      breakdownContainer.innerHTML = activeExpenses.map(e => {
        const pct = totalExpenses > 0 ? ((e.balance || 0) / totalExpenses) * 100 : 0;
        return `
          <div style="font-size:0.85rem;">
            <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
              <span style="color:var(--color-muted);">${e.name}</span>
              <span style="font-weight:bold; color:#ff5252;">$${e.balance.toFixed(2)} (${pct.toFixed(0)}%)</span>
            </div>
            <div style="height:6px; background:var(--color-surface); border-radius:4px; overflow:hidden;">
              <div style="width:${pct}%; height:100%; background:linear-gradient(90deg, #ff5252, #ff7b7b); border-radius:4px;"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

// 2. Render Chart of Accounts (COA)
function renderChartOfAccounts(mfg) {
  const accounts = recalculateBalances(mfg);
  const body = document.getElementById("accAccountsTableBody");
  if (!body) return;

  const isSuper = mfg === "all";

  if (accounts.length === 0) {
    body.innerHTML = `<tr><td colspan="5" style="text-align:center;">No accounts available</td></tr>`;
    return;
  }

  body.innerHTML = accounts.map(a => {
    const balColor = a.balance > 0 ? (["Asset", "Expense"].includes(a.type) ? "#00e676" : "#00b0ff") : (a.balance < 0 ? "#ff5252" : "#ccc");
    
    const isDefault = DEFAULT_ACCOUNTS.some(defAcc => defAcc.code === a.code);
    let actions = '';
    if (isSuper) {
      actions = '—';
    } else {
      actions = `<button class="acc-action-btn view show-acc-ledger-btn" data-code="${a.code}">View Ledger</button>`;
      if (!isDefault) {
        actions += `<button class="acc-action-btn delete delete-acc-btn" data-code="${a.code}" style="margin-left:0.25rem;">Delete</button>`;
      }
    }
    
    return `
      <tr>
        <td><code>${a.code}</code></td>
        <td style="font-weight:bold; color:var(--color-text-bright);">${a.name}</td>
        <td><span style="background:var(--color-input-bg); border:1px solid var(--color-border); padding:0.15rem 0.4rem; border-radius:4px; font-size:0.75rem;">${a.type}</span></td>
        <td style="text-align:right; font-weight:bold; color:${balColor}; font-family:monospace;">$${a.balance.toFixed(2)}</td>
        <td style="text-align:center;">${actions}</td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll(".show-acc-ledger-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const code = btn.dataset.code;
      const ledgerFilter = document.getElementById("accLedgerAccountFilter");
      if (ledgerFilter) {
        ledgerFilter.value = code;
        const event = new Event('change');
        ledgerFilter.dispatchEvent(event);
      }
      // Switch tab to Ledger
      const tabLedgerBtn = document.getElementById("accTabLedgerBtn");
      if (tabLedgerBtn) tabLedgerBtn.click();
    });
  });

  document.querySelectorAll(".delete-acc-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const code = btn.dataset.code;
      const mfg = getActiveManufacturer();
      if (mfg === "all") return;
      
      const transactions = getOrCreateTransactions(mfg);
      const hasTransactions = transactions.some(t => 
        t.debits.some(d => d.accountCode === code) || 
        t.credits.some(c => c.accountCode === code)
      );
      if (hasTransactions) {
        alert("Cannot delete this account because it has recorded transactions in the ledger. Void or delete those transactions first.");
        return;
      }
      
      if (confirm(`Are you sure you want to delete the custom account ${code}?`)) {
        let accounts = getOrCreateAccounts(mfg);
        accounts = accounts.filter(a => a.code !== code);
        localStorage.setItem(`brakeAccountingAccounts_${mfg}`, JSON.stringify(accounts));
        recalculateBalances(mfg);
        renderChartOfAccounts(mfg);
      }
    });
  });
}

// 3. Render Journal Ledger
function renderJournalLedger() {
  const mfg = getActiveManufacturer();
  const transactions = getOrCreateTransactions(mfg);
  const accounts = getOrCreateAccounts(mfg);
  
  const ledgerFilter = document.getElementById("accLedgerAccountFilter");
  const ledgerSearch = document.getElementById("accLedgerSearch");
  const body = document.getElementById("accLedgerTableBody");
  if (!body) return;

  // Update account filter options
  if (ledgerFilter && ledgerFilter.innerHTML === "") {
    ledgerFilter.innerHTML = '<option value="all">All Accounts</option>' + 
      accounts.map(a => `<option value="${a.code}">${a.code} - ${a.name}</option>`).join('');
  }

  const selectedAccount = ledgerFilter ? ledgerFilter.value : "all";
  const searchVal = ledgerSearch ? ledgerSearch.value.toLowerCase().trim() : "";

  // Filter
  const filteredTxs = transactions.filter(t => {
    // Search
    const searchMatch = !searchVal || 
      t.description.toLowerCase().includes(searchVal) || 
      (t.ref && t.ref.toLowerCase().includes(searchVal));
    if (!searchMatch) return false;

    // Account
    if (selectedAccount === "all") return true;
    const hasDebit = t.debits.some(d => d.accountCode === selectedAccount);
    const hasCredit = t.credits.some(c => c.accountCode === selectedAccount);
    return hasDebit || hasCredit;
  });

  if (filteredTxs.length === 0) {
    body.innerHTML = `<tr><td colspan="8" style="text-align:center;">No transactions recorded matching filters</td></tr>`;
    return;
  }

  body.innerHTML = filteredTxs.map(t => {
    // Generate beautiful debits/credits rows with semi-transparent separator lines
    const debNames = t.debits.map((d, idx) => {
      const acc = accounts.find(a => a.code === d.accountCode);
      const borderStyle = idx < t.debits.length - 1 ? 'border-bottom:1px solid var(--color-border);' : '';
      return `<div style="font-weight:600; color:#00e676; padding: 0.4rem 0; ${borderStyle}">${d.accountCode} - ${acc ? acc.name : 'Unknown'}</div>`;
    }).join('');
    
    const credNames = t.credits.map((c, idx) => {
      const acc = accounts.find(a => a.code === c.accountCode);
      const borderStyle = idx < t.credits.length - 1 ? 'border-bottom:1px solid var(--color-border);' : '';
      return `<div style="font-weight:600; color:#00b0ff; padding: 0.4rem 0; ${borderStyle}">${c.accountCode} - ${acc ? acc.name : 'Unknown'}</div>`;
    }).join('');

    const debAmts = t.debits.map((d, idx) => {
      const borderStyle = idx < t.debits.length - 1 ? 'border-bottom:1px solid var(--color-border);' : '';
      return `<div style="font-family:monospace; color:#00e676; padding: 0.4rem 0; ${borderStyle}">$${d.amount.toFixed(2)}</div>`;
    }).join('');
    
    const credAmts = t.credits.map((c, idx) => {
      const borderStyle = idx < t.credits.length - 1 ? 'border-bottom:1px solid var(--color-border);' : '';
      return `<div style="font-family:monospace; color:#00b0ff; padding: 0.4rem 0; ${borderStyle}">$${c.amount.toFixed(2)}</div>`;
    }).join('');

    const dateStr = new Date(t.date).toLocaleDateString();
    
    const isManual = t.type === "manual";
    const mfgBadge = mfg === "all" ? `<span style="font-size:0.7rem; background:var(--color-border); color:var(--color-muted); padding:0.1rem 0.35rem; border-radius:3px; display:inline-block; margin-top:0.25rem;">🏭 ${t.mfg || 'Garage1'}</span>` : '';
    
    const actionCell = isManual && mfg !== "all" 
      ? `<button class="acc-action-btn delete void-tx-btn" data-id="${t.id}">Void</button>`
      : `—`;

    return `
      <tr style="border-bottom:1px solid var(--color-border);">
        <td style="vertical-align: top; padding: 0.9rem 0.5rem;">${dateStr}</td>
        <td style="vertical-align: top; padding: 0.9rem 0.5rem;">
          <div style="font-weight:bold; color:var(--color-text-bright);">${t.description}</div>
          ${mfgBadge}
        </td>
        <td style="vertical-align: top; padding: 0.9rem 0.5rem;"><code>${t.ref || '—'}</code></td>
        <td style="vertical-align: top; padding: 0.5rem;">${debNames}</td>
        <td style="vertical-align: top; padding: 0.5rem;">${credNames}</td>
        <td style="vertical-align: top; padding: 0.5rem; text-align:right;">${debAmts}</td>
        <td style="vertical-align: top; padding: 0.5rem; text-align:right;">${credAmts}</td>
        <td style="vertical-align: top; padding: 0.9rem 0.5rem; text-align:center;">${actionCell}</td>
      </tr>
    `;
  }).join('');

  // Attach void event listener
  document.querySelectorAll(".void-tx-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const txId = btn.dataset.id;
      if (confirm("Are you sure you want to void this manual transaction? This will delete it from ledger.")) {
        const activeMfg = getActiveManufacturer();
        const txsKey = `brakeAccountingTransactions_${activeMfg}`;
        let txs = JSON.parse(localStorage.getItem(txsKey) || "[]");
        txs = txs.filter(t => t.id !== txId);
        localStorage.setItem(txsKey, JSON.stringify(txs));
        renderJournalLedger();
        renderAccounting();
      }
    });
  });
}

// 4. Render Order Reconciliation
function renderOrderReconciliation() {
  const mfg = getActiveManufacturer();
  const orders = JSON.parse(localStorage.getItem("brakeOrders") || "[]");
  const body = document.getElementById("accOrdersTableBody");
  if (!body) return;

  const filteredOrders = orders.filter(o => {
    if (mfg === "all") return true;
    return o.items.some(item => {
      const p = getProductFromStorage(item.id);
      const pMfg = p ? (p.manufacturer || "Garage1") : "Garage1";
      return pMfg === mfg;
    });
  });

  if (filteredOrders.length === 0) {
    body.innerHTML = `<tr><td colspan="8" style="text-align:center;">No orders recorded</td></tr>`;
    return;
  }

  let totalSellingPrice = 0;
  let totalExpenseTotal = 0;
  let totalNetProfit = 0;

  const rows = filteredOrders.map(o => {
    let orderMfg = mfg;
    if (orderMfg === "all") {
      const firstItem = o.items[0];
      const p = firstItem ? getProductFromStorage(firstItem.id) : null;
      orderMfg = p ? (p.manufacturer || "Garage1") : "Garage1";
    }

    // Auto-sync order to accounting
    postOrderToAccounting(o, orderMfg);

    const sellingPrice = getOrderMfgSubtotal(o, orderMfg);
    const estimateKey = `brakeOrderEstimateSummary_${o.id}_${orderMfg}`;
    let estimate = JSON.parse(localStorage.getItem(estimateKey));
    if (!estimate) {
      const templateKey = `brakeMfgEstimateTemplate_${orderMfg}`;
      const mfgTemplate = JSON.parse(localStorage.getItem(templateKey) || "null");
      const currentItems = mfgTemplate || DEFAULT_ESTIMATE_ITEMS;
      const expenseTotal = currentItems.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
      const netProfit = sellingPrice - expenseTotal;
      estimate = {
        totalExpenses: expenseTotal,
        netProfit: netProfit
      };
    }
    
    const expenseTotal = estimate ? (estimate.totalExpenses || 0) : 0;
    const netProfit = sellingPrice - expenseTotal;

    totalSellingPrice += sellingPrice;
    totalExpenseTotal += expenseTotal;
    totalNetProfit += netProfit;

    const productNames = (o.items || []).map(item => `${item.name} (x${item.qty})`).join("<br/>") || '<span style="color:var(--color-muted);">—</span>';

    return `
      <tr>
        <td style="font-weight:bold; color:var(--color-text-bright);">
          <button class="recon-detail-btn" data-id="${o.id}" style="background:none; border:none; color:var(--color-primary-start, #00b0ff); cursor:pointer; text-decoration:underline; font-weight:bold; padding:0; font-size:inherit; font-family:inherit;">#${o.id.toString().slice(-4)}</button>
        </td>
        <td>${new Date(o.date).toLocaleDateString()}</td>
        <td style="color:var(--color-muted); font-size:0.85rem; max-width:220px; white-space:normal; word-break:break-word;">${productNames}</td>
        <td style="font-weight:bold; color:#00e676;">$${sellingPrice.toFixed(2)}</td>
        <td style="color:#ff5252;">$${expenseTotal.toFixed(2)}</td>
        <td style="font-weight:bold; color:${netProfit >= 0 ? '#00e676' : '#ff5252'};">$${netProfit.toFixed(2)}</td>
      </tr>
    `;
  });

  // Append summary row
  if (filteredOrders.length > 0) {
    rows.push(`
      <tr style="background:var(--color-input-bg); font-weight:bold; border-top:2px solid var(--color-primary-start);">
        <td colspan="3" style="text-align:right; color:var(--color-text-bright); font-weight:bold;">Total Summary:</td>
        <td style="color:#00e676; font-weight:bold; font-size:1.1rem;">$${totalSellingPrice.toFixed(2)}</td>
        <td style="color:#ff5252; font-weight:bold; font-size:1.1rem;">$${totalExpenseTotal.toFixed(2)}</td>
        <td style="color:${totalNetProfit >= 0 ? '#00e676' : '#ff5252'}; font-weight:bold; font-size:1.1rem;">$${totalNetProfit.toFixed(2)}</td>
      </tr>
    `);
  }

  body.innerHTML = rows.join('');

  // Clickable Order No. → open Order Details modal
  document.querySelectorAll(".recon-detail-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (typeof window.openOrderDetails === "function") {
        window.openOrderDetails(btn.dataset.id);
      }
    });
  });
}

function drawProfitLossChart(transactions) {
  const container = document.getElementById("accProfitChart");
  const legend = document.getElementById("accProfitChartLegend");
  if (!container) return;
  
  if (transactions.length === 0) {
    container.innerHTML = `<div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:var(--color-muted); font-size:0.85rem;">No transactions recorded yet</div>`;
    legend.innerHTML = "";
    return;
  }
  
  const monthlyData = {};
  transactions.forEach(t => {
    const d = new Date(t.date);
    if (isNaN(d.getTime())) return;
    const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
    if (!monthlyData[key]) {
      monthlyData[key] = { revenue: 0, expenses: 0 };
    }
    
    t.debits.forEach(deb => {
      if (deb.accountCode.startsWith("5")) {
        monthlyData[key].expenses += deb.amount;
      }
    });
    t.credits.forEach(cred => {
      if (cred.accountCode.startsWith("4")) {
        monthlyData[key].revenue += cred.amount;
      }
    });
  });
  
  const labels = Object.keys(monthlyData).sort((a, b) => new Date(a) - new Date(b));
  
  if (labels.length === 0) {
    container.innerHTML = `<div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:var(--color-muted); font-size:0.85rem;">No transaction data found</div>`;
    legend.innerHTML = "";
    return;
  }
  
  let maxVal = 0;
  labels.forEach(label => {
    const data = monthlyData[label];
    maxVal = Math.max(maxVal, data.revenue, data.expenses);
  });
  
  if (maxVal === 0) maxVal = 100;
  maxVal *= 1.15;
  
  const width = container.clientWidth || 500;
  const height = 220;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;
  
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  
  const barWidth = Math.max(10, Math.min(30, (chartWidth / labels.length) / 3));
  const spacing = (chartWidth / labels.length);
  
  let svgContent = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" style="font-family: inherit;">`;
  
  const gridLinesCount = 4;
  for (let i = 0; i <= gridLinesCount; i++) {
    const yVal = (maxVal / gridLinesCount) * i;
    const yPos = height - paddingBottom - (chartHeight / gridLinesCount) * i;
    svgContent += `
      <line x1="${paddingLeft}" y1="${yPos}" x2="${width - paddingRight}" y2="${yPos}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3,3" />
      <text x="${paddingLeft - 8}" y="${yPos + 4}" fill="#888" font-size="10" text-anchor="end">$${Math.round(yVal)}</text>
    `;
  }
  
  labels.forEach((label, index) => {
    const data = monthlyData[label];
    const xPos = paddingLeft + spacing * index + (spacing - barWidth * 2) / 2;
    
    const revHeight = (data.revenue / maxVal) * chartHeight;
    const expHeight = (data.expenses / maxVal) * chartHeight;
    
    const revY = height - paddingBottom - revHeight;
    const expY = height - paddingBottom - expHeight;
    
    // Revenue bar
    svgContent += `
      <rect x="${xPos}" y="${revY}" width="${barWidth}" height="${revHeight}" fill="url(#revGrad)" rx="2">
        <title>Revenue: $${data.revenue.toFixed(2)}</title>
      </rect>
    `;
    
    // Expenses bar
    svgContent += `
      <rect x="${xPos + barWidth + 4}" y="${expY}" width="${barWidth}" height="${expHeight}" fill="url(#expGrad)" rx="2">
        <title>Expenses: $${data.expenses.toFixed(2)}</title>
      </rect>
    `;
    
    // X label
    svgContent += `
      <text x="${xPos + barWidth}" y="${height - paddingBottom + 18}" fill="#aaa" font-size="10" text-anchor="middle">${label}</text>
    `;
  });
  
  svgContent += `
    <defs>
      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#00e676" />
        <stop offset="100%" stop-color="#00c853" />
      </linearGradient>
      <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ff5252" />
        <stop offset="100%" stop-color="#ff1744" />
      </linearGradient>
    </defs>
  `;
  
  svgContent += `</svg>`;
  container.innerHTML = svgContent;
  
  legend.innerHTML = `
    <div style="display:flex; align-items:center; gap:0.4rem; font-weight:600;"><span style="width:12px; height:12px; background:#00e676; border-radius:3px;"></span>Revenue</div>
    <div style="display:flex; align-items:center; gap:0.4rem; font-weight:600;"><span style="width:12px; height:12px; background:#ff5252; border-radius:3px;"></span>Expenses</div>
  `;
}

// ==========================================
// WALLET AND SALES COMMISSION SYSTEM
// ==========================================

export function getWalletData(mfg) {
  const orders = JSON.parse(localStorage.getItem("brakeOrders") || "[]");
  const withdrawals = JSON.parse(localStorage.getItem("brakeWithdrawals") || "[]");
  const settlements = JSON.parse(localStorage.getItem("brakeCommissionSettlements") || "[]");
  const settings = JSON.parse(localStorage.getItem("brakeSiteSettings") || "{}");
  
  const commissionEnabled = settings.commissionEnabled ?? false;
  const commissionPercent = settings.commissionPercent ?? 5.0;
  
  const validStatuses = ["paid", "processing", "shipped", "delivered"];
  const mfgOrders = orders.filter(o => validStatuses.includes(o.status));
  
  let totalSales = 0;
  let totalCommission = 0;
  let accruedCommission = 0;
  let settledCommission = 0;
  
  const orderCommissions = [];
  
  mfgOrders.forEach(o => {
    const subtotal = getOrderMfgSubtotal(o, mfg);
    if (subtotal > 0) {
      totalSales += subtotal;
      
      let rate = commissionPercent;
      let amt = 0;
      if (commissionEnabled) {
        if (o.commissionRate !== undefined) {
          rate = o.commissionRate;
        }
        if (o.commissions && o.commissions[mfg] !== undefined) {
          amt = o.commissions[mfg];
        } else {
          amt = parseFloat((subtotal * rate / 100).toFixed(2));
        }
      }
      
      totalCommission += amt;
      
      const isSettled = settlements.some(s => s.mfg === mfg && s.orderIds.includes(o.id));
      if (isSettled) {
        settledCommission += amt;
      } else {
        accruedCommission += amt;
      }
      
      orderCommissions.push({
        id: o.id,
        date: o.date,
        subtotal: subtotal,
        commission: amt,
        isSettled: isSettled
      });
    }
  });
  
  const mfgWithdrawals = withdrawals.filter(w => w.mfg === mfg);
  const totalPayouts = mfgWithdrawals
    .filter(w => w.status === "approved")
    .reduce((sum, w) => sum + w.amount, 0);
  const pendingPayouts = mfgWithdrawals
    .filter(w => w.status === "pending")
    .reduce((sum, w) => sum + w.amount, 0);
    
  const currentBalance = parseFloat((totalSales - totalPayouts - settledCommission).toFixed(2));
  const withdrawableBalance = parseFloat((currentBalance - accruedCommission).toFixed(2));
  
  const history = [];
  
  orderCommissions.forEach(sc => {
    history.push({
      id: `sale_${sc.id}`,
      date: sc.date,
      type: "sale",
      description: `Sale revenue from Order #${sc.id.toString().slice(-4)}`,
      ref: `Order #${sc.id.toString().slice(-4)}`,
      amount: sc.subtotal,
      commission: sc.commission,
      status: "completed"
    });
  });
  
  const mfgSettlements = settlements.filter(s => s.mfg === mfg);
  mfgSettlements.forEach(s => {
    history.push({
      id: `comm_${s.id}`,
      date: s.date,
      type: "commission_charge",
      description: `Charged commission fee for orders: ${s.orderIds.map(id => "#" + id.toString().slice(-4)).join(", ")}`,
      ref: `Settlement`,
      amount: -s.amount,
      commission: 0,
      status: "completed"
    });
  });
  
  mfgWithdrawals.forEach(w => {
    history.push({
      id: `wit_${w.id}`,
      date: w.date,
      type: "withdrawal",
      description: `Withdrawal payout requested to: ${w.bankDetails}`,
      ref: `Payout`,
      amount: -w.amount,
      commission: 0,
      status: w.status
    });
  });
  
  history.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  return {
    totalSales,
    totalCommission,
    accruedCommission,
    settledCommission,
    totalPayouts,
    pendingPayouts,
    currentBalance,
    withdrawableBalance,
    withdrawals: mfgWithdrawals,
    history
  };
}

export function renderWalletTab(mfg) {
  const kpiGrid = document.getElementById("walletKpiGrid");
  const actionArea = document.getElementById("walletActionArea");
  if (!kpiGrid || !actionArea) return;
  
  const userRole = localStorage.getItem("brakeRole") || "user";
  
  if (mfg === "all" && userRole === "superadmin") {
    // Consolidated Overview for Superuser
    const users = JSON.parse(localStorage.getItem("brakeUsers") || "[]");
    const products = JSON.parse(localStorage.getItem("brakeProducts") || "[]");
    const mfgs = new Set();
    users.forEach(u => { if (u.manufacturer) mfgs.add(u.manufacturer); });
    products.forEach(p => { if (p.manufacturer) mfgs.add(p.manufacturer); });
    const mfgList = Array.from(mfgs).filter(Boolean);
    if (mfgList.length === 0) mfgList.push("Garage1");

    let overallSales = 0;
    let overallCommissionsSettled = 0;
    let overallCommissionsAccrued = 0;
    let overallPayoutsApproved = 0;
    let overallWithdrawable = 0;
    let overallPendingPayouts = 0;
    
    const mfgWallets = mfgList.map(name => {
      const wData = getWalletData(name);
      overallSales += wData.totalSales;
      overallCommissionsSettled += wData.settledCommission;
      overallCommissionsAccrued += wData.accruedCommission;
      overallPayoutsApproved += wData.totalPayouts;
      overallWithdrawable += wData.withdrawableBalance;
      overallPendingPayouts += wData.pendingPayouts;
      return { name, ...wData };
    });

    kpiGrid.innerHTML = `
      <div class="acc-kpi-card cash">
        <div class="acc-kpi-title">Commissions Collected</div>
        <div class="acc-kpi-value">$${overallCommissionsSettled.toFixed(2)}</div>
        <div class="acc-kpi-subtitle">Total platform commission revenue</div>
      </div>
      <div class="acc-kpi-card expenses">
        <div class="acc-kpi-title">Accrued Commissions</div>
        <div class="acc-kpi-value">$${overallCommissionsAccrued.toFixed(2)}</div>
        <div class="acc-kpi-subtitle">Uncollected sales commission fees</div>
      </div>
      <div class="acc-kpi-card profit">
        <div class="acc-kpi-title">Pending Payouts</div>
        <div class="acc-kpi-value">$${overallPendingPayouts.toFixed(2)}</div>
        <div class="acc-kpi-subtitle">Manufacturer withdrawal requests</div>
      </div>
      <div class="acc-kpi-card networth">
        <div class="acc-kpi-title">Manufacturer Payables</div>
        <div class="acc-kpi-value">$${overallWithdrawable.toFixed(2)}</div>
        <div class="acc-kpi-subtitle">Outstanding manufacturer balances</div>
      </div>
    `;

    let walletRows = mfgWallets.map(w => {
      const settleBtnDisabled = w.accruedCommission <= 0;
      return `
        <tr>
          <td style="font-weight:bold; color:var(--color-text-bright);">🏭 ${w.name}</td>
          <td>$${w.totalSales.toFixed(2)}</td>
          <td style="color:#00e676;">$${w.settledCommission.toFixed(2)}</td>
          <td style="color:#ff5252;">$${w.accruedCommission.toFixed(2)}</td>
          <td>$${w.currentBalance.toFixed(2)}</td>
          <td style="font-weight:bold; color:var(--color-primary-start);">$${w.withdrawableBalance.toFixed(2)}</td>
          <td>
            <button class="brand-btn charge-commission-btn" data-mfg="${w.name}" data-amount="${w.accruedCommission}" ${settleBtnDisabled ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : 'style="border: 1px solid #ff5252; color:#ff5252;"'}>
              🪙 Charge Fee
            </button>
          </td>
        </tr>
      `;
    }).join("");

    const withdrawalsList = JSON.parse(localStorage.getItem("brakeWithdrawals") || "[]");
    const pendingWithdrawals = withdrawalsList.filter(w => w.status === "pending");
    let pendingRows = pendingWithdrawals.map(w => `
      <tr>
        <td>${new Date(w.date).toLocaleDateString()}</td>
        <td style="font-weight:bold; color:var(--color-text-bright);">🏭 ${w.mfg}</td>
        <td style="font-weight:bold; color:var(--color-primary-start);">$${w.amount.toFixed(2)}</td>
        <td style="font-size:0.85rem; max-width:200px; overflow:hidden; text-overflow:ellipsis;" title="${w.bankDetails}">${w.bankDetails}</td>
        <td><span style="padding:0.2rem 0.6rem; border-radius:12px; background:rgba(255,179,0,0.15); color:var(--color-primary-start); font-size:0.8rem; font-weight:bold;">Pending</span></td>
        <td>
          <div style="display:flex; gap:0.4rem;">
            <button class="brand-btn approve-payout-btn" data-id="${w.id}" style="border: 1px solid #00e676; color:#00e676; padding:0.3rem 0.6rem; font-size:0.8rem;">Approve</button>
            <button class="brand-btn decline-payout-btn" data-id="${w.id}" style="border: 1px solid #ff5252; color:#ff5252; padding:0.3rem 0.6rem; font-size:0.8rem;">Decline</button>
          </div>
        </td>
      </tr>
    `).join("");

    if (pendingWithdrawals.length === 0) {
      pendingRows = `<tr><td colspan="6" style="text-align:center; color:var(--color-muted); padding:1.5rem;">No pending payout requests</td></tr>`;
    }

    const allHistory = [];
    mfgWallets.forEach(w => {
      w.history.forEach(h => {
        allHistory.push({ mfg: w.name, ...h });
      });
    });
    allHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentHistory = allHistory.slice(0, 30);
    
    let historyRows = recentHistory.map(h => {
      let typeBadge = "";
      let amtColor = "";
      let prefix = "";
      if (h.type === "sale") {
        typeBadge = `<span style="padding:0.2rem 0.6rem; border-radius:12px; background:rgba(0,230,118,0.15); color:#00e676; font-size:0.8rem; font-weight:bold;">Sale</span>`;
        amtColor = "#00e676";
        prefix = "+";
      } else if (h.type === "commission_charge") {
        typeBadge = `<span style="padding:0.2rem 0.6rem; border-radius:12px; background:rgba(255,82,82,0.15); color:#ff5252; font-size:0.8rem; font-weight:bold;">Fee Charged</span>`;
        amtColor = "#ff5252";
        prefix = "";
      } else if (h.type === "withdrawal") {
        const bg = h.status === "approved" ? "rgba(0,176,255,0.15)" : (h.status === "pending" ? "rgba(255,179,0,0.15)" : "rgba(255,82,82,0.15)");
        const col = h.status === "approved" ? "#00b0ff" : (h.status === "pending" ? "#ffb300" : "#ff5252");
        typeBadge = `<span style="padding:0.2rem 0.6rem; border-radius:12px; background:${bg}; color:${col}; font-size:0.8rem; font-weight:bold;">Payout (${h.status})</span>`;
        amtColor = h.status === "approved" ? "#00b0ff" : "#aaa";
        prefix = "";
      }

      return `
        <tr>
          <td>${new Date(h.date).toLocaleString()}</td>
          <td style="font-weight:bold;">🏭 ${h.mfg}</td>
          <td>${typeBadge}</td>
          <td style="font-size:0.9rem;">${h.description}</td>
          <td style="font-weight:bold; color:${amtColor};">${prefix}$${h.amount.toFixed(2)}</td>
        </tr>
      `;
    }).join("");

    if (recentHistory.length === 0) {
      historyRows = `<tr><td colspan="5" style="text-align:center; color:var(--color-muted); padding:1.5rem;">No wallet transactions yet</td></tr>`;
    }

    actionArea.innerHTML = `
      <div class="acc-dashboard-grid" style="display:grid; grid-template-columns: 1fr; gap:1.5rem;">
        <div class="acc-dashboard-card">
          <h4 style="margin:0 0 1rem 0; color:var(--color-text-bright); display:flex; align-items:center; gap:0.5rem;">🏭 Manufacturer Wallets</h4>
          <div class="acc-table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Manufacturer</th>
                  <th>Gross Sales</th>
                  <th>Commissions Paid</th>
                  <th>Accrued Commission</th>
                  <th>Balance on Platform</th>
                  <th>Withdrawable</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${walletRows}
              </tbody>
            </table>
          </div>
        </div>

        <div class="acc-dashboard-card" style="border: 1px solid rgba(255,179,0,0.2); background: rgba(255,179,0,0.02);">
          <h4 style="margin:0 0 1rem 0; color:var(--color-text-bright); display:flex; align-items:center; gap:0.5rem;">⏳ Pending Payout Requests</h4>
          <div class="acc-table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Request Date</th>
                  <th>Manufacturer</th>
                  <th>Payout Amount</th>
                  <th>Bank Details</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${pendingRows}
              </tbody>
            </table>
          </div>
        </div>

        <div class="acc-dashboard-card">
          <h4 style="margin:0 0 1rem 0; color:var(--color-text-bright); display:flex; align-items:center; gap:0.5rem;">📖 Platform Wallet Activity Log</h4>
          <div class="acc-table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Manufacturer</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${historyRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    actionArea.querySelectorAll(".charge-commission-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const mfgName = btn.dataset.mfg;
        const amount = parseFloat(btn.dataset.amount) || 0;
        if (confirm(`Are you sure you want to charge the accrued commission fee of $${amount.toFixed(2)} for ${mfgName}? This will deduct the amount from their platform balance and reset their accrued commission.`)) {
          chargeMonthlyCommissionForMfg(mfgName, amount);
        }
      });
    });

    actionArea.querySelectorAll(".approve-payout-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const payoutId = Number(btn.dataset.id);
        if (confirm("Approve this payout request? Please ensure you have transferred the funds to the manufacturer's bank account details listed.")) {
          processPayoutRequest(payoutId, "approved");
        }
      });
    });

    actionArea.querySelectorAll(".decline-payout-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const payoutId = Number(btn.dataset.id);
        if (confirm("Decline this payout request? The funds will remain in the manufacturer's withdrawable balance.")) {
          processPayoutRequest(payoutId, "declined");
        }
      });
    });

  } else {
    // Individual Manufacturer View
    const activeMfg = (mfg === "all" || !mfg || mfg === "Administration (Superuser)") ? "Garage1" : mfg;
    const data = getWalletData(activeMfg);

    kpiGrid.innerHTML = `
      <div class="acc-kpi-card cash">
        <div class="acc-kpi-title">Gross Platform Balance</div>
        <div class="acc-kpi-value">$${data.currentBalance.toFixed(2)}</div>
        <div class="acc-kpi-subtitle">Sales minus approved withdrawals & settled fees</div>
      </div>
      <div class="acc-kpi-card expenses">
        <div class="acc-kpi-title">Accrued Commission</div>
        <div class="acc-kpi-value">$${data.accruedCommission.toFixed(2)}</div>
        <div class="acc-kpi-subtitle">Platform sales fee waiting to be charged</div>
      </div>
      <div class="acc-kpi-card profit">
        <div class="acc-kpi-title">Withdrawable Balance</div>
        <div class="acc-kpi-value">$${data.withdrawableBalance.toFixed(2)}</div>
        <div class="acc-kpi-subtitle">Available for immediate withdrawal request</div>
      </div>
    `;

    let historyRows = data.history.map(h => {
      let typeBadge = "";
      let amtColor = "";
      let prefix = "";
      if (h.type === "sale") {
        typeBadge = `<span style="padding:0.2rem 0.6rem; border-radius:12px; background:rgba(0,230,118,0.15); color:#00e676; font-size:0.8rem; font-weight:bold;">Sale</span>`;
        amtColor = "#00e676";
        prefix = "+";
      } else if (h.type === "commission_charge") {
        typeBadge = `<span style="padding:0.2rem 0.6rem; border-radius:12px; background:rgba(255,82,82,0.15); color:#ff5252; font-size:0.8rem; font-weight:bold;">Fee Charged</span>`;
        amtColor = "#ff5252";
        prefix = "";
      } else if (h.type === "withdrawal") {
        const bg = h.status === "approved" ? "rgba(0,176,255,0.15)" : (h.status === "pending" ? "rgba(255,179,0,0.15)" : "rgba(255,82,82,0.15)");
        const col = h.status === "approved" ? "#00b0ff" : (h.status === "pending" ? "#ffb300" : "#ff5252");
        typeBadge = `<span style="padding:0.2rem 0.6rem; border-radius:12px; background:${bg}; color:${col}; font-size:0.8rem; font-weight:bold;">Payout (${h.status})</span>`;
        amtColor = h.status === "approved" ? "#00b0ff" : "#aaa";
        prefix = "";
      }

      return `
        <tr>
          <td>${new Date(h.date).toLocaleString()}</td>
          <td>${typeBadge}</td>
          <td style="font-size:0.9rem;">${h.description}</td>
          <td style="font-weight:bold; color:${amtColor};">${prefix}$${h.amount.toFixed(2)}</td>
        </tr>
      `;
    }).join("");

    if (data.history.length === 0) {
      historyRows = `<tr><td colspan="4" style="text-align:center; color:var(--color-muted); padding:1.5rem;">No wallet transactions yet</td></tr>`;
    }

    actionArea.innerHTML = `
      <div style="display:grid; grid-template-columns: 1fr 2fr; gap:1.5rem; flex-wrap:wrap;">
        <div class="acc-dashboard-card" style="height:fit-content; border: 1px solid rgba(0,176,255,0.2);">
          <h4 style="margin:0 0 1rem 0; color:var(--color-text-bright); display:flex; align-items:center; gap:0.5rem;">👛 Request Funds Withdrawal</h4>
          <form id="requestPayoutForm" style="display:flex; flex-direction:column; gap:1rem;">
            <div style="display:flex; flex-direction:column; gap:0.3rem;">
              <label style="font-size:0.85rem; color:var(--color-muted);">Withdrawal Amount ($)</label>
              <input type="number" id="witAmt" step="0.01" min="1" max="${data.withdrawableBalance}" value="${data.withdrawableBalance > 0 ? data.withdrawableBalance : 0}" required style="padding:0.8rem; border-radius:4px; border:1px solid var(--color-border); background:var(--color-bg); color:var(--color-text-bright); font-weight:bold; font-size:1.1rem; color:var(--color-primary-start);" />
              <span style="font-size:0.75rem; color:#888;">Max withdrawable: $${data.withdrawableBalance.toFixed(2)}</span>
            </div>
            <div style="display:flex; flex-direction:column; gap:0.3rem;">
              <label style="font-size:0.85rem; color:var(--color-muted);">Bank Account Details / Card Info</label>
              <textarea id="witDetails" required style="padding:0.8rem; border-radius:4px; border:1px solid var(--color-border); background:var(--color-bg); color:var(--color-text-bright); min-height:80px; font-family:inherit; font-size:0.9rem;" placeholder="e.g. Card No., IBAN, Bank Name, SWIFT, Recipient Full Name..."></textarea>
            </div>
            <button type="submit" class="brand-btn" style="background:var(--color-primary-start); color:#fff; border:none; padding:0.8rem; font-weight:bold; cursor:pointer;" ${data.withdrawableBalance <= 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
              📤 Submit Payout Request
            </button>
          </form>
        </div>

        <div class="acc-dashboard-card">
          <h4 style="margin:0 0 1rem 0; color:var(--color-text-bright); display:flex; align-items:center; gap:0.5rem;">📖 Wallet Transaction History</h4>
          <div class="acc-table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${historyRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    const payoutForm = document.getElementById("requestPayoutForm");
    if (payoutForm) {
      payoutForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const amt = parseFloat(document.getElementById("witAmt").value) || 0;
        const details = document.getElementById("witDetails").value.trim();

        if (amt <= 0) {
          alert("Withdrawal amount must be greater than zero.");
          return;
        }
        if (amt > data.withdrawableBalance) {
          alert(`You cannot withdraw more than your available withdrawable balance of $${data.withdrawableBalance.toFixed(2)}.`);
          return;
        }
        if (!details) {
          alert("Please provide bank or card details for payout processing.");
          return;
        }

        const withdrawals = JSON.parse(localStorage.getItem("brakeWithdrawals") || "[]");
        const newWithdrawal = {
          id: Date.now(),
          mfg: activeMfg,
          date: new Date().toISOString(),
          amount: amt,
          bankDetails: details,
          status: "pending",
          processedDate: null
        };
        withdrawals.push(newWithdrawal);
        localStorage.setItem("brakeWithdrawals", JSON.stringify(withdrawals));

        alert("Payout request submitted successfully! It is now pending administrator approval.");
        renderWalletTab(mfg);
      });
    }
  }
}

function chargeMonthlyCommissionForMfg(mfgName, amount) {
  const settlements = JSON.parse(localStorage.getItem("brakeCommissionSettlements") || "[]");
  const orders = JSON.parse(localStorage.getItem("brakeOrders") || "[]");
  const settings = JSON.parse(localStorage.getItem("brakeSiteSettings") || "{}");
  
  const commissionEnabled = settings.commissionEnabled ?? false;
  const commissionPercent = settings.commissionPercent ?? 5.0;
  
  const validStatuses = ["paid", "processing", "shipped", "delivered"];
  const unpaidOrders = orders.filter(o => {
    if (!validStatuses.includes(o.status)) return false;
    const subtotal = getOrderMfgSubtotal(o, mfgName);
    if (subtotal <= 0) return false;
    
    const isSettled = settlements.some(s => s.mfg === mfgName && s.orderIds.includes(o.id));
    return !isSettled;
  });

  if (unpaidOrders.length === 0) {
    alert("No accrued commissions to charge.");
    return;
  }

  const orderIds = unpaidOrders.map(o => o.id);
  
  const newSettlement = {
    id: Date.now(),
    date: new Date().toISOString(),
    mfg: mfgName,
    amount: amount,
    orderIds: orderIds
  };
  settlements.push(newSettlement);
  localStorage.setItem("brakeCommissionSettlements", JSON.stringify(settlements));

  const txsKey = `brakeAccountingTransactions_${mfgName}`;
  const transactions = JSON.parse(localStorage.getItem(txsKey) || "[]");
  transactions.push({
    id: `tx_comm_settle_${Date.now()}`,
    date: new Date().toISOString(),
    description: `Sales commission fee settled for orders: ${orderIds.map(id => "#" + id.toString().slice(-4)).join(", ")}`,
    ref: `Settlement #${newSettlement.id.toString().slice(-4)}`,
    type: "manual",
    debits: [{ accountCode: "5110", amount: amount }],
    credits: [{ accountCode: "1020", amount: amount }]
  });
  localStorage.setItem(txsKey, JSON.stringify(transactions));

  alert(`Successfully charged commission fee of $${amount.toFixed(2)} for ${mfgName}.`);
  renderWalletTab("all");
}

function processPayoutRequest(payoutId, status) {
  const withdrawals = JSON.parse(localStorage.getItem("brakeWithdrawals") || "[]");
  const idx = withdrawals.findIndex(w => w.id === payoutId);
  if (idx === -1) return;
  
  const w = withdrawals[idx];
  w.status = status;
  w.processedDate = new Date().toISOString();
  localStorage.setItem("brakeWithdrawals", JSON.stringify(withdrawals));

  if (status === "approved") {
    const txsKey = `brakeAccountingTransactions_${w.mfg}`;
    const transactions = JSON.parse(localStorage.getItem(txsKey) || "[]");
    transactions.push({
      id: `tx_payout_${w.id}`,
      date: new Date().toISOString(),
      description: `Payout request approved and paid to: ${w.bankDetails}`,
      ref: `Payout #${w.id.toString().slice(-4)}`,
      type: "manual",
      debits: [{ accountCode: "1010", amount: w.amount }],
      credits: [{ accountCode: "1020", amount: w.amount }]
    });
    localStorage.setItem(txsKey, JSON.stringify(transactions));
    alert(`Payout request of $${w.amount.toFixed(2)} for ${w.mfg} has been approved.`);
  } else {
    alert(`Payout request of $${w.amount.toFixed(2)} for ${w.mfg} has been declined.`);
  }

  renderWalletTab("all");
}
