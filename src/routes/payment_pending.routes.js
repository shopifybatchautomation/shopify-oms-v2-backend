const { Router } = require('express');
const {
  fetchPaymentPendingOrders,
  fetchRefundFailedOrders,
  createPaymentPendingOrders,
  salesSummary,
  getPaymentPendingOrders,
  updateCustomerContacted,
} = require('../controllers/payment_pending.controller');
const router = Router();
const helperRoute = '/payment-pending';

router.get(helperRoute, fetchPaymentPendingOrders);
router.get(`${helperRoute}-orders`, getPaymentPendingOrders);
router.patch(`${helperRoute}/:id`, updateCustomerContacted);
router.post(`${helperRoute}/create/bulk`, createPaymentPendingOrders);

router.post('/sales', salesSummary);
router.get('/refund-failed', fetchRefundFailedOrders);
module.exports = router;
