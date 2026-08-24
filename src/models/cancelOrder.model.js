const mongoose = require('mongoose');
const buildOrderSchema = require('../schemas/orderBaseSchema');

// This is the "cancelled by admin" table: orders manually cancelled by a
// staff member (as opposed to PreCancelledOrder, which holds system-flagged
// orders awaiting review).
const cancelOrderSchema = buildOrderSchema({
  cancelled_by: {
    type: String,
    trim: true,
    default: 'admin',
  },
  cancel_note: {
    type: String,
    trim: true,
  },
});

const CancelOrder = mongoose.model('CancelOrder', cancelOrderSchema);

module.exports = CancelOrder;
