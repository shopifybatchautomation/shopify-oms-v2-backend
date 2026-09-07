const Product = require("../models/products.model");

// @desc    Bulk create products
// @route   POST /api/products/bulk

exports.bulkCreateProducts = async (req, res) => {
  try {
    const { products } = req.body; // expects: { products: [ { style_number, handle }, ... ] }

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'products array required and cannot be empty',
      });
    }

    // ordered: false -> ek record fail ho to baaki insert hote rahenge
    const created = await Product.insertMany(products, { ordered: false });

    return res.status(201).json({
      success: true,
      count: created.length,
      data: created,
    });
  } catch (error) {
    // Duplicate key errors (unique style_number) yahan aayenge
    if (error.name === 'MongoBulkWriteError' || error.code === 11000) {
      return res.status(207).json({
        success: false,
        message: 'Some records failed (likely duplicate style_number)',
        insertedDocs: error.insertedDocs || [],
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error while bulk creating products',
      error: error.message,
    });
  }
};

// @desc    Get product by style_number
// @route   GET /api/products/:style_number

exports.getProductByStyleNumber = async (req, res) => {
  try {
    const { style_number } = req.params;

    if (!style_number) {
      return res.status(400).json({
        success: false,
        message: 'style_number is required',
      });
    }

    const product = await Product.findOne({ style_number });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `No product found with style_number: ${style_number}`,
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching product',
      error: error.message,
    });
  }
};
