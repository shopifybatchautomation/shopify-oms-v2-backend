const express = require('express');
const { bulkCreateProducts, getProductByStyleNumber } = require('../controllers/productController');
const router = express.Router();

router.post('/bulk/create', bulkCreateProducts);
router.get('/:style_number', getProductByStyleNumber);

module.exports = router;
