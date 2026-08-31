const express = require('express');
const router = express.Router();
const { login, loginStep1, sendOtp, verifyOtp, changePassword, resetPassword } = require('../controllers/authController');

router.post('/login', login);
router.post('/login-step1', loginStep1);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/change-password', changePassword);
router.post('/reset-password', resetPassword);

module.exports = router;

