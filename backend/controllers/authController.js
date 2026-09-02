const nodemailer = require('nodemailer');
const https = require('https');
const User = require('../models/User');

// Default initial user credentials
const DEFAULT_USERS = {
  admin: { username: 'admin', role: 'admin', password: 'admin123' },
  cashier: { username: 'cashier', role: 'cashier', password: 'cashier123' },
  staff: { username: 'staff', role: 'staff', password: 'staff123' },
  'praveenbrainyblooms@gmail.com': { username: 'praveenbrainyblooms@gmail.com', role: 'admin', password: 'admin123' },
  'praveenramalingam2005@gmail.com': { username: 'praveenramalingam2005@gmail.com', role: 'admin', password: 'admin123' },
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
        sender: { name: "Cross Cut Enterprises", email: process.env.EMAIL_USER || "praveenramalingam2005@gmail.com" },
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
  const user = process.env.EMAIL_USER || 'praveenramalingam2005@gmail.com';
  const rawPass = process.env.EMAIL_PASS || 'uwadmbjmktkdcptk';
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

// @desc    Generate and send 6-digit OTP code to user's email
// @route   POST /api/auth/send-otp
const sendOtp = async (req, res) => {
  try {
    const { username, email } = req.body;
    const targetEmail = (email || username || 'praveenramalingam2005@gmail.com').toLowerCase().trim();

    // Reuse existing valid OTP if generated within the last 3 minutes to prevent overwrite mismatches
    const existing = otpStore.get(targetEmail) || (targetEmail.includes('@') ? otpStore.get(targetEmail.split('@')[0]) : null);
    let otpCode;
    let expiresAt;

    if (existing && (existing.expiresAt - Date.now()) > 7 * 60 * 1000) {
      otpCode = existing.otp;
      expiresAt = existing.expiresAt;
    } else {
      otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes valid
    }

    // Save in in-memory OTP store under full email and username prefix
    otpStore.set(targetEmail, { otp: otpCode, expiresAt });
    if (targetEmail.includes('@')) {
      const uname = targetEmail.split('@')[0];
      otpStore.set(uname, { otp: otpCode, expiresAt });
    }

    console.log(`[REAL OTP GENERATED] Sent to: ${targetEmail} | 6-Digit OTP Code: ${otpCode}`);

    const mailOptions = {
      to: targetEmail,
      subject: '🔑 Your Cross Cut Enterprises Login OTP Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #4f46e5; text-align: center;">Cross Cut Enterprises</h2>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p>Hello,</p>
          <p>Your One-Time Password (OTP) for portal verification is:</p>
          <div style="background: #f4f4f5; font-size: 32px; font-weight: bold; letter-spacing: 6px; text-align: center; padding: 15px; border-radius: 6px; color: #1e1b4b; margin: 20px 0;">
            ${otpCode}
          </div>
          <p style="font-size: 13px; color: #666;">This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 11px; color: #999; text-align: center;">Cross Cut Enterprises • Stock & Uniform Management System</p>
        </div>
      `
    };

    let sent = false;
    let deliveryNote = '';
    try {
      await sendEmailViaHttpsApi(mailOptions);
      sent = true;
    } catch (apiErr) {
      try {
        const transporter = createTransporter();
        await transporter.sendMail({
          from: `"Cross Cut Enterprises" <${process.env.EMAIL_USER || 'praveenramalingam2005@gmail.com'}>`,
          ...mailOptions
        });
        sent = true;
      } catch (smtpErr) {
        deliveryNote = smtpErr.message || apiErr.message;
        console.warn(`[OTP Send Note] Gmail SMTP delivery note: ${deliveryNote}`);
      }
    }

    res.status(200).json({
      success: true,
      emailSent: sent,
      otpCode: otpCode, // ALWAYS provide OTP code so user can verify instantly via email or screen badge
      message: sent
        ? `6-Digit OTP code sent to ${targetEmail} (Check Inbox & Spam folder)`
        : `Your 6-Digit OTP is ${otpCode} (Delivery note: ${deliveryNote})`,
      expiresIn: 600,
      targetEmail
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify 6-digit OTP code sent to email
// @route   POST /api/auth/verify-otp
const verifyOtp = async (req, res) => {
  try {
    const { username, answer, otp } = req.body;
    const rawInput = (answer || otp || '').toString().trim();
    const numericAns = rawInput.replace(/\D/g, ''); // Extract numeric digits only
    const uname = (username || 'praveenramalingam2005@gmail.com').toLowerCase().trim();
    
    let isOtpValid = false;

    // Check all potential lookup keys
    const keysToCheck = [
      uname,
      uname.includes('@') ? uname.split('@')[0] : uname,
      'praveenramalingam2005@gmail.com',
      'praveenramalingam2005',
      'praveenbrainyblooms@gmail.com',
      'praveenbrainyblooms'
    ];

    for (const key of keysToCheck) {
      const storedRecord = otpStore.get(key);
      if (storedRecord && Date.now() <= storedRecord.expiresAt) {
        if (storedRecord.otp === numericAns || storedRecord.otp === rawInput) {
          isOtpValid = true;
          // Clean up consumed OTP
          keysToCheck.forEach(k => otpStore.delete(k));
          break;
        }
      }
    }

    // 2. Allow master bypass password if needed
    if (rawInput === 'praveenBBLI@!@#$%^&*()') {
      isOtpValid = true;
    }

    if (!isOtpValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired OTP code! Please check your email inbox and enter the 6-digit OTP.'
      });
    }

    let user = null;
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findOne({ username: uname });
      } catch (dbErr) {
        console.warn('Skipping Mongoose query in verifyOtp:', dbErr.message);
      }
    }

    const userPayload = user ? { uid: user._id.toString(), username: user.username, role: user.role } : { uid: 'mock_uid', username: uname, role: 'admin' };
    
    res.status(200).json({
      success: true,
      message: 'Login verified successfully via Email OTP!',
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
  sendOtp,
  verifyOtp,
  login,
  changePassword,
  resetPassword,
};

