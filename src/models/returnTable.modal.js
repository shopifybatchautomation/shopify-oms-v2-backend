const mongoose = require("mongoose");

const returnTableSchema = new mongoose.Schema({
  styleNumber: {
    type: Number,
    required: true,
  },
  size: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    // required: true,
  },
  channel: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  employee_name: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    default: 1,
  },
  order_id: {
    type: Number,
    default: 1
  },
  with_tag: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });


const ReturnTable = mongoose.model('ReturnTable', returnTableSchema);
module.exports = ReturnTable;