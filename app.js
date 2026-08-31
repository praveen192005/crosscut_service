// app.js
import { db } from './db-config.js?v=20260805_final';

// Detect Portal Mode (Robust support for clean URLs e.g. /admin and /admin.html)
const isAdminPage = window.location.pathname.includes('admin') || document.getElementById('admin-login-form') !== null;


// Global Application State
const state = {
  activeView: isAdminPage ? 'dashboard' : 'issuer',
  activeBranch: 'ALL',
  currentUser: null, // Phone session (Staff)
  currentAdmin: null, // Password session (Admin)
  stocks: [],
  students: [],
  transactions: [],
  selectedStudent: null,
  otpConfirmationResult: null,
  tempPhoneNumber: ''
};

// Available Sizes for Dropdowns
const CONSTANTS = {
  SIZES: ['24', '26', '28', '30', '32', '34', '36', '38', '40', '42'],
  GRADES: ['LKG', 'UKG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
  BRANCH_GRADES: {
    'BBLI': [
      '1 (BRAIN)',
      '2 (BRAIN)',
      '3 (BRAIN)',
      '4 (BRAIN)',
      '5 (BRAIN)',
      '6 (BRAIN)',
      '7 (BRAI)',
      '8 (BRAI)'
    ],
    'BBCS': ['LKG', 'UKG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'],
    'BBMS': ['LKG', 'UKG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
  },
  BRANCHES: ['BBLI', 'BBCS', 'BBMS'] // Updated Branch name to BBMS
};

// DOM Elements Cache
const DOM = {
  get authScreen() { return document.getElementById('auth-screen'); },
  get mainApp() { return document.getElementById('main-app'); },
  get connectionStatus() { return document.getElementById('connection-status'); },
  get sidebarNav() { return document.getElementById('sidebar-nav'); },
  get viewTitle() { return document.getElementById('view-title'); },
  
  // Modals & Toast Containers
  get modalOverlay() { return document.getElementById('modal-overlay'); },
  get toastContainer() { return document.getElementById('toast-container'); },

  // Staff Portal Elements (index.html)
  get currentUserPhone() { return document.getElementById('current-user-phone'); },
  get viewIssuer() { return document.getElementById('view-issuer'); },
  get viewStudents() { return document.getElementById('view-students'); },
  get viewImportStudents() { return document.getElementById('view-import-students'); },
  get issuerSearchInput() { return document.getElementById('issuer-search-input'); },
  get issuerStudentScroll() { return document.getElementById('issuer-student-scroll'); },
  get issuerDetailEmpty() { return document.getElementById('issuer-detail-empty'); },
  get issuerDetailActive() { return document.getElementById('issuer-detail-active'); },
  get studentTableBody() { return document.getElementById('student-table-body'); },

  // Admin Portal Elements (admin.html)
  get viewDashboard() { return document.getElementById('view-dashboard'); },
  get viewRequests() { return document.getElementById('view-requests'); },
  get viewLogs() { return document.getElementById('view-logs'); },
  get viewSettings() { return document.getElementById('view-settings'); },
  get viewAdminStudents() { return document.getElementById('view-admin-students'); },
  get viewUniformReport() { return document.getElementById('view-uniform-report'); },
  get viewBilling() { return document.getElementById('view-billing'); },
  get adminStudentSearchInput() { return document.getElementById('admin-student-search-input'); },
  get adminStudentTableBody() { return document.getElementById('admin-student-table-body'); },
  get kpiReceived() { return document.getElementById('kpi-received'); },
  get kpiIssued() { return document.getElementById('kpi-issued'); },
  get kpiRemaining() { return document.getElementById('kpi-remaining'); },
  get kpiPending() { return document.getElementById('kpi-pending'); },
  get stockTableBody() { return document.getElementById('stock-table-body'); },
  get requestsTableBody() { return document.getElementById('requests-table-body'); },
  get logsTableBody() { return document.getElementById('logs-table-body'); },
  
  // Admin Billing
  get adminBillingSearchInput() { return document.getElementById('admin-billing-search-input'); },
  get adminBillingGradeFilter() { return document.getElementById('admin-billing-grade-filter'); },
  get adminBillingStatusFilter() { return document.getElementById('admin-billing-status-filter'); },
  get adminBillingTableBody() { return document.getElementById('admin-billing-table-body'); },
  get kpiBillingTotal() { return document.getElementById('kpi-billing-total'); },
  get kpiBillingPaid() { return document.getElementById('kpi-billing-paid'); },
  get kpiBillingPending() { return document.getElementById('kpi-billing-pending'); }
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
// Navigation & Views Router
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

  // Views List based on Page
  const views = isAdminPage 
    ? [DOM.viewDashboard, DOM.viewRequests, DOM.viewLogs, DOM.viewSettings, DOM.viewAdminStudents, DOM.viewBilling]
    : [DOM.viewIssuer, DOM.viewStudents, DOM.viewImportStudents];

  views.forEach(view => {
    if (view) view.classList.remove('active');
  });
  
  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) {
    targetView.classList.add('active');
  }

  // Update header text
  if (DOM.viewTitle) {
    if (viewId === 'dashboard') DOM.viewTitle.textContent = 'Admin Dashboard';
    else if (viewId === 'issuer') DOM.viewTitle.textContent = 'Uniform Issuer (Front)';
    else if (viewId === 'students') DOM.viewTitle.textContent = 'Student Registry';
    else if (viewId === 'import-students') DOM.viewTitle.textContent = 'Import Student CSV/Excel';
    else if (viewId === 'requests') DOM.viewTitle.textContent = 'Sizing Exception Requests';
    else if (viewId === 'logs') DOM.viewTitle.textContent = 'Audit Transaction Logs';
    else if (viewId === 'settings') DOM.viewTitle.textContent = 'Portal Settings';
    else if (viewId === 'admin-students') DOM.viewTitle.textContent = 'Student Directory';
    else if (viewId === 'uniform-report') DOM.viewTitle.textContent = 'Uniform Issuance Report';
    else if (viewId === 'billing') DOM.viewTitle.textContent = 'Billing & Accounts';
  }

  // Refresh view specific data
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
}

// ----------------------------------------------------
// ----------------------------------------------------
// Authentication Handlers (Password required on each portal)
// ----------------------------------------------------
async function checkAuth() {
  try {
    if (isAdminPage) {
      const isExplicitAuth = sessionStorage.getItem('bb_stock_explicit_admin_auth') === 'true';
      state.currentAdmin = await db.getCurrentAdmin();
      if (state.currentAdmin && isExplicitAuth) {
        if (DOM.authScreen) DOM.authScreen.style.display = 'none';
        if (DOM.mainApp) DOM.mainApp.style.display = 'flex';
        
        if (DOM.connectionStatus) {
          const statusDot = DOM.connectionStatus.querySelector('.connection-dot');
          const statusText = DOM.connectionStatus.querySelector('span:last-child');
          if (statusDot && statusText) {
            statusDot.className = 'connection-dot online';
            statusText.textContent = 'MongoDB Database';
          }
        }
        navigateTo('dashboard');
      } else {
        if (DOM.authScreen) DOM.authScreen.style.display = 'flex';
        if (DOM.mainApp) DOM.mainApp.style.display = 'none';
      }
    } else {
      const isExplicitAuth = sessionStorage.getItem('bb_stock_explicit_staff_auth') === 'true';
      state.currentUser = await db.getCurrentUser();
      if (state.currentUser && isExplicitAuth) {
        if (DOM.authScreen) DOM.authScreen.style.display = 'none';
        if (DOM.mainApp) DOM.mainApp.style.display = 'flex';
        
        if (DOM.currentUserPhone) {
          DOM.currentUserPhone.textContent = state.currentUser.username || 'Staff Active';
        }

        if (DOM.connectionStatus) {
          const statusDot = DOM.connectionStatus.querySelector('.connection-dot');
          const statusText = DOM.connectionStatus.querySelector('span:last-child');
          if (statusDot && statusText) {
            statusDot.className = 'connection-dot online';
            statusText.textContent = 'MongoDB Database';
          }
        }
        navigateTo('issuer');
      } else {
        if (DOM.authScreen) DOM.authScreen.style.display = 'flex';
        if (DOM.mainApp) DOM.mainApp.style.display = 'none';
      }
    }
  } catch (err) {
    console.warn('Authentication check notice:', err);
    if (DOM.authScreen) DOM.authScreen.style.display = 'flex';
    if (DOM.mainApp) DOM.mainApp.style.display = 'none';
  }
}

window.handleStaffLoginSubmit = async function(e) {
  if (e) e.preventDefault();
  const usernameEl = document.getElementById('auth-staff-username');
  const passwordEl = document.getElementById('auth-staff-password');
  const usernameVal = usernameEl ? usernameEl.value.trim() : '';
  const passwordVal = passwordEl ? passwordEl.value : '';

  if (!usernameVal || !passwordVal) {
    showToast('User ID and Password are required', 'error');
    return false;
  }

  const submitBtn = document.getElementById('btn-staff-login-submit') || (e.target && e.target.querySelector ? e.target.querySelector('button') : null);
  const originalText = submitBtn ? submitBtn.innerHTML : 'Access Staff Portal 🔓';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Authenticating...';
  }

  try {
    await db.loginStaff(usernameVal, passwordVal);
    sessionStorage.setItem('bb_stock_explicit_staff_auth', 'true');
    showToast('Access Granted. Welcome Staff!', 'success');
    await checkAuth();
  } catch (error) {
    showToast(error.message || 'Invalid staff credentials.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }
  return false;
};

window.handleAdminLoginSubmit = async function(e) {
  if (e) e.preventDefault();
  const usernameEl = document.getElementById('auth-admin-username');
  const passwordEl = document.getElementById('auth-admin-password');
  const usernameVal = usernameEl ? usernameEl.value.trim() : 'admin';
  const passwordVal = passwordEl ? passwordEl.value : '';

  if (!passwordVal) {
    showToast('Management Password is required', 'error');
    return false;
  }

  const submitBtn = document.getElementById('btn-admin-login-submit') || (e.target && e.target.querySelector ? e.target.querySelector('button') : null);
  const originalText = submitBtn ? submitBtn.innerHTML : 'Access Admin Dashboard 🔓';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Authenticating...';
  }

  try {
    await db.loginAdmin(usernameVal, passwordVal);
    sessionStorage.setItem('bb_stock_explicit_admin_auth', 'true');
    showToast('Access Granted. Welcome Administrator!', 'success');
    await checkAuth();
  } catch (error) {
    showToast(error.message || 'Invalid admin credentials.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }
  return false;
};

// Logouts
document.getElementById('btn-logout').addEventListener('click', async () => {
  if (confirm('Are you sure you want to log out?')) {
    if (isAdminPage) {
      await db.logoutAdmin();
    } else {
      await db.logout();
    }
    checkAuth();
    showToast('Logged out successfully', 'info');
  }
});

// Demo Mode Toggle logins
if (document.getElementById('btn-enter-demo')) {
  document.getElementById('btn-enter-demo').addEventListener('click', async () => {
    if (isAdminPage) {
      const demoAdmin = { uid: 'mock_admin_uid', username: 'management_admin', role: 'admin' };
      sessionStorage.setItem('bb_stock_admin_user', JSON.stringify(demoAdmin));
      sessionStorage.setItem('bb_stock_explicit_admin_auth', 'true');
    } else {
      const demoStaff = { uid: 'mock_staff_uid', username: 'staff_demo', role: 'staff' };
      sessionStorage.setItem('bb_stock_current_user', JSON.stringify(demoStaff));
      sessionStorage.setItem('bb_stock_explicit_staff_auth', 'true');
    }
    checkAuth();
    showToast('Entered Local Demo Mode!', 'success');
  });
}

// ----------------------------------------------------
// Data Refresh Pipeline
// ----------------------------------------------------
async function refreshData() {
  try {
    state.stocks = await db.getStocks();
    state.students = await db.getStudents();
    state.transactions = await db.getTransactions();
    state.bills = await db.getBills ? await db.getBills() : [];
    
    // Apply branch filters
    const filterBranch = (list) => {
      if (state.activeBranch === 'ALL') return list;
      return list.filter(item => item.branch === state.activeBranch);
    };

    const filteredStocks = filterBranch(state.stocks);
    const filteredStudents = filterBranch(state.students);
    const filteredTransactions = filterBranch(state.transactions);
    const filteredBills = filterBranch(state.bills);

    if (isAdminPage) {
      if (state.activeView === 'dashboard') {
        renderDashboardData(filteredStocks, filteredStudents);
      } else if (state.activeView === 'requests') {
        renderRequestsData(filteredStudents);
      } else if (state.activeView === 'logs') {
        renderLogsData(filteredTransactions);
      } else if (state.activeView === 'admin-students') {
        renderAdminStudentsData(filteredStudents);
      } else if (state.activeView === 'uniform-report') {
        renderUniformReportData(filteredStudents, filteredTransactions);
      } else if (state.activeView === 'billing') {
        renderAdminBillingData(filteredBills);
      }
    } else {
      if (state.activeView === 'issuer') {
        renderIssuerData(filteredStudents);
      } else if (state.activeView === 'students') {
        renderStudentsData(filteredStudents);
      }
    }
  } catch (error) {
    showToast('Database synchronization error: ' + error.message, 'error');
    console.error(error);
  }
}

// ----------------------------------------------------
// Staff View Renders (index.html)
// ----------------------------------------------------
// Helper to parse roman numeral standard and section from grade
function getStudentStandardAndSection(student) {
  let gradeStr = student.grade || '';
  let standard = 'Junior KG';
  let section = 'B';
  
  if (gradeStr.includes(' - ')) {
    const parts = gradeStr.split(' - ');
    standard = parts[0].trim();
    section = parts[1].trim().toUpperCase();
  } else {
    const normalized = gradeStr.toLowerCase().trim();
    if (normalized.includes('junior') || normalized === 'lkg') {
      standard = 'Junior KG';
    } else if (normalized.includes('senior') || normalized === 'ukg') {
      standard = 'Senior KG';
    } else {
      const match = gradeStr.match(/\d+/);
      if (match) {
        const num = parseInt(match[0]);
        standard = getRomanStandard(num);
      } else {
        standard = gradeStr;
      }
    }
    
    if (gradeStr.includes('(')) {
      section = 'B';
    } else {
      const lastChar = gradeStr.trim().slice(-1).toUpperCase();
      if (['B','R','A','I','N'].includes(lastChar)) {
        section = lastChar;
      }
    }
  }
  
  return { standard, section };
}

function getRomanStandard(num) {
  const romans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  if (num >= 1 && num <= 12) {
    return romans[num - 1] + ' Std';
  }
  return 'Grade ' + num;
}

// Render class boxes filters for staff page
function initClassSectionFilters() {
  const classContainer = document.getElementById('class-boxes-container');
  const sectionContainer = document.getElementById('section-boxes-container');
  
  if (!classContainer || !sectionContainer) return;
  
  const standards = [
    'Junior KG', 'Senior KG', 
    'I Std', 'II Std', 'III Std', 'IV Std', 'V Std', 
    'VI Std', 'VII Std', 'VIII Std', 'IX Std', 'X Std', 'XI Std', 'XII Std'
  ];
  const sections = ['B', 'R', 'A', 'I', 'N'];
  
  if (!state.selectedStandard) state.selectedStandard = 'Junior KG';
  if (!state.selectedSection) state.selectedSection = 'B';
  
  classContainer.innerHTML = '';
  standards.forEach(std => {
    const box = document.createElement('div');
    box.className = `class-box ${state.selectedStandard === std ? 'active' : ''}`;
    box.style.padding = '12px 8px';
    box.style.border = '1px solid #cbd5e1';
    box.style.borderRadius = 'var(--radius-md)';
    box.style.textAlign = 'center';
    box.style.cursor = 'pointer';
    box.style.fontWeight = '600';
    box.style.fontSize = '0.9rem';
    box.style.background = state.selectedStandard === std ? 'var(--primary)' : '#ffffff';
    box.style.color = state.selectedStandard === std ? '#ffffff' : '#1e293b';
    box.style.transition = 'all 0.2s ease';
    box.textContent = std;
    
    box.addEventListener('click', () => {
      state.selectedStandard = std;
      document.querySelectorAll('#class-boxes-container .class-box').forEach(el => {
        el.classList.remove('active');
        el.style.background = '#ffffff';
        el.style.color = '#1e293b';
      });
      box.classList.add('active');
      box.style.background = 'var(--primary)';
      box.style.color = '#ffffff';
      state.selectedStudent = null;
      refreshData();
    });
    classContainer.appendChild(box);
  });
  
  sectionContainer.innerHTML = '';
  sections.forEach(sec => {
    const box = document.createElement('div');
    box.className = `section-box ${state.selectedSection === sec ? 'active' : ''}`;
    box.style.width = '45px';
    box.style.height = '45px';
    box.style.display = 'flex';
    box.style.alignItems = 'center';
    box.style.justifyContent = 'center';
    box.style.border = '1px solid #cbd5e1';
    box.style.borderRadius = 'var(--radius-md)';
    box.style.cursor = 'pointer';
    box.style.fontWeight = '700';
    box.style.fontSize = '1.1rem';
    box.style.background = state.selectedSection === sec ? 'var(--primary)' : '#ffffff';
    box.style.color = state.selectedSection === sec ? '#ffffff' : '#1e293b';
    box.style.transition = 'all 0.2s ease';
    box.textContent = sec;
    
    box.addEventListener('click', () => {
      state.selectedSection = sec;
      document.querySelectorAll('#section-boxes-container .section-box').forEach(el => {
        el.classList.remove('active');
        el.style.background = '#ffffff';
        el.style.color = '#1e293b';
      });
      box.classList.add('active');
      box.style.background = 'var(--primary)';
      box.style.color = '#ffffff';
      state.selectedStudent = null;
      refreshData();
    });
    sectionContainer.appendChild(box);
  });
}

function renderIssuerData(students) {
  const searchQuery = DOM.issuerSearchInput.value.toLowerCase().trim();
  
  // Render and sync UI class and section boxes filters
  initClassSectionFilters();

  const activeStandard = state.selectedStandard || 'Junior KG';
  const activeSection = state.selectedSection || 'B';

  const filtered = students.filter(s => {
    const { standard, section } = getStudentStandardAndSection(s);
    const matchesSearch = s.name.toLowerCase().includes(searchQuery);
    const matchesClass = (standard === activeStandard);
    const matchesSection = (section === activeSection);
    return matchesSearch && matchesClass && matchesSection;
  });

  DOM.issuerStudentScroll.innerHTML = '';
  if (filtered.length === 0) {
    DOM.issuerStudentScroll.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">No students found.</div>`;
  } else {
    filtered.forEach(s => {
      const issuedCount = s.sets.filter(set => set.status === 'Issued').length;
      const feePendingCount = s.sets.filter(set => set.status === 'Fee Pending').length;
      const sizePendingCount = s.sets.filter(set => set.status === 'Size Pending' || set.status === 'Pending Size').length;
      const activeCount = issuedCount + feePendingCount;
      
      const card = document.createElement('div');
      card.className = `student-card-item ${state.selectedStudent && state.selectedStudent.id === s.id ? 'selected' : ''}`;
      
      let summaryPill = `<span class="badge badge-danger">0/3 Sets</span>`;
      if (activeCount === 3) {
        if (feePendingCount > 0) {
          summaryPill = `<span class="badge badge-info">3/3 Sets (Fee Pending)</span>`;
        } else {
          summaryPill = `<span class="badge badge-success">3/3 Sets</span>`;
        }
      } else if (activeCount > 0) {
        if (sizePendingCount > 0) {
          summaryPill = `<span class="badge badge-warning">${activeCount}/3 Sets (Req Pending)</span>`;
        } else if (feePendingCount > 0) {
          summaryPill = `<span class="badge badge-info">${activeCount}/3 Sets (Fee Pending)</span>`;
        } else {
          summaryPill = `<span class="badge badge-warning">${activeCount}/3 Sets</span>`;
        }
      } else if (sizePendingCount > 0) {
        summaryPill = `<span class="badge badge-warning">Request Pending</span>`;
      }

      const bill = state.bills ? state.bills.find(b => b.studentId === s.id) : null;
      let billingLabel = '<span class="badge badge-neutral">Unbilled</span>';
      if (bill) {
        if (bill.status === 'Paid') {
          billingLabel = '<span class="badge badge-success">Paid</span>';
        } else if (bill.status === 'Pending') {
          billingLabel = '<span class="badge badge-warning">Bill Pending</span>';
        }
      }

      card.innerHTML = `
        <div class="student-card-name">${s.name}</div>
        <div class="student-card-meta">
          <span>${s.branch} • ${s.gender} • ${s.grade}</span>
          <div style="display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap;">
            ${summaryPill}
            ${billingLabel}
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        state.selectedStudent = s;
        document.querySelectorAll('.student-card-item').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        renderSelectedStudentDetail();
      });

      DOM.issuerStudentScroll.appendChild(card);
    });
  }

  if (state.selectedStudent) {
    const freshStudent = students.find(s => s.id === state.selectedStudent.id);
    if (freshStudent) {
      state.selectedStudent = freshStudent;
      renderSelectedStudentDetail();
    } else {
      clearIssuerDetail();
    }
  } else {
    clearIssuerDetail();
  }
}

function clearIssuerDetail() {
  DOM.issuerDetailEmpty.style.display = 'flex';
  DOM.issuerDetailActive.style.display = 'none';
}

function renderSelectedStudentDetail() {
  DOM.issuerDetailEmpty.style.display = 'none';
  DOM.issuerDetailActive.style.display = 'block';

  const s = state.selectedStudent;
  document.getElementById('profile-name').textContent = s.name;
  if (document.getElementById('profile-adm-no')) document.getElementById('profile-adm-no').textContent = s.admissionNo ? `Adm: ${s.admissionNo}` : 'Adm: N/A';
  if (document.getElementById('profile-father-name')) document.getElementById('profile-father-name').textContent = s.fatherName ? `Father: ${s.fatherName}` : 'Father: N/A';
  document.getElementById('profile-branch').textContent = s.branch;
  document.getElementById('profile-gender').textContent = s.gender;
  document.getElementById('profile-grade').textContent = s.grade;

  // Billing status indicators in Staff portal
  const billingBadge = document.getElementById('profile-billing-badge');
  const warningBanner = document.getElementById('billing-warning-banner');
  if (billingBadge) {
    const bill = state.bills ? state.bills.find(b => b.studentId === s.id) : null;
    const billStatus = bill ? bill.status : 'Unbilled';
    
    billingBadge.textContent = `Billing: ${billStatus}`;
    billingBadge.className = 'badge';
    if (billStatus === 'Paid') {
      billingBadge.classList.add('badge-success');
      if (warningBanner) {
        warningBanner.style.display = 'block';
        warningBanner.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
        warningBanner.style.border = '1px solid rgba(16, 185, 129, 0.2)';
        warningBanner.style.color = '#10b981';
        warningBanner.innerHTML = '✨ Payment verified! You may issue the allocated uniform sets to this student.';
      }
    } else if (billStatus === 'Pending') {
      billingBadge.classList.add('badge-warning');
      if (warningBanner) {
        warningBanner.style.display = 'block';
        warningBanner.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
        warningBanner.style.border = '1px solid rgba(245, 158, 11, 0.2)';
        warningBanner.style.color = '#f59e0b';
        warningBanner.innerHTML = '⚠️ Payment Pending! Please direct student to the Accounts Dept (Cashier) to clear uniform fees before issuing sets.';
      }
    } else {
      billingBadge.classList.add('badge-neutral');
      if (warningBanner) {
        warningBanner.style.display = 'block';
        warningBanner.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
        warningBanner.style.border = '1px solid rgba(255, 255, 255, 0.05)';
        warningBanner.style.color = 'var(--text-secondary)';
        warningBanner.innerHTML = '⚠️ Unbilled Student! Please direct student to the Accounts Dept (Cashier) to register and pay their uniform fees.';
      }
    }
  }

  const bill = state.bills ? state.bills.find(b => b.studentId === s.id) : null;
  const billStatus = bill ? bill.status : 'Unbilled';
  const isPaid = (billStatus === 'Paid');

  const container = document.getElementById('uniform-sets-container');
  container.innerHTML = '';

  s.sets.forEach(set => {
    const card = document.createElement('div');
    let statusClass = '';
    let statusBadge = '';
    let detailsHtml = '';
    let actionBtnHtml = '';

    const labelName = set.setNumber === 1 ? 'Yellow Uniform' : (set.setNumber === 2 ? 'Red Uniform' : (set.sportsColor ? `Sports Uniform (${set.sportsColor})` : 'Sports Uniform'));

    if (set.status === 'Issued') {
      statusClass = 'issued';
      statusBadge = `<span class="badge badge-success">Issued</span>`;
      const dateFormatted = set.issueDate ? new Date(set.issueDate).toLocaleDateString() : 'N/A';
      detailsHtml = `
        <div>Top Size: <strong>Size ${set.topSize || 'N/A'}</strong></div>
        <div>Bottom Size: <strong>Size ${set.bottomSize || 'N/A'}</strong></div>
        <div>Date: <strong>${dateFormatted}</strong></div>
      `;
      actionBtnHtml = `
        <button class="btn btn-secondary btn-sm set-action-btn" data-set="${set.setNumber}">
          🔄 Edit Sizing / Return
        </button>
      `;
    } else if (set.status === 'Fee Pending') {
      statusClass = 'fee-pending';
      statusBadge = `<span class="badge badge-info">Fee Pending</span>`;
      const dateFormatted = set.issueDate ? new Date(set.issueDate).toLocaleDateString() : 'N/A';
      detailsHtml = `
        <div>Top Size: <strong>Size ${set.topSize || 'N/A'}</strong></div>
        <div>Bottom Size: <strong>Size ${set.bottomSize || 'N/A'}</strong></div>
        <div>Date: <strong>${dateFormatted}</strong></div>
      `;
      actionBtnHtml = `
        <button class="btn btn-secondary btn-sm set-action-btn" data-set="${set.setNumber}">
          🔄 Edit Sizing / Return
        </button>
      `;
    } else if (set.status === 'Size Pending' || set.status === 'Pending Size') {
      statusClass = 'pending';
      statusBadge = `<span class="badge badge-warning">Request Pending</span>`;
      detailsHtml = `
        <div style="color: var(--warning);">Req. Top: <strong>${set.topSize || 'N/A'}</strong></div>
        <div style="color: var(--warning);">Req. Bottom: <strong>${set.bottomSize || 'N/A'}</strong></div>
        <div style="font-style: italic; margin-top: 4px; font-size: 0.75rem;">"${set.reasonIfMissing}"</div>
      `;
      actionBtnHtml = `
        <button class="btn ${isPaid ? 'btn-primary' : 'btn-secondary'} btn-sm set-action-btn" data-set="${set.setNumber}" ${isPaid ? '' : 'style="opacity: 0.65;"'}>
          ${isPaid ? '✏️ Resolve Sizing Issues' : '🔒 Paid Bill Required'}
        </button>
      `;
    } else {
      statusBadge = `<span class="badge badge-neutral">Not Issued</span>`;
      detailsHtml = `<div style="color: var(--text-muted);">This uniform has not been issued to the student.</div>`;
      actionBtnHtml = `
        <button class="btn ${isPaid ? 'btn-primary' : 'btn-secondary'} btn-sm set-action-btn" data-set="${set.setNumber}" ${isPaid ? '' : 'style="opacity: 0.65;"'}>
          ${isPaid ? '📦 Issue This Uniform' : '🔒 Paid Bill Required'}
        </button>
      `;
    }

    card.className = `set-card ${statusClass}`;
    card.innerHTML = `
      <div class="set-title">
        <span>${labelName}</span>
        ${statusBadge}
      </div>
      <div class="set-details">${detailsHtml}</div>
      ${actionBtnHtml}
    `;

    card.querySelectorAll('.set-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // Enforce only paid students can collect
        if (set.status !== 'Issued' && set.status !== 'Fee Pending' && !isPaid) {
          showToast('Cannot collect uniform. Uniform fees must be PAID in the Accounts Portal first.', 'error');
          return;
        }
        openIssueForm(s, set.setNumber);
      });
    });

    container.appendChild(card);
  });
}

function openIssueForm(student, setNumber) {
  const currentSet = student.sets[setNumber - 1];
  const isSports = (setNumber === 3);
  const uniformType = isSports ? 'Sports Uniform' : (setNumber === 1 ? 'Yellow Uniform' : 'Red Uniform');
  
  const statuses = [
    { value: 'Not Issued', label: 'Not Issued' },
    { value: 'Issued', label: 'Issued (Full Set)' },
    { value: 'Partial Issue & Request Admin', label: 'Partial Issue (Top/Bottom) & Request Admin 📩' },
    { value: 'Size Pending', label: 'Sizing Exception / Request Admin 📩' },
    { value: 'Fee Pending', label: 'Fee Pending' }
  ];
  
  const statusOptions = statuses.map(s => `<option value="${s.value}" ${currentSet.status === s.value ? 'selected' : ''}>${s.label}</option>`).join('');
  
  const sportsColors = ['B', 'E', 'S', 'T'];
  const sportsColorOptions = sportsColors.map(c => `<option value="${c}" ${currentSet.sportsColor === c ? 'selected' : ''}>Color ${c}</option>`).join('');

  const modalBodyContent = `
    <form id="issue-submit-form" data-student-id="${student.id}" data-set-number="${setNumber}">
      <div style="font-weight: 500; font-size: 1.05rem; margin-bottom: 12px; color: var(--text-secondary);">
        Student: <span style="color: var(--text-primary); font-weight: 600;">${student.name}</span> (${student.branch} • ${student.gender})
      </div>
      <div style="font-weight: 500; font-size: 1.05rem; margin-bottom: 16px; color: var(--text-secondary);">
        Uniform: <span style="color: var(--text-primary); font-weight: 600;">${uniformType}</span>
      </div>
      
      ${isSports ? `
      <div class="form-group" style="margin-bottom: 16px;">
        <label for="issue-sports-color">Select Sports Uniform Color</label>
        <select id="issue-sports-color" class="input-ctrl">
          <option value="">-- Choose Color --</option>
          ${sportsColorOptions}
        </select>
      </div>
      ` : ''}

      <div class="form-group" style="margin-bottom: 16px;">
        <label for="issue-status-select">Uniform Status</label>
        <select id="issue-status-select" class="input-ctrl">
          ${statusOptions}
        </select>
      </div>

      <div class="sizing-selectors" id="sizing-selectors-container">
        <div class="form-group" style="margin-bottom: 16px;">
          <label for="issue-top-size-select">Top Size (Shirt/T-shirt)</label>
          <select id="issue-top-size-select" class="input-ctrl">
            <option value="">-- Choose Top Size --</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 16px;">
          <label for="issue-bottom-size-select">Bottom Size (Skirt/Trousers)</label>
          <select id="issue-bottom-size-select" class="input-ctrl">
            <option value="">-- Choose Bottom Size --</option>
          </select>
        </div>
      </div>

      <div class="sizing-form" id="sizing-reason-container" style="display: none;">
        <div class="form-group" style="margin-bottom: 12px;">
          <label for="missing-top-size">Requested Top Size</label>
          <input type="text" id="missing-top-size" class="input-ctrl" placeholder="e.g. Size 32, Custom" value="${(currentSet.status === 'Size Pending' || currentSet.status === 'Pending Size') ? (currentSet.topSize || '') : ''}">
        </div>
        <div class="form-group" style="margin-bottom: 12px;">
          <label for="missing-bottom-size">Requested Bottom Size</label>
          <input type="text" id="missing-bottom-size" class="input-ctrl" placeholder="e.g. Size 32, Custom" value="${(currentSet.status === 'Size Pending' || currentSet.status === 'Pending Size') ? (currentSet.bottomSize || '') : ''}">
        </div>
        <div class="form-group" style="margin-bottom: 12px;">
          <label for="missing-reason-textarea">Reason / Custom Notes</label>
          <textarea id="missing-reason-textarea" class="input-ctrl" rows="3" placeholder="Explain sizing details..." style="resize: none;">${(currentSet.status === 'Size Pending' || currentSet.status === 'Pending Size') ? (currentSet.reasonIfMissing || '') : ''}</textarea>
        </div>
      </div>

      ${currentSet.status === 'Issued' || currentSet.status === 'Fee Pending' ? `
        <div class="checkbox-wrapper" style="margin-top: 16px; padding: 12px; background: rgba(244, 63, 94, 0.05); border: 1px dashed rgba(244, 63, 94, 0.2); border-radius: var(--radius-md);">
          <input type="checkbox" id="chk-return-uniform">
          <label for="chk-return-uniform" style="color: var(--danger); font-weight: 600;">🔄 Return uniform back to stock (Unissue)</label>
        </div>
      ` : ''}
    </form>
  `;

  openModal(`Issue Uniform - Set ${setNumber}`, modalBodyContent, [
    { text: 'Cancel', type: 'secondary', handler: closeModal },
    { text: 'Save Issuance', type: 'primary', handler: submitUniformIssuance }
  ]);

  const statusSelect = document.getElementById('issue-status-select');
  const sizingSelectors = document.getElementById('sizing-selectors-container');
  const reasonContainer = document.getElementById('sizing-reason-container');
  const colorSelect = document.getElementById('issue-sports-color');

  const getSizeOptionsHtml = (part, selectedSize, uniformTypeLabel) => {
    return CONSTANTS.SIZES.map(sz => {
      const stockItem = state.stocks.find(s => 
        s.branch === student.branch && 
        s.gender === student.gender && 
        s.uniformType === uniformTypeLabel &&
        s.uniformPart === part &&
        s.size === sz
      );
      const avail = stockItem ? stockItem.remaining : 0;
      const statusTxt = avail > 0 ? `(${avail} available)` : `(Out of Stock)`;
      return `<option value="${sz}" ${selectedSize === sz ? 'selected' : ''}>Size ${sz} ${statusTxt}</option>`;
    }).join('');
  };

  const updateSizeDropdowns = () => {
    const selectedColor = isSports ? (colorSelect ? colorSelect.value : '') : '';
    const activeUniformLabel = isSports ? (selectedColor ? `Sports Uniform (${selectedColor})` : 'Sports Uniform') : uniformType;
    
    const topSelect = document.getElementById('issue-top-size-select');
    const bottomSelect = document.getElementById('issue-bottom-size-select');
    
    if (topSelect) {
      const currentTopVal = topSelect.value || currentSet.topSize || '';
      topSelect.innerHTML = `<option value="">-- Choose Top Size --</option>` + getSizeOptionsHtml('Top', currentTopVal, activeUniformLabel);
    }
    if (bottomSelect) {
      const currentBottomVal = bottomSelect.value || currentSet.bottomSize || '';
      bottomSelect.innerHTML = `<option value="">-- Choose Bottom Size --</option>` + getSizeOptionsHtml('Bottom', currentBottomVal, activeUniformLabel);
    }
  };

  const toggleStatusInputs = () => {
    const val = statusSelect.value;
    if (val === 'Size Pending') {
      sizingSelectors.style.display = 'none';
      reasonContainer.style.display = 'block';
    } else if (val === 'Partial Issue & Request Admin') {
      sizingSelectors.style.display = 'block';
      reasonContainer.style.display = 'block';
      updateSizeDropdowns();
    } else if (val === 'Not Issued') {
      sizingSelectors.style.display = 'none';
      reasonContainer.style.display = 'none';
    } else {
      sizingSelectors.style.display = 'block';
      reasonContainer.style.display = 'none';
      updateSizeDropdowns();
    }
  };

  statusSelect.addEventListener('change', toggleStatusInputs);
  if (colorSelect) {
    colorSelect.addEventListener('change', updateSizeDropdowns);
  }
  
  toggleStatusInputs();
}

async function submitUniformIssuance() {
  const form = document.getElementById('issue-submit-form');
  const studentId = form.dataset.studentId;
  const setNumber = parseInt(form.dataset.setNumber);
  const isSports = (setNumber === 3);
  const uniformType = isSports ? 'Sports Uniform' : (setNumber === 1 ? 'Yellow Uniform' : 'Red Uniform');

  const statusSelect = document.getElementById('issue-status-select');
  const chkReturn = document.getElementById('chk-return-uniform') ? document.getElementById('chk-return-uniform').checked : false;

  let status = chkReturn ? 'Not Issued' : statusSelect.value;
  let topSize = '';
  let bottomSize = '';
  let sportsColor = '';
  let reason = '';

  if (isSports && status !== 'Not Issued') {
    sportsColor = document.getElementById('issue-sports-color').value;
    if (!sportsColor) {
      showToast('Please select a Sports Uniform color', 'error');
      return;
    }
  }

  if (status === 'Partial Issue & Request Admin') {
    topSize = document.getElementById('issue-top-size-select').value || document.getElementById('missing-top-size').value.trim();
    bottomSize = document.getElementById('issue-bottom-size-select').value || document.getElementById('missing-bottom-size').value.trim();
    reason = document.getElementById('missing-reason-textarea').value.trim();

    if (!topSize && !bottomSize) {
      showToast('Please select or enter at least Top or Bottom size', 'error');
      return;
    }

    const student = state.students.find(s => s.id === studentId);
    const label = isSports ? `Sports Uniform (${sportsColor})` : uniformType;
    let noteParts = [];

    let topAvail = false;
    let bottomAvail = false;

    if (topSize) {
      const topStock = state.stocks.find(s => 
        s.branch === student.branch && 
        s.gender === student.gender && 
        s.uniformType === label && 
        s.uniformPart === 'Top' && 
        s.size === topSize
      );
      if (topStock && topStock.remaining > 0) topAvail = true;
    }

    if (bottomSize) {
      const bottomStock = state.stocks.find(s => 
        s.branch === student.branch && 
        s.gender === student.gender && 
        s.uniformType === label && 
        s.uniformPart === 'Bottom' && 
        s.size === bottomSize
      );
      if (bottomStock && bottomStock.remaining > 0) bottomAvail = true;
    }

    if (topAvail) noteParts.push(`Top (Size ${topSize}) Available/Issued`);
    else if (topSize) noteParts.push(`Top (Size ${topSize}) OUT OF STOCK`);

    if (bottomAvail) noteParts.push(`Bottom (Size ${bottomSize}) Available/Issued`);
    else if (bottomSize) noteParts.push(`Bottom (Size ${bottomSize}) OUT OF STOCK`);

    const autoReason = noteParts.join('; ') + (reason ? ` | Note: ${reason}` : '');

    try {
      const operator = state.currentUser ? (state.currentUser.phoneNumber || state.currentUser.username) : 'Staff Issuer';
      await db.issueUniformSet(studentId, setNumber, 'Size Pending', topSize, bottomSize, sportsColor, autoReason, operator);
      showToast('Partial status recorded & Sizing Request sent to Admin!', 'success');
      closeModal();
      refreshData();
      return;
    } catch (err) {
      showToast('Failed to log partial request: ' + err.message, 'error');
      return;
    }
  } else if (status === 'Size Pending') {
    topSize = document.getElementById('missing-top-size').value.trim();
    bottomSize = document.getElementById('missing-bottom-size').value.trim();
    reason = document.getElementById('missing-reason-textarea').value.trim();

    if (!topSize && !bottomSize) {
      showToast('Please specify the requested Top and/or Bottom size', 'error');
      return;
    }
    if (!reason) {
      showToast('Please specify the reason/sizing details', 'error');
      return;
    }
  } else if (status === 'Issued' || status === 'Fee Pending') {
    topSize = document.getElementById('issue-top-size-select').value;
    bottomSize = document.getElementById('issue-bottom-size-select').value;

    if (!topSize && !bottomSize) {
      showToast('Please select at least Top or Bottom size to issue', 'error');
      return;
    }

    const student = state.students.find(s => s.id === studentId);
    const label = isSports ? `Sports Uniform (${sportsColor})` : uniformType;
    let outOfStockMsg = '';

    if (topSize) {
      const topStock = state.stocks.find(s => 
        s.branch === student.branch && 
        s.gender === student.gender && 
        s.uniformType === label && 
        s.uniformPart === 'Top' && 
        s.size === topSize
      );
      if (!topStock || topStock.remaining <= 0) {
        outOfStockMsg += `Top size ${topSize} is out of stock.\n`;
      }
    }

    if (bottomSize) {
      const bottomStock = state.stocks.find(s => 
        s.branch === student.branch && 
        s.gender === student.gender && 
        s.uniformType === label && 
        s.uniformPart === 'Bottom' && 
        s.size === bottomSize
      );
      if (!bottomStock || bottomStock.remaining <= 0) {
        outOfStockMsg += `Bottom size ${bottomSize} is out of stock.\n`;
      }
    }

    if (outOfStockMsg) {
      const confirmPartial = confirm(
        `Stock Warning:\n${outOfStockMsg}\n` +
        `Would you like to issue the available items and automatically send a Sizing Request to Admin for the missing items?`
      );
      if (confirmPartial) {
        status = 'Size Pending';
        reason = `Partial Issue: ${outOfStockMsg.replace(/\n/g, ' ')} (Requested from Admin)`;
      } else {
        const forceAnyway = confirm('Force full issue anyway (will result in negative stock)?');
        if (!forceAnyway) return;
      }
    }
  }

  try {
    const operator = state.currentUser ? state.currentUser.phoneNumber : 'Staff Issuer';
    await db.issueUniformSet(studentId, setNumber, status, topSize, bottomSize, sportsColor, reason, operator);
    showToast(`Uniform status updated successfully!`, 'success');
    closeModal();
    refreshData();
    
    // Display receipt slip on successful issue / fee pending
    if (status === 'Issued' || status === 'Fee Pending') {
      const student = state.students.find(s => s.id === studentId);
      if (student) {
        setTimeout(() => {
          showReceiptModal(student, setNumber, status, topSize, bottomSize, sportsColor, operator);
        }, 350);
      }
    }
  } catch (error) {
    showToast('Failed to update: ' + error.message, 'error');
  }
}

function renderStudentsData(students) {
  DOM.studentTableBody.innerHTML = '';
  if (students.length === 0) {
    DOM.studentTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No student records found.</td></tr>`;
  } else {
    const sorted = [...students].sort((a, b) => a.name.localeCompare(b.name));
    sorted.forEach(s => {
      const tr = document.createElement('tr');
      const setBadges = s.sets.map(set => {
        let badgeClass = 'badge-neutral';
        let statusLabel = 'Not Issued';
        if (set.status === 'Issued') {
          badgeClass = 'badge-success';
          statusLabel = 'Issued';
        } else if (set.status === 'Fee Pending') {
          badgeClass = 'badge-info';
          statusLabel = 'Fee Pending';
        } else if (set.status === 'Size Pending' || set.status === 'Pending Size') {
          badgeClass = 'badge-warning';
          statusLabel = 'Pending Size';
        }

        const nameLabel = set.setNumber === 1 ? 'Yellow' : (set.setNumber === 2 ? 'Red' : (set.sportsColor ? `Sports (${set.sportsColor})` : 'Sports'));
        let sizesText = '';
        if (set.status === 'Issued' || set.status === 'Fee Pending') {
          sizesText = ` (T:${set.topSize || 'N/A'}, B:${set.bottomSize || 'N/A'})`;
        } else if (set.status === 'Size Pending' || set.status === 'Pending Size') {
          sizesText = ` (Req: ${set.topSize || '?'}/${set.bottomSize || '?'})`;
        }
        
        return `<span class="badge ${badgeClass}">${nameLabel}: ${statusLabel}${sizesText}</span>`;
      }).join(' ');

      tr.innerHTML = `
        <td><strong>${s.admissionNo || '-'}</strong></td>
        <td><strong>${s.name}</strong></td>
        <td>${s.fatherName || '-'}</td>
        <td>${s.branch}</td>
        <td>${s.gender}</td>
        <td><span class="badge badge-neutral">${s.grade}</span></td>
        <td><div style="display: flex; gap: 6px; flex-wrap: wrap;">${setBadges}</div></td>
        <td>
          <button class="btn btn-danger btn-sm btn-delete-student" style="padding: 2px 8px; font-size: 0.75rem;">
            🗑️ Delete
          </button>
        </td>
      `;

      tr.querySelector('.btn-delete-student').addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete student "${s.name}" (${s.grade})?`)) {
          try {
            await db.deleteStudent(s.id);
            showToast(`Student ${s.name} deleted successfully.`, 'success');
            refreshData();
          } catch (error) {
            showToast('Failed to delete student: ' + error.message, 'error');
          }
        }
      });

      DOM.studentTableBody.appendChild(tr);
    });
  }
}

if (document.getElementById('btn-add-student')) {
  document.getElementById('btn-add-student').addEventListener('click', () => {
    const branchOptions = CONSTANTS.BRANCHES.map(b => `<option value="${b}">${b}</option>`).join('');
    
    const standards = [
      'Junior KG', 'Senior KG', 
      'I Std', 'II Std', 'III Std', 'IV Std', 'V Std', 
      'VI Std', 'VII Std', 'VIII Std', 'IX Std', 'X Std', 'XI Std', 'XII Std'
    ];
    const sections = ['B', 'R', 'A', 'I', 'N'];

    const stdOptions = standards.map(s => `<option value="${s}">${s}</option>`).join('');
    const secOptions = sections.map(s => `<option value="${s}">${s}</option>`).join('');

    const modalBody = `
      <form id="new-student-form">
        <div class="form-group">
          <label for="new-student-admission-no">Admission No</label>
          <input type="text" id="new-student-admission-no" class="input-ctrl" placeholder="e.g. ADM-2026-001">
        </div>
        <div class="form-group">
          <label for="new-student-name">Student Full Name</label>
          <input type="text" id="new-student-name" class="input-ctrl" placeholder="e.g. Kabir Sharma" required>
        </div>
        <div class="form-group">
          <label for="new-student-father-name">Father Name</label>
          <input type="text" id="new-student-father-name" class="input-ctrl" placeholder="e.g. Rajesh Sharma">
        </div>
        <div class="form-group">
          <label for="new-student-branch">Branch</label>
          <select id="new-student-branch" class="input-ctrl">
            ${branchOptions}
          </select>
        </div>
        <div class="form-group">
          <label for="new-student-gender">Gender</label>
          <select id="new-student-gender" class="input-ctrl">
            <option value="Boys">Boys</option>
            <option value="Girls">Girls</option>
          </select>
        </div>
        <div class="form-group" style="display: flex; gap: 12px; margin-bottom: 0;">
          <div style="flex: 1;">
            <label for="new-student-standard">Grade / Class</label>
            <select id="new-student-standard" class="input-ctrl">
              ${stdOptions}
            </select>
          </div>
          <div style="width: 100px;">
            <label for="new-student-section">Section</label>
            <select id="new-student-section" class="input-ctrl">
              ${secOptions}
            </select>
          </div>
        </div>
      </form>
    `;

    openModal('Register New Student', modalBody, [
      { text: 'Cancel', type: 'secondary', handler: closeModal },
      { text: 'Register Student', type: 'primary', handler: submitNewStudent }
    ]);
  });
}

async function submitNewStudent() {
  const admissionNo = document.getElementById('new-student-admission-no').value.trim();
  const name = document.getElementById('new-student-name').value.trim();
  const fatherName = document.getElementById('new-student-father-name').value.trim();
  const branch = document.getElementById('new-student-branch').value;
  const gender = document.getElementById('new-student-gender').value;
  const standard = document.getElementById('new-student-standard').value;
  const section = document.getElementById('new-student-section').value;
  const grade = `${standard} - ${section}`;

  if (!name) {
    showToast('Name is required', 'error');
    return;
  }

  try {
    const newStud = await db.addStudent(name, branch, gender, grade, fatherName, admissionNo);
    showToast(`Registered student: ${name}`, 'success');
    closeModal();
    state.selectedStudent = newStud;
    navigateTo('issuer');
  } catch (error) {
    showToast('Registration failed: ' + error.message, 'error');
  }
}

// ----------------------------------------------------
// Admin View Renders (admin.html)
// ----------------------------------------------------
function renderDashboardData(stocks, students) {
  let totalReceived = 0;
  let totalIssued = 0;
  
  stocks.forEach(s => {
    totalReceived += parseInt(s.received || 0);
    totalIssued += parseInt(s.issued || 0);
  });
  
  let totalRemaining = totalReceived - totalIssued;
  
  let pendingRequests = 0;
  students.forEach(stud => {
    stud.sets.forEach(set => {
      if (set.status === 'Pending Size' || set.status === 'Size Pending') pendingRequests++;
    });
  });

  DOM.kpiReceived.textContent = totalReceived.toLocaleString();
  DOM.kpiIssued.textContent = totalIssued.toLocaleString();
  DOM.kpiRemaining.textContent = totalRemaining.toLocaleString();
  DOM.kpiPending.textContent = pendingRequests.toLocaleString();

  DOM.stockTableBody.innerHTML = '';
  if (stocks.length === 0) {
    DOM.stockTableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted);">No stock logs found. Click "Add Received Stock" to log inventory.</td></tr>`;
  } else {
    const sortedStocks = [...stocks].sort((a, b) => {
      if (a.branch !== b.branch) return a.branch.localeCompare(b.branch);
      const utA = a.uniformType || 'General';
      const utB = b.uniformType || 'General';
      if (utA !== utB) return utA.localeCompare(utB);
      const upA = a.uniformPart || 'N/A';
      const upB = b.uniformPart || 'N/A';
      if (upA !== upB) return upA.localeCompare(upB);
      if (a.gender !== b.gender) return a.gender.localeCompare(b.gender);
      return parseInt(a.size) - parseInt(b.size);
    });

    sortedStocks.forEach(s => {
      const tr = document.createElement('tr');
      let badgeClass = 'badge-success';
      let statusTxt = 'In Stock';
      
      if (s.remaining === 0) {
        badgeClass = 'badge-danger';
        statusTxt = 'Out of Stock';
        tr.className = 'row-out-of-stock';
      } else if (s.remaining <= 5) {
        badgeClass = 'badge-warning';
        statusTxt = 'Low Stock';
        tr.className = 'row-low-stock';
      } else if (s.remaining < 10) {
        badgeClass = 'badge-warning';
        statusTxt = 'Low Stock';
      }

      const dateStr = s.lastUpdated ? new Date(s.lastUpdated).toLocaleString() : 'N/A';

      tr.innerHTML = `
        <td><strong>${s.branch}</strong></td>
        <td>${s.uniformType || 'General'}</td>
        <td><span class="badge badge-neutral">${s.uniformPart || 'N/A'}</span></td>
        <td>${s.gender}</td>
        <td><span class="badge badge-neutral">${s.size}</span></td>
        <td>${s.received}</td>
        <td>${s.issued}</td>
        <td><strong>${s.remaining}</strong></td>
        <td><small style="color: var(--text-secondary);">${dateStr}</small></td>
        <td><span class="badge ${badgeClass}">${statusTxt}</span></td>
        <td>
          <button class="btn btn-danger btn-sm btn-delete-stock" style="padding: 2px 8px; font-size: 0.7rem;">
            🗑️ Delete
          </button>
        </td>
      `;

      tr.querySelector('.btn-delete-stock').addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete stock item: ${s.branch} - ${s.uniformType || 'General'} (${s.uniformPart || 'N/A'}, Size ${s.size})?`)) {
          try {
            await db.deleteStock(s.branch, s.uniformType || 'General', s.uniformPart || 'N/A', s.gender, s.size);
            showToast('Stock log deleted successfully.', 'success');
            refreshData();
          } catch (error) {
            showToast('Failed to delete stock: ' + error.message, 'error');
          }
        }
      });

      DOM.stockTableBody.appendChild(tr);
    });
  }

  renderBranchChart(students);
}

function renderBranchChart(students) {
  const stats = {
    BBLI: { issued: 0, total: 0 },
    BBCS: { issued: 0, total: 0 },
    'BBMS': { issued: 0, total: 0 }
  };

  students.forEach(stud => {
    if (stats[stud.branch]) {
      stud.sets.forEach(set => {
        stats[stud.branch].total++;
        if (set.status === 'Issued' || set.status === 'Fee Pending') {
          stats[stud.branch].issued++;
        }
      });
    }
  });

  CONSTANTS.BRANCHES.forEach(b => {
    const branchStat = stats[b];
    const percentage = branchStat && branchStat.total > 0 ? Math.round((branchStat.issued / branchStat.total) * 100) : 0;
    
    let barId = 'chart-bar-bb';
    let valId = 'chart-val-bb';
    if (b === 'BBLI') { barId = 'chart-bar-bbli'; valId = 'chart-val-bbli'; }
    else if (b === 'BBCS') { barId = 'chart-bar-bbcs'; valId = 'chart-val-bbcs'; }
    
    const bar = document.getElementById(barId);
    const valText = document.getElementById(valId);
    
    if (bar && valText) {
      bar.style.height = `${Math.max(percentage, 5)}%`;
      valText.textContent = `${percentage}% (${branchStat.issued}/${branchStat.total})`;
    }
  });
}

function renderAdminStudentsData(students) {
  if (!DOM.adminStudentTableBody) return;
  DOM.adminStudentTableBody.innerHTML = '';

  const searchQuery = DOM.adminStudentSearchInput ? DOM.adminStudentSearchInput.value.toLowerCase().trim() : '';
  
  const filtered = students.filter(s => {
    return s.name.toLowerCase().includes(searchQuery) || s.grade.toLowerCase().includes(searchQuery);
  });

  if (filtered.length === 0) {
    DOM.adminStudentTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">No matching students found in the directory.</td></tr>`;
  } else {
    filtered.forEach(s => {
      const tr = document.createElement('tr');
      
      const set1 = s.sets && s.sets[0] ? s.sets[0] : { status: 'Not Issued' };
      const set2 = s.sets && s.sets[1] ? s.sets[1] : { status: 'Not Issued' };
      const set3 = s.sets && s.sets[2] ? s.sets[2] : { status: 'Not Issued' };

      const getBadgeHTML = (set, isSports = false) => {
        let badgeClass = 'badge-neutral';
        let label = 'Not Issued';
        if (set.status === 'Issued') {
          badgeClass = 'badge-success';
          label = `Issued (${set.topSize || '?'}/${set.bottomSize || '?'})`;
        } else if (set.status === 'Fee Pending') {
          badgeClass = 'badge-info';
          label = `Fee Pending (${set.topSize || '?'}/${set.bottomSize || '?'})`;
        } else if (set.status === 'Size Pending' || set.status === 'Pending Size') {
          badgeClass = 'badge-warning';
          label = `Req Pending (${set.topSize || '?'}/${set.bottomSize || '?'})`;
        }
        if (isSports && set.sportsColor && set.status !== 'Not Issued') {
          label += ` [${set.sportsColor}]`;
        }
        return `<span class="badge ${badgeClass}">${label}</span>`;
      };

      tr.innerHTML = `
        <td><strong>${s.admissionNo || '-'}</strong></td>
        <td><strong>${s.name}</strong></td>
        <td>${s.fatherName || '-'}</td>
        <td>${s.branch}</td>
        <td>${s.gender}</td>
        <td><span class="badge badge-neutral">${s.grade}</span></td>
        <td>${getBadgeHTML(set1)}</td>
        <td>${getBadgeHTML(set2)}</td>
        <td>${getBadgeHTML(set3, true)}</td>
        <td>
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-outline btn-sm btn-edit-student" style="padding: 2px 8px; font-size: 0.75rem;">
              ✏️ Edit
            </button>
            <button class="btn btn-danger btn-sm btn-delete-student" style="padding: 2px 8px; font-size: 0.75rem;">
              🗑️ Delete
            </button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-edit-student').addEventListener('click', () => {
        handleOpenEditStudentModal(s);
      });

      tr.querySelector('.btn-delete-student').addEventListener('click', async () => {
        if (confirm(`Are you sure you want to delete student "${s.name}" (${s.grade})?`)) {
          try {
            await db.deleteStudent(s.id);
            showToast(`Student ${s.name} deleted successfully.`, 'success');
            refreshData();
          } catch (error) {
            showToast('Failed to delete student: ' + error.message, 'error');
          }
        }
      });

      DOM.adminStudentTableBody.appendChild(tr);
    });
  }
}

function renderAdminBillingData(bills) {
  if (!DOM.adminBillingTableBody) return;
  DOM.adminBillingTableBody.innerHTML = '';

  // KPI Calculations
  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalPending = 0;

  bills.forEach(b => {
    totalInvoiced += b.feeAmount;
    if (b.status === 'Paid') {
      totalPaid += b.feeAmount;
    } else {
      totalPending += b.feeAmount;
    }
  });

  if (DOM.kpiBillingTotal) DOM.kpiBillingTotal.textContent = `₹${totalInvoiced}`;
  if (DOM.kpiBillingPaid) DOM.kpiBillingPaid.textContent = `₹${totalPaid}`;
  if (DOM.kpiBillingPending) DOM.kpiBillingPending.textContent = `₹${totalPending}`;

  // Apply filters
  const searchQuery = DOM.adminBillingSearchInput ? DOM.adminBillingSearchInput.value.toLowerCase().trim() : '';
  const gradeFilter = DOM.adminBillingGradeFilter ? DOM.adminBillingGradeFilter.value : 'ALL';
  const statusFilter = DOM.adminBillingStatusFilter ? DOM.adminBillingStatusFilter.value : 'ALL';

  let filtered = bills.filter(b => {
    // Search Query
    if (searchQuery && !b.studentName.toLowerCase().includes(searchQuery) && !b.id.toLowerCase().includes(searchQuery)) {
      return false;
    }
    
    // Status Filter
    if (statusFilter !== 'ALL' && b.status !== statusFilter) {
      return false;
    }
    
    // Grade Filter
    if (gradeFilter !== 'ALL') {
      const gLower = b.grade.toLowerCase();
      if (gradeFilter === 'KG') {
        if (!gLower.includes('lkg') && !gLower.includes('ukg') && !gLower.includes('kg')) return false;
      } else if (gradeFilter === 'Grade 1 & 2') {
        if (!gLower.includes('grade 1') && !gLower.includes('grade 2') && !gLower.startsWith('1 ') && !gLower.startsWith('2 ')) return false;
      } else if (gradeFilter === 'Grade 3 to 5') {
        if (!gLower.includes('grade 3') && !gLower.includes('grade 4') && !gLower.includes('grade 5') && 
            !gLower.startsWith('3 ') && !gLower.startsWith('4 ') && !gLower.startsWith('5 ')) return false;
      } else if (gradeFilter === 'Grade 6 to 8') {
        if (!gLower.includes('grade 6') && !gLower.includes('grade 7') && !gLower.includes('grade 8') && 
            !gLower.startsWith('6 ') && !gLower.startsWith('7 ') && !gLower.startsWith('8 ')) return false;
      } else if (gradeFilter === 'Grade 9 to 12') {
        if (!gLower.includes('grade 9') && !gLower.includes('grade 10') && !gLower.includes('grade 11') && !gLower.includes('grade 12') && 
            !gLower.startsWith('9 ') && !gLower.startsWith('10 ') && !gLower.startsWith('11 ') && !gLower.startsWith('12 ')) return false;
      }
    }
    
    return true;
  });

  if (filtered.length === 0) {
    DOM.adminBillingTableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 20px;">No matching billing records found.</td></tr>`;
    return;
  }

  filtered.forEach(b => {
    const tr = document.createElement('tr');
    const createdStr = new Date(b.createdAt).toLocaleDateString() + ' ' + new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const statusBadge = `<span class="badge ${b.status === 'Paid' ? 'badge-success' : 'badge-warning'}">${b.status}</span>`;
    
    tr.innerHTML = `
      <td><strong>${b.id}</strong></td>
      <td>${b.branch}</td>
      <td><strong>${b.studentName}</strong></td>
      <td><span class="badge badge-neutral">${b.grade}</span></td>
      <td>${b.gender}</td>
      <td class="font-bold">₹${b.feeAmount}</td>
      <td><small>${createdStr}</small></td>
      <td>${b.cashier}</td>
      <td>${statusBadge}</td>
      <td>
        <button class="btn btn-danger btn-sm btn-delete-bill" data-id="${b.id}" style="padding: 2px 8px; font-size: 0.7rem;">
          ❌ Cancel
        </button>
      </td>
    `;
    
    tr.querySelector('.btn-delete-bill').addEventListener('click', async () => {
      if (confirm(`Are you sure you want to cancel and delete Bill Invoice ${b.id} for ${b.studentName}?`)) {
        try {
          await db.deleteBill(b.id);
          showToast(`Bill Invoice ${b.id} cancelled.`, 'success');
          refreshData();
        } catch (error) {
          showToast('Failed to delete bill: ' + error.message, 'error');
        }
      }
    });

    DOM.adminBillingTableBody.appendChild(tr);
  });
}

// ----------------------------------------------------
// Admin Uniform Issuance Report & Analytics
// ----------------------------------------------------
function renderUniformReportData(students, transactions) {
  const tableBody = document.getElementById('report-table-body');
  if (!tableBody) return;

  const yearFilter = document.getElementById('report-filter-year') ? document.getElementById('report-filter-year').value : 'ALL';
  const monthFilter = document.getElementById('report-filter-month') ? document.getElementById('report-filter-month').value : 'ALL';
  const dateFilter = document.getElementById('report-filter-date') ? document.getElementById('report-filter-date').value : '';
  const statusFilter = document.getElementById('report-filter-status') ? document.getElementById('report-filter-status').value : 'ALL';

  const recipientList = [];

  students.forEach(s => {
    const sets = s.sets || [];
    const issuedSets = sets.filter(st => st.status === 'Issued');
    if (issuedSets.length === 0) return;

    let matchesDate = false;
    let latestDate = null;

    issuedSets.forEach(st => {
      let stDateStr = st.issueDate;
      if (!stDateStr && transactions) {
        const tx = transactions.find(t => t.studentId === s.id && t.type === 'Issue');
        if (tx) stDateStr = tx.timestamp || tx.createdAt;
      }
      if (!stDateStr) stDateStr = s.createdAt || new Date().toISOString();

      const stDate = new Date(stDateStr);
      if (!latestDate || stDate > latestDate) {
        latestDate = stDate;
      }

      const stYYYY = stDate.getFullYear().toString();
      const stMM = String(stDate.getMonth() + 1).padStart(2, '0');
      const stYYYYMMDD = `${stYYYY}-${stMM}-${String(stDate.getDate()).padStart(2, '0')}`;

      if (dateFilter) {
        if (stYYYYMMDD === dateFilter) matchesDate = true;
      } else {
        const matchY = (yearFilter === 'ALL' || stYYYY === yearFilter);
        const matchM = (monthFilter === 'ALL' || stMM === monthFilter);
        if (matchY && matchM) matchesDate = true;
      }
    });

    if (!matchesDate) return;

    const issuedCount = issuedSets.length;
    const isFull = issuedCount === 3;

    if (statusFilter === 'FULL' && !isFull) return;
    if (statusFilter === 'PARTIAL' && isFull) return;

    recipientList.push({
      student: s,
      issuedCount,
      isFull,
      latestDate: latestDate ? latestDate.toLocaleString() : 'N/A',
      issuedSets
    });
  });

  // Calculate KPIs
  const totalStudents = recipientList.length;
  const fullStudents = recipientList.filter(r => r.isFull).length;
  const partialStudents = totalStudents - fullStudents;
  const totalSets = recipientList.reduce((sum, r) => sum + r.issuedCount, 0);

  if (document.getElementById('report-kpi-students')) document.getElementById('report-kpi-students').textContent = totalStudents;
  if (document.getElementById('report-kpi-full')) document.getElementById('report-kpi-full').textContent = fullStudents;
  if (document.getElementById('report-kpi-partial')) document.getElementById('report-kpi-partial').textContent = partialStudents;
  if (document.getElementById('report-kpi-total-sets')) document.getElementById('report-kpi-total-sets').textContent = totalSets;

  tableBody.innerHTML = '';
  if (recipientList.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--text-muted); padding: 20px;">No uniform recipients found for the selected date criteria.</td></tr>`;
    return;
  }

  recipientList.sort((a, b) => a.student.name.localeCompare(b.student.name));

  recipientList.forEach(r => {
    const s = r.student;
    const tr = document.createElement('tr');

    const getSetBadge = (setNum) => {
      const set = s.sets && s.sets[setNum - 1] ? s.sets[setNum - 1] : null;
      if (!set || set.status !== 'Issued') {
        return `<span class="badge badge-neutral">Not Issued</span>`;
      }
      const sizes = `(T:${set.topSize || '?'}, B:${set.bottomSize || '?'})`;
      return `<span class="badge badge-success">Issued ${sizes}</span>`;
    };

    const statusBadge = r.isFull
      ? `<span class="badge badge-success">✨ Fully Issued (3/3)</span>`
      : `<span class="badge badge-warning">📦 Partially Issued (${r.issuedCount}/3)</span>`;

    tr.innerHTML = `
      <td><strong>${s.admissionNo || '-'}</strong></td>
      <td><strong>${s.name}</strong></td>
      <td>${s.fatherName || '-'}</td>
      <td><span class="badge badge-neutral">${s.grade}</span></td>
      <td>${s.branch}</td>
      <td>${s.gender}</td>
      <td>${getSetBadge(1)}</td>
      <td>${getSetBadge(2)}</td>
      <td>${getSetBadge(3)}</td>
      <td>${statusBadge}</td>
      <td><small>${r.latestDate}</small></td>
    `;

    tableBody.appendChild(tr);
  });
}

function exportUniformReportCSV() {
  const tableBody = document.getElementById('report-table-body');
  if (!tableBody) return;

  const yearFilter = document.getElementById('report-filter-year') ? document.getElementById('report-filter-year').value : 'ALL';
  const monthFilter = document.getElementById('report-filter-month') ? document.getElementById('report-filter-month').value : 'ALL';
  const dateFilter = document.getElementById('report-filter-date') ? document.getElementById('report-filter-date').value : '';

  const rows = [];
  rows.push(['Admission No', 'Student Name', 'Father Name', 'Grade & Section', 'Branch', 'Gender', 'Set 1 Yellow Status', 'Set 2 Red Status', 'Set 3 Sports Status', 'Overall Issuance Status', 'Issued Sets Count', 'Latest Issue Date'].join(','));

  const students = state.activeBranch === 'ALL' ? state.students : state.students.filter(s => s.branch === state.activeBranch);

  students.forEach(s => {
    const sets = s.sets || [];
    const issuedSets = sets.filter(st => st.status === 'Issued');
    if (issuedSets.length === 0) return;

    let matchesDate = false;
    let latestDate = null;

    issuedSets.forEach(st => {
      let stDateStr = st.issueDate || s.createdAt || new Date().toISOString();
      const stDate = new Date(stDateStr);
      if (!latestDate || stDate > latestDate) latestDate = stDate;

      const stYYYY = stDate.getFullYear().toString();
      const stMM = String(stDate.getMonth() + 1).padStart(2, '0');
      const stYYYYMMDD = `${stYYYY}-${stMM}-${String(stDate.getDate()).padStart(2, '0')}`;

      if (dateFilter) {
        if (stYYYYMMDD === dateFilter) matchesDate = true;
      } else {
        const matchY = (yearFilter === 'ALL' || stYYYY === yearFilter);
        const matchM = (monthFilter === 'ALL' || stMM === monthFilter);
        if (matchY && matchM) matchesDate = true;
      }
    });

    if (!matchesDate) return;

    const set1 = sets[0] && sets[0].status === 'Issued' ? `Issued (T:${sets[0].topSize}, B:${sets[0].bottomSize})` : 'Not Issued';
    const set2 = sets[1] && sets[1].status === 'Issued' ? `Issued (T:${sets[1].topSize}, B:${sets[1].bottomSize})` : 'Not Issued';
    const set3 = sets[2] && sets[2].status === 'Issued' ? `Issued (T:${sets[2].topSize}, B:${sets[2].bottomSize})` : 'Not Issued';

    rows.push([
      `"${s.admissionNo || ''}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${(s.fatherName || '').replace(/"/g, '""')}"`,
      `"${s.grade}"`,
      s.branch,
      s.gender,
      `"${set1}"`,
      `"${set2}"`,
      `"${set3}"`,
      issuedSets.length === 3 ? 'Fully Issued' : 'Partially Issued',
      issuedSets.length,
      latestDate ? latestDate.toISOString().slice(0, 10) : ''
    ].join(','));
  });

  if (rows.length <= 1) {
    showToast('No recipient data matching selected filters to export.', 'error');
    return;
  }

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `uniform_recipients_report_${dateFilter || (yearFilter + '_' + monthFilter)}.csv`);
  a.click();
  showToast('Uniform Recipients CSV Report exported successfully.', 'success');
}

function exportBillingCSV() {
  const filtered = state.activeBranch === 'ALL'
    ? state.bills
    : state.bills.filter(b => b.branch === state.activeBranch);

  if (filtered.length === 0) {
    showToast('No billing records to export.', 'error');
    return;
  }

  const csvRows = [];
  csvRows.push(['Bill ID', 'Branch', 'Student Name', 'Grade', 'Gender', 'Fee Amount', 'Created Date', 'Paid Date', 'Cashier', 'Status'].join(','));
  
  filtered.forEach(b => {
    csvRows.push([
      b.id,
      b.branch,
      `"${b.studentName.replace(/"/g, '""')}"`,
      `"${b.grade}"`,
      b.gender,
      b.feeAmount,
      b.createdAt,
      b.paidAt || 'N/A',
      b.cashier,
      b.status
    ].join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `uniform_billing_report_branch_${state.activeBranch}.csv`);
  a.click();
  showToast('Billing CSV report downloaded.', 'success');
}

async function handleChangeCashierPasswordSubmit(e) {
  e.preventDefault();
  const oldPass = document.getElementById('change-cashier-old-password').value;
  const newPass = document.getElementById('change-cashier-new-password').value;
  const confirmPass = document.getElementById('change-cashier-new-password-confirm').value;

  if (newPass !== confirmPass) {
    showToast('New passwords do not match.', 'error');
    return;
  }

  try {
    await db.changeCashierPassword(oldPass, newPass);
    showToast('Cashier Password updated successfully!', 'success');
    document.getElementById('change-cashier-password-form').reset();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderRequestsData(students) {
  DOM.requestsTableBody.innerHTML = '';
  
  const pendingRequests = [];
  students.forEach(stud => {
    stud.sets.forEach(set => {
      if (set.status === 'Pending Size' || set.status === 'Size Pending') {
        if (state.activeBranch === 'ALL' || stud.branch === state.activeBranch) {
          pendingRequests.push({
            student: stud,
            setNumber: set.setNumber,
            uniformType: set.uniformType,
            sportsColor: set.sportsColor || '',
            topSize: set.topSize || '',
            bottomSize: set.bottomSize || '',
            reason: set.reasonIfMissing,
            date: set.issueDate
          });
        }
      }
    });
  });

  if (pendingRequests.length === 0) {
    DOM.requestsTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No pending custom sizing requests.</td></tr>`;
  } else {
    pendingRequests.forEach(req => {
      const tr = document.createElement('tr');
      const uniformLabel = req.setNumber === 1 ? 'Yellow Uniform' : (req.setNumber === 2 ? 'Red Uniform' : (req.sportsColor ? `Sports (${req.sportsColor})` : 'Sports'));
      const sizeDisplay = `Top: ${req.topSize || 'N/A'}, Bottom: ${req.bottomSize || 'N/A'}`;

      tr.innerHTML = `
        <td><strong>${req.student.name}</strong></td>
        <td>${req.student.branch}</td>
        <td>${req.student.gender}</td>
        <td>${uniformLabel}</td>
        <td><span class="badge badge-warning">${sizeDisplay}</span></td>
        <td><div style="font-size: 0.85rem; color: var(--text-secondary); max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${req.reason}</div></td>
        <td>
          <button class="btn btn-primary btn-sm btn-resolve-req" style="margin-right: 4px; padding: 3px 8px; font-size: 0.75rem;">
            🔧 Resolve
          </button>
          <button class="btn btn-danger btn-sm btn-delete-req" style="padding: 3px 8px; font-size: 0.75rem;">
            🗑️ Dismiss
          </button>
        </td>
      `;

      tr.querySelector('.btn-resolve-req').addEventListener('click', () => {
        openResolveSizingModal(req.student, req.setNumber, req.topSize, req.bottomSize, req.reason, req.sportsColor);
      });

      tr.querySelector('.btn-delete-req').addEventListener('click', async () => {
        if (confirm(`Are you sure you want to dismiss and delete the sizing request for ${req.student.name} (Set ${req.setNumber})?`)) {
          try {
            await db.deleteRequest(req.student.id, req.setNumber);
            showToast('Sizing request dismissed successfully.', 'success');
            refreshData();
          } catch (error) {
            showToast('Failed to dismiss request: ' + error.message, 'error');
          }
        }
      });

      DOM.requestsTableBody.appendChild(tr);
    });
  }
}

// Admin resolve sizing modal
function openResolveSizingModal(student, setNumber, topSize, bottomSize, reason, sportsColor) {
  const uniformType = setNumber === 1 ? 'Yellow Uniform' : (setNumber === 2 ? 'Red Uniform' : 'Sports Uniform');
  const activeLabel = sportsColor ? `Sports Uniform (${sportsColor})` : uniformType;

  const modalBody = `
    <div style="font-weight: 500; font-size: 1.05rem; margin-bottom: 16px; color: var(--text-secondary);">
      Resolve Sizing Exception for <span style="color: var(--text-primary);">${student.name}</span>
    </div>
    <div style="font-size: 0.9rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px; background: rgba(255, 255, 255, 0.02); padding: 12px; border-radius: var(--radius-md); border: 1px solid rgba(255, 255, 255, 0.04);">
      <div>Branch: <strong>${student.branch}</strong> | Category: <strong>${student.gender}</strong></div>
      <div>Uniform: <strong>${activeLabel}</strong> (Set ${setNumber})</div>
      <div>Requested Top Size: <strong style="color: var(--warning);">Size ${topSize || 'N/A'}</strong></div>
      <div>Requested Bottom Size: <strong style="color: var(--warning);">Size ${bottomSize || 'N/A'}</strong></div>
      <div>Staff Reason: <em style="color: var(--text-primary);">"${reason}"</em></div>
    </div>
    <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 12px;">
      How would you like to resolve this request?
    </div>
  `;

  openModal('Resolve Sizing Exception', modalBody, [
    { text: 'Cancel', type: 'secondary', handler: closeModal },
    {
      text: 'Add Stock & Issue Now 📥',
      type: 'primary',
      handler: async () => {
        try {
          const operator = 'Admin Resolution';
          if (topSize) {
            await db.addStock(student.branch, student.gender, topSize, 1, operator, activeLabel, 'Top');
          }
          if (bottomSize) {
            await db.addStock(student.branch, student.gender, bottomSize, 1, operator, activeLabel, 'Bottom');
          }
          await db.issueUniformSet(student.id, setNumber, 'Issued', topSize, bottomSize, sportsColor, '', operator);
          
          showToast(`Stock replenished and ${activeLabel} issued to ${student.name}!`, 'success');
          closeModal();
          refreshData();

          // Display receipt slip on successful resolution
          setTimeout(() => {
            showReceiptModal(student, setNumber, 'Issued', topSize, bottomSize, sportsColor, operator);
          }, 350);
        } catch (error) {
          showToast('Resolution failed: ' + error.message, 'error');
        }
      }
    }
  ]);
}

function renderLogsData(transactions) {
  DOM.logsTableBody.innerHTML = '';
  if (transactions.length === 0) {
    DOM.logsTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No transaction logs found.</td></tr>`;
  } else {
    transactions.forEach(t => {
      const tr = document.createElement('tr');
      const timeStr = new Date(t.timestamp).toLocaleString();
      let typeBadge = '';
      let details = '';

      if (t.type === 'Receive') {
        typeBadge = `<span class="badge badge-success">Stock In</span>`;
        details = `Received <strong>+${t.quantity}</strong> items of <strong>${t.uniformType || 'General'}</strong> (${t.uniformPart || 'N/A'}) for branch <strong>${t.branch}</strong> (${t.gender}, Size ${t.size})`;
      } else if (t.type === 'Issue') {
        let badgeClass = t.status === 'Fee Pending' ? 'badge-info' : 'badge-neutral';
        typeBadge = `<span class="badge ${badgeClass}">${t.status || 'Issued Out'}</span>`;
        details = `Issued 1 <strong>${t.uniformType || 'General'}</strong> (Top: ${t.topSize || 'N/A'}, Btm: ${t.bottomSize || 'N/A'}) to student <strong>${t.studentName}</strong> (Set ${t.setNumber})`;
      } else if (t.type === 'Special Request') {
        typeBadge = `<span class="badge badge-warning">Request Log</span>`;
        details = `Exception Logged: Student <strong>${t.studentName}</strong> requested <strong>${t.uniformType || 'General'}</strong> (Top: ${t.topSize || 'N/A'}, Btm: ${t.bottomSize || 'N/A'}). Reason: <em>"${t.notes}"</em>`;
      }

      tr.innerHTML = `
        <td><small style="color: var(--text-secondary);">${timeStr}</small></td>
        <td>${typeBadge}</td>
        <td>${details}</td>
        <td><small>${t.operator || 'System'}</small></td>
      `;
      DOM.logsTableBody.appendChild(tr);
    });
  }
}

// Add received stock modal (admin)
if (document.getElementById('btn-add-stock-modal')) {
  document.getElementById('btn-add-stock-modal').addEventListener('click', () => {
    const branchOptions = CONSTANTS.BRANCHES.map(b => `<option value="${b}">${b}</option>`).join('');
    const sizeOptions = CONSTANTS.SIZES.map(s => `<option value="${s}">Size ${s}</option>`).join('');

    const modalBody = `
      <form id="add-stock-form">
        <div class="form-group">
          <label for="stock-uniform-type">Uniform Type</label>
          <select id="stock-uniform-type" class="input-ctrl">
            <option value="Yellow Uniform">Yellow Uniform</option>
            <option value="Red Uniform">Red Uniform</option>
            <option value="Sports Uniform">Sports Uniform</option>
          </select>
        </div>
        <div class="form-group" id="stock-sports-color-group" style="display: none;">
          <label for="stock-sports-color">Sports Color</label>
          <select id="stock-sports-color" class="input-ctrl">
            <option value="B">Color B</option>
            <option value="E">Color E</option>
            <option value="S">Color S</option>
            <option value="T">Color T</option>
          </select>
        </div>
        <div class="form-group">
          <label for="stock-uniform-part">Component Part</label>
          <select id="stock-uniform-part" class="input-ctrl">
            <option value="Top">Top (Shirt/T-shirt)</option>
            <option value="Bottom">Bottom (Skirt/Trousers)</option>
          </select>
        </div>
        <div class="form-group">
          <label for="stock-branch-select">Branch</label>
          <select id="stock-branch-select" class="input-ctrl">
            ${branchOptions}
          </select>
        </div>
        <div class="form-group">
          <label for="stock-gender-select">Gender Category</label>
          <select id="stock-gender-select" class="input-ctrl">
            <option value="Boys">Boys</option>
            <option value="Girls">Girls</option>
          </select>
        </div>
        <div class="form-group">
          <label for="stock-size-select">Uniform Size</label>
          <select id="stock-size-select" class="input-ctrl">
            ${sizeOptions}
          </select>
        </div>
        <div class="form-group">
          <label for="stock-quantity-input">Quantity Received (+)</label>
          <input type="number" id="stock-quantity-input" class="input-ctrl" min="1" max="1000" placeholder="e.g. 50" required value="50">
        </div>
      </form>
    `;

    openModal('Add Received Uniform Stock', modalBody, [
      { text: 'Cancel', type: 'secondary', handler: closeModal },
      { text: 'Add Stock Logs', type: 'primary', handler: submitAddStock }
    ]);

    // Handle conditional sports color select visibility
    setTimeout(() => {
      const typeSelect = document.getElementById('stock-uniform-type');
      const colorGroup = document.getElementById('stock-sports-color-group');
      if (typeSelect && colorGroup) {
        typeSelect.addEventListener('change', () => {
          if (typeSelect.value === 'Sports Uniform') {
            colorGroup.style.display = 'block';
          } else {
            colorGroup.style.display = 'none';
          }
        });
      }
    }, 100);
  });
}

async function submitAddStock() {
  const type = document.getElementById('stock-uniform-type').value;
  const color = type === 'Sports Uniform' ? document.getElementById('stock-sports-color').value : null;
  const part = document.getElementById('stock-uniform-part').value;
  
  const branch = document.getElementById('stock-branch-select').value;
  const gender = document.getElementById('stock-gender-select').value;
  const size = document.getElementById('stock-size-select').value;
  const qty = parseInt(document.getElementById('stock-quantity-input').value);

  if (isNaN(qty) || qty <= 0) {
    showToast('Please enter a valid quantity', 'error');
    return;
  }

  const uniformTypeLabel = color ? `Sports Uniform (${color})` : type;

  try {
    const operator = state.currentAdmin ? 'Management (' + state.currentAdmin.username + ')' : 'Admin';
    await db.addStock(branch, gender, size, qty, operator, uniformTypeLabel, part);
    showToast(`Added ${qty} items of ${uniformTypeLabel} ${part} for branch ${branch} Size ${size} successfully!`, 'success');
    closeModal();
    refreshData();
  } catch (error) {
    showToast('Failed to add stock: ' + error.message, 'error');
  }
}

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

// PDF Export implementation
function exportStocksToPDF() {
  const filterBranch = state.activeBranch;
  const filtered = filterBranch === 'ALL' 
    ? state.stocks 
    : state.stocks.filter(s => s.branch === filterBranch);

  const sorted = [...filtered].sort((a, b) => {
    if (a.branch !== b.branch) return a.branch.localeCompare(b.branch);
    const utA = a.uniformType || 'General';
    const utB = b.uniformType || 'General';
    if (utA !== utB) return utA.localeCompare(utB);
    const upA = a.uniformPart || 'N/A';
    const upB = b.uniformPart || 'N/A';
    if (upA !== upB) return upA.localeCompare(upB);
    if (a.gender !== b.gender) return a.gender.localeCompare(b.gender);
    return parseInt(a.size) - parseInt(b.size);
  });

  const reportDate = new Date().toLocaleString();
  let rowsHtml = sorted.map(s => {
    const status = s.remaining === 0 ? 'Out of Stock' : (s.remaining < 10 ? 'Low Stock' : 'In Stock');
    const updateTime = s.lastUpdated ? new Date(s.lastUpdated).toLocaleString() : 'N/A';
    return `
      <tr>
        <td>${s.branch}</td>
        <td>${s.uniformType || 'General'}</td>
        <td>${s.uniformPart || 'N/A'}</td>
        <td>${s.gender}</td>
        <td>Size ${s.size}</td>
        <td class="num">${s.received}</td>
        <td class="num">${s.issued}</td>
        <td class="num font-bold">${s.remaining}</td>
        <td><small>${updateTime}</small></td>
        <td>${status}</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>CROSS CUT ENTERPRISES - Uniform Stock Report</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #333;
          padding: 40px;
          line-height: 1.4;
        }
        .header-container {
          border-bottom: 3px solid #6366f1;
          padding-bottom: 20px;
          margin-bottom: 30px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .logo {
          font-size: 24px;
          font-weight: 800;
          color: #6366f1;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .title {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          color: #111;
        }
        .meta-info {
          font-size: 13px;
          color: #666;
          margin-bottom: 20px;
        }
        .meta-info span {
          margin-right: 25px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 14px;
        }
        th {
          background-color: #f3f4f6;
          color: #374151;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #e5e7eb;
          padding: 12px;
          text-align: left;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #f3f4f6;
        }
        .num {
          text-align: right;
        }
        .font-bold {
          font-weight: bold;
        }
        .footer {
          margin-top: 50px;
          border-top: 1px solid #e5e7eb;
          padding-top: 15px;
          font-size: 11px;
          color: #999;
          text-align: center;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header-container">
        <div>
          <div class="logo">CROSS CUT ENTERPRISES</div>
          <h1 class="title">Uniform Stock Inventory Report</h1>
        </div>
        <div style="text-align: right; font-size: 12px; color: #666;">
          Management Control Portal
        </div>
      </div>

      <div class="meta-info">
        <span>Date Generated: <strong>${reportDate}</strong></span>
        <span>Branch Filter: <strong>${filterBranch}</strong></span>
        <span>Database Mode: <strong>${isFirebaseMode ? 'Firebase Cloud' : 'Local Demo'}</strong></span>
      </div>

      <table>
        <thead>
          <tr>
            <th>Branch</th>
            <th>Uniform Type</th>
            <th>Part</th>
            <th>Category (Gender)</th>
            <th>Size</th>
            <th class="num">Received</th>
            <th class="num">Issued</th>
            <th class="num">Remaining</th>
            <th>Last Updated</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="10" style="text-align:center;">No stock data matching criteria.</td></tr>'}
        </tbody>
      </table>

      <div class="footer">
        This document is an official inventory record of CROSS CUT ENTERPRISES school uniform stock management system.
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

// ----------------------------------------------------
// Admin Password Modifications (admin.html)
// ----------------------------------------------------
async function handleChangePasswordSubmit(e) {
  e.preventDefault();
  const oldPass = document.getElementById('change-old-password').value;
  const newPass = document.getElementById('change-new-password').value;
  const confirmNewPass = document.getElementById('change-new-password-confirm').value;

  if (newPass !== confirmNewPass) {
    showToast('New passwords do not match.', 'error');
    return;
  }

  const submitBtn = e.target ? e.target.querySelector('button') : null;
  const originalText = submitBtn ? submitBtn.innerHTML : 'Update Password 🔑';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Updating...';
  }

  try {
    await db.changeAdminPassword(oldPass, newPass);
    showToast('Admin password updated successfully!', 'success');
    document.getElementById('change-old-password').value = '';
    document.getElementById('change-new-password').value = '';
    document.getElementById('change-new-password-confirm').value = '';
  } catch (error) {
    showToast(error.message || 'Password update failed.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }
}

async function handleChangeStaffPasswordSubmit(e) {
  e.preventDefault();
  const oldPass = document.getElementById('change-staff-old-password').value;
  const newPass = document.getElementById('change-staff-new-password').value;
  const confirmNewPass = document.getElementById('change-staff-new-password-confirm').value;

  if (newPass !== confirmNewPass) {
    showToast('New passwords do not match.', 'error');
    return;
  }

  const submitBtn = e.target ? e.target.querySelector('button') : null;
  const originalText = submitBtn ? submitBtn.innerHTML : 'Update Staff Password 🔑';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Updating...';
  }

  try {
    await db.changeStaffPassword(oldPass, newPass);
    showToast('Staff password updated successfully!', 'success');
    document.getElementById('change-staff-old-password').value = '';
    document.getElementById('change-staff-new-password').value = '';
    document.getElementById('change-staff-new-password-confirm').value = '';
  } catch (error) {
    showToast(error.message || 'Staff password update failed.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }
}

// ----------------------------------------------------
// Firebase Configuration Setup Wizard
// ----------------------------------------------------
if (document.getElementById('btn-db-setup')) {
  document.getElementById('btn-db-setup').addEventListener('click', () => {
    const currentConfig = getFirebaseConfig();
    const configString = currentConfig ? JSON.stringify(currentConfig, null, 2) : '';

    const modalBody = `
      <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px;">
        Paste your <strong>Firebase Web App Configuration Object</strong> (JSON format) below to connect this app to a live Firebase Auth & Firestore database:
      </div>
      
      <div class="form-group">
        <label for="fb-config-textarea">Firebase Configuration Config (JSON)</label>
        <textarea id="fb-config-textarea" class="input-ctrl" rows="8" placeholder='{
    "apiKey": "AIzaSy...",
    "authDomain": "your-project.firebaseapp.com",
    "projectId": "your-project",
    "storageBucket": "your-project.appspot.com",
    "messagingSenderId": "...",
    "appId": "1:..."
  }' style="font-family: monospace; font-size: 0.8rem; resize: vertical;">${configString}</textarea>
      </div>

      ${currentConfig ? `
        <div style="margin-top: 12px; padding: 12px; background: rgba(244, 63, 94, 0.05); border: 1px dashed rgba(244, 63, 94, 0.2); border-radius: var(--radius-md); font-size: 0.8rem; color: var(--danger);">
          ⚠️ Saving a new configuration will clear your current local session and reload the page.
        </div>
      ` : ''}
    `;

    const footerButtons = [
      { text: 'Cancel', type: 'secondary', handler: closeModal }
    ];

    if (currentConfig) {
      footerButtons.push({
        text: 'Disconnect Firebase',
        type: 'danger',
        handler: () => {
          if (confirm('Disconnect from Firebase and switch to Demo Mode?')) {
            clearFirebaseConfig();
            showToast('Firebase disconnected. Switching to Demo Mode...', 'info');
            setTimeout(() => window.location.reload(), 1000);
          }
        }
      });
    }

    footerButtons.push({
      text: 'Connect Firebase',
      type: 'primary',
      handler: submitFirebaseConfig
    });

    openModal('Firebase Cloud Database Setup', modalBody, footerButtons);
  });
}

function submitFirebaseConfig() {
  const val = document.getElementById('fb-config-textarea').value.trim();
  if (!val) {
    showToast('Configuration cannot be empty', 'error');
    return;
  }

  try {
    const config = JSON.parse(val);
    if (!config.apiKey || !config.projectId || !config.appId) {
      throw new Error('Config missing vital fields (apiKey, projectId, or appId)');
    }
    saveFirebaseConfig(config);
    showToast('Firebase config saved! Reloading application...', 'success');
    closeModal();
    setTimeout(() => window.location.reload(), 1200);
  } catch (error) {
    showToast('Invalid JSON: ' + error.message, 'error');
  }
}

// ----------------------------------------------------
// Modal System Functions
// ----------------------------------------------------
function openModal(title, bodyHtml, buttons = []) {
  document.getElementById('modal-title').textContent = title;
  DOM.modalOverlay.querySelector('.modal-body').innerHTML = bodyHtml;
  
  const footer = DOM.modalOverlay.querySelector('.modal-footer');
  footer.innerHTML = '';
  
  buttons.forEach(btnConfig => {
    const btn = document.createElement('button');
    btn.className = `btn btn-${btnConfig.type || 'secondary'}`;
    btn.textContent = btnConfig.text;
    btn.addEventListener('click', btnConfig.handler);
    footer.appendChild(btn);
  });
  
  DOM.modalOverlay.classList.add('active');
}

function closeModal() {
  DOM.modalOverlay.classList.remove('active');
}

DOM.modalOverlay.querySelector('.close-btn').addEventListener('click', closeModal);

// ----------------------------------------------------
// CSV Data Exporter Utilities
// ----------------------------------------------------
function exportToCSV(filename, headers, rows) {
  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => row.map(cell => {
      const cellStr = cell === null || cell === undefined ? '' : String(cell);
      return `"${cellStr.replace(/"/g, '""')}"`;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function handleExportStudents() {
  if (!state.students || state.students.length === 0) {
    showToast('No students data to export', 'error');
    return;
  }
  const headers = [
    'Student ID', 'Admission No', 'Student Name', 'Father Name', 'Branch', 'Gender', 'Grade / Class',
    'Set 1 Name', 'Set 1 Status', 'Set 1 Top Size', 'Set 1 Bottom Size',
    'Set 2 Name', 'Set 2 Status', 'Set 2 Top Size', 'Set 2 Bottom Size',
    'Set 3 Name', 'Set 3 Status', 'Set 3 Top Size', 'Set 3 Bottom Size', 'Set 3 Color'
  ];
  const rows = state.students.map(s => {
    const row = [s.id, s.admissionNo || '', s.name, s.fatherName || '', s.branch, s.gender, s.grade];
    for (let i = 0; i < 3; i++) {
      const set = s.sets && s.sets[i] ? s.sets[i] : {};
      row.push(
        set.uniformType || 'N/A',
        set.status || 'Not Issued',
        set.topSize || '',
        set.bottomSize || ''
      );
      if (i === 2) {
        row.push(set.sportsColor || '');
      }
    }
    return row;
  });
  exportToCSV(`students_report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  showToast('Students database exported successfully!', 'success');
}

let pendingImportStudents = [];

function downloadSampleStudentTemplate() {
  const headers = ['Admission No', 'Student Name', 'Father Name', 'Branch', 'Gender', 'Grade / Class'];
  const sampleRows = [
    ['ADM-2026-001', 'Aarav Kumar', 'Rajesh Kumar', 'BBIS', 'Boys', 'Grade 5 - A'],
    ['ADM-2026-002', 'Ananya Sharma', 'Suresh Sharma', 'BBMS', 'Girls', 'Grade 6 - B'],
    ['ADM-2026-003', 'Rohan Verma', 'Mahesh Verma', 'BBIS', 'Boys', 'Grade 7 - A']
  ];
  
  if (window.XLSX) {
    const wsData = [headers, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "Student_Import_Template.xlsx");
  } else {
    exportToCSV("Student_Import_Template.csv", headers, sampleRows);
  }
}

function handleOpenImportStudentsModal() {
  const modal = document.getElementById('modal-import-students');
  if (!modal) return;
  pendingImportStudents = [];
  
  const fileInput = document.getElementById('student-import-file-input');
  if (fileInput) fileInput.value = '';
  
  const previewContainer = document.getElementById('student-import-preview-container');
  if (previewContainer) previewContainer.style.display = 'none';
  
  const btnConfirm = document.getElementById('btn-confirm-import-students');
  if (btnConfirm) btnConfirm.disabled = true;

  modal.classList.add('active');
}

function handleCloseImportStudentsModal() {
  const modal = document.getElementById('modal-import-students');
  if (modal) modal.classList.remove('active');
  pendingImportStudents = [];
}

function handleStudentFileSelected(event) {
  const file = event.target.files ? event.target.files[0] : null;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      if (!window.XLSX) {
        throw new Error('Excel parsing library not loaded. Please refresh the page.');
      }
      const workbook = XLSX.read(data, { type: 'array' });
      
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rawRows || rawRows.length === 0) {
        showToast('The uploaded spreadsheet contains no data rows.', 'error');
        return;
      }

      pendingImportStudents = rawRows.map(row => {
        const getVal = (keys) => {
          for (const k of keys) {
            const matchedKey = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.trim().toLowerCase());
            if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
              return String(row[matchedKey]).trim();
            }
          }
          return '';
        };

        const admissionNo = getVal(['Admission No', 'Admission Number', 'admissionNo', 'admission_no', 'Student ID', 'ID']);
        const name = getVal(['Student Name', 'Name', 'studentName', 'student_name']);
        const fatherName = getVal(['Father Name', "Father's Name", 'fatherName', 'father_name']);
        const branch = getVal(['Branch', 'branch']);
        const gender = getVal(['Gender', 'gender']);
        const grade = getVal(['Grade / Class', 'Grade', 'Class', 'grade', 'class']);

        return { admissionNo, name, fatherName, branch, gender, grade };
      }).filter(s => s.name && s.branch && s.grade);

      if (pendingImportStudents.length === 0) {
        showToast('No valid student records found. Required headers: Student Name, Branch, Grade / Class', 'error');
        return;
      }

      const previewContainer = document.getElementById('student-import-preview-container');
      const fileInfo = document.getElementById('import-file-info');
      const tbody = document.getElementById('student-import-preview-tbody');
      const btnConfirm = document.getElementById('btn-confirm-import-students');

      if (fileInfo) fileInfo.textContent = `File "${file.name}" - ${pendingImportStudents.length} valid student record(s) ready`;
      if (tbody) {
        tbody.innerHTML = pendingImportStudents.slice(0, 10).map(s => `
          <tr>
            <td><strong>${s.admissionNo || '-'}</strong></td>
            <td><strong>${s.name}</strong></td>
            <td>${s.fatherName || '-'}</td>
            <td>${s.branch}</td>
            <td>${s.gender}</td>
            <td>${s.grade}</td>
          </tr>
        `).join('');
        if (pendingImportStudents.length > 10) {
          tbody.innerHTML += `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); font-style: italic;">...and ${pendingImportStudents.length - 10} more rows</td></tr>`;
        }
      }

      if (previewContainer) previewContainer.style.display = 'block';
      if (btnConfirm) btnConfirm.disabled = false;

    } catch (err) {
      showToast('Failed to parse file: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

async function handleConfirmImportStudents() {
  if (!pendingImportStudents || pendingImportStudents.length === 0) {
    showToast('No student data loaded to import.', 'error');
    return;
  }

  const btnConfirm = document.getElementById('btn-confirm-import-students');
  if (btnConfirm) {
    btnConfirm.disabled = true;
    btnConfirm.textContent = '⏳ Processing Update...';
  }

  try {
    const res = await db.bulkImportStudents(pendingImportStudents);
    showToast(res.message || `Successfully processed ${pendingImportStudents.length} students!`, 'success');
    handleCloseImportStudentsModal();
    refreshData();
  } catch (err) {
    showToast('Import failed: ' + err.message, 'error');
  } finally {
    if (btnConfirm) {
      btnConfirm.disabled = false;
      btnConfirm.textContent = '🚀 Process Update & Import';
    }
  }
}

function handleOpenEditStudentModal(student) {
  const modal = document.getElementById('modal-edit-student');
  if (!modal) return;

  document.getElementById('edit-student-id').value = student.id || student._id || '';
  document.getElementById('edit-student-admission').value = student.admissionNo || '';
  document.getElementById('edit-student-name').value = student.name || '';
  document.getElementById('edit-student-father').value = student.fatherName || '';
  document.getElementById('edit-student-branch').value = student.branch || 'BBIS';
  document.getElementById('edit-student-gender').value = student.gender || 'Boys';
  document.getElementById('edit-student-grade').value = student.grade || '';

  modal.classList.add('active');
}

function handleCloseEditStudentModal() {
  const modal = document.getElementById('modal-edit-student');
  if (modal) modal.classList.remove('active');
}

async function handleEditStudentSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('edit-student-id').value;
  const admissionNo = document.getElementById('edit-student-admission').value;
  const name = document.getElementById('edit-student-name').value;
  const fatherName = document.getElementById('edit-student-father').value;
  const branch = document.getElementById('edit-student-branch').value;
  const gender = document.getElementById('edit-student-gender').value;
  const grade = document.getElementById('edit-student-grade').value;

  if (!id || !name) {
    showToast('Student ID and Name are required.', 'error');
    return;
  }

  try {
    await db.updateStudent(id, name, branch, gender, grade, fatherName, admissionNo);
    showToast(`Updated details for ${name}`, 'success');
    handleCloseEditStudentModal();
    refreshData();
  } catch (err) {
    showToast('Failed to update student: ' + err.message, 'error');
  }
}

let pendingStaffImportStudents = [];

function handleStaffFileSelected(event) {
  const file = event.target.files ? event.target.files[0] : null;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      if (!window.XLSX) {
        throw new Error('Excel parsing library not loaded. Please refresh the page.');
      }
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rawRows || rawRows.length === 0) {
        showToast('The uploaded spreadsheet contains no data rows.', 'error');
        return;
      }

      pendingStaffImportStudents = rawRows.map(row => {
        const getVal = (keys) => {
          for (const k of keys) {
            const matchedKey = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.trim().toLowerCase());
            if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== '') {
              return String(row[matchedKey]).trim();
            }
          }
          return '';
        };

        const admissionNo = getVal(['Admission No', 'Admission Number', 'admissionNo', 'admission_no', 'Student ID', 'ID']);
        const name = getVal(['Student Name', 'Name', 'studentName', 'student_name']);
        const fatherName = getVal(['Father Name', "Father's Name", 'fatherName', 'father_name']);
        const branch = getVal(['Branch', 'branch']);
        const gender = getVal(['Gender', 'gender']);
        const grade = getVal(['Grade / Class', 'Grade', 'Class', 'grade', 'class']);

        return { admissionNo, name, fatherName, branch, gender, grade };
      }).filter(s => s.name && s.branch && s.grade);

      if (pendingStaffImportStudents.length === 0) {
        showToast('No valid student records found. Required headers: Student Name, Branch, Grade / Class', 'error');
        return;
      }

      const previewContainer = document.getElementById('staff-import-preview-container');
      const fileInfo = document.getElementById('staff-import-file-info');
      const tbody = document.getElementById('staff-import-preview-tbody');

      if (fileInfo) fileInfo.textContent = `Loaded File "${file.name}" - ${pendingStaffImportStudents.length} valid student record(s)`;
      if (tbody) {
        tbody.innerHTML = pendingStaffImportStudents.slice(0, 10).map(s => `
          <tr>
            <td><strong>${s.admissionNo || '-'}</strong></td>
            <td><strong>${s.name}</strong></td>
            <td>${s.fatherName || '-'}</td>
            <td>${s.branch}</td>
            <td>${s.gender}</td>
            <td>${s.grade}</td>
          </tr>
        `).join('');
        if (pendingStaffImportStudents.length > 10) {
          tbody.innerHTML += `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); font-style: italic;">...and ${pendingStaffImportStudents.length - 10} more rows</td></tr>`;
        }
      }

      if (previewContainer) previewContainer.style.display = 'block';

    } catch (err) {
      showToast('Failed to parse file: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

async function handleStaffConfirmImport() {
  if (!pendingStaffImportStudents || pendingStaffImportStudents.length === 0) {
    showToast('No student data loaded to import.', 'error');
    return;
  }

  const btnConfirm = document.getElementById('btn-staff-confirm-import');
  if (btnConfirm) {
    btnConfirm.disabled = true;
    btnConfirm.textContent = '⏳ Processing Update...';
  }

  try {
    const res = await db.bulkImportStudents(pendingStaffImportStudents);
    showToast(res.message || `Successfully processed ${pendingStaffImportStudents.length} students!`, 'success');
    
    pendingStaffImportStudents = [];
    const previewContainer = document.getElementById('staff-import-preview-container');
    if (previewContainer) previewContainer.style.display = 'none';
    const fileInput = document.getElementById('staff-student-import-file');
    if (fileInput) fileInput.value = '';

    refreshData();
  } catch (err) {
    showToast('Import failed: ' + err.message, 'error');
  } finally {
    if (btnConfirm) {
      btnConfirm.disabled = false;
      btnConfirm.textContent = '🚀 Process Update & Import Data';
    }
  }
}

function handleExportTransactions() {
  if (!state.transactions || state.transactions.length === 0) {
    showToast('No transaction logs to export', 'error');
    return;
  }
  const headers = ['Date / Time', 'Type', 'Branch', 'Gender', 'Details', 'Operator'];
  const rows = state.transactions.map(t => {
    let details = '';
    if (t.type === 'Receive') {
      details = `Received ${t.quantity} sets of ${t.uniformType} (${t.uniformPart || 'N/A'}) - Size ${t.size}`;
    } else if (t.type === 'Issue') {
      details = `Issued Set ${t.setNumber} (${t.uniformType}): Top Size ${t.topSize || '?'}, Bottom Size ${t.bottomSize || '?'}${t.status ? ` - [${t.status}]` : ''} for ${t.studentName || 'Student'}`;
    } else if (t.type === 'Special Request' || t.type === 'Sizing Request') {
      details = `Sizing Request: Set ${t.setNumber} (${t.uniformType}): Top Size ${t.topSize || '?'}, Bottom Size ${t.bottomSize || '?'}. Note: ${t.notes || 'None'}`;
    } else {
      details = t.notes || 'N/A';
    }
    const dateStr = t.timestamp ? new Date(t.timestamp).toLocaleString() : 'N/A';
    return [
      dateStr,
      t.type || 'Transaction',
      t.branch || 'ALL',
      t.gender || 'N/A',
      details,
      t.operator || 'System'
    ];
  });
  exportToCSV(`transaction_logs_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  showToast('Transaction logs exported successfully!', 'success');
}

function showReceiptModal(student, setNumber, status, topSize, bottomSize, sportsColor, operator) {
  const uniformType = setNumber === 3 ? 'Sports Uniform' : (setNumber === 1 ? 'Yellow Uniform' : 'Red Uniform');
  const details = setNumber === 3 ? `${uniformType} (Color: ${sportsColor})` : uniformType;
  const dateStr = new Date().toLocaleString();
  const receiptId = `REC-${Math.floor(100000 + Math.random() * 900000)}`;

  const printContent = `
    <div id="receipt-print-area" style="font-family: 'Inter', sans-serif; color: #000; padding: 20px; background: #fff; border-radius: 8px; border: 1px solid #ddd; max-width: 400px; margin: 0 auto; line-height: 1.4; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 12px; margin-bottom: 12px;">
        <h2 style="margin: 0; font-family: 'Outfit', sans-serif; font-size: 1.4rem; font-weight: 700;">CROSS CUT ENTERPRISES</h2>
        <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: #555;">School Uniform Allocation Slip</p>
      </div>
      
      <div style="font-size: 0.9rem; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: #666;">Receipt ID:</span>
          <strong>${receiptId}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: #666;">Date & Time:</span>
          <span>${dateStr}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <span style="color: #666;">Operator:</span>
          <span>${operator}</span>
        </div>
      </div>

      <div style="border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 10px 0; margin-bottom: 16px; font-size: 0.95rem;">
        <div style="margin-bottom: 8px;"><strong>Student Details:</strong></div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #666;">Name:</span>
          <strong>${student.name}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #666;">Branch:</span>
          <span>${student.branch}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #666;">Class:</span>
          <span>${student.grade}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #666;">Gender:</span>
          <span>${student.gender}</span>
        </div>
      </div>

      <div style="border-bottom: 2px dashed #000; padding-bottom: 12px; margin-bottom: 16px; font-size: 0.95rem;">
        <div style="margin-bottom: 8px;"><strong>Issued Item:</strong></div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span>${details}</span>
          <span style="font-weight: 600; color: ${status === 'Issued' ? '#10b981' : '#f59e0b'};">${status}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.9rem; color: #555;">
          <span>Sizes: Top ${topSize || 'N/A'} / Bottom ${bottomSize || 'N/A'}</span>
          <span>Qty: 1 Set</span>
        </div>
      </div>

      <div style="text-align: center; font-size: 0.8rem; color: #666; margin-top: 8px;">
        <p style="margin: 0;">Thank you! Please retain this slip for verification.</p>
      </div>
    </div>
  `;

  openModal('Uniform Receipt Slip', `
    <div style="margin-bottom: 16px; text-align: center; font-size: 0.9rem; color: var(--text-secondary);">
      Uniform status has been updated. You can print the receipt below.
    </div>
    ${printContent}
  `, [
    { text: 'Close', type: 'secondary', handler: closeModal },
    { text: '🖨️ Print Slip', type: 'primary', handler: () => {
        const renderSlip = () => `
          <div style="font-family: 'Inter', sans-serif; color: #000; padding: 14px 18px; background: #fff; border-radius: 6px; border: 1px dashed #cbd5e1; max-width: 550px; margin: 0 auto; line-height: 1.35; position: relative;">
            <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 10px;">
              <h2 style="margin: 0; font-family: 'Outfit', sans-serif; font-size: 1.2rem; font-weight: 700;">CROSS CUT ENTERPRISES</h2>
              <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: #555;">School Uniform Allocation Slip</p>
            </div>
            
            <div style="font-size: 0.85rem; margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #666;">Receipt ID:</span>
                <strong style="font-size: 0.95rem; color: #1e1b4b;">${receiptId}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #666;">Date & Time:</span>
                <span>${dateStr}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #666;">Operator:</span>
                <span>${operator}</span>
              </div>
            </div>

            <div style="border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 8px 0; margin-bottom: 10px; font-size: 0.85rem;">
              <div style="margin-bottom: 4px;"><strong>Student Details:</strong></div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="color: #666;">Name:</span>
                <strong>${student.name}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="color: #666;">Branch:</span>
                <span>${student.branch}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="color: #666;">Class:</span>
                <span>${student.grade}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="color: #666;">Gender:</span>
                <span>${student.gender}</span>
              </div>
            </div>

            <div style="border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 10px; font-size: 0.85rem;">
              <div style="margin-bottom: 4px;"><strong>Issued Item:</strong></div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span>${details}</span>
                <span style="font-weight: 600; color: ${status === 'Issued' ? '#10b981' : '#f59e0b'};">${status}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 0.8rem; color: #555;">
                <span>Sizes: Top ${topSize || 'N/A'} / Bottom ${bottomSize || 'N/A'}</span>
                <span>Qty: 1 Set</span>
              </div>
            </div>

            <div style="text-align: center; font-size: 0.75rem; color: #666;">
              <p style="margin: 0;">Thank you! Please retain this slip for verification.</p>
            </div>
          </div>
        `;

        const htmlSlip = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Print Uniform Receipt - ${student.name}</title>
              <style>
                @page { size: A4 portrait; margin: 8mm; }
                * { box-sizing: border-box; }
                body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #fff; }
                .wrapper { display: flex; flex-direction: column; gap: 12px; }
                .cut-divider { text-align: center; border-top: 2px dashed #94a3b8; margin: 12px 0; position: relative; height: 1px; }
                .cut-label { position: absolute; top: -9px; left: 50%; transform: translateX(-50%); background: #fff; padding: 0 10px; font-size: 9.5px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
                @media print { body { padding: 0; } }
              </style>
            </head>
            <body>
              <div class="wrapper">
                ${renderSlip()}
                <div class="cut-divider">
                  <span class="cut-label">✂ Cut Here ✂</span>
                </div>
                ${renderSlip()}
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
        safeTriggerPrint(htmlSlip);
      }
    }
  ]);
}

// ----------------------------------------------------
// Initial Bootstrapping
// ----------------------------------------------------
async function initMainApp() {
  // Bind form submissions depending on active page
  if (isAdminPage) {
    const adminLoginForm = document.getElementById('admin-login-form');
    if (adminLoginForm) adminLoginForm.addEventListener('submit', handleAdminLoginSubmit);
    
    const changePassForm = document.getElementById('change-password-form');
    if (changePassForm) changePassForm.addEventListener('submit', handleChangePasswordSubmit);
    
    const btnExportPdf = document.getElementById('btn-export-pdf');
    if (btnExportPdf) {
      btnExportPdf.addEventListener('click', exportStocksToPDF);
    }

    // CSV Exporters
    const btnHeaderExportLogs = document.getElementById('btn-header-export-logs-csv');
    if (btnHeaderExportLogs) btnHeaderExportLogs.addEventListener('click', handleExportTransactions);

    const btnExportStudents = document.getElementById('btn-export-students-csv');
    if (btnExportStudents) btnExportStudents.addEventListener('click', handleExportStudents);

    // Student Import / Update Buttons
    const btnOpenImportStudents = document.getElementById('btn-open-import-students');
    if (btnOpenImportStudents) btnOpenImportStudents.addEventListener('click', handleOpenImportStudentsModal);

    const btnCloseImportStudents = document.getElementById('close-modal-import-students');
    if (btnCloseImportStudents) btnCloseImportStudents.addEventListener('click', handleCloseImportStudentsModal);

    const btnCancelImportStudents = document.getElementById('btn-cancel-import-students');
    if (btnCancelImportStudents) btnCancelImportStudents.addEventListener('click', handleCloseImportStudentsModal);

    const btnDownloadTemplate = document.getElementById('btn-download-student-template');
    if (btnDownloadTemplate) btnDownloadTemplate.addEventListener('click', downloadSampleStudentTemplate);

    const btnDownloadTemplateModal = document.getElementById('btn-download-student-template-modal');
    if (btnDownloadTemplateModal) btnDownloadTemplateModal.addEventListener('click', downloadSampleStudentTemplate);

    const btnBrowseFile = document.getElementById('btn-browse-student-file');
    const fileInput = document.getElementById('student-import-file-input');
    if (btnBrowseFile && fileInput) {
      btnBrowseFile.addEventListener('click', () => fileInput.click());
    }
    if (fileInput) {
      fileInput.addEventListener('change', handleStudentFileSelected);
    }

    const dropzone = document.getElementById('student-dropzone');
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', (e) => {
        if (e.target !== btnBrowseFile) fileInput.click();
      });
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--primary)';
        dropzone.style.background = '#eff6ff';
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = '#cbd5e1';
        dropzone.style.background = '#f8fafc';
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#cbd5e1';
        dropzone.style.background = '#f8fafc';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          fileInput.files = e.dataTransfer.files;
          handleStudentFileSelected({ target: fileInput });
        }
      });
    }

    const btnConfirmImport = document.getElementById('btn-confirm-import-students');
    if (btnConfirmImport) btnConfirmImport.addEventListener('click', handleConfirmImportStudents);

    // Single Edit Student Modal
    const btnCloseEditStudent = document.getElementById('close-modal-edit-student');
    if (btnCloseEditStudent) btnCloseEditStudent.addEventListener('click', handleCloseEditStudentModal);

    const btnCancelEditStudent = document.getElementById('btn-cancel-edit-student');
    if (btnCancelEditStudent) btnCancelEditStudent.addEventListener('click', handleCloseEditStudentModal);

    const editStudentForm = document.getElementById('edit-student-form');
    if (editStudentForm) editStudentForm.addEventListener('submit', handleEditStudentSubmit);

    // Staff Portal Student Import Event Handlers
    const btnStaffTemplate = document.getElementById('btn-staff-download-template');
    if (btnStaffTemplate) btnStaffTemplate.addEventListener('click', downloadSampleStudentTemplate);

    const staffFileInput = document.getElementById('staff-student-import-file');
    const btnStaffBrowse = document.getElementById('btn-staff-browse-file');
    if (btnStaffBrowse && staffFileInput) {
      btnStaffBrowse.addEventListener('click', () => staffFileInput.click());
    }
    if (staffFileInput) {
      staffFileInput.addEventListener('change', handleStaffFileSelected);
    }

    const staffDropzone = document.getElementById('staff-student-dropzone');
    if (staffDropzone && staffFileInput) {
      staffDropzone.addEventListener('click', (e) => {
        if (e.target !== btnStaffBrowse) staffFileInput.click();
      });
      staffDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        staffDropzone.style.borderColor = 'var(--primary)';
        staffDropzone.style.background = '#eff6ff';
      });
      staffDropzone.addEventListener('dragleave', () => {
        staffDropzone.style.borderColor = '#cbd5e1';
        staffDropzone.style.background = '#f8fafc';
      });
      staffDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        staffDropzone.style.borderColor = '#cbd5e1';
        staffDropzone.style.background = '#f8fafc';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          staffFileInput.files = e.dataTransfer.files;
          handleStaffFileSelected({ target: staffFileInput });
        }
      });
    }

    const btnStaffClear = document.getElementById('btn-staff-clear-file');
    if (btnStaffClear) {
      btnStaffClear.addEventListener('click', () => {
        pendingStaffImportStudents = [];
        const previewContainer = document.getElementById('staff-import-preview-container');
        if (previewContainer) previewContainer.style.display = 'none';
        if (staffFileInput) staffFileInput.value = '';
        showToast('File cleared.', 'info');
      });
    }

    const btnStaffConfirm = document.getElementById('btn-staff-confirm-import');
    if (btnStaffConfirm) btnStaffConfirm.addEventListener('click', handleStaffConfirmImport);

    const btnExportLogs = document.getElementById('btn-export-transactions-csv');
    if (btnExportLogs) btnExportLogs.addEventListener('click', handleExportTransactions);

    const btnExportReport = document.getElementById('btn-export-report-csv');
    if (btnExportReport) btnExportReport.addEventListener('click', exportUniformReportCSV);

    // Uniform Report Filter Controls
    ['report-filter-year', 'report-filter-month', 'report-filter-date', 'report-filter-status'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => refreshData());
    });

    const btnClearReportDate = document.getElementById('btn-clear-report-date');
    if (btnClearReportDate) {
      btnClearReportDate.addEventListener('click', () => {
        const dateEl = document.getElementById('report-filter-date');
        if (dateEl) {
          dateEl.value = '';
          refreshData();
        }
      });
    }

    // Student Directory Search
    const adminStudentSearch = document.getElementById('admin-student-search-input');
    if (adminStudentSearch) {
      adminStudentSearch.addEventListener('input', () => {
        refreshData();
      });
    }

    // Change Cashier Password Form
    const changeCashierPassForm = document.getElementById('change-cashier-password-form');
    if (changeCashierPassForm) {
      changeCashierPassForm.addEventListener('submit', handleChangeCashierPasswordSubmit);
    }

    // Change Staff Password Form
    const changeStaffPassForm = document.getElementById('change-staff-password-form');
    if (changeStaffPassForm) {
      changeStaffPassForm.addEventListener('submit', handleChangeStaffPasswordSubmit);
    }

    // Reset Password Buttons (Admin, Cashier, Staff)
    const masterPassInput = document.getElementById('reset-master-password');
    const btnResetAdmin = document.getElementById('btn-reset-admin-pass');
    const btnResetCashier = document.getElementById('btn-reset-cashier-pass');
    const btnResetStaff = document.getElementById('btn-reset-staff-pass');

    if (btnResetAdmin) {
      btnResetAdmin.addEventListener('click', async () => {
        const masterPass = masterPassInput ? masterPassInput.value : '';
        if (!masterPass) { showToast('Master Password is required to reset Admin password.', 'error'); return; }
        try {
          await db.resetPassword('admin', masterPass);
          showToast('Admin password reset to default (admin123).', 'success');
          if (masterPassInput) masterPassInput.value = '';
        } catch (err) {
          showToast(err.message || 'Reset failed.', 'error');
        }
      });
    }

    if (btnResetCashier) {
      btnResetCashier.addEventListener('click', async () => {
        const masterPass = masterPassInput ? masterPassInput.value : '';
        if (!masterPass) { showToast('Master Password is required to reset Cashier password.', 'error'); return; }
        try {
          await db.resetPassword('cashier', masterPass);
          showToast('Cashier password reset to default (cashier123).', 'success');
          if (masterPassInput) masterPassInput.value = '';
        } catch (err) {
          showToast(err.message || 'Reset failed.', 'error');
        }
      });
    }

    if (btnResetStaff) {
      btnResetStaff.addEventListener('click', async () => {
        const masterPass = masterPassInput ? masterPassInput.value : '';
        if (!masterPass) { showToast('Master Password is required to reset Staff password.', 'error'); return; }
        try {
          await db.resetPassword('staff', masterPass);
          showToast('Staff password reset to default (staff123).', 'success');
          if (masterPassInput) masterPassInput.value = '';
        } catch (err) {
          showToast(err.message || 'Reset failed.', 'error');
        }
      });
    }
    
    // Billing ledger filters
    const adminBillingSearch = document.getElementById('admin-billing-search-input');
    if (adminBillingSearch) adminBillingSearch.addEventListener('input', refreshData);
    
    const adminBillingGrade = document.getElementById('admin-billing-grade-filter');
    if (adminBillingGrade) adminBillingGrade.addEventListener('change', refreshData);
    
    const adminBillingStatus = document.getElementById('admin-billing-status-filter');
    if (adminBillingStatus) adminBillingStatus.addEventListener('change', refreshData);
    
    // Export billing CSV
    const btnAdminExportBillingCsv = document.getElementById('btn-admin-export-billing-csv');
    if (btnAdminExportBillingCsv) btnAdminExportBillingCsv.addEventListener('click', exportBillingCSV);

    const btnExportBillingArchiveCsv = document.getElementById('btn-export-billing-archive-csv');
    if (btnExportBillingArchiveCsv) btnExportBillingArchiveCsv.addEventListener('click', exportBillingCSV);

    // Bulk Delete Handlers (Admin)
    const btnDeleteAllStock = document.getElementById('btn-delete-all-stock');
    if (btnDeleteAllStock) {
      btnDeleteAllStock.addEventListener('click', async () => {
        if (confirm('⚠️ Are you sure you want to delete ALL stock inventory records? This action cannot be undone.')) {
          try {
            await db.deleteAllStocks();
            showToast('All stock records deleted.', 'success');
            refreshData();
          } catch (err) {
            showToast('Failed to delete all stocks: ' + err.message, 'error');
          }
        }
      });
    }

    const btnDeleteAllRequests = document.getElementById('btn-delete-all-requests');
    if (btnDeleteAllRequests) {
      btnDeleteAllRequests.addEventListener('click', async () => {
        if (confirm('⚠️ Are you sure you want to clear ALL pending sizing requests?')) {
          try {
            await db.deleteAllRequests();
            showToast('All sizing requests cleared.', 'success');
            refreshData();
          } catch (err) {
            showToast('Failed to clear requests: ' + err.message, 'error');
          }
        }
      });
    }

    const btnDeleteAllStudents = document.getElementById('btn-delete-all-students');
    if (btnDeleteAllStudents) {
      btnDeleteAllStudents.addEventListener('click', async () => {
        if (confirm('⚠️ PERMANENT DELETE: Are you sure you want to delete ALL registered students?')) {
          try {
            await db.deleteAllStudents();
            showToast('All students deleted.', 'success');
            refreshData();
          } catch (err) {
            showToast('Failed to delete all students: ' + err.message, 'error');
          }
        }
      });
    }

    const btnDeleteAllBills = document.getElementById('btn-delete-all-bills');
    if (btnDeleteAllBills) {
      btnDeleteAllBills.addEventListener('click', async () => {
        if (confirm('⚠️ PERMANENT DELETE: Are you sure you want to delete ALL billing invoices?')) {
          try {
            await db.deleteAllBills();
            showToast('All billing invoices deleted.', 'success');
            refreshData();
          } catch (err) {
            showToast('Failed to delete all bills: ' + err.message, 'error');
          }
        }
      });
    }
  } else {
    const staffLoginForm = document.getElementById('staff-login-form');
    if (staffLoginForm) staffLoginForm.addEventListener('submit', handleStaffLoginSubmit);
    
    if (DOM.issuerSearchInput) {
      DOM.issuerSearchInput.addEventListener('input', () => {
        refreshData();
      });
    }

    const btnStaffDeleteAllStudents = document.getElementById('btn-staff-delete-all-students');
    if (btnStaffDeleteAllStudents) {
      btnStaffDeleteAllStudents.addEventListener('click', async () => {
        if (confirm('⚠️ PERMANENT DELETE: Are you sure you want to delete ALL registered students?')) {
          try {
            await db.deleteAllStudents();
            showToast('All students deleted.', 'success');
            refreshData();
          } catch (err) {
            showToast('Failed to delete all students: ' + err.message, 'error');
          }
        }
      });
    }
  }

  // Setup navigation
  initNavigation();
  
  // Reset Password buttons (Portal Settings)
  ['admin', 'cashier', 'staff'].forEach(role => {
    const btn = document.getElementById(`btn-reset-${role}-pass`);
    if (btn) {
      btn.addEventListener('click', async () => {
        const masterPassEl = document.getElementById('reset-master-password');
        const masterPassword = masterPassEl ? masterPassEl.value : '';
        if (!masterPassword) {
          showToast('Please enter the master password first.', 'error');
          return;
        }
        const defaultPass = role === 'admin' ? 'admin123' : role === 'cashier' ? 'cashier123' : 'staff123';
        if (!confirm(`Reset ${role} password back to "${defaultPass}"? This cannot be undone.`)) return;
        btn.disabled = true;
        btn.textContent = 'Resetting...';
        try {
          await db.resetPassword(role, masterPassword);
          showToast(`✅ ${role.charAt(0).toUpperCase() + role.slice(1)} password reset to "${defaultPass}" successfully!`, 'success');
          if (masterPassEl) masterPassEl.value = '';
        } catch (err) {
          showToast(err.message || `Failed to reset ${role} password.`, 'error');
        } finally {
          btn.disabled = false;
          btn.innerHTML = `🔄 Reset ${role.charAt(0).toUpperCase() + role.slice(1)} → ${defaultPass}`;
        }
      });
    }
  });

  // Authenticate user
  await checkAuth();
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initMainApp);
} else {
  initMainApp();
}
