const BlacklistedOrder = require('../models/blacklistedOrder.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const { listOrders } = require('../services/order.service');
const { normalizeOrderPayload } = require('../services/order.service');

// GET /api/v1/orders/blacklisted
const getBlacklistedOrders = asyncHandler(async (req, res) => {
  const { records, pagination } = await listOrders(BlacklistedOrder, req.query, [
    'order_id',
    'size',
    'customer_email',
    'customer_name',
    'blacklist_reason',
    'original_destination',
  ]);
  res
    .status(200)
    .json(new ApiResponse(200, 'Blacklisted orders fetched successfully.', { records, pagination }));
});

// POST /api/v1/orders/blacklisted/bulk
// Direct insert path (e.g. if the frontend already classified the order as
// blacklisted during upload) -- these are already headed to the right table,
// so no further guard/redirect logic is needed here.
const createBlacklistedOrdersBulk = asyncHandler(async (req, res) => {
  const orders = req.body.orders || req.body;
  const payloads = (Array.isArray(orders) ? orders : [])
    .filter((o) => o.order_id)
    .map((o) => ({
      ...normalizeOrderPayload(o),
      is_blacklisted: true,
      blacklist_reason: o.blacklist_reason || 'Customer is blacklisted',
    }));

  const inserted = payloads.length > 0 ? await BlacklistedOrder.insertMany(payloads, { ordered: false }) : [];
  res
    .status(201)
    .json(new ApiResponse(201, `${inserted.length} order(s) recorded as blacklisted.`, inserted));
});

module.exports = { getBlacklistedOrders, createBlacklistedOrdersBulk };
