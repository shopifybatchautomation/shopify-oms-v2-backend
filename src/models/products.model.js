const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    style_number: {
      type: String,
      required: true,
      unique: true,
    },
    handle: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
