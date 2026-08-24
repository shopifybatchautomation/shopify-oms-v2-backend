const express = require('express');
const {
  getConfirmedOrders,
  createConfirmedOrder,
  createConfirmedOrdersBulk,
} = require('../controllers/confirmOrder.controller');

const router = express.Router();

router.get('/confirmed', getConfirmedOrders);
router.post('/confirmed', createConfirmedOrder);
router.post('/confirmed/bulk', createConfirmedOrdersBulk);

module.exports = router;
