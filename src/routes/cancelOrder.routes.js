const express = require('express');
const {
  getCancelledOrders,
  createCancelledOrder,
  restoreCancelledOrder,
} = require('../controllers/cancelOrder.controller');

const router = express.Router();

router.get('/cancelled', getCancelledOrders);
router.post('/cancelled', createCancelledOrder);
router.post('/cancelled/restore', restoreCancelledOrder);

module.exports = router;
