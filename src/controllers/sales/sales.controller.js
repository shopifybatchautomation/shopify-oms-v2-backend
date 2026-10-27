const Sales = require('../../models/sales/Sales.model');

// POST /api/sales/import
// Deletes ALL existing sales data and saves the new array sent by the frontend.
const importSales = async (req, res) => {
  try {
    const items = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Send a non-empty array of sales data.' });
    }

    // Convert styleNumber to a Number and validate before touching the database
    const documents = items.map((item) => ({ ...item, styleNumber: Number(item.styleNumber) }));

    if (documents.some((doc) => !Number.isFinite(doc.styleNumber))) {
      return res.status(400).json({ message: 'Every item needs a numeric styleNumber.' });
    }

    // Remove old data, then insert the new data
    const deleted = await Sales.deleteMany({});
    const inserted = await Sales.insertMany(documents);

    res.status(200).json({
      message: 'Sales data saved successfully.',
      deleted: deleted.deletedCount,
      created: inserted.length,
    });
  } catch (error) {
    console.error('Import failed:', error);
    res.status(500).json({ message: 'Server error while saving sales data.' });
  }
};

// GET /api/sales
// Returns all styles sorted by net sales, then total sales (highest first).
// Optional query: ?sortBy=netSales|totalSales|netAmount&order=desc|asc
const SORT_FIELDS = {
  netSales: 'masterNetSaleUnit',
  totalSales: 'masterTotalSalesUnit',
  netAmount: 'masterNetSales',
};

const getAllSales = async (req, res) => {
  try {
    const primary = SORT_FIELDS[req.query.sortBy] || 'masterNetSaleUnit';
    const direction = req.query.order === 'asc' ? 1 : -1;

    // Ties are broken by the other unit field
    const secondary =
      primary === 'masterNetSaleUnit' ? 'masterTotalSalesUnit' : 'masterNetSaleUnit';

    const sales = await Sales.find().sort({ [primary]: direction, [secondary]: direction });
    res.json(sales);
  } catch (error) {
    console.error('Fetch failed:', error);
    res.status(500).json({ message: 'Server error while fetching sales data.' });
  }
};

// GET /api/sales/:styleNumber
// Returns one style
const getSalesByStyle = async (req, res) => {
  try {
    const styleNumber = Number(req.params.styleNumber);

    if (!Number.isFinite(styleNumber)) {
      return res.status(400).json({ message: 'styleNumber must be a number.' });
    }

    const sale = await Sales.findOne({ styleNumber });

    if (!sale) {
      return res.status(404).json({ message: 'Style not found.' });
    }

    res.json(sale);
  } catch (error) {
    console.error('Fetch failed:', error);
    res.status(500).json({ message: 'Server error while fetching style.' });
  }
};

module.exports = { importSales, getAllSales, getSalesByStyle };
