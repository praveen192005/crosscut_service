const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Receive', 'Issue', 'Adjust', 'Return'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    branch: {
      type: String,
      required: true,
    },
    uniformType: {
      type: String,
      default: 'General',
    },
    uniformPart: {
      type: String,
      default: 'Top',
    },
    gender: {
      type: String,
      default: 'Unisex',
    },
    size: {
      type: String,
      default: 'N/A',
    },
    quantity: {
      type: Number,
      required: true,
    },
    operator: {
      type: String,
      default: 'System',
    },
    studentId: {
      type: String,
      default: null,
    },
    studentName: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    return ret;
  }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
