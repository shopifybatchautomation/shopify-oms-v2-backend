const mongoose = require('mongoose');
const buildOrderSchema = require('../schemas/orderBaseSchema');

// Orders auto-flagged during upload (e.g. Shopify "cancelled" tag) that need
// a human to confirm the final cancellation before they move to CancelOrder.
const preCancelledOrderSchema = buildOrderSchema({
  cancel_reason: {
    type: String,
    trim: true,
    default: 'Cancelled Tag',
  },
});

const PreCancelledOrder = mongoose.model('PreCancelledOrder', preCancelledOrderSchema);

module.exports = PreCancelledOrder;
