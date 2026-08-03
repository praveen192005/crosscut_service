const Transaction = require('../models/Transaction');

// @desc    Get all transactions
// @route   GET /api/transactions
const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({}).sort({ timestamp: -1 });
    res.status(200).json({ success: true, count: transactions.length, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create transaction record
// @route   POST /api/transactions
const createTransaction = async (req, res) => {
  try {
    const tx = await Transaction.create(req.body);
    res.status(201).json({ success: true, data: tx });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTransactions,
  createTransaction,
};
