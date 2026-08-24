const mongoose = require('mongoose');

// Shared field set for every order-status collection (confirmed, pending,
// pre-cancelled, cancelled, hold, voided, blacklisted-orders). Keeping this
// in one place guarantees every table gets the same core fields (including
// `price`, which was missing everywhere before this rewrite) and keeps
// dashboard aggregation queries simple since every collection shares the
// same shape.
//
// Pass `extra` to bolt on table-specific fields (e.g. pending_reason).
const buildOrderSchema = (extra = {}, schemaOptions = {}) => {
  return new mongoose.Schema(
    {
      order_id: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },
      customer_id: {
        type: Number,
      },
      customer_name: {
        type: String,
        trim: true,
      },
      customer_email: {
        type: String,
        trim: true,
        lowercase: true,
        index: true,
      },
      styleNumber: {
        type: Number,
        required: true,
      },
      size: {
        type: String,
        required: true,
        trim: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        required: true,
        default: 0,
      },
      order_date: {
        type: Date,
        required: true,
        default: Date.now,
        index: true,
      },
      shipping_method: {
        type: String,
        trim: true,
        default: 'NA',
      },
      payment_method: {
        type: String,
        trim: true,
        default: 'NA',
      },
      // Normalised bucket used by the dashboard's COD vs Prepaid breakdown.
      payment_type: {
        type: String,
        enum: ['COD', 'Prepaid'],
        required: true,
        default: 'COD',
      },
      payment_status: {
        type: String,
        trim: true,
        default: 'NA',
      },
      order_status: {
        type: String,
        trim: true,
        default: 'NA',
      },
      contact_number: {
        type: String,
        trim: true,
      },
      source: {
        type: String,
        trim: true,
        default: 'manual',
      },
      is_blacklisted: {
        type: Boolean,
        default: false,
      },
      ...extra,
    },
    { timestamps: true, ...schemaOptions }
  );
};

module.exports = buildOrderSchema;
