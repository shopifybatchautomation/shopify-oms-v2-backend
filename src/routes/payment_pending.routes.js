const { Router } = require('express');
const {
  fetchPaymentPendingOrders,
  fetchRefundFailedOrders,
  createPaymentPendingOrders,
  salesSummary,
} = require('../controllers/payment_pending.controller');
const router = Router();

router.get('/payment-pending', fetchPaymentPendingOrders);
router.post('/payment-pending/create/bulk', createPaymentPendingOrders);
router.post('/sales', salesSummary);
router.get('/refund-failed', fetchRefundFailedOrders);
module.exports = router;
