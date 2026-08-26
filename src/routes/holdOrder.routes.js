const express = require('express');
const {
  getHoldOrders,
  createHoldOrdersBulk,
  moveHoldOrdersToConfirmed,
  moveHoldOrdersToProccessed,
} = require('../controllers/holdOrder.controller');

const router = express.Router();

router.get('/hold', getHoldOrders);
router.post('/hold/bulk', createHoldOrdersBulk);
router.post('/hold/move-to-confirmed', moveHoldOrdersToConfirmed);
router.post('/hold/move-to-processed', moveHoldOrdersToProccessed);

module.exports = router;
