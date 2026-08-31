// accounts.js
import { db } from './db-config.js?v=20260805_final';

// Global Cashier Application State
const state = {
  activeView: 'billing',
  activeBranch: 'ALL',
  activeStatusFilter: 'ALL',
  activeGradeFilter: 'ALL',
  activeSectionFilter: 'ALL',
  activeMatrixGender: 'Boys',
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
  viewFeeStructure: document.getElementById('view-fee-structure'),
  
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

  if (DOM.viewBilling) DOM.viewBilling.style.display = viewId === 'billing' ? 'block' : 'none';
  if (DOM.viewTransactions) DOM.viewTransactions.style.display = viewId === 'transactions' ? 'block' : 'none';
  if (DOM.viewFeeStructure) DOM.viewFeeStructure.style.display = viewId === 'fee-structure' ? 'block' : 'none';
  
  if (DOM.viewTitle) {
    if (viewId === 'billing') DOM.viewTitle.textContent = 'Uniform Billing';
    else if (viewId === 'transactions') DOM.viewTitle.textContent = 'Accounts Collection Ledger';
    else if (viewId === 'fee-structure') {
      DOM.viewTitle.textContent = 'Grade Uniform Fee Matrix Master';
      renderGradeFeeMatrixTable();
    }
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

const DEFAULT_BOYS_FEE_MATRIX = [
  { gradeKey: 'LKG', gradeName: 'Junior KG / LKG', yellowFee: 900, pinkFee: 900, sportsFee: 800, otherFee: 0 },
  { gradeKey: 'UKG', gradeName: 'Senior KG / UKG', yellowFee: 900, pinkFee: 900, sportsFee: 800, otherFee: 0 },
  { gradeKey: 'GRADE_1', gradeName: 'Grade 1 / I Std', yellowFee: 950, pinkFee: 950, sportsFee: 800, otherFee: 0 },
  { gradeKey: 'GRADE_2', gradeName: 'Grade 2 / II Std', yellowFee: 950, pinkFee: 950, sportsFee: 800, otherFee: 0 },
  { gradeKey: 'GRADE_3', gradeName: 'Grade 3 / III Std', yellowFee: 1000, pinkFee: 1000, sportsFee: 800, otherFee: 0 },
  { gradeKey: 'GRADE_4', gradeName: 'Grade 4 / IV Std', yellowFee: 1000, pinkFee: 1000, sportsFee: 800, otherFee: 0 },
  { gradeKey: 'GRADE_5', gradeName: 'Grade 5 / V Std', yellowFee: 1000, pinkFee: 1000, sportsFee: 800, otherFee: 0 },
  { gradeKey: 'GRADE_6', gradeName: 'Grade 6 / VI Std', yellowFee: 1300, pinkFee: 1300, sportsFee: 1100, otherFee: 0 },
  { gradeKey: 'GRADE_7', gradeName: 'Grade 7 / VII Std', yellowFee: 1300, pinkFee: 1300, sportsFee: 1100, otherFee: 0 },
  { gradeKey: 'GRADE_8', gradeName: 'Grade 8 / VIII Std', yellowFee: 1300, pinkFee: 1300, sportsFee: 1100, otherFee: 0 },
  { gradeKey: 'GRADE_9', gradeName: 'Grade 9 / IX Std', yellowFee: 900, pinkFee: 900, sportsFee: 800, otherFee: 0 },
  { gradeKey: 'GRADE_10', gradeName: 'Grade 10 / X Std', yellowFee: 900, pinkFee: 900, sportsFee: 800, otherFee: 0 },
  { gradeKey: 'GRADE_11', gradeName: 'Grade 11 / XI Std', yellowFee: 900, pinkFee: 900, sportsFee: 800, otherFee: 0 },
  { gradeKey: 'GRADE_12', gradeName: 'Grade 12 / XII Std', yellowFee: 900, pinkFee: 900, sportsFee: 800, otherFee: 0 }
];

const DEFAULT_GIRLS_FEE_MATRIX = [
  { gradeKey: 'LKG', gradeName: 'Junior KG / LKG', yellowFee: 950, pinkFee: 950, sportsFee: 800, otherFee: 0 },
  { gradeKey: 'UKG', gradeName: 'Senior KG / UKG', yellowFee: 950, pinkFee: 950, sportsFee: 800, otherFee: 0 },
  { gradeKey: 'GRADE_1', gradeName: 'Grade 1 / I Std', yellowFee: 1000, pinkFee: 1000, sportsFee: 800, otherFee: 0 },
  { gradeKey: 'GRADE_2', gradeName: 'Grade 2 / II Std', yellowFee: 1000, pinkFee: 1000, sportsFee: 800, otherFee: 0 },
  { gradeKey: 'GRADE_3', gradeName: 'Grade 3 / III Std', yellowFee: 1050, pinkFee: 1050, sportsFee: 800, otherFee: 0 },
  { gradeKey: 'GRADE_4', gradeName: 'Grade 4 / IV Std', yellowFee: 1050, pinkFee: 1050, sportsFee: 800, otherFee: 0 },
  { gradeKey: 'GRADE_5', gradeName: 'Grade 5 / V Std', yellowFee: 1050, pinkFee: 1050, sportsFee: 800, otherFee: 0 },
  { gradeKey: 'GRADE_6', gradeName: 'Grade 6 / VI Std', yellowFee: 1600, pinkFee: 1600, sportsFee: 1400, otherFee: 0 },
  { gradeKey: 'GRADE_7', gradeName: 'Grade 7 / VII Std', yellowFee: 1600, pinkFee: 1600, sportsFee: 1400, otherFee: 0 },
  { gradeKey: 'GRADE_8', gradeName: 'Grade 8 / VIII Std', yellowFee: 1600, pinkFee: 1600, sportsFee: 1400, otherFee: 0 },
  { gradeKey: 'GRADE_9', gradeName: 'Grade 9 / IX Std', yellowFee: 1100, pinkFee: 1100, sportsFee: 1000, otherFee: 0 },
  { gradeKey: 'GRADE_10', gradeName: 'Grade 10 / X Std', yellowFee: 1100, pinkFee: 1100, sportsFee: 1000, otherFee: 0 },
  { gradeKey: 'GRADE_11', gradeName: 'Grade 11 / XI Std', yellowFee: 1100, pinkFee: 1100, sportsFee: 1000, otherFee: 0 },
  { gradeKey: 'GRADE_12', gradeName: 'Grade 12 / XII Std', yellowFee: 1100, pinkFee: 1100, sportsFee: 1000, otherFee: 0 }
];

function getAllGradeFeeMatrices() {
  try {
    const stored = localStorage.getItem('bb_grade_fee_matrix_gender_v2');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.Boys && parsed.Girls) return parsed;
    }
  } catch (err) {
    console.warn('Could not read gender fee matrix:', err);
  }
  return {
    Boys: DEFAULT_BOYS_FEE_MATRIX,
    Girls: DEFAULT_GIRLS_FEE_MATRIX
  };
}

function getGradeFeeMatrix(targetGender = 'Boys') {
  const isGirl = (targetGender || '').toLowerCase() === 'girls';
  const genderKey = isGirl ? 'Girls' : 'Boys';
  const allMatrices = getAllGradeFeeMatrices();
  return allMatrices[genderKey] || (isGirl ? DEFAULT_GIRLS_FEE_MATRIX : DEFAULT_BOYS_FEE_MATRIX);
}

function renderGradeFeeMatrixTable() {
  const tbody = document.getElementById('grade-fee-matrix-tbody');
  if (!tbody) return;

  const boysBtn = document.getElementById('btn-matrix-boys');
  const girlsBtn = document.getElementById('btn-matrix-girls');

  if (boysBtn && girlsBtn) {
    if (state.activeMatrixGender === 'Girls') {
      girlsBtn.classList.remove('btn-outline');
      girlsBtn.classList.add('btn-primary');
      boysBtn.classList.remove('btn-primary');
      boysBtn.classList.add('btn-outline');
    } else {
      boysBtn.classList.remove('btn-outline');
      boysBtn.classList.add('btn-primary');
      girlsBtn.classList.remove('btn-primary');
      girlsBtn.classList.add('btn-outline');
    }
  }

  const matrix = getGradeFeeMatrix(state.activeMatrixGender);
  tbody.innerHTML = matrix.map((row, idx) => {
    const yellow = parseFloat(row.yellowFee) || 0;
    const pink = parseFloat(row.pinkFee) || 0;
    const sports = parseFloat(row.sportsFee) || 0;
    const total = yellow + pink + sports;
    const isHighSchool = ['GRADE_9', 'GRADE_10', 'GRADE_11', 'GRADE_12'].includes(row.gradeKey);
    const yellowLabel = isHighSchool ? '🟨 Yellow Cloth Material (₹)' : '🟨 Yellow Uniform Fee (₹)';
    const pinkLabel = isHighSchool ? '🩷 Pink Cloth Material (₹)' : '🩷 Pink / Red Fee (₹)';

    return `
      <tr data-index="${idx}">
        <td style="font-weight: 600; color: #1e293b;">
          ${row.gradeName}
          ${isHighSchool ? `<div style="font-size: 0.72rem; color: #6366f1; font-weight: 500;">(Pink & Yellow = Cloth Material, Sports = Stitched Set)</div>` : ''}
          <input type="hidden" class="matrix-key" value="${row.gradeKey}">
          <input type="hidden" class="matrix-name" value="${row.gradeName}">
        </td>
        <td>
          <input type="number" class="input-ctrl matrix-yellow" value="${row.yellowFee}" min="0" step="1" style="font-weight: 600; padding: 4px 8px; color: #000; background: #fff;" title="${yellowLabel}">
        </td>
        <td>
          <input type="number" class="input-ctrl matrix-pink" value="${row.pinkFee}" min="0" step="1" style="font-weight: 600; padding: 4px 8px; color: #000; background: #fff;" title="${pinkLabel}">
        </td>
        <td>
          <input type="number" class="input-ctrl matrix-sports" value="${row.sportsFee}" min="0" step="1" style="font-weight: 600; padding: 4px 8px; color: #000; background: #fff;" title="🏃 Sports Uniform Set (₹)">
        </td>
        <td style="text-align: right; font-weight: 700; color: var(--primary); font-size: 1.05rem;" class="matrix-total">
          ₹${total}
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('tr').forEach(tr => {
    const yIn = tr.querySelector('.matrix-yellow');
    const pIn = tr.querySelector('.matrix-pink');
    const sIn = tr.querySelector('.matrix-sports');
    const totCell = tr.querySelector('.matrix-total');

    const updateRowTotal = () => {
      const y = parseFloat(yIn.value) || 0;
      const p = parseFloat(pIn.value) || 0;
      const s = parseFloat(sIn.value) || 0;
      totCell.textContent = `₹${y + p + s}`;
    };

    [yIn, pIn, sIn].forEach(inp => inp.addEventListener('input', updateRowTotal));
  });
}

function saveGradeFeeMatrix() {
  const tbody = document.getElementById('grade-fee-matrix-tbody');
  if (!tbody) return;

  const rows = tbody.querySelectorAll('tr');
  const activeGenderMatrix = [];
  rows.forEach(tr => {
    const key = tr.querySelector('.matrix-key').value;
    const name = tr.querySelector('.matrix-name').value;
    const y = parseFloat(tr.querySelector('.matrix-yellow').value) || 0;
    const p = parseFloat(tr.querySelector('.matrix-pink').value) || 0;
    const s = parseFloat(tr.querySelector('.matrix-sports').value) || 0;
    activeGenderMatrix.push({
      gradeKey: key,
      gradeName: name,
      yellowFee: y,
      pinkFee: p,
      sportsFee: s,
      otherFee: 0
    });
  });

  const allMatrices = getAllGradeFeeMatrices();
  const genderKey = state.activeMatrixGender === 'Girls' ? 'Girls' : 'Boys';
  allMatrices[genderKey] = activeGenderMatrix;

  try {
    localStorage.setItem('bb_grade_fee_matrix_gender_v2', JSON.stringify(allMatrices));
    showToast(`Grade Fee Structure for ${genderKey} saved successfully! Rates will auto-apply to student billing.`, 'success');
  } catch (err) {
    showToast('Failed to save fee structure: ' + err.message, 'error');
  }
}

// ----------------------------------------------------
// Special & Other Fees Master Catalog (ECA, Trips, etc.)
// ----------------------------------------------------
const DEFAULT_SPECIAL_FEES = [
  { id: 'sf_1', purpose: 'ECA / Co-Curricular Activity Fee', amount: 500, grade: 'ALL', details: 'Annual Sports & Cultural Activities' },
  { id: 'sf_2', purpose: 'Educational School Trip', amount: 1200, grade: 'ALL', details: 'Field Visit & Transport' },
  { id: 'sf_3', purpose: 'Lab & Computer Facility Fee', amount: 800, grade: 'IX Std', details: 'Science & Computer Lab Maintenance' }
];

function getSpecialFees() {
  try {
    const stored = localStorage.getItem('bb_special_other_fees_v1');
    if (stored !== null) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Could not read special fees catalog:', err);
  }
  return DEFAULT_SPECIAL_FEES;
}

function saveSpecialFees(fees) {
  try {
    localStorage.setItem('bb_special_other_fees_v1', JSON.stringify(fees));
  } catch (err) {
    showToast('Failed to save special fees: ' + err.message, 'error');
  }
}

function renderSpecialFeesCatalogTable() {
  const tbody = document.getElementById('special-fee-catalog-tbody');
  if (!tbody) return;
  const fees = getSpecialFees();

  if (fees.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 16px;">No special fees configured. Add one using the form above.</td></tr>`;
    return;
  }

  tbody.innerHTML = fees.map(f => `
    <tr>
      <td style="font-weight: 600; color: #1e293b;">${f.purpose}</td>
      <td style="font-weight: 700; color: #059669;">₹${f.amount}</td>
      <td><span class="badge badge-neutral" style="font-size: 0.75rem;">${f.grade || 'ALL'}</span></td>
      <td style="color: #64748b; font-size: 0.85rem;">${f.details || 'N/A'}</td>
      <td style="text-align: right;">
        <button type="button" class="btn btn-danger btn-sm btn-delete-special-fee" data-id="${f.id}" style="padding: 2px 8px; font-size: 0.75rem;">❌ Remove</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.btn-delete-special-fee').forEach(btn => {
    btn.addEventListener('click', () => {
      const feeId = btn.dataset.id;
      const current = getSpecialFees();
      const updated = current.filter(item => item.id !== feeId);
      saveSpecialFees(updated);
      renderSpecialFeesCatalogTable();
      showToast('Special fee item removed.', 'info');
    });
  });
}

function handleAddSpecialFeeSubmit(e) {
  e.preventDefault();
  const purposeEl = document.getElementById('special-fee-purpose');
  const amountEl = document.getElementById('special-fee-amount');
  const gradeEl = document.getElementById('special-fee-grade');
  const detailsEl = document.getElementById('special-fee-details');

  const purpose = purposeEl ? purposeEl.value.trim() : '';
  const amount = amountEl ? parseFloat(amountEl.value) : 0;
  const grade = gradeEl ? gradeEl.value : 'ALL';
  const details = detailsEl ? detailsEl.value.trim() : '';

  if (!purpose || isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid Fee Purpose and Amount.', 'error');
    return;
  }

  const current = getSpecialFees();
  const newItem = {
    id: `sf_${Date.now()}`,
    purpose,
    amount,
    grade,
    details
  };
  current.push(newItem);
  saveSpecialFees(current);
  renderSpecialFeesCatalogTable();

  if (purposeEl) purposeEl.value = '';
  if (amountEl) amountEl.value = '';
  if (detailsEl) detailsEl.value = '';

  showToast(`Special fee "${purpose}" (₹${amount}) created successfully!`, 'success');
}

function handleClearAllSpecialFees() {
  if (confirm('Are you sure you want to remove all special fee items from the master catalog?')) {
    saveSpecialFees([]);
    renderSpecialFeesCatalogTable();
    showToast('All special fee items cleared.', 'info');
  }
}

function initFeeSubTabs() {
  document.querySelectorAll('.fee-subtab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.fee-subtab-btn').forEach(b => {
        b.classList.remove('active', 'btn-primary');
        b.classList.add('btn-outline');
      });
      e.currentTarget.classList.add('active', 'btn-primary');
      e.currentTarget.classList.remove('btn-outline');

      const targetId = e.currentTarget.dataset.target;
      document.querySelectorAll('.fee-subtab-content').forEach(c => c.style.display = 'none');
      const targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.style.display = 'block';

      if (targetId === 'subtab-other-fees') {
        renderSpecialFeesCatalogTable();
      }
    });
  });
}

function getUniformParticularFees(grade, gender) {
  const matrix = getGradeFeeMatrix(gender);
  const gLower = (grade || '').toLowerCase();
  const isHighSchool = gLower.includes('9') || gLower.includes('10') || gLower.includes('11') || gLower.includes('12') ||
                       gLower.includes('ix') || gLower.includes('x') || gLower.includes('xi') || gLower.includes('xii');

  const match = matrix.find(m => {
    const k = m.gradeKey.toLowerCase();
    const n = m.gradeName.toLowerCase();
    if (gLower.includes('lkg') || gLower.includes('junior kg') || gLower.includes('jkg')) return k === 'lkg' || n.includes('lkg');
    if (gLower.includes('ukg') || gLower.includes('senior kg') || gLower.includes('skg')) return k === 'ukg' || n.includes('ukg');
    if (gLower.includes('12') || gLower.includes('xii')) return k === 'grade_12' || n.includes('12');
    if (gLower.includes('11') || gLower.includes('xi')) return k === 'grade_11' || n.includes('11');
    if (gLower.includes('10') || gLower.includes('x')) return k === 'grade_10' || n.includes('10');
    if (gLower.includes('9') || gLower.includes('ix')) return k === 'grade_9' || n.includes('9');
    if (gLower.includes('8') || gLower.includes('viii')) return k === 'grade_8' || n.includes('8');
    if (gLower.includes('7') || gLower.includes('vii')) return k === 'grade_7' || n.includes('7');
    if (gLower.includes('6') || gLower.includes('vi')) return k === 'grade_6' || n.includes('6');
    if (gLower.includes('5') || gLower.includes('v')) return k === 'grade_5' || n.includes('5');
    if (gLower.includes('4') || gLower.includes('iv')) return k === 'grade_4' || n.includes('4');
    if (gLower.includes('3') || gLower.includes('iii')) return k === 'grade_3' || n.includes('3');
    if (gLower.includes('2') || gLower.includes('ii')) return k === 'grade_2' || n.includes('2');
    if (gLower.includes('1') || gLower.includes('i')) return k === 'grade_1' || n.includes('1');
    return false;
  });

  if (match) {
    const yellowFee = match.yellowFee;
    const pinkFee = match.pinkFee;
    const sportsFee = match.sportsFee;
    const otherFee = match.otherFee || 0;
    const total = yellowFee + pinkFee + sportsFee + otherFee;
    return { yellowFee, pinkFee, sportsFee, otherFee, total, isHighSchool, isAutoLoaded: true };
  }

  const total = getUniformFee(grade, gender);
  const sportsFee = Math.round(total * 0.3);
  const remaining = total - sportsFee;
  const yellowFee = Math.floor(remaining / 2);
  const pinkFee = remaining - yellowFee;
  return { yellowFee, pinkFee, sportsFee, otherFee: 0, total, isHighSchool, isAutoLoaded: false };
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

  // Filter by Grade
  if (state.activeGradeFilter && state.activeGradeFilter !== 'ALL') {
    filtered = filtered.filter(s => s.grade && s.grade.startsWith(state.activeGradeFilter));
  }

  // Filter by Section
  if (state.activeSectionFilter && state.activeSectionFilter !== 'ALL') {
    filtered = filtered.filter(s => {
      if (!s.grade) return false;
      const parts = s.grade.split(' - ');
      return parts.length > 1 && parts[1].trim().toUpperCase() === state.activeSectionFilter;
    });
  }
    
  // Filter by search query
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.grade.toLowerCase().includes(q) ||
      (s.admissionNo && s.admissionNo.toLowerCase().includes(q)) ||
      (s.fatherName && s.fatherName.toLowerCase().includes(q))
    );
  }
  
  // Filter by billing status
  if (state.activeStatusFilter !== 'ALL') {
    filtered = filtered.filter(s => getStudentBillingStatus(s.id) === state.activeStatusFilter);
  }

  if (filtered.length === 0) {
    DOM.billingStudentScroll.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">No matching students found.</div>`;
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
      <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">
        <span>Adm: <strong>${s.admissionNo || 'N/A'}</strong> | Father: ${s.fatherName || 'N/A'}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; font-size: 0.78rem;">
        <span style="font-weight: 600; color: var(--primary);">Class: ${s.grade} (${s.branch})</span>
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
  if (document.getElementById('billing-profile-adm-no')) document.getElementById('billing-profile-adm-no').textContent = s.admissionNo ? `Adm: ${s.admissionNo}` : 'Adm: N/A';
  if (document.getElementById('billing-profile-father-name')) document.getElementById('billing-profile-father-name').textContent = s.fatherName ? `Father: ${s.fatherName}` : 'Father: N/A';
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
    const defaults = getUniformParticularFees(s.grade, s.gender);
    const yellowTitle = defaults.isHighSchool ? '🟨 Yellow Uniform Cloth Material' : '🟨 Yellow Uniform Set';
    const pinkTitle = defaults.isHighSchool ? '🩷 Pink / Red Uniform Cloth Material' : '🩷 Pink / Red Uniform Set';
    const sportsTitle = '🏃 Sports Uniform Set';

    const specialFeesCatalog = getSpecialFees().filter(f => f.grade === 'ALL' || (s.grade && s.grade.startsWith(f.grade)));
    const presetOptionsHtml = `<option value="">-- Select Special Fee Preset (or Type Custom Below) --</option>` +
      specialFeesCatalog.map(f => `<option value="${f.id}" data-amount="${f.amount}" data-purpose="${f.purpose}" data-details="${f.details}">${f.purpose} (₹${f.amount})</option>`).join('');

    DOM.dynamicBillCard.innerHTML = `
      <div class="glass-panel" style="padding: 20px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px;">
        <h4 style="margin-bottom: 8px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
          <span>📝</span> Particular Uniform & Fee Calculator
        </h4>
        <p style="color: var(--text-secondary); font-size: 0.88rem; margin-bottom: 16px;">
          Auto-loaded rates for <strong>${s.grade}</strong> (${s.gender}):
          ${defaults.isHighSchool ? `<br><span style="color: #6366f1; font-weight: 600;">(Grade 9-12 Rules: Pink & Yellow issued as Cloth Material, Sports as Stitched Set)</span>` : ''}
        </p>

        <!-- Particular Fees Entry Card -->
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px;">
          
          <!-- Yellow Uniform -->
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;">
            <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.9rem; color: #1e293b;">
              <input type="checkbox" id="check-fee-yellow" checked style="width: 16px; height: 16px; cursor: pointer;">
              <span>${yellowTitle}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: 600; color: #64748b; font-size: 0.9rem;">₹</span>
              <input type="number" id="input-fee-yellow" class="input-ctrl" value="${defaults.yellowFee}" min="0" step="1" style="width: 110px; font-weight: 700; text-align: right; font-size: 0.95rem; padding: 4px 8px; color: #000; background: #fff;">
            </div>
          </div>

          <!-- Pink / Red Uniform -->
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;">
            <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.9rem; color: #1e293b;">
              <input type="checkbox" id="check-fee-pink" checked style="width: 16px; height: 16px; cursor: pointer;">
              <span>${pinkTitle}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: 600; color: #64748b; font-size: 0.9rem;">₹</span>
              <input type="number" id="input-fee-pink" class="input-ctrl" value="${defaults.pinkFee}" min="0" step="1" style="width: 110px; font-weight: 700; text-align: right; font-size: 0.95rem; padding: 4px 8px; color: #000; background: #fff;">
            </div>
          </div>

          <!-- Sports Uniform -->
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;">
            <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.9rem; color: #1e293b;">
              <input type="checkbox" id="check-fee-sports" checked style="width: 16px; height: 16px; cursor: pointer;">
              <span>${sportsTitle}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-weight: 600; color: #64748b; font-size: 0.9rem;">₹</span>
              <input type="number" id="input-fee-sports" class="input-ctrl" value="${defaults.sportsFee}" min="0" step="1" style="width: 110px; font-weight: 700; text-align: right; font-size: 0.95rem; padding: 4px 8px; color: #000; background: #fff;">
            </div>
          </div>

          <!-- Special / Other Fee -->
          <div style="padding-top: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.9rem; color: #1e293b;">
                <input type="checkbox" id="check-fee-other" style="width: 16px; height: 16px; cursor: pointer;">
                <span>🎟️ Special / Other Fee (ECA, Trip, Exams)</span>
              </div>
              <div style="display: flex; align-items: center; gap: 4px;">
                <span style="font-weight: 600; color: #64748b; font-size: 0.9rem;">₹</span>
                <input type="number" id="input-fee-other" class="input-ctrl" value="0" min="0" step="1" style="width: 110px; font-weight: 700; text-align: right; font-size: 0.95rem; padding: 4px 8px; color: #059669; background: #fff;">
              </div>
            </div>

            <!-- Special Fee Details Form -->
            <div id="other-fee-details-box" style="display: none; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-top: 8px;">
              <div style="margin-bottom: 6px;">
                <label style="font-size: 0.72rem; font-weight: 600; color: #64748b; display: block; margin-bottom: 2px;">⚡ Select Configured Special Fee Preset:</label>
                <select id="select-special-fee-preset" class="input-ctrl" style="font-size: 0.8rem; padding: 4px 8px; background: #fff;">
                  ${presetOptionsHtml}
                </select>
              </div>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="input-fee-other-purpose" class="input-ctrl" placeholder="Fee Purpose e.g. ECA Activity / Trip" style="font-size: 0.8rem; padding: 4px 8px; flex: 1; background: #fff;">
                <input type="text" id="input-fee-other-details" class="input-ctrl" placeholder="Notes (Optional)" style="font-size: 0.8rem; padding: 4px 8px; flex: 1; background: #fff;">
              </div>
            </div>
          </div>

        </div>

        <div style="border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); padding: 12px 0; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">
            <span>Calculated Bill Total:</span>
            <span style="color: var(--primary);" id="display-invoice-fee-amount">₹${defaults.total}</span>
          </div>
        </div>

        <button class="btn btn-primary" id="btn-generate-bill" style="width: 100%; display: flex; justify-content: center; align-items: center; gap: 8px; font-size: 0.95rem; padding: 10px;">
          ⚡ Generate & Issue Invoice
        </button>
      </div>
    `;

    const calcTotal = () => {
      const yCheck = document.getElementById('check-fee-yellow')?.checked;
      const pCheck = document.getElementById('check-fee-pink')?.checked;
      const sCheck = document.getElementById('check-fee-sports')?.checked;
      const oCheck = document.getElementById('check-fee-other')?.checked;

      const yVal = yCheck ? (parseFloat(document.getElementById('input-fee-yellow')?.value) || 0) : 0;
      const pVal = pCheck ? (parseFloat(document.getElementById('input-fee-pink')?.value) || 0) : 0;
      const sVal = sCheck ? (parseFloat(document.getElementById('input-fee-sports')?.value) || 0) : 0;
      const oVal = oCheck ? (parseFloat(document.getElementById('input-fee-other')?.value) || 0) : 0;

      const detailsBox = document.getElementById('other-fee-details-box');
      if (detailsBox) detailsBox.style.display = oCheck ? 'block' : 'none';

      const total = yVal + pVal + sVal + oVal;
      const disp = document.getElementById('display-invoice-fee-amount');
      if (disp) disp.textContent = `₹${total}`;
      return { yVal, pVal, sVal, oVal, total };
    };

    ['check-fee-yellow', 'check-fee-pink', 'check-fee-sports', 'check-fee-other'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', calcTotal);
    });

    ['input-fee-yellow', 'input-fee-pink', 'input-fee-sports', 'input-fee-other'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', calcTotal);
    });

    const presetSelect = document.getElementById('select-special-fee-preset');
    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        const selectedOpt = e.target.options[e.target.selectedIndex];
        if (selectedOpt && selectedOpt.value) {
          const amt = selectedOpt.dataset.amount;
          const purp = selectedOpt.dataset.purpose;
          const det = selectedOpt.dataset.details;

          const checkOther = document.getElementById('check-fee-other');
          if (checkOther) checkOther.checked = true;

          const inputOther = document.getElementById('input-fee-other');
          if (inputOther) inputOther.value = amt || 0;

          const inputPurp = document.getElementById('input-fee-other-purpose');
          if (inputPurp) inputPurp.value = purp || '';

          const inputDet = document.getElementById('input-fee-other-details');
          if (inputDet) inputDet.value = det || '';

          calcTotal();
        }
      });
    }

    document.getElementById('btn-generate-bill').addEventListener('click', () => {
      const { yVal, pVal, sVal, oVal, total } = calcTotal();
      if (total <= 0) {
        showToast('Please select at least one uniform fee item with a valid amount.', 'error');
        return;
      }
      const otherPurp = document.getElementById('input-fee-other-purpose')?.value || '';
      const otherDet = document.getElementById('input-fee-other-details')?.value || '';
      generateBillForStudent(s.id, total, yVal, pVal, sVal, oVal, otherPurp, otherDet);
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
            <span style="color: var(--text-secondary);">Billed Grade/Class:</span>
            <strong>${bill.grade}</strong>
          </div>
          ${bill.otherFee && bill.otherFee > 0 ? `
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #475569; margin-bottom: 4px;">
            <span>Included Other Fee (${bill.otherFeePurpose || 'ECA/Trip'}):</span>
            <strong>₹${bill.otherFee}</strong>
          </div>` : ''}
          <div style="display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin-top: 8px;">
            <span>Outstanding Fee:</span>
            <span style="color: var(--warning);">₹${bill.feeAmount}</span>
          </div>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-outline btn-sm" id="btn-edit-fee-pending" style="flex: 1; min-width: 110px; padding: 8px;">
            ✏️ Edit Fee
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-print-invoice-pending" style="flex: 1; min-width: 110px; padding: 8px;">
            🖨️ Invoice Slip
          </button>
          <button class="btn btn-primary btn-sm" id="btn-collect-payment" style="flex: 2; min-width: 140px; padding: 8px; display: flex; justify-content: center; align-items: center; gap: 6px;">
            💵 Collect Payment
          </button>
        </div>
      </div>
    `;
    
    document.getElementById('btn-edit-fee-pending').addEventListener('click', () => {
      handleOpenEditFeeModal(bill);
    });
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
            <strong>Uniform & Fee Package ${bill.otherFeePurpose ? `(${bill.otherFeePurpose})` : ''}</strong>
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
async function generateBillForStudent(studentId, amount, yellowFee = 0, pinkFee = 0, sportsFee = 0, otherFee = 0, otherFeePurpose = '', otherFeeDetails = '') {
  try {
    const student = state.students.find(s => s.id === studentId);
    if (!student) return;
    const operator = state.currentUser ? state.currentUser.username : 'Cashier Desk';
    
    await db.createBill(studentId, student.name, student.grade, student.branch, student.gender, amount, operator, student.fatherName, student.admissionNo, yellowFee, pinkFee, sportsFee, otherFee, otherFeePurpose, otherFeeDetails);
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

function getItemizedRowsHTML(bill) {
  const gLower = (bill.grade || '').toLowerCase();
  const isHighSchool = gLower.includes('9') || gLower.includes('10') || gLower.includes('11') || gLower.includes('12') ||
                       gLower.includes('ix') || gLower.includes('x') || gLower.includes('xi') || gLower.includes('xii');

  const yellowTitle = isHighSchool ? '🟨 Yellow Uniform Cloth Material' : '🟨 Yellow Uniform Set';
  const yellowDesc = isHighSchool ? 'Unstitched Yellow Uniform Fabric Material' : 'Classroom Yellow Uniform Set';

  const pinkTitle = isHighSchool ? '🩷 Pink / Red Uniform Cloth Material' : '🩷 Pink / Red Uniform Set';
  const pinkDesc = isHighSchool ? 'Unstitched Pink / Red Uniform Fabric Material' : 'Classroom Pink / Red Uniform Set';

  const sportsTitle = '🏃 Sports Uniform Set';
  const sportsDesc = 'Stitched Sports Uniform Set';

  let rows = '';
  if (bill.yellowFee && bill.yellowFee > 0) {
    rows += `
      <tr>
        <td>
          <strong>${yellowTitle}</strong>
          <div style="font-size: 10px; color: #666; margin-top: 2px;">${yellowDesc}</div>
        </td>
        <td style="text-align: center;">1 Unit</td>
        <td style="text-align: right; font-weight: 600;">₹${bill.yellowFee}.00</td>
      </tr>
    `;
  }
  if (bill.pinkFee && bill.pinkFee > 0) {
    rows += `
      <tr>
        <td>
          <strong>${pinkTitle}</strong>
          <div style="font-size: 10px; color: #666; margin-top: 2px;">${pinkDesc}</div>
        </td>
        <td style="text-align: center;">1 Unit</td>
        <td style="text-align: right; font-weight: 600;">₹${bill.pinkFee}.00</td>
      </tr>
    `;
  }
  if (bill.sportsFee && bill.sportsFee > 0) {
    rows += `
      <tr>
        <td>
          <strong>${sportsTitle}</strong>
          <div style="font-size: 10px; color: #666; margin-top: 2px;">${sportsDesc}</div>
        </td>
        <td style="text-align: center;">1 Set</td>
        <td style="text-align: right; font-weight: 600;">₹${bill.sportsFee}.00</td>
      </tr>
    `;
  }
  if (bill.otherFee && bill.otherFee > 0) {
    const oTitle = bill.otherFeePurpose ? `📝 Other Fee (${bill.otherFeePurpose})` : '📝 Other Fee (ECA / Trip / Activity)';
    const oDesc = bill.otherFeeDetails || `Special Fee: ${bill.otherFeePurpose || 'ECA/Trip/Activity'}`;
    rows += `
      <tr>
        <td>
          <strong>${oTitle}</strong>
          <div style="font-size: 10px; color: #666; margin-top: 2px;">${oDesc}</div>
        </td>
        <td style="text-align: center;">1 Unit</td>
        <td style="text-align: right; font-weight: 600;">₹${bill.otherFee}.00</td>
      </tr>
    `;
  }
  if (!rows) {
    rows = `
      <tr>
        <td>
          <strong>Uniform Package Allocation</strong>
          <div style="font-size: 10px; color: #666; margin-top: 2px;">Standard classroom and sports uniform allocation for ${bill.gender}.</div>
        </td>
        <td style="text-align: center;">1 Pack</td>
        <td style="text-align: right; font-weight: 600;">₹${bill.feeAmount}.00</td>
      </tr>
    `;
  }
  return rows;
}

// PDF Invoice Print Export with Signature
// ----------------------------------------------------
function printInvoicePDF(bill) {
  const dateStr = new Date(bill.createdAt).toLocaleString();
  const paidDateStr = bill.paidAt ? new Date(bill.paidAt).toLocaleString() : 'N/A';
  const receiptType = bill.status === 'Paid' ? 'PAYMENT RECEIPT' : 'BILL INVOICE';
  const itemRowsHTML = getItemizedRowsHTML(bill);

  const renderSingleInvoice = () => `
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
            <span class="grid-label">Father Name:</span>
            <span class="grid-value">${bill.fatherName || 'N/A'}</span>
          </div>
          <div class="grid-line">
            <span class="grid-label">Grade / Class:</span>
            <span class="grid-value">${bill.grade}</span>
          </div>
        </div>
        <div class="grid-col">
          <h4>Registration Details</h4>
          <div class="grid-line">
            <span class="grid-label">Admission No:</span>
            <span class="grid-value">${bill.admissionNo || 'N/A'}</span>
          </div>
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
            <th style="width: 65%;">Item Description</th>
            <th style="width: 15%; text-align: center;">Qty</th>
            <th style="width: 20%; text-align: right;">Total Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemRowsHTML}
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

      <div style="font-size: 10px; color: #777; border-top: 1px solid #edf2f7; padding-top: 8px;">
        <strong>Receipt Information:</strong> Proof of payment for uniform set. Uniforms issued upon presentation of paid bill validation.
      </div>

      <div class="signature-section">
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-label">Acc Staff / Cashier Signature</div>
        </div>
      </div>
    </div>
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>CROSS CUT ENTERPRISES - Uniform Fee Receipt (${bill.id})</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 3mm 5mm;
        }
        * {
          box-sizing: border-box;
        }
        html, body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #1a1a1a;
          padding: 0;
          margin: 0;
          line-height: 1.2;
          font-size: 10px;
          background: #fff;
          height: 100%;
          overflow: hidden;
        }
        .page-wrapper {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100vh;
          max-height: 290mm;
          box-sizing: border-box;
          padding: 0;
        }
        .invoice-card {
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 8px 12px;
          background: #fff;
          position: relative;
          box-shadow: none;
        }
        .header {
          display: flex;
          justify-content: space-between;
          border-bottom: 2px solid #6366f1;
          padding-bottom: 2px;
          margin-bottom: 4px;
        }
        .school-name {
          font-size: 14px;
          font-weight: 700;
          margin: 0;
          color: #4f46e5;
          letter-spacing: -0.5px;
        }
        .receipt-title {
          font-size: 10px;
          font-weight: 600;
          color: #666;
          margin-top: 1px;
        }
        .invoice-meta {
          text-align: right;
        }
        .invoice-id {
          font-size: 13px;
          font-weight: 800;
          color: #1e1b4b;
          margin-bottom: 1px;
          letter-spacing: 0.5px;
        }
        .meta-line {
          font-size: 9px;
          color: #555;
          margin-bottom: 0px;
        }
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          background: #f8fafc;
          border-radius: 4px;
          padding: 4px 8px;
          margin-bottom: 4px;
          border: 1px solid #e2e8f0;
        }
        .grid-col h4 {
          margin: 0 0 2px 0;
          color: #64748b;
          font-size: 8.5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .grid-line {
          margin-bottom: 1px;
          display: flex;
          justify-content: space-between;
          font-size: 9.5px;
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
          margin-bottom: 4px;
        }
        .table th {
          border-bottom: 2px solid #e2e8f0;
          padding: 3px 4px;
          text-align: left;
          color: #64748b;
          font-size: 8.5px;
          text-transform: uppercase;
        }
        .table td {
          border-bottom: 1px solid #edf2f7;
          padding: 3px 4px;
          font-size: 9.5px;
        }
        .amount-summary {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 3px;
        }
        .amount-card {
          width: 180px;
          border-top: 1px solid #eee;
          padding-top: 2px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1px;
          font-size: 9.5px;
        }
        .summary-total {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          font-weight: 700;
          color: #4f46e5;
          margin-top: 2px;
          border-top: 1px dashed #ddd;
          padding-top: 2px;
        }
        .watermark {
          position: absolute;
          top: 25%;
          left: 25%;
          font-size: 38px;
          font-weight: 800;
          color: rgba(16, 185, 129, 0.07);
          transform: rotate(-20deg);
          border: 5px solid rgba(16, 185, 129, 0.07);
          padding: 4px 16px;
          border-radius: 8px;
          pointer-events: none;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .watermark-pending {
          color: rgba(245, 158, 11, 0.07);
          border-color: rgba(245, 158, 11, 0.07);
        }
        .signature-section {
          margin-top: 3px;
          display: flex;
          justify-content: flex-end;
          align-items: flex-end;
        }
        .sig-box {
          text-align: center;
          width: 150px;
        }
        .sig-line {
          border-bottom: 1px solid #1a1a1a;
          margin-bottom: 2px;
          height: 12px;
        }
        .sig-label {
          font-size: 8.5px;
          color: #666;
          font-weight: 500;
        }
        .cut-divider {
          text-align: center;
          border-top: 1.5px dashed #94a3b8;
          margin: 2px 0;
          position: relative;
          height: 1px;
        }
        .cut-label {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          background: #fff;
          padding: 0 8px;
          font-size: 8.5px;
          color: #64748b;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        @media print {
          html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          .page-wrapper {
            height: 100%;
            max-height: 290mm;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          .invoice-card {
            border: 1px dashed #cbd5e1;
            box-shadow: none;
            page-break-inside: avoid;
          }
          .cut-divider {
            margin: 2px 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="page-wrapper">
        ${renderSingleInvoice()}
        <div class="cut-divider">
          <span class="cut-label">✂ Cut Here ✂</span>
        </div>
        ${renderSingleInvoice()}
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
  csvRows.push(['Bill ID', 'Created Timestamp', 'Paid Timestamp', 'Student Name', 'Grade', 'Branch', 'Gender', 'Fee Amount', 'Yellow Fee', 'Pink Fee', 'Sports Fee', 'Other Fee', 'Other Fee Purpose', 'Other Fee Details', 'Cashier', 'Status'].join(','));
  
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
      b.yellowFee || 0,
      b.pinkFee || 0,
      b.sportsFee || 0,
      b.otherFee || 0,
      `"${(b.otherFeePurpose || '').replace(/"/g, '""')}"`,
      `"${(b.otherFeeDetails || '').replace(/"/g, '""')}"`,
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

function handleOpenEditFeeModal(bill) {
  const modal = document.getElementById('modal-edit-fee');
  if (!modal) return;
  document.getElementById('edit-fee-bill-id').value = bill.id || bill.billId || '';
  document.getElementById('edit-fee-student-name').value = bill.studentName || '';
  document.getElementById('edit-fee-amount-input').value = bill.feeAmount || 0;
  modal.classList.add('active');
}

function handleCloseEditFeeModal() {
  const modal = document.getElementById('modal-edit-fee');
  if (modal) modal.classList.remove('active');
}

async function handleEditFeeSubmit(e) {
  e.preventDefault();
  const billId = document.getElementById('edit-fee-bill-id').value;
  const newFee = document.getElementById('edit-fee-amount-input').value;
  const currentUser = db.getCurrentCashier() || db.getCurrentAdmin();
  const operatorName = currentUser ? (currentUser.username || currentUser.name || 'Cashier Desk') : 'Cashier Desk';

  if (!billId || newFee === undefined || newFee === '') {
    showToast('Invalid fee amount entered.', 'error');
    return;
  }

  try {
    await db.updateBillFee(billId, parseFloat(newFee), operatorName);
    showToast(`Updated fee amount to ₹${newFee} for ${billId}`, 'success');
    handleCloseEditFeeModal();
    refreshData();
  } catch (err) {
    showToast('Failed to update fee: ' + err.message, 'error');
  }
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
async function initAccountsApp() {
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
  
  // Search inputs & Grade/Section Filters
  if (DOM.billingSearchInput) {
    DOM.billingSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderStudentsList();
    });
  }

  const gradeFilterEl = document.getElementById('billing-grade-filter');
  if (gradeFilterEl) {
    gradeFilterEl.addEventListener('change', (e) => {
      state.activeGradeFilter = e.target.value;
      renderStudentsList();
    });
  }

  const sectionFilterEl = document.getElementById('billing-section-filter');
  if (sectionFilterEl) {
    sectionFilterEl.addEventListener('change', (e) => {
      state.activeSectionFilter = e.target.value;
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

  const btnSaveFeeMatrix = document.getElementById('btn-save-fee-matrix');
  if (btnSaveFeeMatrix) {
    btnSaveFeeMatrix.addEventListener('click', saveGradeFeeMatrix);
  }

  const btnMatrixBoys = document.getElementById('btn-matrix-boys');
  const btnMatrixGirls = document.getElementById('btn-matrix-girls');
  if (btnMatrixBoys) {
    btnMatrixBoys.addEventListener('click', () => {
      state.activeMatrixGender = 'Boys';
      renderGradeFeeMatrixTable();
    });
  }
  if (btnMatrixGirls) {
    btnMatrixGirls.addEventListener('click', () => {
      state.activeMatrixGender = 'Girls';
      renderGradeFeeMatrixTable();
    });
  }

  // Edit Fee Modal Event Handlers
  const btnCloseEditFee = document.getElementById('close-modal-edit-fee');
  if (btnCloseEditFee) btnCloseEditFee.addEventListener('click', handleCloseEditFeeModal);

  const btnCancelEditFee = document.getElementById('btn-cancel-edit-fee');
  if (btnCancelEditFee) btnCancelEditFee.addEventListener('click', handleCloseEditFeeModal);

  const formAddSpecialFee = document.getElementById('form-add-special-fee');
  if (formAddSpecialFee) {
    formAddSpecialFee.addEventListener('submit', handleAddSpecialFeeSubmit);
  }

  const btnClearAllSpecialFees = document.getElementById('btn-clear-all-special-fees');
  if (btnClearAllSpecialFees) {
    btnClearAllSpecialFees.addEventListener('click', handleClearAllSpecialFees);
  }

  initFeeSubTabs();

  // Navigation and authentication check
  initNavigation();
  await checkAuth();

  // Polling data updates to synchronize state
  refreshData();
  setInterval(refreshData, 10000);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initAccountsApp);
} else {
  initAccountsApp();
}
