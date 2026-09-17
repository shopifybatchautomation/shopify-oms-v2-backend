const mongoose = require('mongoose');
const buildOrderSchema = require('../schemas/orderBaseSchema');

const paymentPendingSchema = buildOrderSchema({
  pending_reason: {
    type: String,
    trim: true,
    default: 'Order is prepaid but payment is pending ',
  },
  customer_contacted: {
    type: Boolean,
    default: false,
  },
});

const PaymentPending = mongoose.model('PaymentPending', paymentPendingSchema);

module.exports = PaymentPending;
