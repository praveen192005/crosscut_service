const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'Product SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Product category/uniform type is required'],
      trim: true,
      default: 'Uniform',
    },
    uniformPart: {
      type: String,
      enum: ['Top', 'Bottom', 'Full Set', 'Other'],
      default: 'Other',
    },
    branch: {
      type: String,
      required: [true, 'Branch location is required'],
      trim: true,
    },
    gender: {
      type: String,
      enum: ['Boys', 'Girls', 'Unisex'],
      default: 'Unisex',
    },
    size: {
      type: String,
      required: [true, 'Product size is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price cannot be negative'],
      default: 0,
    },
    quantity: {
      type: Number,
      required: [true, 'Available quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
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
    minStockThreshold: {
      type: Number,
      min: [0, 'Threshold cannot be negative'],
      default: 5,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual property to check if stock level status is In Stock, Low Stock, or Out of Stock
productSchema.virtual('status').get(function () {
  if (this.quantity === 0) {
    return 'Out of Stock';
  }
  if (this.quantity <= this.minStockThreshold) {
    return 'Low Stock';
  }
  return 'In Stock';
});

// Configure schema to include virtuals in JSON outputs
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
