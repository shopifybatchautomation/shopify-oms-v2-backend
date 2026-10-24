const express = require('express');
const router = express.Router();
const {
  getOutOfStocksProduct,
  getActiveProducts,
  getDraftProducts,
  getPartialOutOfStock,
} = require('../controllers/shopify_products.controller.js');

router.get('/out-of-stocks', getOutOfStocksProduct);
router.get('/active-products', getActiveProducts);
router.get('/draft-products', getDraftProducts);
router.get('/zero-inventory', getPartialOutOfStock);

module.exports = router;
