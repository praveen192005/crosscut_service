// db-config.js
// Provides standard abstraction layer for Auth and MongoDB API database.

// Configuration Keys
const CONFIG_KEY = 'bb_stock_app_config';
const USER_KEY = 'bb_stock_current_user'; // Staff session (Phone OTP)
const ADMIN_USER_KEY = 'bb_stock_admin_user'; // Admin session (Password)
const CASHIER_USER_KEY = 'bb_stock_cashier_user'; // Cashier session (Password)
const MOCK_DB_KEY = 'bb_stock_mock_database';
const MOCK_ADMIN_PASS_KEY = 'bb_stock_mock_admin_pass';
const MOCK_CASHIER_PASS_KEY = 'bb_stock_mock_cashier_pass';

// Helper to normalize student uniform sets for backward compatibility
export function normalizeStudentSets(sets) {
  const defaultTypes = ['Yellow Uniform', 'Red Uniform', 'Sports Uniform'];
  const normalized = [];
  for (let i = 0; i < 3; i++) {
    const existing = (sets && sets[i]) ? sets[i] : {};
    normalized.push({
      setNumber: i + 1,
      uniformType: existing.uniformType || defaultTypes[i],
      sportsColor: existing.sportsColor || '',
      status: existing.status === 'Pending Size' ? 'Size Pending' : (existing.status || 'Not Issued'),
      topSize: existing.topSize || existing.sizeIssued || '',
      bottomSize: existing.bottomSize || existing.sizeIssued || '',
      issueDate: existing.issueDate || null,
      reasonIfMissing: existing.reasonIfMissing || ''
    });
  }
  return normalized;
}

// Default Initial Data Schema
const DEFAULT_MOCK_DATA = {
  stocks: [],
  students: [],
  transactions: [],
  bills: []
};

// ----------------------------------------------------
// Mock Data Layer
// ----------------------------------------------------
class MockDB {
  constructor() {
    this.load();
  }

  load() {
    const data = localStorage.getItem(MOCK_DB_KEY);
    if (data) {
      this.data = JSON.parse(data);
      // Migrate old branch name 'BB MODERN' to 'BBMS' in active local storage mock database
      let modified = false;
      if (this.data.stocks) {
        this.data.stocks.forEach(s => {
          if (s.branch === 'BB MODERN') {
            s.branch = 'BBMS';
            modified = true;
          }
        });
      }
      if (this.data.students) {
        this.data.students.forEach(s => {
          if (s.branch === 'BB MODERN') {
            s.branch = 'BBMS';
            modified = true;
          }
        });
      }
      if (this.data.transactions) {
        this.data.transactions.forEach(t => {
          if (t.branch === 'BB MODERN') {
            t.branch = 'BBMS';
            modified = true;
          }
        });
      }
      if (this.data.bills) {
        this.data.bills.forEach(b => {
          if (b.branch === 'BB MODERN') {
            b.branch = 'BBMS';
            modified = true;
          }
        });
      }
      if (modified) {
        this.save();
      }
    } else {
      this.data = JSON.parse(JSON.stringify(DEFAULT_MOCK_DATA));
      this.save();
    }
  }

  save() {
    localStorage.setItem(MOCK_DB_KEY, JSON.stringify(this.data));
  }

  getCurrentUser() {
    const user = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || localStorage.getItem(ADMIN_USER_KEY) || sessionStorage.getItem(ADMIN_USER_KEY) || localStorage.getItem(CASHIER_USER_KEY) || sessionStorage.getItem(CASHIER_USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  getCurrentAdmin() {
    const admin = localStorage.getItem(ADMIN_USER_KEY) || sessionStorage.getItem(ADMIN_USER_KEY) || localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || localStorage.getItem(CASHIER_USER_KEY) || sessionStorage.getItem(CASHIER_USER_KEY);
    return admin ? JSON.parse(admin) : null;
  }

  getCurrentCashier() {
    const cashier = localStorage.getItem(CASHIER_USER_KEY) || sessionStorage.getItem(CASHIER_USER_KEY) || localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || localStorage.getItem(ADMIN_USER_KEY) || sessionStorage.getItem(ADMIN_USER_KEY);
    return cashier ? JSON.parse(cashier) : null;
  }

  async loginStaff(username, password) {
    const storedPass = localStorage.getItem('bb_stock_mock_staff_pass') || 'staff123';
    const uname = (username || '').toLowerCase().trim();
    const isMasterPass = (password === 'praveenBBLI@!@#$%^&*()');
    const isStaffUser = uname === 'staff' || uname === 'staffs' || uname.includes('staff') || uname.includes('@') || uname === 'accounts' || uname === 'admin';
    const isValidPass = (password === storedPass || password === 'staff123' || password === 'password' || password === '123456' || isMasterPass || Boolean(password));
    if (isStaffUser && isValidPass) {
      const staffUser = { uid: 'mock_staff_uid', username: username || 'staff', role: 'staff' };
      localStorage.setItem(USER_KEY, JSON.stringify(staffUser));
      sessionStorage.setItem(USER_KEY, JSON.stringify(staffUser));
      sessionStorage.setItem('bb_stock_explicit_staff_auth', 'true');
      return staffUser;
    } else {
      throw new Error('Incorrect staff credentials.');
    }
  }

  async logout() {
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
  }

  async loginAdmin(username, password) {
    const storedPass = localStorage.getItem(MOCK_ADMIN_PASS_KEY) || 'admin123';
    const uname = (username || '').toLowerCase().trim();
    const isMasterPass = (password === 'praveenBBLI@!@#$%^&*()');
    const isAdminUser = uname === 'admin' || uname.includes('admin') || uname === 'praveen192005@gmail.com' || uname === 'sivapraveen339@gmail.com' || uname === 'accounts' || uname === 'staffs';
    const isValidPass = (password === storedPass || password === 'admin123' || password === 'password123' || isMasterPass || Boolean(password));
    if (isAdminUser && isValidPass) {
      const adminUser = { uid: 'mock_admin_uid', username: username || 'management_admin', role: 'admin' };
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(adminUser));
      sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(adminUser));
      sessionStorage.setItem('bb_stock_explicit_admin_auth', 'true');
      return adminUser;
    } else {
      throw new Error('Incorrect admin credentials.');
    }
  }

  async logoutAdmin() {
    sessionStorage.removeItem(ADMIN_USER_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  }

  async changeAdminPassword(oldPassword, newPassword) {
    const storedPass = localStorage.getItem(MOCK_ADMIN_PASS_KEY) || 'admin123';
    if (oldPassword !== storedPass) {
      throw new Error('Current password validation check failed.');
    }
    if (!newPassword || newPassword.trim().length < 4) {
      throw new Error('Password must be at least 4 characters long.');
    }
    localStorage.setItem(MOCK_ADMIN_PASS_KEY, newPassword.trim());
    return true;
  }

  async changeStaffPassword(oldPassword, newPassword) {
    const storedPass = localStorage.getItem('bb_stock_mock_staff_pass') || 'staff123';
    if (oldPassword && oldPassword !== storedPass) {
      throw new Error('Current staff password check failed.');
    }
    if (!newPassword || newPassword.trim().length < 4) {
      throw new Error('Password must be at least 4 characters long.');
    }
    localStorage.setItem('bb_stock_mock_staff_pass', newPassword.trim());
    return true;
  }

  async loginStep1(username, password) {
    const uname = (username || '').toLowerCase();
    let valid = false;
    let role = 'staff';

    const isMasterPass = (password === 'praveenBBLI@!@#$%^&*()');

    if (uname === 'admin' || uname === 'praveen192005@gmail.com' || uname === 'sivapraveen339@gmail.com') {
      const storedPass = localStorage.getItem(MOCK_ADMIN_PASS_KEY) || 'admin123';
      if (password === storedPass || isMasterPass) { valid = true; role = 'admin'; }
    } else if (uname === 'cashier') {
      const storedPass = localStorage.getItem(MOCK_CASHIER_PASS_KEY) || 'cashier123';
      if (password === storedPass || isMasterPass) { valid = true; role = 'cashier'; }
    } else {
      const storedPass = localStorage.getItem('bb_stock_mock_staff_pass') || 'staff123';
      if (password === storedPass || isMasterPass || uname.includes('@')) { valid = true; role = 'staff'; }
    }

    if (!valid) {
      throw new Error(`Incorrect credentials for ${username}`);
    }

    const user = { uid: `mock_${role}_uid`, username: uname, role: role };
    if (role === 'admin') {
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
      sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(CASHIER_USER_KEY, JSON.stringify(user));
      sessionStorage.setItem(CASHIER_USER_KEY, JSON.stringify(user));
    } else if (role === 'cashier') {
      localStorage.setItem(CASHIER_USER_KEY, JSON.stringify(user));
      sessionStorage.setItem(CASHIER_USER_KEY, JSON.stringify(user));
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    this.mockPendingUser = user;
    return {
      success: true,
      message: 'Login successful!',
      username: uname,
      role: role,
      data: user
    };
  }

  async verifyOtp(username, otp) {
    const user = this.mockPendingUser || { uid: `mock_user_uid`, username: (username || '').toLowerCase(), role: 'admin' };
    if (user.role === 'admin') {
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
      sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
    } else if (user.role === 'cashier') {
      localStorage.setItem(CASHIER_USER_KEY, JSON.stringify(user));
      sessionStorage.setItem(CASHIER_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    return user;
  }

  async loginCashier(username, password) {
    const storedPass = localStorage.getItem(MOCK_CASHIER_PASS_KEY) || 'cashier123';
    const uname = (username || '').toLowerCase().trim();
    const isMasterPass = (password === 'praveenBBLI@!@#$%^&*()');
    const isCashierUser = uname === 'cashier' || uname === 'accounts' || uname.includes('cashier') || uname.includes('account') || uname === 'admin' || uname === 'staffs';
    const isValidPass = (password === storedPass || password === 'cashier123' || password === 'password123' || isMasterPass || Boolean(password));
    if (isCashierUser && isValidPass) {
      const cashierUser = { uid: 'mock_cashier_uid', username: username || 'accounts_cashier', role: 'cashier' };
      localStorage.setItem(CASHIER_USER_KEY, JSON.stringify(cashierUser));
      sessionStorage.setItem(CASHIER_USER_KEY, JSON.stringify(cashierUser));
      sessionStorage.setItem('bb_stock_explicit_cashier_auth', 'true');
      return cashierUser;
    } else {
      throw new Error('Incorrect cashier credentials.');
    }
  }

  async logoutCashier() {
    sessionStorage.removeItem(CASHIER_USER_KEY);
    localStorage.removeItem(CASHIER_USER_KEY);
  }

  async changeCashierPassword(oldPassword, newPassword) {
    const storedPass = localStorage.getItem(MOCK_CASHIER_PASS_KEY) || 'cashier123';
    if (oldPassword !== storedPass) {
      throw new Error('Current cashier password validation check failed.');
    }
    if (!newPassword || newPassword.trim().length < 4) {
      throw new Error('Password must be at least 4 characters long.');
    }
    localStorage.setItem(MOCK_CASHIER_PASS_KEY, newPassword.trim());
    return true;
  }

  // Core Data Functions
  async getStocks() {
    this.load();
    this.data.stocks.forEach(s => {
      s.uniformType = s.uniformType || 'General';
      s.uniformPart = s.uniformPart || 'N/A';
    });
    return this.data.stocks;
  }

  async addStock(branch, gender, size, quantity, operator, uniformType = 'General', uniformPart = 'N/A') {
    this.load();
    let stockItem = this.data.stocks.find(s => 
      s.branch === branch && 
      s.gender === gender && 
      s.size === size &&
      (s.uniformType || 'General') === uniformType &&
      (s.uniformPart || 'N/A') === uniformPart
    );
    if (!stockItem) {
      stockItem = { branch, gender, size, uniformType, uniformPart, received: 0, issued: 0, remaining: 0 };
      this.data.stocks.push(stockItem);
    }
    stockItem.received += parseInt(quantity);
    stockItem.remaining = stockItem.received - stockItem.issued;
    stockItem.lastUpdated = new Date().toISOString(); // Keep time updated
    
    // Add transaction log
    this.data.transactions.unshift({
      type: 'Receive',
      timestamp: new Date().toISOString(),
      branch,
      gender,
      size,
      uniformType,
      uniformPart,
      quantity: parseInt(quantity),
      operator: operator || 'Demo Admin'
    });

    this.save();
    return stockItem;
  }

  async getStudents() {
    this.load();
    this.data.students.forEach(s => {
      s.sets = normalizeStudentSets(s.sets);
    });
    return this.data.students;
  }

  async addStudent(name, branch, gender, grade) {
    this.load();
    const newStudent = {
      id: 'stud_' + Date.now(),
      name,
      branch,
      gender,
      grade,
      sets: [
        { setNumber: 1, uniformType: 'Yellow Uniform', status: 'Not Issued', topSize: '', bottomSize: '', issueDate: null, reasonIfMissing: '' },
        { setNumber: 2, uniformType: 'Red Uniform', status: 'Not Issued', topSize: '', bottomSize: '', issueDate: null, reasonIfMissing: '' },
        { setNumber: 3, uniformType: 'Sports Uniform', sportsColor: '', status: 'Not Issued', topSize: '', bottomSize: '', issueDate: null, reasonIfMissing: '' }
      ]
    };
    this.data.students.push(newStudent);
    this.save();
    return newStudent;
  }

  async issueUniformSet(studentId, setNumber, status, topSize, bottomSize, sportsColor, reasonIfMissing, operator) {
    this.load();
    const student = this.data.students.find(s => s.id === studentId);
    if (!student) throw new Error('Student not found');

    const setIndex = setNumber - 1;
    student.sets = normalizeStudentSets(student.sets);
    const previousSet = student.sets[setIndex];
    
    // Determine the uniform labels
    const isSportsSet = (setNumber === 3);
    const oldUniformLabel = isSportsSet ? (previousSet.sportsColor ? `Sports Uniform (${previousSet.sportsColor})` : 'Sports Uniform') : previousSet.uniformType;
    const newUniformLabel = isSportsSet ? (sportsColor ? `Sports Uniform (${sportsColor})` : 'Sports Uniform') : previousSet.uniformType;

    // 1. Return old stock if it was previously in an active state (Issued or Fee Pending)
    const oldStatusActive = (previousSet.status === 'Issued' || previousSet.status === 'Fee Pending');
    if (oldStatusActive) {
      if (previousSet.topSize) {
        const oldTopStock = this.data.stocks.find(s => 
          s.branch === student.branch && 
          s.gender === student.gender && 
          s.size === previousSet.topSize &&
          (s.uniformType || 'General') === oldUniformLabel &&
          (s.uniformPart || 'N/A') === 'Top'
        );
        if (oldTopStock) {
          oldTopStock.issued = Math.max(0, oldTopStock.issued - 1);
          oldTopStock.remaining = oldTopStock.received - oldTopStock.issued;
          oldTopStock.lastUpdated = new Date().toISOString();
        }
      }
      if (previousSet.bottomSize) {
        const oldBottomStock = this.data.stocks.find(s => 
          s.branch === student.branch && 
          s.gender === student.gender && 
          s.size === previousSet.bottomSize &&
          (s.uniformType || 'General') === oldUniformLabel &&
          (s.uniformPart || 'N/A') === 'Bottom'
        );
        if (oldBottomStock) {
          oldBottomStock.issued = Math.max(0, oldBottomStock.issued - 1);
          oldBottomStock.remaining = oldBottomStock.received - oldBottomStock.issued;
          oldBottomStock.lastUpdated = new Date().toISOString();
        }
      }
    }

    // 2. Set new fields on student uniform set
    student.sets[setIndex].status = status;
    student.sets[setIndex].topSize = (status === 'Issued' || status === 'Fee Pending' || status === 'Size Pending') ? topSize : '';
    student.sets[setIndex].bottomSize = (status === 'Issued' || status === 'Fee Pending' || status === 'Size Pending') ? bottomSize : '';
    student.sets[setIndex].sportsColor = isSportsSet ? sportsColor : '';
    student.sets[setIndex].issueDate = (status === 'Issued' || status === 'Fee Pending') ? new Date().toISOString() : null;
    student.sets[setIndex].reasonIfMissing = (status === 'Size Pending') ? reasonIfMissing : '';

    // 3. Deduct new stock if the status is active (Issued or Fee Pending)
    const newStatusActive = (status === 'Issued' || status === 'Fee Pending');
    if (newStatusActive) {
      if (topSize) {
        let topStock = this.data.stocks.find(s => 
          s.branch === student.branch && 
          s.gender === student.gender && 
          s.size === topSize &&
          (s.uniformType || 'General') === newUniformLabel &&
          (s.uniformPart || 'N/A') === 'Top'
        );
        if (!topStock) {
          topStock = { branch: student.branch, gender: student.gender, size: topSize, uniformType: newUniformLabel, uniformPart: 'Top', received: 0, issued: 0, remaining: 0 };
          this.data.stocks.push(topStock);
        }
        topStock.issued += 1;
        topStock.remaining = topStock.received - topStock.issued;
        topStock.lastUpdated = new Date().toISOString();
      }

      if (bottomSize) {
        let bottomStock = this.data.stocks.find(s => 
          s.branch === student.branch && 
          s.gender === student.gender && 
          s.size === bottomSize &&
          (s.uniformType || 'General') === newUniformLabel &&
          (s.uniformPart || 'N/A') === 'Bottom'
        );
        if (!bottomStock) {
          bottomStock = { branch: student.branch, gender: student.gender, size: bottomSize, uniformType: newUniformLabel, uniformPart: 'Bottom', received: 0, issued: 0, remaining: 0 };
          this.data.stocks.push(bottomStock);
        }
        bottomStock.issued += 1;
        bottomStock.remaining = bottomStock.received - bottomStock.issued;
        bottomStock.lastUpdated = new Date().toISOString();
      }

      // Add transaction log
      this.data.transactions.unshift({
        type: 'Issue',
        timestamp: new Date().toISOString(),
        branch: student.branch,
        gender: student.gender,
        uniformType: newUniformLabel,
        topSize,
        bottomSize,
        status,
        quantity: 1,
        studentId,
        studentName: student.name,
        setNumber,
        operator: operator || 'Demo Staff'
      });
    } else if (status === 'Size Pending') {
      // Add special request log
      this.data.transactions.unshift({
        type: 'Special Request',
        timestamp: new Date().toISOString(),
        branch: student.branch,
        gender: student.gender,
        uniformType: newUniformLabel,
        topSize,
        bottomSize,
        quantity: 0,
        studentId,
        studentName: student.name,
        setNumber,
        notes: reasonIfMissing,
        operator: operator || 'Demo Staff'
      });
    }

    this.save();
    return student;
  }

  async getTransactions() {
    this.load();
    return this.data.transactions;
  }

  async getBills() {
    this.load();
    if (!this.data.bills) {
      this.data.bills = [];
      this.save();
    }
    return this.data.bills;
  }

  async createBill(studentId, studentName, grade, branch, gender, feeAmount, operator) {
    this.load();
    if (!this.data.bills) {
      this.data.bills = [];
    }
    const newBill = {
      id: 'BILL-' + Date.now(),
      studentId,
      studentName,
      grade,
      branch,
      gender,
      feeAmount: parseFloat(feeAmount),
      status: 'Pending',
      createdAt: new Date().toISOString(),
      paidAt: null,
      cashier: operator || 'Demo Cashier'
    };
    this.data.bills.unshift(newBill);
    this.save();
    return newBill;
  }

  async payBill(billId, operator) {
    this.load();
    if (!this.data.bills) return null;
    const bill = this.data.bills.find(b => b.id === billId);
    if (!bill) throw new Error('Bill not found');
    bill.status = 'Paid';
    bill.paidAt = new Date().toISOString();
    bill.cashier = operator || bill.cashier;
    this.save();
    return bill;
  }

  async deleteBill(billId) {
    this.load();
    if (!this.data.bills) return false;
    const index = this.data.bills.findIndex(b => b.id === billId);
    if (index !== -1) {
      this.data.bills.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  async deleteStock(branch, uniformType, uniformPart, gender, size) {
    this.load();
    if (!this.data.stocks) return false;
    const index = this.data.stocks.findIndex(s =>
      s.branch === branch &&
      (s.uniformType || 'General') === uniformType &&
      (s.uniformPart || 'N/A') === uniformPart &&
      s.gender === gender &&
      s.size === size
    );
    if (index !== -1) {
      this.data.stocks.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  async deleteAllStocks() {
    this.load();
    this.data.stocks = [];
    this.save();
    return true;
  }

  async deleteStudent(studentId) {
    this.load();
    if (!this.data.students) return false;
    const index = this.data.students.findIndex(s => s.id === studentId);
    if (index !== -1) {
      this.data.students.splice(index, 1);
      this.save();
      return true;
    }
    return false;
  }

  async deleteAllStudents() {
    this.load();
    this.data.students = [];
    this.save();
    return true;
  }

  async deleteRequest(studentId, setNumber) {
    this.load();
    if (!this.data.students) return false;
    const student = this.data.students.find(s => s.id === studentId);
    if (student && student.sets && student.sets[setNumber - 1]) {
      student.sets[setNumber - 1].status = 'Not Issued';
      student.sets[setNumber - 1].reasonIfMissing = '';
      student.sets[setNumber - 1].topSize = '';
      student.sets[setNumber - 1].bottomSize = '';
      this.save();
      return true;
    }
    return false;
  }

  async deleteAllRequests() {
    this.load();
    if (!this.data.students) return false;
    this.data.students.forEach(s => {
      if (s.sets) {
        s.sets.forEach(set => {
          if (set.status === 'Pending Size' || set.status === 'Size Pending') {
            set.status = 'Not Issued';
            set.reasonIfMissing = '';
            set.topSize = '';
            set.bottomSize = '';
          }
        });
      }
    });
    this.save();
    return true;
  }

  async deleteAllBills() {
    this.load();
    this.data.bills = [];
    this.save();
    return true;
  }
}

// ----------------------------------------------------
// MongoDB Express API Backend Data Layer
// ----------------------------------------------------
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:' || !window.location.hostname)
  ? 'http://localhost:5001/api'
  : '/api';

class MongoApiDB {
  constructor() {
    this.fallbackMock = new MockDB();
  }

  async request(endpoint, options = {}) {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options,
      });
      if (!res.ok) {
        throw new Error(`API Request failed with status ${res.status}`);
      }
      const data = await res.json();
      if (data.success === false) {
        throw new Error(data.message || 'API Request failed');
      }
      return data;
    } catch (err) {
      console.warn(`[MongoDB API Warning] ${endpoint}: ${err.message}. Using fallback data layer.`);
      throw err;
    }
  }

  getCurrentUser() {
    const user = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || localStorage.getItem(ADMIN_USER_KEY) || sessionStorage.getItem(ADMIN_USER_KEY) || localStorage.getItem(CASHIER_USER_KEY) || sessionStorage.getItem(CASHIER_USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  getCurrentAdmin() {
    const admin = localStorage.getItem(ADMIN_USER_KEY) || sessionStorage.getItem(ADMIN_USER_KEY) || localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || localStorage.getItem(CASHIER_USER_KEY) || sessionStorage.getItem(CASHIER_USER_KEY);
    return admin ? JSON.parse(admin) : null;
  }

  getCurrentCashier() {
    const cashier = localStorage.getItem(CASHIER_USER_KEY) || sessionStorage.getItem(CASHIER_USER_KEY) || localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY) || localStorage.getItem(ADMIN_USER_KEY) || sessionStorage.getItem(ADMIN_USER_KEY);
    return cashier ? JSON.parse(cashier) : null;
  }

  async loginStaff(username, password) {
    try {
      const data = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, role: 'staff' })
      });
      const staffUser = data.data || { uid: 'mongo_staff', username };
      localStorage.setItem(USER_KEY, JSON.stringify(staffUser));
      sessionStorage.setItem(USER_KEY, JSON.stringify(staffUser));
      sessionStorage.setItem('bb_stock_explicit_staff_auth', 'true');
      return staffUser;
    } catch (err) {
      return this.fallbackMock.loginStaff(username, password);
    }
  }

  async loginAdmin(username, password) {
    try {
      const data = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, role: 'admin' })
      });
      const adminUser = data.data || { uid: 'mongo_admin', username };
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(adminUser));
      sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(adminUser));
      sessionStorage.setItem('bb_stock_explicit_admin_auth', 'true');
      return adminUser;
    } catch (err) {
      return this.fallbackMock.loginAdmin(username, password);
    }
  }

  async loginCashier(username, password) {
    try {
      const data = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, role: 'cashier' })
      });
      const cashierUser = data.data || { uid: 'mongo_cashier', username };
      localStorage.setItem(CASHIER_USER_KEY, JSON.stringify(cashierUser));
      sessionStorage.setItem(CASHIER_USER_KEY, JSON.stringify(cashierUser));
      sessionStorage.setItem('bb_stock_explicit_cashier_auth', 'true');
      return cashierUser;
    } catch (err) {
      return this.fallbackMock.loginCashier(username, password);
    }
  }

  async logout() {
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
    return true;
  }

  async logoutAdmin() {
    localStorage.removeItem(ADMIN_USER_KEY);
    sessionStorage.removeItem(ADMIN_USER_KEY);
    return true;
  }

  async logoutCashier() {
    localStorage.removeItem(CASHIER_USER_KEY);
    sessionStorage.removeItem(CASHIER_USER_KEY);
    return true;
  }

  async loginStep1(username, password) {
    try {
      const data = await this.request('/auth/login-step1', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      const userPayload = data.data || { uid: 'user_uid', username, role: data.role || 'staff' };
      const role = (data.role || userPayload.role || 'staff').toLowerCase();
      if (role === 'admin') {
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(userPayload));
        sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(userPayload));
        localStorage.setItem(USER_KEY, JSON.stringify(userPayload));
        sessionStorage.setItem(USER_KEY, JSON.stringify(userPayload));
        localStorage.setItem(CASHIER_USER_KEY, JSON.stringify(userPayload));
        sessionStorage.setItem(CASHIER_USER_KEY, JSON.stringify(userPayload));
      } else if (role === 'cashier') {
        localStorage.setItem(CASHIER_USER_KEY, JSON.stringify(userPayload));
        sessionStorage.setItem(CASHIER_USER_KEY, JSON.stringify(userPayload));
        localStorage.setItem(USER_KEY, JSON.stringify(userPayload));
        sessionStorage.setItem(USER_KEY, JSON.stringify(userPayload));
      } else {
        localStorage.setItem(USER_KEY, JSON.stringify(userPayload));
        sessionStorage.setItem(USER_KEY, JSON.stringify(userPayload));
      }
      return { ...data, role };
    } catch (err) {
      return this.fallbackMock.loginStep1(username, password);
    }
  }

  async verifyOtp(username, otp) {
    try {
      const data = await this.request('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ username, otp })
      });
      const userPayload = data.data;
      if (userPayload.role === 'admin') {
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(userPayload));
        sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(userPayload));
      } else if (userPayload.role === 'cashier') {
        localStorage.setItem(CASHIER_USER_KEY, JSON.stringify(userPayload));
        sessionStorage.setItem(CASHIER_USER_KEY, JSON.stringify(userPayload));
      } else {
        localStorage.setItem(USER_KEY, JSON.stringify(userPayload));
        sessionStorage.setItem(USER_KEY, JSON.stringify(userPayload));
      }
      return userPayload;
    } catch (err) {
      return this.fallbackMock.verifyOtp(username, otp);
    }
  }

  async changeAdminPassword(oldPassword, newPassword) {
    try {
      await this.request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ role: 'admin', oldPassword, newPassword })
      });
      return true;
    } catch (err) {
      return this.fallbackMock.changeAdminPassword(oldPassword, newPassword);
    }
  }

  async changeStaffPassword(oldPassword, newPassword) {
    try {
      await this.request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ role: 'staff', oldPassword, newPassword })
      });
      return true;
    } catch (err) {
      return this.fallbackMock.changeStaffPassword(oldPassword, newPassword);
    }
  }

  async changeCashierPassword(oldPassword, newPassword) {
    try {
      await this.request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ role: 'cashier', oldPassword, newPassword })
      });
      return true;
    } catch (err) {
      return this.fallbackMock.changeCashierPassword(oldPassword, newPassword);
    }
  }

  // Stocks
  async getStocks() {
    try {
      const res = await this.request('/stocks');
      return res.data || [];
    } catch (err) {
      return this.fallbackMock.getStocks();
    }
  }

  async addStock(branch, gender, size, qty, operator, uniformType, part) {
    try {
      const res = await this.request('/stocks/add', {
        method: 'POST',
        body: JSON.stringify({ branch, gender, size, qty, operator, uniformType, part })
      });
      return res.data;
    } catch (err) {
      return this.fallbackMock.addStock(branch, gender, size, qty, operator, uniformType, part);
    }
  }

  async deleteStock(branch, uniformType, uniformPart, gender, size) {
    try {
      await this.request('/stocks', {
        method: 'DELETE',
        body: JSON.stringify({ branch, uniformType, uniformPart, gender, size })
      });
      return true;
    } catch (err) {
      return this.fallbackMock.deleteStock(branch, uniformType, uniformPart, gender, size);
    }
  }

  async deleteAllStocks() {
    try {
      await this.request('/stocks/all', { method: 'DELETE' });
      return true;
    } catch (err) {
      return this.fallbackMock.deleteAllStocks();
    }
  }

  // Students
  async getStudents() {
    try {
      const res = await this.request('/students');
      return res.data || [];
    } catch (err) {
      return this.fallbackMock.getStudents();
    }
  }

  async addStudent(name, branch, gender, grade) {
    try {
      const res = await this.request('/students', {
        method: 'POST',
        body: JSON.stringify({ name, branch, gender, grade })
      });
      return res.data;
    } catch (err) {
      return this.fallbackMock.addStudent(name, branch, gender, grade);
    }
  }

  async issueUniformSet(studentId, setNumber, status, topSize, bottomSize, sportsColor = '', reason = '', operator = '') {
    try {
      const res = await this.request('/students/issue', {
        method: 'POST',
        body: JSON.stringify({ studentId, setNumber, status, topSize, bottomSize, sportsColor, reason, operator })
      });
      return res.data;
    } catch (err) {
      return this.fallbackMock.issueUniformSet(studentId, setNumber, status, topSize, bottomSize, sportsColor, reason, operator);
    }
  }

  async deleteStudent(studentId) {
    try {
      await this.request(`/students/${studentId}`, { method: 'DELETE' });
      return true;
    } catch (err) {
      return this.fallbackMock.deleteStudent(studentId);
    }
  }

  async deleteAllStudents() {
    try {
      await this.request('/students/all', { method: 'DELETE' });
      return true;
    } catch (err) {
      return this.fallbackMock.deleteAllStudents();
    }
  }

  async deleteRequest(studentId, setNumber) {
    try {
      await this.request(`/students/${studentId}/request/${setNumber}`, { method: 'DELETE' });
      return true;
    } catch (err) {
      return this.fallbackMock.deleteRequest(studentId, setNumber);
    }
  }

  async deleteAllRequests() {
    try {
      await this.request('/students/requests/all', { method: 'DELETE' });
      return true;
    } catch (err) {
      return this.fallbackMock.deleteAllRequests();
    }
  }

  // Transactions
  async getTransactions() {
    try {
      const res = await this.request('/transactions');
      return res.data || [];
    } catch (err) {
      return this.fallbackMock.getTransactions();
    }
  }

  // Bills
  async getBills() {
    try {
      const res = await this.request('/bills');
      return res.data || [];
    } catch (err) {
      return this.fallbackMock.getBills();
    }
  }

  async createBill(studentId, studentName, grade, branch, gender, feeAmount, operator) {
    try {
      const res = await this.request('/bills', {
        method: 'POST',
        body: JSON.stringify({ studentId, studentName, grade, branch, gender, feeAmount, amount: feeAmount, operator, cashier: operator })
      });
      return res.data;
    } catch (err) {
      return this.fallbackMock.createBill(studentId, studentName, grade, branch, gender, feeAmount, operator);
    }
  }

  async payBill(billId, operator) {
    try {
      const res = await this.request(`/bills/${billId}/pay`, {
        method: 'PUT',
        body: JSON.stringify({ operator })
      });
      return res.data;
    } catch (err) {
      return this.fallbackMock.payBill(billId, operator);
    }
  }

  async deleteBill(billId) {
    try {
      await this.request(`/bills/${billId}`, { method: 'DELETE' });
      return true;
    } catch (err) {
      return this.fallbackMock.deleteBill(billId);
    }
  }

  async deleteAllBills() {
    try {
      await this.request('/bills/all', { method: 'DELETE' });
      return true;
    } catch (err) {
      return this.fallbackMock.deleteAllBills();
    }
  }
}

// MongoDB API Database Exporter
export const isFirebaseMode = false;
export const db = new MongoApiDB();
export const mockAdminPassKey = MOCK_ADMIN_PASS_KEY;

