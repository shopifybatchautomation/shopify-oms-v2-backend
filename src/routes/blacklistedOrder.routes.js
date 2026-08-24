const express = require('express');
const {
  getBlacklistedOrders,
  createBlacklistedOrdersBulk,
} = require('../controllers/blacklistedOrder.controller');

const router = express.Router();

router.get('/blacklisted', getBlacklistedOrders);
router.post('/blacklisted/bulk', createBlacklistedOrdersBulk);

module.exports = router;
