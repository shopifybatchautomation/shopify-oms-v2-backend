const VoidedOrder = require('../models/voidedOrder.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const { listOrders, createOrdersBulk } = require('../services/order.service');

// GET /api/v1/orders/voided
const getVoidedOrders = asyncHandler(async (req, res) => {
  const { records, pagination } = await listOrders(VoidedOrder, req.query, [
    'order_id',
    'size',
    'shipping_method',
    'payment_status',
  ]);
  res
    .status(200)
    .json(new ApiResponse(200, 'Voided orders fetched successfully.', { records, pagination }));
});

// POST /api/v1/orders/voided/bulk
const createVoidedOrdersBulk = asyncHandler(async (req, res) => {
  const orders = req.body.orders || req.body;
  const { inserted, blacklistedCount } = await createOrdersBulk(VoidedOrder, orders, 'voided');
  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        `${inserted.length} voided order(s) recorded. ${blacklistedCount} redirected to blacklisted orders.`,
        { inserted, blacklistedCount }
      )
    );
});

module.exports = { getVoidedOrders, createVoidedOrdersBulk };
