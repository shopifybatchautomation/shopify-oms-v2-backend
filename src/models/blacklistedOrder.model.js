const mongoose = require('mongoose');
const buildOrderSchema = require('../schemas/orderBaseSchema');

// New table: whenever an incoming order (from upload OR any manual action)
// belongs to a blacklisted customer, it is redirected here instead of its
// normal destination table. See services/blacklist.service.js.
const blacklistedOrderSchema = buildOrderSchema({
  blacklist_reason: {
    type: String,
    trim: true,
    default: 'Customer is blacklisted',
  },
  original_destination: {
    type: String,
    trim: true, // which table the order would have gone to, for audit trail
  },
});

const BlacklistedOrder = mongoose.model('BlacklistedOrder', blacklistedOrderSchema);

module.exports = BlacklistedOrder;
