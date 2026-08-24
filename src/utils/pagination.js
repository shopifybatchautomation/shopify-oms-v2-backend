// Shared pagination + text-search + date-range query builder used by every
// order resource so list endpoints behave consistently.
const { buildDateRange } = require('./dateUtils');

/**
 * @param {import('mongoose').Model} Model
 * @param {Object} options
 * @param {number} options.page
 * @param {number} options.limit
 * @param {string} [options.search]
 * @param {string[]} [options.searchFields] fields to $regex search across
 * @param {string} [options.startDate]
 * @param {string} [options.endDate]
 * @param {Object} [options.extraFilter] additional mongo filter merged in
 */
const paginateQuery = async (
  Model,
  { page = 1, limit = 50, search = '', searchFields = [], startDate, endDate, extraFilter = {} }
) => {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 20);

  const filter = { ...extraFilter };

  if (search && searchFields.length > 0) {
    const orConditions = searchFields.map((field) => ({
      [field]: { $regex: search, $options: 'i' },
    }));

    // Allow numeric search fields (styleNumber, price, customer_id) to match too.
    if (!isNaN(search) && search.trim() !== '') {
      orConditions.push({ styleNumber: Number(search) });
      orConditions.push({ price: Number(search) });
    }

    filter.$or = orConditions;
  }

  if (startDate || endDate) {
    const { start, end } = buildDateRange(startDate, endDate);
    filter.order_date = { $gte: start, $lte: end };
  }

  const totalRecords = await Model.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(totalRecords / limitNum));

  const records = await Model.find(filter)
    .sort({ order_date: -1, createdAt: -1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum);

  return {
    records,
    pagination: {
      page: pageNum,
      limit: limitNum,
      totalRecords,
      totalPages,
    },
  };
};

module.exports = { paginateQuery };
