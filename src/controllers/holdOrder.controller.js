const { HoldOrder } = require('../models/holdOrder.model');
const ConfirmOrder = require('../models/confirmOrder.model');
const ProcessedOrder = require('../models/processedOrder.model');

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { listOrders, createOrdersBulk, moveOrderById } = require('../services/order.service');

// GET /api/v1/orders/hold
const getHoldOrders = asyncHandler(async (req, res) => {
  const { records, pagination } = await listOrders(HoldOrder, req.query, [
    'order_id',
    'size',
    'shipping_method',
    'order_status',
    'source',
    'payment_status',
    'contact_number',
  ]);
  res
    .status(200)
    .json(new ApiResponse(200, 'Hold orders fetched successfully.', { records, pagination }));
});

// POST /api/v1/orders/hold/bulk
const createHoldOrdersBulk = asyncHandler(async (req, res) => {
  const orders = req.body.orders || req.body;
  const { inserted, blacklistedCount } = await createOrdersBulk(HoldOrder, orders, 'hold');
  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        `${inserted.length} order(s) put on hold. ${blacklistedCount} redirected to blacklisted orders.`,
        { inserted, blacklistedCount }
      )
    );
});

// POST /api/v1/orders/hold/move-to-confirmed  { ids: [] }
// `ids` are the specific hold documents' Mongo _ids -- NOT order_ids, since
// one order can have several line items sharing the same order_id and
// moving one must not cascade to its siblings.
const moveHoldOrdersToConfirmed = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, 'Request body must contain an array of ids.');
  }

  const results = [];
  for (const id of ids) {
    try {
      const { redirected, order_id } = await moveOrderById(
        HoldOrder,
        ConfirmOrder,
        id,
        { order_status: 'Confirm' },
        'confirmed'
      );
      results.push({ id, order_id, success: true, redirected });
    } catch (error) {
      results.push({ id, success: false, error: error.message });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  res
    .status(200)
    .json(
      new ApiResponse(200, `${successCount} of ${ids.length} orders moved to confirmed.`, results)
    );
});

// POST /api/v1/orders/hold/move-to-processed {ids:[]}

const moveHoldOrdersToProccessed = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ApiError(400, 'Request body must contain an array of ids.');
  }

  const results = [];
  for (const id of ids) {
    try {
      const { redirected, order_id } = await moveOrderById(
        HoldOrder,
        ProcessedOrder,
        id,
        { order_status: 'Hold order processed' },
        'processed'
      );
      results.push({ id, order_id, success: true, redirected });
    } catch (error) {
      results.push({ id, success: false, error: error.message });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  res
    .status(200)
    .json(
      new ApiResponse(200, `${successCount} of ${ids.length} orders moved to processed.`, results)
    );
});

module.exports = {
  getHoldOrders,
  createHoldOrdersBulk,
  moveHoldOrdersToConfirmed,
  moveHoldOrdersToProccessed,
};
