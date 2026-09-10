const express = require('express');
const getOrdersStats = require('../controllers/ordersDashboard.controller');
const router = express.Router();

router.post('/stats', getOrdersStats);

module.exports = router;
