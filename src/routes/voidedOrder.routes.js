const express = require('express');
const {
  getVoidedOrders,
  createVoidedOrdersBulk,
  blockCustomerAndOrderMoveToCancelledOrder,
} = require('../controllers/voidedOrder.controller');

const router = express.Router();

router.get('/voided', getVoidedOrders);
router.post('/voided/bulk', createVoidedOrdersBulk);
router.post('/voided/block', blockCustomerAndOrderMoveToCancelledOrder);

module.exports = router;
