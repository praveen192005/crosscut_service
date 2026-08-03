const Product = require('../models/Product');

// @desc    Get all products with searching, filtering, sorting, and pagination
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const { search, category, branch, gender, status, sortBy, order, page, limit } = req.query;
    
    // Build query object
    const query = {};

    // 1. Search filter (covers name, description, and SKU)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // 2. Exact filters
    if (category) {
      query.category = category;
    }
    if (branch) {
      query.branch = branch;
    }
    if (gender) {
      query.gender = gender;
    }

    // 3. Status filter (Virtual field status logic mapped to query conditions)
    if (status) {
      if (status === 'Out of Stock') {
        query.quantity = 0;
      } else if (status === 'Low Stock') {
        query.quantity = { $gt: 0, $lte: '$minStockThreshold' }; // Wait, $lte comparing with field needs expr in mongoose
        // For query filter: query.$expr = { $and: [ { $gt: ["$quantity", 0] }, { $lte: ["$quantity", "$minStockThreshold"] } ] }
        query.$expr = {
          $and: [
            { $gt: ['$quantity', 0] },
            { $lte: ['$quantity', '$minStockThreshold'] }
          ]
        };
      } else if (status === 'In Stock') {
        query.$expr = { $gt: ['$quantity', '$minStockThreshold'] };
      }
    }

    // Sorting
    let sortOptions = {};
    if (sortBy) {
      const sortOrder = order === 'desc' ? -1 : 1;
      sortOptions[sortBy] = sortOrder;
    } else {
      sortOptions['createdAt'] = -1; // Default to newest
    }

    // Pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skipNum = (pageNum - 1) * limitNum;

    // Execute query
    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sortOptions)
      .skip(skipNum)
      .limit(limitNum);

    res.status(200).json({
      success: true,
      count: products.length,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum
      },
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to fetch products',
      error: error.message
    });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with id ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid Product ID format'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Public
const createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      description,
      category,
      uniformPart,
      branch,
      gender,
      size,
      price,
      received,
      issued,
      minStockThreshold
    } = req.body;

    // Calculate initial quantity based on received & issued if provided, otherwise default to 0
    const receivedStock = parseInt(received, 10) || 0;
    const issuedStock = parseInt(issued, 10) || 0;
    const quantity = Math.max(0, receivedStock - issuedStock);

    const product = await Product.create({
      name,
      sku,
      description,
      category,
      uniformPart,
      branch,
      gender,
      size,
      price,
      received: receivedStock,
      issued: issuedStock,
      quantity,
      minStockThreshold
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    // Handle duplicate SKU error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: `SKU '${req.body.sku}' already exists. SKU must be unique.`
      });
    }
    // Handle mongoose validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to create product',
      error: error.message
    });
  }
};

// @desc    Update product by ID
// @route   PUT /api/products/:id
// @access  Public
const updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with id ${req.params.id}`
      });
    }

    const updates = req.body;

    // If stock adjustments are sent, calculate the new overall quantity
    const finalReceived = updates.received !== undefined ? parseInt(updates.received, 10) : product.received;
    const finalIssued = updates.issued !== undefined ? parseInt(updates.issued, 10) : product.issued;

    // Auto update quantity if received or issued are updated
    if (updates.received !== undefined || updates.issued !== undefined) {
      updates.quantity = Math.max(0, finalReceived - finalIssued);
    } else if (updates.quantity !== undefined) {
      // If quantity is set directly, adjust received to match (keeping consistency)
      updates.received = finalIssued + parseInt(updates.quantity, 10);
    }

    // Apply validation and update options
    product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: `SKU already exists. SKU must be unique.`
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages
      });
    }
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid Product ID format'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to update product',
      error: error.message
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Public
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with id ${req.params.id}`
      });
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Product removed successfully',
      data: {}
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid Product ID format'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to delete product',
      error: error.message
    });
  }
};

// @desc    Get dashboard statistics for products
// @route   GET /api/products/stats
// @access  Public
const getProductStats = async (req, res) => {
  try {
    const stats = await Product.aggregate([
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                totalStockItems: { $sum: '$quantity' },
                totalReceived: { $sum: '$received' },
                totalIssued: { $sum: '$issued' },
                totalValuation: { $sum: { $multiply: ['$quantity', '$price'] } }
              }
            }
          ],
          outOfStock: [
            { $match: { quantity: 0 } },
            { $count: 'count' }
          ],
          lowStock: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $gt: ['$quantity', 0] },
                    { $lte: ['$quantity', '$minStockThreshold'] }
                  ]
                }
              }
            },
            { $count: 'count' }
          ],
          byCategory: [
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' }
              }
            }
          ],
          byBranch: [
            {
              $group: {
                _id: '$branch',
                count: { $sum: 1 },
                totalQuantity: { $sum: '$quantity' }
              }
            }
          ]
        }
      }
    ]);

    const summaryResult = stats[0].summary[0] || {
      totalProducts: 0,
      totalStockItems: 0,
      totalReceived: 0,
      totalIssued: 0,
      totalValuation: 0
    };

    const outOfStockCount = stats[0].outOfStock[0] ? stats[0].outOfStock[0].count : 0;
    const lowStockCount = stats[0].lowStock[0] ? stats[0].lowStock[0].count : 0;

    res.status(200).json({
      success: true,
      data: {
        totalProducts: summaryResult.totalProducts,
        totalStockItems: summaryResult.totalStockItems,
        totalReceived: summaryResult.totalReceived,
        totalIssued: summaryResult.totalIssued,
        totalValuation: summaryResult.totalValuation,
        outOfStockCount,
        lowStockCount,
        byCategory: stats[0].byCategory,
        byBranch: stats[0].byBranch
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to fetch stats',
      error: error.message
    });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats
};
