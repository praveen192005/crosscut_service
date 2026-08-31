const nodemailer = require('nodemailer');
const https = require('https');
const User = require('../models/User');

// Default initial user credentials
const DEFAULT_USERS = {
  admin: { username: 'admin', role: 'admin', password: 'admin123' },
  cashier: { username: 'cashier', role: 'cashier', password: 'cashier123' },
  staff: { username: 'staff', role: 'staff', password: 'staff123' },
  'praveenbrainyblooms@gmail.com': { username: 'praveenbrainyblooms@gmail.com', role: 'admin', password: 'admin123' },
};

// In-memory OTP storage: key -> { otp, expiresAt, userPayload }
const otpStore = new Map();

// Helper to send email via HTTPS API (Port 443) which is never blocked by cloud hosts like Render
const sendEmailViaHttpsApi = (mailOptions) => {
  return new Promise((resolve, reject) => {
    const brevoApiKey = process.env.BREVO_API_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (brevoApiKey) {
      const payload = JSON.stringify({
        sender: { name: "Cross Cut Enterprises", email: process.env.EMAIL_USER || "praveenbrainyblooms@gmail.com" },
        to: [{ email: mailOptions.to }],
        subject: mailOptions.subject,
        htmlContent: mailOptions.html,
      });

      const options = {
        hostname: 'api.brevo.com',
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload),
        },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ provider: 'Brevo API', body });
          } else {
            reject(new Error(`Brevo API returned status ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.write(payload);
      req.end();
      return;
    }

    if (resendApiKey) {
      const payload = JSON.stringify({
        from: process.env.RESEND_FROM || "onboarding@resend.dev",
        to: [mailOptions.to],
        subject: mailOptions.subject,
        html: mailOptions.html,
      });

      const options = {
        hostname: 'api.resend.com',
        path: '/emails',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ provider: 'Resend API', body });
          } else {
            reject(new Error(`Resend API returned status ${res.statusCode}: ${body}`));
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.write(payload);
      req.end();
      return;
    }

    reject(new Error('No HTTPS API Key configured'));
  });
};

// Configure Nodemailer transporter optimized for cloud platforms (Render, etc.)
const createTransporter = () => {
  const user = process.env.EMAIL_USER || 'praveenbrainyblooms@gmail.com';
  const rawPass = process.env.EMAIL_PASS || 'euakdzdsvgruofbc';
  const pass = rawPass.replace(/\s+/g, ''); // Strip any space from Google App Password

  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const secure = process.env.EMAIL_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: secure, // false for 587 (STARTTLS), true for 465
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });
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
    const ALLOWED_USERNAMES = ['praveenbrainyblooms@gmail.com', 'admin', 'staff', 'cashier', 'staffs', 'accounts'];
    if (!ALLOWED_USERNAMES.includes(uname)) {
      return res.status(403).json({ success: false, message: 'Access denied. Invalid credentials.' });
    }

    // Password Check: Master password or role/default password
    if (password !== 'praveenBBLI@!@#$%^&*()' && password !== 'admin123' && password !== 'cashier123' && password !== 'staff123') {
      return res.status(401).json({ success: false, message: 'Incorrect password. Please check your credentials.' });
    }

    const userRole = role || (uname === 'cashier' ? 'cashier' : (uname === 'staff' ? 'staff' : 'admin'));
    let user = await User.findOne({ username: uname });

    if (!user) {
      user = await User.create({ username: uname, role: userRole, password: password });
    }

    const userPayload = {
      uid: user._id.toString(),
      username: user.username,
      role: user.role,
    };

    res.status(200).json({
      success: true,
      message: 'Credentials verified!',
      data: userPayload,
      role: user.role,
      username: user.username,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify Security Question (Answer: BEST)
// @route   POST /api/auth/verify-otp
const verifyOtp = async (req, res) => {
  try {
    const { username, answer, otp } = req.body;
    const ans = (answer || otp || '').toString().trim();
    
    if (ans !== 'BesT') {
      return res.status(401).json({ success: false, message: 'Incorrect security answer! Access denied.' });
    }

    const uname = (username || 'praveenbrainyblooms@gmail.com').toLowerCase();
    let user = await User.findOne({ username: uname });
    const userPayload = user ? { uid: user._id.toString(), username: user.username, role: user.role } : { uid: 'mock_uid', username: uname, role: 'admin' };
    
    res.status(200).json({
      success: true,
      message: 'Login verified successfully!',
      data: userPayload,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate user login (Portal login endpoint)
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and Password are required' });
    }

    const uname = (username || '').toLowerCase().trim();
    const reqRole = (role || (uname === 'cashier' ? 'cashier' : (uname === 'staff' ? 'staff' : 'admin'))).toLowerCase();

    let user = await User.findOne({ username: uname });
    
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

    if (!user) {
      user = await User.create({ username: uname, role: reqRole, password: password });
    }

    const userPayload = {
      uid: user._id.toString(),
      username: user.username,
      role: user.role,
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
  verifyOtp,
  login,
  changePassword,
  resetPassword,
};

