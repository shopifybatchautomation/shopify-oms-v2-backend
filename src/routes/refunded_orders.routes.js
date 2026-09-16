const { Router } = require('express');
const {
  getRefundedOrders,
  deleteRefundOrder,
  bulkCreateRefundOrders,
  getNonRefundedOrders,
} = require('../controllers/refund_processed.controller');
const router = Router();

router.get('/non-refund', getNonRefundedOrders);
router.get('/', getRefundedOrders);
router.post('/', bulkCreateRefundOrders);
router.delete('/:id', deleteRefundOrder);

module.exports = router;
