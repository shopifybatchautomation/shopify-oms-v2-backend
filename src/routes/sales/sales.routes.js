const express = require('express');
const {
  importSales,
  getAllSales,
  getSalesByStyle,
} = require('../../controllers/sales/sales.controller.js');

const router = express.Router();

router.post('/import', importSales);
router.get('/', getAllSales);
router.get('/:styleNumber', getSalesByStyle);

module.exports = router;
