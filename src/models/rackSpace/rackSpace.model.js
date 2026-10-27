const mongoose = require('mongoose');

const SIZES = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

// Stock of one size.
// rackSpaces looks like: [{ '10-A': 10, '20-B': 5, '10-D': 5 }]  (rack name -> quantity)
const sizeSchema = new mongoose.Schema(
  {
    inStock: { type: Number, default: 0 },
    rackSpaces: [{ type: Map, of: Number }],
  },
  { _id: false }
);

// Build one field per size: { XXS: sizeSchema, XS: sizeSchema, ... }
const sizeFields = {};
for (const size of SIZES) {
  sizeFields[size] = { type: sizeSchema, default: () => ({}) };
}

// One document per style number
const rackSpaceSchema = new mongoose.Schema(
  {
    styleNumber: { type: Number, required: true, unique: true },
    masterInStock: { type: Number, default: 0 }, // total of all sizes
    ...sizeFields,
  },
  {
    timestamps: true,
    toJSON: { flattenMaps: true }, // sends Map fields as plain objects in API responses
  }
);

module.exports = mongoose.model('RackSpace', rackSpaceSchema);
