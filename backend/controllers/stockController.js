const Stock = require('../models/Stock');
const Transaction = require('../models/Transaction');

// @desc    Get all stock items
// @route   GET /api/stocks
const getStocks = async (req, res) => {
  try {
    const stocks = await Stock.find({}).sort({ updatedAt: -1 });
    res.status(200).json({
      success: true,
      count: stocks.length,
      data: stocks,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add or update stock item
// @route   POST /api/stocks/add
const addStock = async (req, res) => {
  try {
    const { branch, gender, size, qty, operator, uniformType, part } = req.body;
    
    if (!branch || !gender || !size || qty === undefined) {
      return res.status(400).json({ success: false, message: 'Branch, gender, size, and quantity are required' });
    }

    const typeLabel = uniformType || 'General';
    const partLabel = part || 'Top';
    const addQty = parseInt(qty, 10) || 0;

    let stock = await Stock.findOne({
      branch,
      uniformType: typeLabel,
      uniformPart: partLabel,
      gender,
      size,
    });

    if (stock) {
      stock.received += addQty;
      stock.remaining = Math.max(0, stock.received - stock.issued);
      stock.lastUpdated = new Date();
      await stock.save();
    } else {
      stock = await Stock.create({
        branch,
        uniformType: typeLabel,
        uniformPart: partLabel,
        gender,
        size,
        received: addQty,
        issued: 0,
        remaining: addQty,
      });
    }

    // Log transaction
    await Transaction.create({
      type: 'Receive',
      branch,
      uniformType: typeLabel,
      uniformPart: partLabel,
      gender,
      size,
      quantity: addQty,
      operator: operator || 'System',
    });

    res.status(200).json({ success: true, data: stock });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete single stock item
// @route   DELETE /api/stocks
const deleteStock = async (req, res) => {
  try {
    const { branch, uniformType, uniformPart, gender, size } = req.body;
    await Stock.deleteOne({
      branch,
      uniformType: uniformType || 'General',
      uniformPart: uniformPart || 'Top',
      gender,
      size,
    });
    res.status(200).json({ success: true, message: 'Stock item deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete all stocks
// @route   DELETE /api/stocks/all
const deleteAllStocks = async (req, res) => {
  try {
    await Stock.deleteMany({});
    res.status(200).json({ success: true, message: 'All stocks cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStocks,
  addStock,
  deleteStock,
  deleteAllStocks,
};
