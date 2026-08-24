const PendingOrder = require('../models/pendingOrder.model');
const ConfirmOrder = require('../models/confirmOrder.model');
const CancelOrder = require('../models/cancelOrder.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const {
  listOrders,
  createOrder,
  createOrdersBulk,
  moveOrderById,
} = require('../services/order.service');

const hasReasons = (value) => Array.isArray(value) && value.length > 0;

// GET /api/v1/orders/pending
const getPendingOrders = asyncHandler(async (req, res) => {
  const { records, pagination } = await listOrders(PendingOrder, req.query, [
    'order_id',
    'size',
    'shipping_method',
    'order_status',
    'contact_number',
    'pending_reason',
  ]);
  res
    .status(200)
    .json(new ApiResponse(200, 'Pending orders fetched successfully.', { records, pagination }));
});

// POST /api/v1/orders/pending
const createPendingOrder = asyncHandler(async (req, res) => {
  if (!req.body.order_id || !hasReasons(req.body.pending_reason)) {
    throw new ApiError(400, 'order_id and at least one pending_reason are required.');
  }
  const { redirected, doc } = await createOrder(PendingOrder, req.body, 'pending');
  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        redirected ? `${doc.order_id} redirected to Blacklisted Orders.` : `${doc.order_id} added to pending orders.`,
        doc
      )
    );
});

// POST /api/v1/orders/pending/bulk  { orders: [{ ...order, pending_reason: [...] }] }
const createPendingOrdersBulk = asyncHandler(async (req, res) => {
  const orders = req.body.orders || req.body;
  const invalid = Array.isArray(orders) ? orders.filter((o) => !hasReasons(o.pending_reason)) : [];
  if (invalid.length > 0) {
    throw new ApiError(400, 'Every pending order requires at least one pending_reason.');
  }

  const { inserted, blacklistedCount } = await createOrdersBulk(PendingOrder, orders, 'pending');
  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        `${inserted.length} order(s) added to pending. ${blacklistedCount} redirected to blacklisted orders.`,
        { inserted, blacklistedCount }
      )
    );
});

// POST /api/v1/orders/pending/confirm  { id }
// `id` is the specific pending document's Mongo _id -- NOT order_id, because
// one order can have several line-item documents sharing the same order_id,
// and confirming one must not cascade to its siblings.
const confirmPendingOrder = asyncHandler(async (req, res) => {
  const { id } = req.body;
  if (!id) throw new ApiError(400, 'id is required.');

  const { redirected, order_id } = await moveOrderById(
    PendingOrder,
    ConfirmOrder,
    id,
    { order_status: 'Confirm', pending_reason: undefined },
    'confirmed'
  );
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        redirected
          ? `${order_id} redirected to Blacklisted Orders.`
          : `${order_id} confirmed successfully.`,
        { redirected }
      )
    );
});

// POST /api/v1/orders/pending/cancel  { id, cancelled_by? } -- admin cancels
// a single pending line item, identified by its Mongo _id (see note above).
const cancelPendingOrder = asyncHandler(async (req, res) => {
  const { id } = req.body;
  if (!id) throw new ApiError(400, 'id is required.');

  const { redirected, order_id } = await moveOrderById(
    PendingOrder,
    CancelOrder,
    id,
    { order_status: 'Cancel', pending_reason: undefined, cancelled_by: req.body.cancelled_by || 'admin' },
    'cancelledByAdmin'
  );
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        redirected
          ? `${order_id} redirected to Blacklisted Orders.`
          : `${order_id} cancelled successfully.`,
        { redirected }
      )
    );
});

// PATCH /api/v1/orders/pending/:id  (edit size)
const editPendingOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { size } = req.body;
  if (!id) throw new ApiError(400, 'id is required.');
  if (!size) throw new ApiError(400, 'size is required.');

  const order = await PendingOrder.findById(id);
  if (!order) throw new ApiError(404, `Pending order ${id} not found.`);

  order.size = size;
  await order.save();

  res.status(200).json(new ApiResponse(200, `${order.order_id} updated successfully.`, order));
});

module.exports = {
  getPendingOrders,
  createPendingOrder,
  createPendingOrdersBulk,
  confirmPendingOrder,
  cancelPendingOrder,
  editPendingOrder,
};
