const mongoose = require('mongoose');
const buildOrderSchema = require('../schemas/orderBaseSchema');

// New table (didn't exist before this rewrite): orders whose Shopify
// Financial Status is "voided". Previously these were only counted on the
// frontend and never persisted.
const voidedOrderSchema = buildOrderSchema({
  void_reason: {
    type: String,
    trim: true,
    default: 'Voided in Shopify',
  },
});

const VoidedOrder = mongoose.model('VoidedOrder', voidedOrderSchema);

module.exports = VoidedOrder;
