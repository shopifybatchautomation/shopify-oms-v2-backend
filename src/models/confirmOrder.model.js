const mongoose = require('mongoose');
const buildOrderSchema = require('../schemas/orderBaseSchema');

const confirmOrderSchema = buildOrderSchema();

const ConfirmOrder = mongoose.model('ConfirmOrder', confirmOrderSchema);

module.exports = ConfirmOrder;
