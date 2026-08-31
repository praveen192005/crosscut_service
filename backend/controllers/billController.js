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
    const { studentId, studentName, grade, branch, gender, feeAmount, amount, cashier, operator, fatherName, admissionNo, yellowFee, pinkFee, sportsFee, otherFee, otherFeePurpose, otherFeeDetails } = req.body;
    
    const yFee = parseFloat(yellowFee) || 0;
    const pFee = parseFloat(pinkFee) || 0;
    const sFee = parseFloat(sportsFee) || 0;
    const oFee = parseFloat(otherFee) || 0;
    const calcTotal = yFee + pFee + sFee + oFee;

    const valFee = (feeAmount !== undefined ? feeAmount : amount);
    const finalFee = (calcTotal > 0 && valFee === undefined) ? calcTotal : (valFee !== undefined ? parseFloat(valFee) : calcTotal);

    if (!studentId || !studentName) {
      return res.status(400).json({ success: false, message: 'studentId and studentName are required' });
    }

    const sequentialBills = await Bill.find({ billId: /^BILL-\d+$/i });
    let maxNum = 0;
    sequentialBills.forEach(b => {
      const match = b.billId.match(/^BILL-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num < 1000000000 && num > maxNum) {
          maxNum = num;
        }
      }
    });
    const billId = `BILL-${maxNum + 1}`;

    const bill = await Bill.create({
      billId,
      studentId,
      studentName,
      grade: grade || '',
      branch: branch || 'BBLI',
      gender: gender || '',
      fatherName: fatherName || '',
      admissionNo: admissionNo || '',
      feeAmount: finalFee,
      yellowFee: yFee,
      pinkFee: pFee,
      sportsFee: sFee,
      otherFee: oFee,
      otherFeePurpose: otherFeePurpose || '',
      otherFeeDetails: otherFeeDetails || '',
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

// @desc    Update bill details (e.g. fee amount)
// @route   PUT /api/bills/:id
const updateBill = async (req, res) => {
  try {
    const { feeAmount, amount, cashier, operator } = req.body;
    const searchId = req.params.id;

    const queryConditions = [{ billId: searchId }];
    if (searchId && searchId.match(/^[0-9a-fA-F]{24}$/)) {
      queryConditions.push({ _id: searchId });
    }

    let bill = await Bill.findOne({ $or: queryConditions });

    if (!bill) {
      bill = await Bill.findOne({ billId: { $regex: new RegExp(`^${searchId}$`, 'i') } });
    }

    if (!bill) {
      return res.status(404).json({ success: false, message: `Bill not found with ID ${searchId}` });
    }

    const newFee = feeAmount !== undefined ? feeAmount : amount;
    if (newFee !== undefined) {
      bill.feeAmount = parseFloat(newFee) || 0;
    }
    if (operator || cashier) {
      bill.cashier = operator || cashier;
    }

    await bill.save();
    res.status(200).json({ success: true, data: bill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getBills,
  createBill,
  payBill,
  updateBill,
  deleteBill,
  deleteAllBills,
};

