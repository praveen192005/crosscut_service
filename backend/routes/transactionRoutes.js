const express = require('express');
const router = express.Router();
const { getTransactions, createTransaction } = require('../controllers/transactionController');

router.route('/')
  .get(getTransactions)
  .post(createTransaction);

module.exports = router;
