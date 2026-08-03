const express = require('express');
const router = express.Router();
const { login, loginStep1, verifyOtp, changePassword } = require('../controllers/authController');

router.post('/login', login);
router.post('/login-step1', loginStep1);
router.post('/verify-otp', verifyOtp);
router.post('/change-password', changePassword);

module.exports = router;

