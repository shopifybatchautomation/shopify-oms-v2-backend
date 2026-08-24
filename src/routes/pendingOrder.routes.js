const express = require('express');
const {
  getPendingOrders,
  createPendingOrder,
  createPendingOrdersBulk,
  confirmPendingOrder,
  cancelPendingOrder,
  editPendingOrder,
} = require('../controllers/pendingOrder.controller');

const router = express.Router();

router.get('/pending', getPendingOrders);
router.post('/pending', createPendingOrder);
router.post('/pending/bulk', createPendingOrdersBulk);
router.post('/pending/confirm', confirmPendingOrder);
router.post('/pending/cancel', cancelPendingOrder);
router.patch('/pending/:id', editPendingOrder);

module.exports = router;
