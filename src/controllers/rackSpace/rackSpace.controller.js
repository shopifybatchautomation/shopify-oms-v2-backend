const RackSpace = require('../../models/rackSpace/rackSpace.model.js');

// POST /api/v1/rack-space/import
// Deletes ALL existing rack space data and saves the new array sent by the frontend.
const importRackSpace = async (req, res) => {
  try {
    const items = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Send a non-empty array of rack space data.' });
    }

    // Convert styleNumber to a Number and validate before touching the database
    const documents = items.map((item) => ({ ...item, styleNumber: Number(item.styleNumber) }));

    if (documents.some((doc) => !Number.isFinite(doc.styleNumber))) {
      return res.status(400).json({ message: 'Every item needs a numeric styleNumber.' });
    }

    // Remove old data, then insert the new data
    const deleted = await RackSpace.deleteMany({});
    const inserted = await RackSpace.insertMany(documents);

    res.status(200).json({
      message: 'Rack space data saved successfully.',
      deleted: deleted.deletedCount,
      created: inserted.length,
    });
  } catch (error) {
    console.error('Rack space import failed:', error);
    res.status(500).json({ message: 'Server error while saving rack space data.' });
  }
};

// GET /api/v1/rack-space
// Returns all styles, highest stock first
const getAllRackSpace = async (req, res) => {
  try {
    const data = await RackSpace.find().sort({ masterInStock: -1, styleNumber: 1 });
    res.json(data);
  } catch (error) {
    console.error('Rack space fetch failed:', error);
    res.status(500).json({ message: 'Server error while fetching rack space data.' });
  }
};

// GET /api/v1/rack-space/:styleNumber
// Returns one style
const getRackSpaceByStyle = async (req, res) => {
  try {
    const styleNumber = Number(req.params.styleNumber);

    if (!Number.isFinite(styleNumber)) {
      return res.status(400).json({ message: 'styleNumber must be a number.' });
    }

    const data = await RackSpace.findOne({ styleNumber });

    if (!data) {
      return res.status(404).json({ message: 'Style not found.' });
    }

    res.json(data);
  } catch (error) {
    console.error('Rack space fetch failed:', error);
    res.status(500).json({ message: 'Server error while fetching style.' });
  }
};

module.exports = { importRackSpace, getAllRackSpace, getRackSpaceByStyle };
