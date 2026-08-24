const ConfirmOrder = require('../models/confirmOrder.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { listOrders, createOrder, createOrdersBulk } = require('../services/order.service');

// GET /api/v1/orders/confirmed
const getConfirmedOrders = asyncHandler(async (req, res) => {
  const { records, pagination } = await listOrders(ConfirmOrder, req.query);
  res
    .status(200)
    .json(new ApiResponse(200, 'Confirmed orders fetched successfully.', { records, pagination }));
});

// POST /api/v1/orders/confirmed
const createConfirmedOrder = asyncHandler(async (req, res) => {
  if (!req.body.order_id) {
    throw new ApiError(400, 'order_id is required.');
  }
  const { redirected, doc } = await createOrder(ConfirmOrder, req.body, 'confirmed');
  const message = redirected
    ? `${doc.order_id} was redirected to Blacklisted Orders (customer is blacklisted).`
    : `${doc.order_id} added to confirmed orders.`;
  res.status(201).json(new ApiResponse(201, message, doc));
});

// POST /api/v1/orders/confirmed/bulk
const createConfirmedOrdersBulk = asyncHandler(async (req, res) => {
  const orders = req.body.orders || req.body;
  const { inserted, blacklistedCount } = await createOrdersBulk(ConfirmOrder, orders, 'confirmed');
  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        `${inserted.length} order(s) confirmed. ${blacklistedCount} redirected to blacklisted orders.`,
        { inserted, blacklistedCount }
      )
    );
});

module.exports = { getConfirmedOrders, createConfirmedOrder, createConfirmedOrdersBulk };
