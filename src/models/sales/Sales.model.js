const mongoose = require('mongoose');

const SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

// Numbers stored for one size (same shape for every size)
const sizeSchema = new mongoose.Schema(
  {
    totalSales: { type: Number, default: 0 },
    netSales: { type: Number, default: 0 },
    customerReturn: { type: Number, default: 0 },
    courierReturn: { type: Number, default: 0 },
    unitCancelled: { type: Number, default: 0 },
    netSalesAmount: { type: Number, default: 0 },
  },
  { _id: false }
);

// Build one field per size: { XXS: sizeSchema, XS: sizeSchema, ... }
const sizeFields = {};
for (const size of SIZES) {
  sizeFields[size] = { type: sizeSchema, default: () => ({}) };
}

// One document per style number
const salesSchema = new mongoose.Schema(
  {
    styleNumber: { type: Number, required: true, unique: true },

    // Master totals (sum of all sizes)
    masterTotalSalesUnit: { type: Number, default: 0 },
    masterNetSaleUnit: { type: Number, default: 0 },
    masterCustomerReturn: { type: Number, default: 0 },
    masterCourierReturn: { type: Number, default: 0 },
    masterCancelled: { type: Number, default: 0 },
    masterNetSales: { type: Number, default: 0 },

    // Size-wise data
    ...sizeFields,
  },
  { timestamps: true }
);

// Indexes used for sorting
salesSchema.index({ masterNetSaleUnit: -1 });
salesSchema.index({ masterTotalSalesUnit: -1 });

module.exports = mongoose.model('Sales', salesSchema);
