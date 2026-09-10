const express = require('express');
const {
  getPreCancelledOrders,
  createPreCancelledOrdersBulk,
  finalizePreCancelledOrder,
  restorePreCancelledOrder,
  getPrecancelledOrderByDateRange,
} = require('../controllers/preCancelledOrder.controller');

const router = express.Router();

router.get('/pre-cancelled', getPreCancelledOrders);
router.post('/precancelled-by-date', getPrecancelledOrderByDateRange);
router.post('/pre-cancelled/bulk', createPreCancelledOrdersBulk);
router.post('/pre-cancelled/finalize', finalizePreCancelledOrder);
router.post('/pre-cancelled/restore', restorePreCancelledOrder);

module.exports = router;
