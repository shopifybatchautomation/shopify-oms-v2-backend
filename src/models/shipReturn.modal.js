const mongoose = require("mongoose");

const shipReturnSchema = new mongoose.Schema({
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
    required: true,
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
  order_id:{
    type:Number,
  }
},{timestamps:true});


const ShipReturn = mongoose.model('ShipReturn',shipReturnSchema);
module.exports = ShipReturn;