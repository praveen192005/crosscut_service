const mongoose = require('mongoose');

const billSchema = new mongoose.Schema(
  {
    billId: {
      type: String,
      required: true,
      unique: true,
    },
    studentId: {
      type: String,
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    grade: {
      type: String,
      default: '',
    },
    branch: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      default: '',
    },
    fatherName: {
      type: String,
      default: '',
    },
    admissionNo: {
      type: String,
      default: '',
    },
    feeAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['Paid', 'Pending'],
      default: 'Pending',
    },
    cashier: {
      type: String,
      default: 'Cashier Desk',
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

billSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret.billId || ret._id.toString();
    ret.amount = ret.feeAmount;
    ret.operator = ret.cashier;
    return ret;
  }
});

const Bill = mongoose.model('Bill', billSchema);

module.exports = Bill;
