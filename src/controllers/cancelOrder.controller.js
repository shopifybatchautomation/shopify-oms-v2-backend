const CancelOrder = require('../models/cancelOrder.model');
const ConfirmOrder = require('../models/confirmOrder.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { listOrders, createOrder, moveOrderById } = require('../services/order.service');

// GET /api/v1/orders/cancelled  ("cancelled by admin" table)
const getCancelledOrders = asyncHandler(async (req, res) => {
  const { records, pagination } = await listOrders(CancelOrder, req.query, [
    'order_id',
    'size',
    'shipping_method',
    'order_status',
    'cancel_note',
  ]);
  res
    .status(200)
    .json(new ApiResponse(200, 'Cancelled orders fetched successfully.', { records, pagination }));
});

// POST /api/v1/orders/cancelled  -- manual/admin cancellation entry
const createCancelledOrder = asyncHandler(async (req, res) => {
  if (!req.body.order_id) {
    throw new ApiError(400, 'order_id is required.');
  }
  const { redirected, doc } = await createOrder(
    CancelOrder,
    { ...req.body, cancelled_by: req.body.cancelled_by || 'admin' },
    'cancelledByAdmin'
  );
  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        redirected ? `${doc.order_id} redirected to Blacklisted Orders.` : `${doc.order_id} added to cancelled orders.`,
        doc
      )
    );
});

// POST /api/v1/orders/cancelled/restore  { id } -- undo an admin
// cancellation for ONE line item, identified by its Mongo _id -- not
// order_id, since a multi-item order can have several documents sharing the
// same order_id and restoring one must not affect its siblings.
const restoreCancelledOrder = asyncHandler(async (req, res) => {
  const { id } = req.body;
  if (!id) throw new ApiError(400, 'id is required.');

  const { redirected, order_id } = await moveOrderById(
    CancelOrder,
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

module.exports = { getCancelledOrders, createCancelledOrder, restoreCancelledOrder };
