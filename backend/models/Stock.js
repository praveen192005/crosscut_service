const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema(
  {
    branch: {
      type: String,
      required: [true, 'Branch location is required'],
      trim: true,
    },
    uniformType: {
      type: String,
      required: [true, 'Uniform type is required'],
      trim: true,
      default: 'General',
    },
    uniformPart: {
      type: String,
      enum: ['Top', 'Bottom', 'Full Set', 'Other', 'N/A'],
      default: 'Top',
    },
    gender: {
      type: String,
      enum: ['Boys', 'Girls', 'Unisex'],
      default: 'Unisex',
    },
    size: {
      type: String,
      required: [true, 'Size is required'],
      trim: true,
    },
    received: {
      type: Number,
      min: [0, 'Received stock cannot be negative'],
      default: 0,
    },
    issued: {
      type: Number,
      min: [0, 'Issued stock cannot be negative'],
      default: 0,
    },
    remaining: {
      type: Number,
      min: [0, 'Remaining stock cannot be negative'],
      default: 0,
    },
    minStockThreshold: {
      type: Number,
      default: 5,
    },
    price: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Auto compute remaining before save
stockSchema.pre('save', function (next) {
  this.remaining = Math.max(0, this.received - this.issued);
  this.lastUpdated = new Date();
  next();
});

const Stock = mongoose.model('Stock', stockSchema);

module.exports = Stock;
