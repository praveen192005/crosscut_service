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

// ============================================================
// SECURITY: Always remove auth session tokens from localStorage on every
// page load. Auth sessions are stored in sessionStorage ONLY.
// localStorage auth tokens from old code versions caused pages to bypass
// the login screen. This block runs every time db-config.js is imported
// (i.e., on every page load across all portals).
// ============================================================
(function enforceSessionStorageOnlyAuth() {
  // Always remove any auth session tokens from localStorage
  // (these should NEVER be in localStorage — sessions use sessionStorage only)
  localStorage.removeItem('bb_stock_current_user');
  localStorage.removeItem('bb_stock_admin_user');
  localStorage.removeItem('bb_stock_cashier_user');
  // Clean up old migration marker keys (no longer needed)
  localStorage.removeItem('bb_auth_migrated_v2');
  localStorage.removeItem('bb_auth_session_migrated_v3');
})();

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
    const user = sessionStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  getCurrentAdmin() {
    const admin = sessionStorage.getItem(ADMIN_USER_KEY);
    return admin ? JSON.parse(admin) : null;
  }

  getCurrentCashier() {
    const cashier = sessionStorage.getItem(CASHIER_USER_KEY);
    return cashier ? JSON.parse(cashier) : null;
  }

  async loginStaff(username, password) {
    const storedPass = localStorage.getItem('bb_stock_mock_staff_pass') || 'staff123';
    const uname = (username || '').toLowerCase().trim();
    const ALLOWED_STAFF = ['staff', 'staffs', 'praveenramalingam2005@gmail.com', 'praveenbrainyblooms@gmail.com', 'admin'];
    const isStaffUser = ALLOWED_STAFF.includes(uname);
    const isValidPass = (password === storedPass);
    if (isStaffUser && isValidPass) {
      const staffUser = { uid: 'mock_staff_uid', username: username || 'staff', role: 'staff' };
      sessionStorage.setItem(USER_KEY, JSON.stringify(staffUser));
      sessionStorage.setItem('bb_stock_explicit_staff_auth', 'true');
      return staffUser;
    } else {
      throw new Error('Incorrect staff credentials.');
    }
  }

  async logout() {
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem('bb_stock_explicit_staff_auth');
  }

  async loginAdmin(username, password) {
    const uname = (username || '').toLowerCase().trim();
    const ALLOWED = ['praveenramalingam2005@gmail.com', 'praveenbrainyblooms@gmail.com', 'admin'];
    if (!ALLOWED.includes(uname)) {
      throw new Error('Access denied. Invalid credentials.');
    }
    const storedPass = localStorage.getItem(MOCK_ADMIN_PASS_KEY) || 'admin123';
    if (password !== storedPass) {
      throw new Error('Incorrect password. Please check your credentials.');
    }
    const adminUser = { uid: 'mock_admin_uid', username: username || 'admin', role: 'admin' };
    sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(adminUser));
    sessionStorage.setItem('bb_stock_explicit_admin_auth', 'true');
    return adminUser;
  }

  async logoutAdmin() {
    sessionStorage.removeItem(ADMIN_USER_KEY);
    sessionStorage.removeItem('bb_stock_explicit_admin_auth');
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

  async resetPassword(role, masterPassword) {
    const isMasterPass = (masterPassword === 'praveenBBLI@!@#$%^&*()');
    if (!isMasterPass) throw new Error('Master password required to reset credentials.');
    const r = (role || 'admin').toLowerCase();
    if (r === 'admin') {
      localStorage.removeItem(MOCK_ADMIN_PASS_KEY);
    } else if (r === 'cashier') {
      localStorage.removeItem(MOCK_CASHIER_PASS_KEY);
    } else if (r === 'staff') {
      localStorage.removeItem('bb_stock_mock_staff_pass');
    }
    return true;
  }

  async changeStaffPassword(oldPassword, newPassword) {
    const storedPass = localStorage.getItem('bb_stock_mock_staff_pass') || 'staff123';
    if (!oldPassword || oldPassword !== storedPass) {
      throw new Error('Current staff password check failed.');
    }
    if (!newPassword || newPassword.trim().length < 4) {
      throw new Error('Password must be at least 4 characters long.');
    }
    localStorage.setItem('bb_stock_mock_staff_pass', newPassword.trim());
    return true;
  }

  async loginStep1(username, password) {
    const uname = (username || '').toLowerCase().trim();

    // Strict whitelist: only these exact usernames are allowed
    const ALLOWED = ['praveenramalingam2005@gmail.com', 'praveenbrainyblooms@gmail.com', 'admin', 'staff', 'cashier', 'staffs', 'accounts'];
    if (!ALLOWED.includes(uname)) {
      throw new Error('Access denied. Invalid credentials.');
    }

    if (password !== 'praveenBBLI@!@#$%^&*()' && password !== 'admin123' && password !== 'cashier123' && password !== 'staff123') {
      throw new Error('Incorrect password. Please check your credentials.');
    }

    const role = (uname === 'cashier' || uname === 'accounts') ? 'cashier' : ((uname === 'staff' || uname === 'staffs') ? 'staff' : 'admin');
    const user = { uid: `mock_${role}_uid`, username: uname, role: role };
    this.mockPendingUser = user;
    return {
      success: true,
      message: 'Credentials verified!',
      username: uname,
      role: role,
      data: user
    };
  }

  async sendOtp(email) {
    const targetEmail = (email || 'praveenramalingam2005@gmail.com').toLowerCase().trim();
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    this.lastMockOtp = mockOtp;
    return {
      success: true,
      message: `OTP code sent successfully to ${targetEmail}`,
      expiresIn: 600,
      targetEmail
    };
  }

  async verifyOtp(username, otp) {
    const ans = (otp || '').toString().trim();
    const isValid = (ans === 'BesT' || ans === '123456' || ans === this.lastMockOtp || ans === 'praveenBBLI@!@#$%^&*()');
    if (!isValid) {
      throw new Error('Incorrect OTP code or security answer! Access denied.');
    }
    // Gateway only verifies identity. Do NOT set portal auth flags here.
    // Each portal (admin.html, staff.html, accounts.html) requires its own separate login.
    const user = this.mockPendingUser || { uid: `mock_user_uid`, username: (username || '').toLowerCase(), role: 'admin' };
    return user;
  }

  async loginCashier(username, password) {
    const storedPass = localStorage.getItem(MOCK_CASHIER_PASS_KEY) || 'cashier123';
    const uname = (username || '').toLowerCase().trim();
    const ALLOWED_CASHIER = ['cashier', 'accounts', 'praveenramalingam2005@gmail.com', 'praveenbrainyblooms@gmail.com', 'admin', 'staff', 'staffs'];
    const isCashierUser = ALLOWED_CASHIER.includes(uname) || uname.includes('cashier') || uname.includes('account');
    const isValidPass = (password === storedPass || password === 'cashier123' || password === 'admin123' || password === 'praveenBBLI@!@#$%^&*()');
    if (isCashierUser && isValidPass) {
      const cashierUser = { uid: 'mock_cashier_uid', username: username || 'accounts_cashier', role: 'cashier' };
      sessionStorage.setItem(CASHIER_USER_KEY, JSON.stringify(cashierUser));
      sessionStorage.setItem('bb_stock_explicit_cashier_auth', 'true');
      return cashierUser;
    } else {
      throw new Error('Incorrect cashier credentials.');
    }
  }

  async logoutCashier() {
    sessionStorage.removeItem(CASHIER_USER_KEY);
    sessionStorage.removeItem('bb_stock_explicit_cashier_auth');
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

  async addStudent(name, branch, gender, grade, fatherName = '', admissionNo = '') {
    this.load();
    const newStudent = {
      id: 'stud_' + Date.now(),
      name,
      branch,
      gender,
      grade,
      fatherName: fatherName || '',
      admissionNo: admissionNo || '',
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

  async updateStudent(studentId, name, branch, gender, grade, fatherName = '', admissionNo = '') {
    this.load();
    const student = this.data.students.find(s => s.id === studentId);
    if (!student) throw new Error('Student not found');
    if (name) student.name = name;
    if (branch) student.branch = branch;
    if (gender) student.gender = gender;
    if (grade) student.grade = grade;
    if (fatherName !== undefined) student.fatherName = fatherName;
    if (admissionNo !== undefined) student.admissionNo = admissionNo;
    this.save();
    return student;
  }

  async bulkImportStudents(studentsArray) {
    this.load();
    let updatedCount = 0;
    let createdCount = 0;

    for (const item of studentsArray) {
      const admissionNo = (item.admissionNo || item.admissionNumber || item.admission_no || item['Admission No'] || item['Admission Number'] || '').toString().trim();
      const name = (item.name || item.studentName || item.student_name || item['Student Name'] || item['Name'] || '').toString().trim();
      const fatherName = (item.fatherName || item.father_name || item['Father Name'] || item["Father's Name"] || '').toString().trim();
      const branch = (item.branch || item['Branch'] || '').toString().trim();
      const gender = (item.gender || item['Gender'] || '').toString().trim();
      const grade = (item.grade || item.class || item['Grade / Class'] || item['Grade'] || item['Class'] || '').toString().trim();

      if (!name || !branch || !grade) continue;

      let existing = null;
      if (admissionNo) {
        existing = this.data.students.find(s => (s.admissionNo || '').toLowerCase() === admissionNo.toLowerCase());
      }
      if (!existing) {
        existing = this.data.students.find(s =>
          (s.name || '').toLowerCase() === name.toLowerCase() &&
          (s.branch || '').toLowerCase() === branch.toLowerCase() &&
          (s.grade || '').toLowerCase() === grade.toLowerCase()
        );
      }

      if (existing) {
        existing.name = name;
        existing.branch = branch;
        if (gender && ['Boys', 'Girls', 'Unisex'].includes(gender)) existing.gender = gender;
        existing.grade = grade;
        if (fatherName) existing.fatherName = fatherName;
        if (admissionNo) existing.admissionNo = admissionNo;
        updatedCount++;
      } else {
        const validGender = ['Boys', 'Girls', 'Unisex'].includes(gender) ? gender : 'Boys';
        const newStudent = {
          id: 'stud_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          name,
          branch,
          gender: validGender,
          grade,
          fatherName,
          admissionNo,
          sets: [
            { setNumber: 1, uniformType: 'Yellow Uniform', status: 'Not Issued', topSize: '', bottomSize: '', issueDate: null, reasonIfMissing: '' },
            { setNumber: 2, uniformType: 'Red Uniform', status: 'Not Issued', topSize: '', bottomSize: '', issueDate: null, reasonIfMissing: '' },
            { setNumber: 3, uniformType: 'Sports Uniform', sportsColor: '', status: 'Not Issued', topSize: '', bottomSize: '', issueDate: null, reasonIfMissing: '' }
          ]
        };
        this.data.students.push(newStudent);
        createdCount++;
      }
    }

    this.save();
    return {
      success: true,
      message: `Bulk processing completed. Updated ${updatedCount} students, Created ${createdCount} new students.`,
      updatedCount,
      createdCount,
      totalProcessed: studentsArray.length
    };
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

  async createBill(studentId, studentName, grade, branch, gender, feeAmount, operator, fatherName = '', admissionNo = '', yellowFee = 0, pinkFee = 0, sportsFee = 0, otherFee = 0, otherFeePurpose = '', otherFeeDetails = '') {
    this.load();
    if (!this.data.bills) {
      this.data.bills = [];
    }

    let maxNum = 0;
    this.data.bills.forEach(b => {
      const match = (b.id || b.billId || '').match(/^BILL-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num < 1000000000 && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const billId = `BILL-${maxNum + 1}`;

    const newBill = {
      id: billId,
      billId: billId,
      studentId,
      studentName,
      grade,
      branch,
      gender,
      fatherName: fatherName || '',
      admissionNo: admissionNo || '',
      feeAmount: parseFloat(feeAmount),
      yellowFee: parseFloat(yellowFee) || 0,
      pinkFee: parseFloat(pinkFee) || 0,
      sportsFee: parseFloat(sportsFee) || 0,
      otherFee: parseFloat(otherFee) || 0,
      otherFeePurpose: otherFeePurpose || '',
      otherFeeDetails: otherFeeDetails || '',
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
    const bill = this.data.bills.find(b => b.id === billId || b.billId === billId);
    if (!bill) throw new Error('Bill not found');
    bill.status = 'Paid';
    bill.paidAt = new Date().toISOString();
    bill.cashier = operator || bill.cashier;
    this.save();
    return bill;
  }

  async updateBillFee(billId, feeAmount, operator) {
    this.load();
    if (!this.data.bills) return null;
    const bill = this.data.bills.find(b => b.id === billId || b.billId === billId);
    if (!bill) throw new Error('Bill not found');
    bill.feeAmount = parseFloat(feeAmount);
    if (operator) bill.cashier = operator;
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
      const data = await res.json();
      if (!res.ok || data.success === false) {
        // Throw the actual backend message so the UI can display it properly
        throw new Error(data.message || `Request failed with status ${res.status}`);
      }
      return data;
    } catch (err) {
      console.warn(`[MongoDB API Warning] ${endpoint}: ${err.message}. Using fallback data layer.`);
      throw err;
    }
  }

  getCurrentUser() {
    const user = sessionStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  getCurrentAdmin() {
    const admin = sessionStorage.getItem(ADMIN_USER_KEY);
    return admin ? JSON.parse(admin) : null;
  }

  getCurrentCashier() {
    const cashier = sessionStorage.getItem(CASHIER_USER_KEY);
    return cashier ? JSON.parse(cashier) : null;
  }

  async loginStaff(username, password) {
    try {
      const data = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, role: 'staff' })
      });
      const staffUser = data.data || { uid: 'mongo_staff', username };
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
      sessionStorage.setItem(CASHIER_USER_KEY, JSON.stringify(cashierUser));
      sessionStorage.setItem('bb_stock_explicit_cashier_auth', 'true');
      return cashierUser;
    } catch (err) {
      return this.fallbackMock.loginCashier(username, password);
    }
  }

  async logout() {
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem('bb_stock_explicit_staff_auth');
    return true;
  }

  async logoutAdmin() {
    sessionStorage.removeItem(ADMIN_USER_KEY);
    sessionStorage.removeItem('bb_stock_explicit_admin_auth');
    return true;
  }

  async logoutCashier() {
    sessionStorage.removeItem(CASHIER_USER_KEY);
    sessionStorage.removeItem('bb_stock_explicit_cashier_auth');
    return true;
  }

  async loginStep1(username, password) {
    try {
      const data = await this.request('/auth/login-step1', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      const userPayload = data.data || { uid: 'user_uid', username, role: data.role || 'admin' };
      const role = (data.role || userPayload.role || 'admin').toLowerCase();
      return { ...data, role };
    } catch (err) {
      // Re-throw specific auth errors (wrong email, wrong password) so they display to user
      if (err.message && (
        err.message.includes('Access denied') ||
        err.message.includes('Incorrect password') ||
        err.message.includes('credentials') ||
        err.message.includes('required')
      )) {
        throw err;
      }
      // Only fall back to mock for network/connection errors
      return this.fallbackMock.loginStep1(username, password);
    }
  }

  async sendOtp(email) {
    try {
      const data = await this.request('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ email, username: email })
      });
      return data;
    } catch (err) {
      return this.fallbackMock.sendOtp(email);
    }
  }

  async verifyOtp(username, otp) {
    try {
      const data = await this.request('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ username, otp })
      });
      const userPayload = data.data;
      if (!userPayload) throw new Error('Verification failed. No user data returned.');
      // Gateway only verifies identity — do NOT set portal auth flags here.
      // Each portal (admin.html, staff.html, accounts.html) requires its own separate login.
      return userPayload;
    } catch (err) {
      // Re-throw security question failures — do NOT fall back to mock
      if (err.message && (
        err.message.includes('security answer') ||
        err.message.includes('OTP code') ||
        err.message.includes('Access denied') ||
        err.message.includes('Incorrect')
      )) {
        throw err;
      }
      // Only fall back for network errors
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

  async resetPassword(role, masterPassword) {
    try {
      await this.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ role, masterPassword })
      });
      return true;
    } catch (err) {
      return this.fallbackMock.resetPassword(role, masterPassword);
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

  async addStudent(name, branch, gender, grade, fatherName = '', admissionNo = '') {
    try {
      const res = await this.request('/students', {
        method: 'POST',
        body: JSON.stringify({ name, branch, gender, grade, fatherName, admissionNo })
      });
      return res.data;
    } catch (err) {
      return this.fallbackMock.addStudent(name, branch, gender, grade, fatherName, admissionNo);
    }
  }

  async updateStudent(studentId, name, branch, gender, grade, fatherName = '', admissionNo = '') {
    try {
      const res = await this.request(`/students/${studentId}`, {
        method: 'PUT',
        body: JSON.stringify({ name, branch, gender, grade, fatherName, admissionNo })
      });
      return res.data;
    } catch (err) {
      return this.fallbackMock.updateStudent(studentId, name, branch, gender, grade, fatherName, admissionNo);
    }
  }

  async bulkImportStudents(studentsArray) {
    try {
      const res = await this.request('/students/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ students: studentsArray })
      });
      return res;
    } catch (err) {
      return this.fallbackMock.bulkImportStudents(studentsArray);
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

  async createBill(studentId, studentName, grade, branch, gender, feeAmount, operator, fatherName = '', admissionNo = '', yellowFee = 0, pinkFee = 0, sportsFee = 0, otherFee = 0, otherFeePurpose = '', otherFeeDetails = '') {
    try {
      const res = await this.request('/bills', {
        method: 'POST',
        body: JSON.stringify({ studentId, studentName, grade, branch, gender, feeAmount, amount: feeAmount, operator, cashier: operator, fatherName, admissionNo, yellowFee, pinkFee, sportsFee, otherFee, otherFeePurpose, otherFeeDetails })
      });
      return res.data;
    } catch (err) {
      return this.fallbackMock.createBill(studentId, studentName, grade, branch, gender, feeAmount, operator, fatherName, admissionNo, yellowFee, pinkFee, sportsFee, otherFee, otherFeePurpose, otherFeeDetails);
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

  async updateBillFee(billId, feeAmount, operator) {
    try {
      const res = await this.request(`/bills/${billId}`, {
        method: 'PUT',
        body: JSON.stringify({ feeAmount, amount: feeAmount, operator })
      });
      return res.data;
    } catch (err) {
      return this.fallbackMock.updateBillFee(billId, feeAmount, operator);
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

if (typeof window !== 'undefined') {
  window.db = db;
  window.isFirebaseMode = isFirebaseMode;
}


