const Product = require('../models/products.model');

// @desc    Bulk upsert products (insert or update if style_number exists)
// @route   POST /api/products/bulk
exports.bulkCreateProducts = async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'products array required and cannot be empty',
      });
    }

    // Validate required fields
    const invalidProducts = [];
    const validProducts = [];

    products.forEach((product, index) => {
      if (!product.style_number || !product.handle) {
        invalidProducts.push({
          index,
          style_number: product.style_number || 'missing',
          message: 'style_number and handle are required',
        });
      } else {
        // Ensure images is an array
        if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
          product.images = ['https://via.placeholder.com/300x300?text=No+Image'];
        }
        validProducts.push(product);
      }
    });

    if (validProducts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid products to upsert',
        invalidProducts,
      });
    }

    // BULK UPSERT: Update if exists, insert if not
    const bulkOps = validProducts.map((product) => ({
      updateOne: {
        filter: { style_number: product.style_number },
        update: {
          $set: {
            handle: product.handle,
            images: product.images,
          },
        },
        upsert: true,
      },
    }));

    const result = await Product.bulkWrite(bulkOps, { ordered: false });

    // Fetch the actual documents to verify
    const styleNumbers = validProducts.map((p) => p.style_number);
    const updatedDocs = await Product.find({
      style_number: { $in: styleNumbers },
    });

    return res.status(200).json({
      success: true,
      message: `Upsert completed: ${result.upsertedCount} inserted, ${result.modifiedCount} updated`,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
      upsertedIds: result.upsertedIds,
      totalProcessed: validProducts.length,
      invalidCount: invalidProducts.length,
      data: updatedDocs, // Return actual data to verify
      invalidProducts: invalidProducts.length > 0 ? invalidProducts : undefined,
    });
  } catch (error) {
    console.error('Bulk upsert error:', error);

    // Handle duplicate key errors
    if (error.name === 'MongoBulkWriteError' || error.code === 11000) {
      return res.status(207).json({
        success: false,
        message: 'Some records failed',
        error: error.message,
        writeErrors: error.writeErrors || [],
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error while bulk upserting products',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
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
    console.log(product);

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
