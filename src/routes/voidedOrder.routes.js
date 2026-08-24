const express = require('express');
const { getVoidedOrders, createVoidedOrdersBulk } = require('../controllers/voidedOrder.controller');

const router = express.Router();

router.get('/voided', getVoidedOrders);
router.post('/voided/bulk', createVoidedOrdersBulk);

module.exports = router;
