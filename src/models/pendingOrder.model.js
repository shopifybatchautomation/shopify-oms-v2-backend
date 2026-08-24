const mongoose = require('mongoose');
const buildOrderSchema = require('../schemas/orderBaseSchema');

// Reasons an order sits in Pending, per the business rules:
//  - Bad Address / High RTO Risk / Medium RTO Risk -> Shopify tag driven
//  - High Value COD -> COD order whose price exceeds the ₹4000 threshold
//    (this is the bucket the dashboard reports separately as "final pending")
//  - Not Confirmed -> catch-all for an order that doesn't carry any risk tag
//    and isn't paid/COD-confirmed yet (still needs a manual confirmation
//    call). Added on top of the 4 reasons called out in the spec because
//    without it ordinary "awaiting confirmation" orders would have nowhere
//    valid to go.
const PENDING_REASONS = [
  'Bad Address',
  'High RTO Risk',
  'Medium RTO Risk',
  'High Value COD',
  'Not Confirmed',
];

const pendingOrderSchema = buildOrderSchema({
  // An order can be flagged for more than one reason at once (e.g. both
  // "High RTO Risk" and "Bad Address"), so this is an array rather than a
  // single value -- the Pending Orders page shows every reason as a badge.
  pending_reason: {
    type: [String],
    enum: PENDING_REASONS,
    required: true,
    validate: {
      validator: (arr) => Array.isArray(arr) && arr.length > 0,
      message: 'At least one pending_reason is required.',
    },
  },
});

const PendingOrder = mongoose.model('PendingOrder', pendingOrderSchema);

module.exports = PendingOrder;
module.exports.PENDING_REASONS = PENDING_REASONS;
