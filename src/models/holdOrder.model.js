const mongoose = require('mongoose');
const buildOrderSchema = require('../schemas/orderBaseSchema');

// Shopify draft orders parked here until someone confirms them.
const holdOrderSchema = buildOrderSchema({
  source: {
    type: String,
    required: true,
    trim: true,
    default: 'shopify_draft_order',
  },
});

const HoldOrder = mongoose.model('HoldOrder', holdOrderSchema);

module.exports = { HoldOrder };
