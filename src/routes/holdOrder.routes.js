const express = require('express');
const {
  getHoldOrders,
  createHoldOrdersBulk,
  moveHoldOrdersToConfirmed,
} = require('../controllers/holdOrder.controller');

const router = express.Router();

router.get('/hold', getHoldOrders);
router.post('/hold/bulk', createHoldOrdersBulk);
router.post('/hold/move-to-confirmed', moveHoldOrdersToConfirmed);

module.exports = router;
