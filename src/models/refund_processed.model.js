const mongoose = require('mongoose');
const refundProcessedSchema = new mongoose.Schema(
  {
    order_id: {
      type: String,
      required: true,
      unique: true,
    },
    customer_name: {
      type: String,
    },
    customer_mobile: {
      type: String,
    },
    customer_email: {
      type: String,
    },
    payment_methods: [String],
    refund_status: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const RefundOrders = mongoose.model('RefundOrders', refundProcessedSchema);
module.exports = RefundOrders;
