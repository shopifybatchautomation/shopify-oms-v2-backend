const RefundOrders = require('../models/refund_processed.model');
const { refundFailedOrders } = require('../services/paymentPending.service');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * POST /api/refund-orders/bulk
 * Body: { orders: [{ order_id, customer_name, customer_mobile, customer_email, payment_methods }] }
 */
const bulkCreateRefundOrders = asyncHandler(async (req, res) => {
  const { orders } = req.body;

  if (!Array.isArray(orders) || orders.length === 0) {
    throw new ApiError(400, 'orders must be a non-empty array');
  }

  // Validate each order has an order_id
  const invalidOrders = orders.filter((o) => !o?.order_id);
  if (invalidOrders.length > 0) {
    throw new ApiError(400, 'Each order must have an order_id');
  }

  const incomingOrderIds = orders.map((o) => o.order_id);

  // Find which order_ids already exist in the DB
  const existingOrders = await RefundOrders.find(
    { order_id: { $in: incomingOrderIds } },
    { order_id: 1 }
  ).lean();

  const existingIds = new Set(existingOrders.map((o) => o.order_id));

  // Only insert orders that don't already exist
  const newOrders = orders.filter((o) => !existingIds.has(o.order_id));

  if (newOrders.length === 0) {
    throw new ApiError(409, 'All orders already exist in refund records');
  }

  let createdOrders = [];
  try {
    createdOrders = await RefundOrders.insertMany(newOrders, { ordered: false });
  } catch (err) {
    // insertMany with ordered:false throws but still inserts valid docs
    // err.insertedDocs contains successfully inserted ones
    if (err?.insertedDocs) {
      createdOrders = err.insertedDocs;
    } else {
      throw err;
    }
  }

  const skippedCount = orders.length - createdOrders.length;

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        created: createdOrders.length,
        skipped: skippedCount,
        message: `${createdOrders.length} refund order(s) created${
          skippedCount > 0 ? `, ${skippedCount} skipped (already exist)` : ''
        }`,
      },
      createdOrders
    )
  );
});

/**
 * GET /api/refund-orders
 */
const getRefundedOrders = asyncHandler(async (req, res) => {
  const {
    order_id,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  // Build query
  const query = {};

  if (order_id) {
    query.order_id = order_id;
  }

  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { order_id: searchRegex },
      { customer_name: searchRegex },
      { customer_mobile: searchRegex },
      { customer_email: searchRegex },
    ];
  }

  // Parse pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  // Parse sorting
  const allowedSortFields = ['createdAt', 'updatedAt', 'order_id', 'customer_name'];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const sortDir = sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortField]: sortDir };

  // Execute query + count in parallel
  const [refundedOrders, totalCount] = await Promise.all([
    RefundOrders.find(query).sort(sort).skip(skip).limit(limitNum).lean(),
    RefundOrders.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalCount / limitNum) || 1;

  return res.status(200).json(
    new ApiResponse(200, 'Refund orders fetched successfully', {
      data: refundedOrders,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    })
  );
});

/**
 * DELETE /api/refund-orders/:id
 */
const deleteRefundOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleted = await RefundOrders.findByIdAndDelete(id);
  if (!deleted) {
    throw new ApiError(404, 'Refund order not found');
  }

  return res.status(200).json(new ApiResponse(200, 'Refund order deleted successfully', deleted));
});

/**
 * GET /api/refund-failed-orders?order_days
 */
const getNonRefundedOrders = asyncHandler(async (req, res) => {
  const { order_days } = req.query;

  // 1. Fetch failed refund orders from Shopify
  const data = await refundFailedOrders(order_days);

  if (!Array.isArray(data) || data.length === 0) {
    throw new ApiError(404, 'No Refund Failed Orders Found');
  }

  // 2. Extract only the order names we care about
  const orderNames = data.map((o) => o.name).filter(Boolean);

  if (orderNames.length === 0) {
    return res.status(404).json(new ApiResponse(404, 'No Refund Failed Orders found', null));
  }

  // 3. Ask MongoDB ONLY for refunded order_ids that match — with a projection
  //    This uses the unique index on order_id and returns just the string values.
  const refundedDocs = await RefundOrders.find(
    { order_id: { $in: orderNames } },
    { order_id: 1, _id: 0 }
  ).lean();

  const refundedSet = new Set(refundedDocs.map((d) => d.order_id));

  // 4. Filter in memory using a Set (O(1) lookups instead of O(n) includes)
  const filteredRefundFailedOrders = data.filter((o) => !refundedSet.has(o.name));

  if (filteredRefundFailedOrders.length === 0) {
    return res.status(404).json(new ApiResponse(404, 'Refund failed orders not found', null));
  }

  res.status(200).json(
    new ApiResponse(200, 'Refund failed orders fetched successfully', {
      total_refund_failed: filteredRefundFailedOrders.length,
      refund_failed_orders: filteredRefundFailedOrders,
    })
  );
});

module.exports = { getNonRefundedOrders };

module.exports = {
  bulkCreateRefundOrders,
  getRefundedOrders,
  deleteRefundOrder,
  getNonRefundedOrders,
};
