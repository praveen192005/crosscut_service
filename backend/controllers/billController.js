const Bill = require('../models/Bill');

// @desc    Get all bills
// @route   GET /api/bills
const getBills = async (req, res) => {
  try {
    const bills = await Bill.find({}).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: bills.length, data: bills });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new bill
// @route   POST /api/bills
const createBill = async (req, res) => {
  try {
    const { studentId, studentName, grade, branch, gender, feeAmount, amount, cashier, operator } = req.body;
    
    const valFee = feeAmount !== undefined ? feeAmount : amount;
    if (!studentId || !studentName || valFee === undefined) {
      return res.status(400).json({ success: false, message: 'studentId, studentName, and feeAmount are required' });
    }

    const billId = `BILL-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const bill = await Bill.create({
      billId,
      studentId,
      studentName,
      grade: grade || '',
      branch: branch || 'BBLI',
      gender: gender || '',
      feeAmount: parseFloat(valFee) || 0,
      status: 'Pending',
      cashier: operator || cashier || 'Cashier Desk',
    });

    res.status(201).json({ success: true, data: bill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Pay bill
// @route   PUT /api/bills/:id/pay
const payBill = async (req, res) => {
  try {
    const { operator, cashier } = req.body;
    const searchId = req.params.id;

    const queryConditions = [{ billId: searchId }];
    if (searchId && searchId.match(/^[0-9a-fA-F]{24}$/)) {
      queryConditions.push({ _id: searchId });
    }

    let bill = await Bill.findOne({ $or: queryConditions });

    if (!bill) {
      // Case-insensitive fallback
      bill = await Bill.findOne({ billId: { $regex: new RegExp(`^${searchId}$`, 'i') } });
    }

    if (!bill) {
      return res.status(404).json({ success: false, message: `Bill not found with ID ${searchId}` });
    }

    bill.status = 'Paid';
    bill.paidAt = new Date();
    if (operator || cashier) {
      bill.cashier = operator || cashier;
    }

    await bill.save();
    res.status(200).json({ success: true, data: bill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete single bill
// @route   DELETE /api/bills/:id
const deleteBill = async (req, res) => {
  try {
    const searchId = req.params.id;
    const queryConditions = [{ billId: searchId }];
    if (searchId && searchId.match(/^[0-9a-fA-F]{24}$/)) {
      queryConditions.push({ _id: searchId });
    }
    await Bill.deleteOne({ $or: queryConditions });
    res.status(200).json({ success: true, message: 'Bill deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete all bills
// @route   DELETE /api/bills/all
const deleteAllBills = async (req, res) => {
  try {
    await Bill.deleteMany({});
    res.status(200).json({ success: true, message: 'All bills deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getBills,
  createBill,
  payBill,
  deleteBill,
  deleteAllBills,
};
