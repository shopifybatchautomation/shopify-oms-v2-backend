const { BlackListedCustomer } = require('../models/blacklisted_customer.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// =======================================
// Bulk Create Blacklisted Customers
// POST /api/blacklisted-customers
// =======================================
const createBlacklistedCustomers = async (req, res, next) => {
  try {
    const customers = req.body;

    if (!Array.isArray(customers) || customers.length === 0) {
      return next(new ApiError(400, 'Request body must be a non-empty array of customers.'));
    }

    const insertedCustomers = await BlackListedCustomer.insertMany(customers);

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          `${insertedCustomers.length} customers added to blacklist successfully.`,
          insertedCustomers
        )
      );
  } catch (error) {
    return next(new ApiError(500, error.message));
  }
};

// =======================================
// Get Blacklisted Customers
// GET /api/blacklisted-customers
// =======================================
const getBlacklistedCustomers = async (req, res, next) => {
  try {
    let { page = 1, limit = 50, search = '' } = req.query;

    page = Number(page);
    limit = Number(limit);

    const filter = {};

    if (search) {
      filter.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];

      if (!isNaN(search)) {
        filter.$or.push({ customer_id: Number(search) });
      }
    }

    const totalRecords = await BlackListedCustomer.countDocuments(filter);

    const customers = await BlackListedCustomer.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json(
      new ApiResponse(200, 'Blacklisted customers fetched successfully.', {
        totalRecords,
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        limit,
        customers,
      })
    );
  } catch (error) {
    return next(new ApiError(500, error.message));
  }
};

module.exports = {
  createBlacklistedCustomers,
  getBlacklistedCustomers,
};
