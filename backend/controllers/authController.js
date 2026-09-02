const User = require('../models/User');

// Default initial user credentials
const DEFAULT_USERS = {
  admin: { username: 'admin', role: 'admin', password: 'admin123' },
  cashier: { username: 'cashier', role: 'cashier', password: 'cashier123' },
  staff: { username: 'staff', role: 'staff', password: 'staff123' },
  'praveenbrainyblooms@gmail.com': { username: 'praveenbrainyblooms@gmail.com', role: 'admin', password: 'admin123' },
  'praveenramalingam2005@gmail.com': { username: 'praveenramalingam2005@gmail.com', role: 'admin', password: 'admin123' },
};

// @desc    Direct Login: Authenticate credentials using Email ID / Username & Password
// @route   POST /api/auth/login-step1 & POST /api/auth/login
const loginStep1 = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Email/Username and Password are required' });
    }

    const uname = (username || '').toLowerCase().trim();

    // Strict whitelist: only these exact usernames are permitted
    const ALLOWED_USERNAMES = ['praveenramalingam2005@gmail.com', 'praveenbrainyblooms@gmail.com', 'admin', 'staff', 'cashier', 'staffs', 'accounts'];
    if (!ALLOWED_USERNAMES.includes(uname)) {
      return res.status(403).json({ success: false, message: 'Access denied. Invalid credentials.' });
    }

    // Password Check: Master password or role/default password
    if (password !== 'praveenBBLI@!@#$%^&*()' && password !== 'admin123' && password !== 'cashier123' && password !== 'staff123') {
      return res.status(401).json({ success: false, message: 'Incorrect password. Please check your credentials.' });
    }

    const userRole = role || (uname === 'cashier' ? 'cashier' : (uname === 'staff' ? 'staff' : 'admin'));
    let user = null;
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findOne({ username: uname });
        if (!user) {
          user = await User.create({ username: uname, role: userRole, password: password });
        }
      } catch (dbErr) {
        console.warn('Skipping Mongoose query in loginStep1:', dbErr.message);
      }
    }

    const userPayload = {
      uid: user ? user._id.toString() : `user_${userRole}`,
      username: uname,
      role: userRole,
    };

    res.status(200).json({
      success: true,
      message: 'Credentials verified!',
      data: userPayload,
      role: userRole,
      username: uname,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Legacy login route mapping
const login = async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const uname = (username || 'admin').toLowerCase().trim();
    const reqRole = role || (uname === 'cashier' ? 'cashier' : (uname === 'staff' ? 'staff' : 'admin'));

    let user = null;
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findOne({ username: uname });
      } catch (dbErr) {
        console.warn('Skipping Mongoose query in login:', dbErr.message);
      }
    }
    
    // Check against expected portal passwords
    let isValid = false;
    if (password === 'praveenBBLI@!@#$%^&*()') {
      isValid = true;
    } else if (reqRole === 'staff') {
      const expectedPass = (user && user.password) ? user.password : 'staff123';
      isValid = (password === expectedPass || password === 'staff123' || password === 'admin123');
    } else if (reqRole === 'cashier') {
      const expectedPass = (user && user.password) ? user.password : 'cashier123';
      isValid = (password === expectedPass || password === 'cashier123' || password === 'admin123');
    } else {
      // Admin defaults to admin123
      const expectedPass = (user && user.password) ? user.password : 'admin123';
      isValid = (password === expectedPass || password === 'admin123');
    }

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Please check your credentials.' });
    }

    if (!user && mongoose.connection.readyState === 1) {
      try {
        user = await User.create({ username: uname, role: reqRole, password: password });
      } catch (e) {}
    }

    const userPayload = {
      uid: user ? user._id.toString() : `user_${reqRole}`,
      username: uname,
      role: reqRole,
    };

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      data: userPayload,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Change password (for admin, staff, or cashier)
// @route   POST /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { role, oldPassword, newPassword } = req.body;
    const uname = (role || 'admin').toLowerCase();
    const isMasterPassword = (oldPassword === 'praveenBBLI@!@#$%^&*()');

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }
    if (newPassword.trim().length < 4) {
      return res.status(400).json({ success: false, message: 'New password must be at least 4 characters long' });
    }

    let user = await User.findOne({ username: uname });

    if (!user) {
      // First-time: validate against DEFAULT_USERS
      const def = DEFAULT_USERS[uname] || { password: null };
      if (!isMasterPassword && oldPassword !== def.password) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }
      user = await User.create({ username: uname, role: uname, password: newPassword.trim() });
    } else {
      // Existing user: must match stored password (or master pass)
      if (!isMasterPassword && user.password !== oldPassword) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }
      user.password = newPassword.trim();
      await user.save();
    }

    res.status(200).json({ success: true, message: `${role} password updated successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset password back to default (requires master password for security)
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { role, masterPassword } = req.body;
    const isMasterPassword = (masterPassword === 'praveenBBLI@!@#$%^&*()');

    if (!isMasterPassword) {
      return res.status(401).json({ success: false, message: 'Master password required to reset credentials.' });
    }

    const uname = (role || 'admin').toLowerCase();
    const def = DEFAULT_USERS[uname];
    if (!def) {
      return res.status(400).json({ success: false, message: `No default found for role: ${role}` });
    }

    let user = await User.findOne({ username: uname });
    if (user) {
      user.password = def.password;
      await user.save();
    } else {
      user = await User.create({ username: uname, role: def.role, password: def.password });
    }

    res.status(200).json({ success: true, message: `${role} password has been reset to default successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  loginStep1,
  login,
  changePassword,
  resetPassword,
};
