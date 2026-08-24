const mongoose = require('mongoose');
const blacklistedCustomerSchema = new mongoose.Schema(
  {
    customer_id: {
      type: Number,
      required: [true, 'Customer id is required'],
    },
    first_name: {
      type: String,
      required: true,
      trim: true,
    },
    last_name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
  },
  { timestamps: true }
);

const BlackListedCustomer = mongoose.model('BlacklistedCustomer', blacklistedCustomerSchema);
module.exports = { BlackListedCustomer };
