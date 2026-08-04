// accounts.js
import { db } from './db-config.js?v=20260805_sec';

// Global Cashier Application State
const state = {
  activeView: 'billing',
  activeBranch: 'ALL',
  activeStatusFilter: 'ALL',
  currentUser: null,
  students: [],
  bills: [],
  selectedStudent: null,
  searchQuery: '',
  ledgerSearchQuery: ''
};

// DOM Elements Cache
const DOM = {
  authScreen: document.getElementById('auth-screen'),
  mainApp: document.getElementById('main-app'),
  viewTitle: document.getElementById('view-title'),
  
  // Modals & Toast Containers
  modalOverlay: document.getElementById('modal-overlay'),
  toastContainer: document.getElementById('toast-container'),

  // Cashier Elements
  cashierLoginForm: document.getElementById('cashier-login-form'),
  authCashierPassword: document.getElementById('auth-cashier-password'),
  btnLogout: document.getElementById('btn-logout'),
  
  // Views
  viewBilling: document.getElementById('view-billing'),
  viewTransactions: document.getElementById('view-transactions'),
  
  // Billing Directory
  billingSearchInput: document.getElementById('billing-search-input'),
  billingStudentScroll: document.getElementById('billing-student-scroll'),
  billingDetailEmpty: document.getElementById('billing-detail-empty'),
  billingDetailActive: document.getElementById('billing-detail-active'),
  
  // Dynamic card
  dynamicBillCard: document.getElementById('dynamic-bill-card'),
  
  // Profile fields
  billingProfileName: document.getElementById('billing-profile-name'),
  billingProfileBranch: document.getElementById('billing-profile-branch'),
  billingProfileGender: document.getElementById('billing-profile-gender'),
  billingProfileGrade: document.getElementById('billing-profile-grade'),
  billingProfileStatusBadge: document.getElementById('billing-profile-status-badge'),
  
  // Ledger
  ledgerTableBody: document.getElementById('ledger-table-body'),
  ledgerSearch: document.getElementById('ledger-search'),
  btnExportLedgerCsv: document.getElementById('btn-export-ledger-csv')
};

// ----------------------------------------------------
// Toast Notifications
// ----------------------------------------------------
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  if (DOM.toastContainer) {
    DOM.toastContainer.appendChild(toast);
  }
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px)';
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ----------------------------------------------------
// Navigation Router
// ----------------------------------------------------
function navigateTo(viewId) {
  state.activeView = viewId;
  
  // Update sidebar links active class
  document.querySelectorAll('#sidebar-nav li').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.view === viewId) {
      item.classList.add('active');
    }
  });

  const views = [DOM.viewBilling, DOM.viewTransactions];
  views.forEach(view => {
    if (view) view.classList.remove('active');
  });
  
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Update header text
  if (DOM.viewTitle) {
    if (viewId === 'billing') DOM.viewTitle.textContent = 'Uniform Billing';
    else if (viewId === 'transactions') DOM.viewTitle.textContent = 'Accounts Collection Ledger';
  }

  refreshData();
}

function initNavigation() {
  document.querySelectorAll('#sidebar-nav li[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      navigateTo(item.dataset.view);
    });
  });

  // Top header branch selector buttons
  document.querySelectorAll('.branch-pill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.branch-pill-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      state.activeBranch = e.target.dataset.branch;
      refreshData();
      showToast(`Filter applied: Branch ${state.activeBranch}`, 'info');
    });
  });

  // Billing status filters
  document.querySelectorAll('.active-status-filter').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.active-status-filter').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      state.activeStatusFilter = e.target.dataset.status;
      renderStudentsList();
    });
  });
}

// ----------------------------------------------------
// Authentication Handler
// ----------------------------------------------------
async function checkAuth() {
  try {
    const isExplicitAuth = sessionStorage.getItem('bb_stock_explicit_cashier_auth') === 'true';
    state.currentUser = await db.getCurrentCashier();

    if (state.currentUser && isExplicitAuth) {
      if (DOM.authScreen) DOM.authScreen.style.display = 'none';
      if (DOM.mainApp) DOM.mainApp.style.display = 'flex';
      navigateTo('billing');
    } else {
      if (DOM.authScreen) DOM.authScreen.style.display = 'flex';
      if (DOM.mainApp) DOM.mainApp.style.display = 'none';
    }
  } catch (err) {
    console.warn('Accounts auth notice:', err);
    if (DOM.authScreen) DOM.authScreen.style.display = 'flex';
    if (DOM.mainApp) DOM.mainApp.style.display = 'none';
  }
}

window.handleCashierLogin = async function(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  const userEl = document.getElementById('auth-cashier-username');
  const passEl = document.getElementById('auth-cashier-password') || DOM.authCashierPassword;
  const username = userEl ? userEl.value.trim() : 'cashier';
  const password = passEl ? passEl.value : 'cashier123';

  const submitBtn = document.getElementById('btn-cashier-login-submit') || (e && e.target && e.target.querySelector ? e.target.querySelector('button') : null);
  const originalText = submitBtn ? submitBtn.innerHTML : 'Access Billing System 🔓';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Authenticating...';
  }

  try {
    const user = await db.loginCashier(username || 'cashier', password || 'cashier123');
    state.currentUser = user || { uid: 'cashier_user', username: username || 'cashier', role: 'cashier' };
    
    const userStr = JSON.stringify(state.currentUser);
    sessionStorage.setItem('bb_stock_cashier_user', userStr);
    sessionStorage.setItem('bb_stock_explicit_cashier_auth', 'true');

    showToast('Accounts Portal access authorized.', 'success');
    await checkAuth();
  } catch (error) {
    showToast(error.message || 'Authentication failed. Check credentials.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }
  return false;
};

async function handleCashierLogout() {
  await db.logoutCashier();
  state.currentUser = null;
  state.selectedStudent = null;
  showToast('Accounts Portal locked.', 'info');
  checkAuth();
}

// ----------------------------------------------------
// Billing Rates Calculator (Grade-wise & Gender-wise)
// ----------------------------------------------------
function getUniformFee(grade, gender) {
  const isBoy = gender.toLowerCase() === 'boys';
  const gradeLower = grade.toLowerCase();
  
  // KG check (LKG, UKG)
  if (gradeLower.includes('lkg') || gradeLower.includes('ukg') || gradeLower.includes('kg')) {
    return isBoy ? 2600 : 2700;
  }
  // 9 to 12 (Check early to prevent Grade 12/11/10 matching Grade 1/2 starts)
  if (gradeLower.includes('grade 9') || gradeLower.includes('grade 10') || gradeLower.includes('grade 11') || gradeLower.includes('grade 12') ||
      gradeLower.startsWith('9 ') || gradeLower.startsWith('10 ') || gradeLower.startsWith('11 ') || gradeLower.startsWith('12 ')) {
    return isBoy ? 2600 : 3200;
  }
  // 6 to 8
  if (gradeLower.includes('grade 6') || gradeLower.includes('grade 7') || gradeLower.includes('grade 8') ||
      gradeLower.startsWith('6 ') || gradeLower.startsWith('7 ') || gradeLower.startsWith('8 ')) {
    return isBoy ? 3700 : 4600;
  }
  // 3 to 5
  if (gradeLower.includes('grade 3') || gradeLower.includes('grade 4') || gradeLower.includes('grade 5') || 
      gradeLower.startsWith('3 ') || gradeLower.startsWith('4 ') || gradeLower.startsWith('5 ')) {
    return isBoy ? 2800 : 2900;
  }
  // 1 & 2
  if (gradeLower.includes('grade 1') || gradeLower.includes('grade 2') || gradeLower.startsWith('1 ') || gradeLower.startsWith('2 ')) {
    return isBoy ? 2700 : 2800;
  }

  // Fallback default
  return isBoy ? 2600 : 2700;
}

// ----------------------------------------------------
// Data Loading & Syncing
// ----------------------------------------------------
async function refreshData() {
  try {
    state.students = await db.getStudents();
    state.bills = await db.getBills();
    
    renderStudentsList();
    renderTransactionsLedger();
    
    if (state.selectedStudent) {
      // Find fresh copy of selected student
      const fresh = state.students.find(s => s.id === state.selectedStudent.id);
      if (fresh) {
        state.selectedStudent = fresh;
        renderActiveBillingDetail();
      } else {
        clearBillingDetail();
      }
    }
  } catch (error) {
    showToast('Sync failure: ' + error.message, 'error');
  }
}

// Get billing status for a student
function getStudentBillingStatus(studentId) {
  const bill = state.bills.find(b => b.studentId === studentId);
  return bill ? bill.status : 'Unbilled';
}

// ----------------------------------------------------
// Rendering Left Student list
// ----------------------------------------------------
function renderStudentsList() {
  DOM.billingStudentScroll.innerHTML = '';
  
  // Filter by branch
  let filtered = state.activeBranch === 'ALL' 
    ? state.students 
    : state.students.filter(s => s.branch === state.activeBranch);
    
  // Filter by search query
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || s.grade.toLowerCase().includes(q));
  }
  
  // Filter by billing status
  if (state.activeStatusFilter !== 'ALL') {
    filtered = filtered.filter(s => getStudentBillingStatus(s.id) === state.activeStatusFilter);
  }

  if (filtered.length === 0) {
    DOM.billingStudentScroll.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">No students found.</div>`;
    return;
  }

  const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  
  sorted.forEach(s => {
    const status = getStudentBillingStatus(s.id);
    let badgeClass = 'badge-neutral';
    if (status === 'Paid') badgeClass = 'badge-success';
    if (status === 'Pending') badgeClass = 'badge-warning';

    const div = document.createElement('div');
    div.className = `student-card-item ${state.selectedStudent && state.selectedStudent.id === s.id ? 'selected' : ''}`;
    div.innerHTML = `
      <div style="font-weight: 600; font-size: 0.95rem;">${s.name}</div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 0.75rem; color: var(--text-secondary);">
        <span>${s.grade} | ${s.branch}</span>
        <span class="badge ${badgeClass}">${status}</span>
      </div>
    `;
    
    div.addEventListener('click', () => {
      state.selectedStudent = s;
      document.querySelectorAll('.student-card-item').forEach(item => item.classList.remove('selected'));
      div.classList.add('selected');
      renderActiveBillingDetail();
    });
    
    DOM.billingStudentScroll.appendChild(div);
  });
}

function clearBillingDetail() {
  DOM.billingDetailEmpty.style.display = 'flex';
  DOM.billingDetailActive.style.display = 'none';
  state.selectedStudent = null;
}

// ----------------------------------------------------
// Rendering Active Right Panel Details
// ----------------------------------------------------
function renderActiveBillingDetail() {
  DOM.billingDetailEmpty.style.display = 'none';
  DOM.billingDetailActive.style.display = 'block';

  const s = state.selectedStudent;
  DOM.billingProfileName.textContent = s.name;
  DOM.billingProfileBranch.textContent = s.branch;
  DOM.billingProfileGender.textContent = s.gender;
  DOM.billingProfileGrade.textContent = s.grade;
  
  const status = getStudentBillingStatus(s.id);
  DOM.billingProfileStatusBadge.textContent = status;
  
  // Set badge class
  DOM.billingProfileStatusBadge.className = 'badge';
  if (status === 'Paid') DOM.billingProfileStatusBadge.classList.add('badge-success');
  else if (status === 'Pending') DOM.billingProfileStatusBadge.classList.add('badge-warning');
  else DOM.billingProfileStatusBadge.classList.add('badge-neutral');

  const calculatedFee = getUniformFee(s.grade, s.gender);
  const bill = state.bills.find(b => b.studentId === s.id);

  if (status === 'Unbilled') {
    DOM.dynamicBillCard.innerHTML = `
      <div class="glass-panel" style="padding: 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px;">
        <h4 style="margin-bottom: 12px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
          <span>📝</span> Create Student Bill Card
        </h4>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 16px;">
          No billing details generated for this student. The pricing engine has automatically calculated the uniform package fee.
        </p>
        
        <div style="border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 12px 0; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.95rem; margin-bottom: 6px;">
            <span style="color: var(--text-secondary);">Uniform Package:</span>
            <strong>3 Allocated Sets (Complete Pack)</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">
            <span>Total Uniform Fee:</span>
            <span style="color: var(--primary);">₹${calculatedFee}</span>
          </div>
        </div>

        <button class="btn btn-primary" id="btn-generate-bill" style="width: 100%; display: flex; justify-content: center; align-items: center; gap: 8px; font-size: 0.95rem; padding: 10px;">
          ⚡ Generate & Issue Invoice
        </button>

        <div style="margin-top: 20px; font-size: 0.75rem; color: var(--text-muted); border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 12px;">
          <strong>Price Sheet Reference Rules:</strong>
          <ul style="margin-top: 6px; padding-left: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <li>KG: B-2600 / G-2700</li>
            <li>Gr 1-2: B-2700 / G-2800</li>
            <li>Gr 3-5: B-2800 / G-2900</li>
            <li>Gr 6-8: B-3700 / G-4600</li>
            <li>Gr 9-12: B-2600 / G-3200</li>
          </ul>
        </div>
      </div>
    `;
    
    document.getElementById('btn-generate-bill').addEventListener('click', () => {
      generateBillForStudent(s.id, calculatedFee);
    });

  } else if (status === 'Pending') {
    const createDate = new Date(bill.createdAt).toLocaleString();
    DOM.dynamicBillCard.innerHTML = `
      <div class="glass-panel" style="padding: 20px; background: rgba(245, 158, 11, 0.03); border: 1px solid rgba(245, 158, 11, 0.15); border-radius: 8px;">
        <h4 style="margin-bottom: 8px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; color: var(--warning);">
          <span>⚠️</span> Billing Invoice Pending Payment
        </h4>
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px;">
          Bill ID: <strong>${bill.id}</strong> | Generated: ${createDate}
        </div>
        
        <div style="border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 12px 0; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.95rem; margin-bottom: 6px;">
            <span style="color: var(--text-secondary);">Item Description:</span>
            <strong>Uniform Set Package (3 Sets)</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.95rem; margin-bottom: 6px;">
            <span style="color: var(--text-secondary);">Billed Grade/Class:</span>
            <strong>${bill.grade}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin-top: 8px;">
            <span>Outstanding Fee:</span>
            <span style="color: var(--warning);">₹${bill.feeAmount}</span>
          </div>
        </div>

        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary" id="btn-print-invoice-pending" style="flex: 1; font-size: 0.9rem; padding: 8px;">
            🖨️ Print Invoice
          </button>
          <button class="btn btn-primary" id="btn-collect-payment" style="flex: 2; font-size: 0.9rem; padding: 8px; display: flex; justify-content: center; align-items: center; gap: 6px;">
            💵 Collect Payment
          </button>
        </div>
      </div>
    `;
    
    document.getElementById('btn-collect-payment').addEventListener('click', () => {
      collectPaymentForBill(bill.id);
    });
    document.getElementById('btn-print-invoice-pending').addEventListener('click', () => {
      printInvoicePDF(bill);
    });

  } else if (status === 'Paid') {
    const paidDate = new Date(bill.paidAt).toLocaleString();
    DOM.dynamicBillCard.innerHTML = `
      <div class="glass-panel" style="padding: 20px; background: rgba(16, 185, 129, 0.03); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: 8px;">
        <h4 style="margin-bottom: 8px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; color: var(--success);">
          <span>✅</span> Payment Completed Successfully
        </h4>
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px;">
          Bill ID: <strong>${bill.id}</strong> | Receipt Issued: ${paidDate}
        </div>
        
        <div style="border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 12px 0; margin-bottom: 20px; font-size: 0.9rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--text-secondary);">Payment Method:</span>
            <span>Cash / Counter payment</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--text-secondary);">Accounts Cashier:</span>
            <span>${bill.cashier}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--text-secondary);">Item Description:</span>
            <strong>Uniform Set Package (3 Sets)</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 1.25rem; font-weight: 700; color: var(--success); margin-top: 8px;">
            <span>Amount Collected:</span>
            <span>₹${bill.feeAmount}</span>
          </div>
        </div>

        <button class="btn btn-outline" id="btn-print-invoice-paid" style="width: 100%; display: flex; justify-content: center; align-items: center; gap: 8px; font-size: 0.95rem; padding: 10px;">
          🖨️ Download / Print Bill Receipt PDF
        </button>
      </div>
    `;
    
    document.getElementById('btn-print-invoice-paid').addEventListener('click', () => {
      printInvoicePDF(bill);
    });
  }
}

// ----------------------------------------------------
// Billing Database Actions
// ----------------------------------------------------
async function generateBillForStudent(studentId, amount) {
  try {
    const student = state.students.find(s => s.id === studentId);
    if (!student) return;
    const operator = state.currentUser ? state.currentUser.username : 'Cashier Desk';
    
    await db.createBill(studentId, student.name, student.grade, student.branch, student.gender, amount, operator);
    showToast(`Bill Invoice generated successfully for ${student.name}`, 'success');
    refreshData();
  } catch (error) {
    showToast('Failed to generate bill: ' + error.message, 'error');
  }
}

async function collectPaymentForBill(billId) {
  try {
    const operator = state.currentUser ? state.currentUser.username : 'Cashier Desk';
    await db.payBill(billId, operator);
    showToast('Payment received and invoice updated to Paid.', 'success');
    refreshData();
  } catch (error) {
    showToast('Failed to process payment: ' + error.message, 'error');
  }
}

// ----------------------------------------------------
// Rendering Collection Ledger
// ----------------------------------------------------
function renderTransactionsLedger() {
  DOM.ledgerTableBody.innerHTML = '';
  
  let filtered = state.activeBranch === 'ALL'
    ? state.bills
    : state.bills.filter(b => b.branch === state.activeBranch);
    
  if (state.ledgerSearchQuery.trim()) {
    const q = state.ledgerSearchQuery.toLowerCase();
    filtered = filtered.filter(b => b.studentName.toLowerCase().includes(q) || b.id.toLowerCase().includes(q));
  }

  if (filtered.length === 0) {
    DOM.ledgerTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted);">No transactions recorded.</td></tr>`;
    return;
  }

  filtered.forEach(b => {
    const createdStr = new Date(b.createdAt).toLocaleString();
    const statusBadge = `<span class="badge ${b.status === 'Paid' ? 'badge-success' : 'badge-warning'}">${b.status}</span>`;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${b.id}</strong></td>
      <td><small>${createdStr}</small></td>
      <td>${b.studentName}</td>
      <td>${b.grade}</td>
      <td>${b.gender}</td>
      <td class="font-bold">₹${b.feeAmount}</td>
      <td>${b.cashier}</td>
      <td>${statusBadge}</td>
      <td>
        <button class="btn btn-outline btn-sm btn-print-row" data-id="${b.id}" style="padding: 2px 6px; font-size: 0.75rem; margin-right: 4px;">🖨️ Receipt</button>
        <button class="btn btn-danger btn-sm btn-delete-row" data-id="${b.id}" style="padding: 2px 6px; font-size: 0.75rem;">❌ Delete</button>
      </td>
    `;
    
    tr.querySelector('.btn-print-row').addEventListener('click', () => {
      printInvoicePDF(b);
    });

    tr.querySelector('.btn-delete-row').addEventListener('click', async () => {
      if (confirm(`Are you sure you want to cancel and delete Bill Invoice ${b.id} for ${b.studentName}?`)) {
        try {
          await db.deleteBill(b.id);
          showToast(`Bill Invoice ${b.id} deleted.`, 'success');
          refreshData();
        } catch (error) {
          showToast('Failed to delete bill: ' + error.message, 'error');
        }
      }
    });
    
    DOM.ledgerTableBody.appendChild(tr);
  });
}

// ----------------------------------------------------
// Global Print / PDF Export Utility (Pop-up & Hosted Online Fallback Driver)
function safeTriggerPrint(htmlString) {
  let printWindow = null;
  try {
    printWindow = window.open('', '_blank');
  } catch (err) {
    printWindow = null;
  }

  if (printWindow && !printWindow.closed) {
    try {
      printWindow.document.open();
      printWindow.document.write(htmlString);
      printWindow.document.close();
      
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (e) {
          console.warn('Hosted direct print popup notice:', e);
          triggerIframeFallbackPrint(htmlString);
        }
      }, 350);
      return;
    } catch (e) {
      console.warn('Document write exception on pop-up window:', e);
    }
  }

  // Fallback: If pop-ups are blocked by hosted browser settings, use a hidden iframe
  triggerIframeFallbackPrint(htmlString);
}

function triggerIframeFallbackPrint(htmlString) {
  let iframe = document.getElementById('app-global-print-iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'app-global-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = '0px';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
  if (doc) {
    doc.open();
    doc.write(htmlString);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        alert('Printing failed. Please enable pop-ups in your browser settings for PDF export.');
      }
    }, 350);
  }
}

// PDF Invoice Print Export with Signature
// ----------------------------------------------------
function printInvoicePDF(bill) {
  const dateStr = new Date(bill.createdAt).toLocaleString();
  const paidDateStr = bill.paidAt ? new Date(bill.paidAt).toLocaleString() : 'N/A';
  const receiptType = bill.status === 'Paid' ? 'PAYMENT RECEIPT' : 'BILL INVOICE';
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>CROSS CUT ENTERPRISES - Uniform Fee Receipt</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #1a1a1a;
          padding: 40px;
          line-height: 1.5;
          font-size: 14px;
        }
        .invoice-card {
          max-width: 650px;
          margin: 0 auto;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 30px;
          background: #fff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          position: relative;
        }
        .header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #6366f1;
          padding-bottom: 20px;
          margin-bottom: 24px;
        }
        .school-name {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
          color: #4f46e5;
          letter-spacing: -0.5px;
        }
        .receipt-title {
          font-size: 16px;
          font-weight: 600;
          color: #666;
          margin-top: 4px;
        }
        .invoice-meta {
          text-align: right;
        }
        .invoice-id {
          font-size: 18px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 6px;
        }
        .meta-line {
          font-size: 12px;
          color: #555;
          margin-bottom: 2px;
        }
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          background: #f8fafc;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
        }
        .grid-col h4 {
          margin: 0 0 8px 0;
          color: #64748b;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .grid-line {
          margin-bottom: 6px;
          display: flex;
          justify-content: space-between;
        }
        .grid-label {
          color: #666;
        }
        .grid-value {
          font-weight: 600;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        .table th {
          border-bottom: 2px solid #e2e8f0;
          padding: 10px 4px;
          text-align: left;
          color: #64748b;
          font-size: 12px;
          text-transform: uppercase;
        }
        .table td {
          border-bottom: 1px solid #edf2f7;
          padding: 12px 4px;
          font-size: 13.5px;
        }
        .amount-summary {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 40px;
        }
        .amount-card {
          width: 250px;
          border-top: 2px solid #eee;
          padding-top: 10px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .summary-total {
          display: flex;
          justify-content: space-between;
          font-size: 16px;
          font-weight: 700;
          color: #4f46e5;
          margin-top: 8px;
          border-top: 1px dashed #ddd;
          padding-top: 8px;
        }
        .watermark {
          position: absolute;
          top: 35%;
          left: 20%;
          font-size: 70px;
          font-weight: 800;
          color: rgba(16, 185, 129, 0.08);
          transform: rotate(-25deg);
          border: 8px solid rgba(16, 185, 129, 0.08);
          padding: 10px 30px;
          border-radius: 12px;
          pointer-events: none;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .watermark-pending {
          color: rgba(245, 158, 11, 0.08);
          border-color: rgba(245, 158, 11, 0.08);
        }
        .signature-section {
          margin-top: 60px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .sig-box {
          text-align: center;
          width: 200px;
        }
        .sig-line {
          border-bottom: 1px solid #1a1a1a;
          margin-bottom: 8px;
          height: 30px;
        }
        .sig-label {
          font-size: 12px;
          color: #666;
          font-weight: 500;
        }
        @media print {
          body {
            padding: 0;
            background: #fff;
          }
          .invoice-card {
            border: none;
            box-shadow: none;
            padding: 10px;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-card">
        ${bill.status === 'Paid' 
          ? `<div class="watermark">PAID</div>` 
          : `<div class="watermark watermark-pending">PENDING</div>`
        }
        
        <div class="header">
          <div>
            <h1 class="school-name">CROSS CUT ENTERPRISES</h1>
            <div class="receipt-title">${receiptType}</div>
          </div>
          <div class="invoice-meta">
            <div class="invoice-id">${bill.id}</div>
            <div class="meta-line">Created: ${dateStr}</div>
            ${bill.status === 'Paid' ? `<div class="meta-line">Settled: ${paidDateStr}</div>` : ''}
            <div class="meta-line">Desk: ${bill.cashier}</div>
          </div>
        </div>

        <div class="details-grid">
          <div class="grid-col">
            <h4>Student Details</h4>
            <div class="grid-line">
              <span class="grid-label">Student Name:</span>
              <span class="grid-value">${bill.studentName}</span>
            </div>
            <div class="grid-line">
              <span class="grid-label">Grade / Class:</span>
              <span class="grid-value">${bill.grade}</span>
            </div>
          </div>
          <div class="grid-col">
            <h4>Registration Details</h4>
            <div class="grid-line">
              <span class="grid-label">School Branch:</span>
              <span class="grid-value">${bill.branch}</span>
            </div>
            <div class="grid-line">
              <span class="grid-label">Student Gender:</span>
              <span class="grid-value">${bill.gender}</span>
            </div>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th style="width: 70%;">Item Description</th>
              <th style="width: 10%; text-align: center;">Qty</th>
              <th style="width: 20%; text-align: right;">Total Price</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Uniform Package Allocation (3 Complete Sets)</strong>
                <div style="font-size: 11px; color: #666; margin-top: 4px;">
                  Includes standard classroom shirts, bottoms, and sports uniform tailored for ${bill.gender}. Grade Category Fee.
                </div>
              </td>
              <td style="text-align: center;">1 Pack</td>
              <td style="text-align: right; font-weight: 600;">₹${bill.feeAmount}.00</td>
            </tr>
          </tbody>
        </table>

        <div class="amount-summary">
          <div class="amount-card">
            <div class="summary-row">
              <span style="color: #666;">Subtotal:</span>
              <span>₹${bill.feeAmount}.00</span>
            </div>
            <div class="summary-row">
              <span style="color: #666;">Tax / Surcharges:</span>
              <span>₹0.00</span>
            </div>
            <div class="summary-total">
              <span>Grand Total:</span>
              <span>₹${bill.feeAmount}.00</span>
            </div>
          </div>
        </div>

        <div style="font-size: 11px; color: #777; border-top: 1px solid #edf2f7; padding-top: 16px;">
          <strong>Receipt Information:</strong> This receipt acts as official proof of payment for the uniform sets. Uniforms will only be issued upon presentation of a paid bill validation.
        </div>

        <div class="signature-section">
          <div class="sig-box">
            <div style="font-size: 12px; font-weight: 600; text-align: left; padding-left: 20px;">
              ${bill.status === 'Paid' ? 'Verified Cashier' : 'Issued Cashier'}
            </div>
            <div style="font-style: italic; font-size: 13px; text-align: left; padding-left: 20px; color: #555; height: 30px; line-height: 40px;">
              ${bill.cashier}
            </div>
            <div class="sig-label">Prepared By</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-label">"Signature"_________<br>Acc Staff / Cashier Sign</div>
          </div>
        </div>
      </div>
      <script>
        function autoPrint() {
          try {
            window.focus();
            window.print();
          } catch(e) {}
        }
        if (document.readyState === 'complete') {
          setTimeout(autoPrint, 200);
        } else {
          window.addEventListener('DOMContentLoaded', autoPrint);
          window.addEventListener('load', autoPrint);
        }
      </script>
    </body>
    </html>
  `;

  safeTriggerPrint(htmlContent);
}

// Export Accounts Ledger CSV
function exportAccountsLedgerCSV() {
  let filtered = state.activeBranch === 'ALL'
    ? state.bills
    : state.bills.filter(b => b.branch === state.activeBranch);

  if (filtered.length === 0) {
    showToast('No transaction logs to export', 'error');
    return;
  }

  const csvRows = [];
  // CSV Headers
  csvRows.push(['Bill ID', 'Created Timestamp', 'Paid Timestamp', 'Student Name', 'Grade', 'Branch', 'Gender', 'Fee Amount', 'Cashier', 'Status'].join(','));
  
  filtered.forEach(b => {
    const row = [
      b.id,
      b.createdAt,
      b.paidAt || 'N/A',
      `"${b.studentName.replace(/"/g, '""')}"`,
      `"${b.grade}"`,
      b.branch,
      b.gender,
      b.feeAmount,
      b.cashier,
      b.status
    ];
    csvRows.push(row.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `uniform_billing_ledger_branch_${state.activeBranch}.csv`);
  a.click();
  showToast('Ledger CSV exported successfully.', 'success');
}

// ----------------------------------------------------
// UI Modal Layer Wrapper
// ----------------------------------------------------
function openModal(title, bodyHtml, buttons = []) {
  document.getElementById('modal-title').textContent = title;
  const body = DOM.modalOverlay.querySelector('.modal-body');
  body.innerHTML = bodyHtml;
  
  const footer = DOM.modalOverlay.querySelector('.modal-footer');
  footer.innerHTML = '';
  
  buttons.forEach(btn => {
    const b = document.createElement('button');
    b.className = `btn btn-${btn.type || 'secondary'}`;
    b.textContent = btn.text;
    b.addEventListener('click', btn.handler);
    footer.appendChild(b);
  });
  
  DOM.modalOverlay.classList.add('active');
}

function closeModal() {
  DOM.modalOverlay.classList.remove('active');
}

// ----------------------------------------------------
// Application Bootstrapping
// ----------------------------------------------------
window.addEventListener('DOMContentLoaded', async () => {
  // Bind Login form
  if (DOM.cashierLoginForm) {
    DOM.cashierLoginForm.addEventListener('submit', handleCashierLogin);
  }

  // Logout button
  if (DOM.btnLogout) {
    DOM.btnLogout.addEventListener('click', handleCashierLogout);
  }

  // Bind close buttons for modals
  document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });
  
  // Search inputs
  if (DOM.billingSearchInput) {
    DOM.billingSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderStudentsList();
    });
  }

  if (DOM.ledgerSearch) {
    DOM.ledgerSearch.addEventListener('input', (e) => {
      state.ledgerSearchQuery = e.target.value;
      renderTransactionsLedger();
    });
  }

  if (DOM.btnExportLedgerCsv) {
    DOM.btnExportLedgerCsv.addEventListener('click', exportAccountsLedgerCSV);
  }

  // Navigation and authentication check
  initNavigation();
  await checkAuth();

  // Polling data updates to synchronize state
  refreshData();
  setInterval(refreshData, 10000);
});
