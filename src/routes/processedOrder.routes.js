const express = require('express');
const {
  createProcessedOrder,
  getProcessedOrder,
  createProcessedOrderDirect,
} = require('../controllers/processedOrder.controller');

const router = express.Router();

router.get('/processed', getProcessedOrder);
router.post('/processed/bulk', createProcessedOrder); // Move from confirmed to processed
router.post('/processed/bulk-direct', createProcessedOrderDirect); // Direct create with data

module.exports = router;
