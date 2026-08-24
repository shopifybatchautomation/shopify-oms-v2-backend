const mongoose = require('mongoose');
const buildOrderSchema = require('../schemas/orderBaseSchema');

const processedOrderSchema = buildOrderSchema({
  processed_by: {
    type: String,
    trim: true,
    default: 'system',
  },
});

const ProcessedOrder = mongoose.model('ProcessedOrder', processedOrderSchema);

module.exports = ProcessedOrder;
