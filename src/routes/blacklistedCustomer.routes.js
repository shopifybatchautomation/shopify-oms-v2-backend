const express = require('express');
const {
  createBlacklistedCustomers,
  getBlacklistedCustomers,
} = require('../controllers/blacklisted_customer.controller.js');

const router = express.Router();

router.post('/blacklisted', createBlacklistedCustomers);
router.get('/blacklisted', getBlacklistedCustomers);

module.exports = router;
