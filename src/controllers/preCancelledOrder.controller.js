const PreCancelledOrder = require('../models/preCancelledOrder.model');
const ConfirmOrder = require('../models/confirmOrder.model');
const CancelOrder = require('../models/cancelOrder.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { listOrders, createOrdersBulk, moveOrderById } = require('../services/order.service');

// GET /api/v1/orders/pre-cancelled
const getPreCancelledOrders = asyncHandler(async (req, res) => {
  const { records, pagination } = await listOrders(PreCancelledOrder, req.query, [
    'order_id',
    'size',
    'shipping_method',
    'order_status',
    'cancel_reason',
  ]);
  res
    .status(200)
    .json(
      new ApiResponse(200, 'Pre-cancelled orders fetched successfully.', { records, pagination })
    );
});

// POST /api/v1/orders/pre-cancelled/bulk
const createPreCancelledOrdersBulk = asyncHandler(async (req, res) => {
  const orders = req.body.orders || req.body;
  const { inserted, blacklistedCount } = await createOrdersBulk(
    PreCancelledOrder,
    orders,
    'preCancelled'
  );
  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        `${inserted.length} order(s) added to pre-cancelled. ${blacklistedCount} redirected to blacklisted orders.`,
        { inserted, blacklistedCount }
      )
    );
});

// POST /api/v1/orders/pre-cancelled/finalize  { id } -- admin confirms the
// auto-flagged cancellation for ONE line item, identified by its Mongo
// _id -- not order_id, since a multi-item order can have several documents
// sharing the same order_id and finalizing one must not affect its siblings.
const finalizePreCancelledOrder = asyncHandler(async (req, res) => {
  const { id } = req.body;
  if (!id) throw new ApiError(400, 'id is required.');

  const { redirected, order_id } = await moveOrderById(
    PreCancelledOrder,
    CancelOrder,
    id,
    { order_status: 'Cancel', cancelled_by: req.body.cancelled_by || 'admin' },
    'cancelledByAdmin'
  );
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        redirected
          ? `${order_id} redirected to Blacklisted Orders.`
          : `${order_id} moved to cancelled orders.`,
        { redirected }
      )
    );
});

// POST /api/v1/orders/pre-cancelled/restore  { id } -- false positive, admin
// restores a single line item back to confirmed.
const restorePreCancelledOrder = asyncHandler(async (req, res) => {
  const { id } = req.body;
  if (!id) throw new ApiError(400, 'id is required.');

  const { redirected, order_id } = await moveOrderById(
    PreCancelledOrder,
    ConfirmOrder,
    id,
    { order_status: 'Confirm' },
    'confirmed'
  );
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        redirected
          ? `${order_id} redirected to Blacklisted Orders.`
          : `${order_id} restored to confirmed orders.`,
        { redirected }
      )
    );
});

// AGGREGATION PIPELINE
const getPrecancelledOrderByDateRange = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.body;
  if (!startDate || !endDate) {
    throw new ApiError(400, 'startDate and endDate are required');
  }
  //  Convert to Date objects
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end)) {
    throw new ApiError(400, 'Invalid date format');
  }

  if (start > end) {
    throw new ApiError(400, 'startDate must be before endDate');
  }

  // Make end date inclusive (end of day)
  end.setHours(23, 59, 59, 999);

  const result = await PreCancelledOrder.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: null,
        //  ifNull handles missing quantity
        preCancelledCount: { $sum: { $ifNull: ['$quantity', 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        date_range: {
          $concat: [
            {
              $dateToString: {
                format: '%Y-%m-%d',
                date: start,
                timezone: 'Asia/Kolkata',
              },
            },
            ' to ',
            {
              $dateToString: {
                format: '%Y-%m-%d',
                date: end,
                timezone: 'Asia/Kolkata',
              },
            },
          ],
        },
        preCancelledCount: 1,
      },
    },
  ]);

  //  Handle empty result (no orders in range)
  const data = result[0] || {
    date_range: `${startDate} to ${endDate}`,
    preCancelledCount: 0,
  };

  res
    .status(200)
    .json(new ApiResponse(200, `Precancelled orders fetched for ${startDate} to ${endDate}`, data));
});

module.exports = {
  getPreCancelledOrders,
  createPreCancelledOrdersBulk,
  finalizePreCancelledOrder,
  restorePreCancelledOrder,
  getPrecancelledOrderByDateRange,
};
