const mongoose = require('mongoose');
const PaymentPending = require('../models/payment_pending.model');
const { createOrdersBulk, listOrders } = require('../services/order.service');
const {
  testOrdersAccess,
  refundFailedOrders,
  fetchOrdersForSummary,
} = require('../services/paymentPending.service');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const summarizeOrdersReport = require('../utils/summarizeReturnOrders');
const ConfirmOrder = require('../models/confirmOrder.model');

// payment failed or pending orders
const fetchPaymentPendingOrders = async (req, res) => {
  try {
    const data = await testOrdersAccess();

    res.status(200).json({
      success: true,
      total_payment_pending_orders: data.length,
      message: 'Payment pending orders fetched successfully',
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: error.message || 'Internal server error',
    });
  }
};

// refund failed orders

const fetchRefundFailedOrders = async (req, res) => {
  const { order_days } = req.query;
  try {
    const data = await refundFailedOrders(order_days);

    res.status(200).json(
      new ApiResponse(200, 'Refund failed orders fetched successfully', {
        total_refund_failed: data.length,
        data,
      })
    );
  } catch (error) {
    throw new ApiError(500, `${error.message || 'Internal Server error'}`);
  }
};

// payment pending orders
const createPaymentPendingOrders = asyncHandler(async (req, res) => {
  const orders = req.body.orders || req.body;

  const { inserted, blacklistedCount } = await createOrdersBulk(
    PaymentPending,
    orders,
    'paymentpending'
  );
  res
    .status(201)
    .json(
      new ApiResponse(201, `${inserted.length} order(s) added to paymentpending. `, { inserted })
    );
});

// return orders
const salesSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.body;
  const data = await fetchOrdersForSummary(startDate, endDate);
  const summary = summarizeOrdersReport(data);

  return res.status(200).json(
    new ApiResponse(200, `${startDate} to ${endDate} sales report fetched`, {
      summary,
      orders: data,
    })
  );
});

// get payment pending orders
const getPaymentPendingOrders = asyncHandler(async (req, res) => {
  const result = await listOrders(PaymentPending, req.query, [], {
    customer_contacted: false,
  });

  res
    .status(200)
    .json(new ApiResponse(200, 'Payment pending orders fetched successfully.', result));
});

// update customer caontacked
const updateCustomerContacted = asyncHandler(async (req, res) => {
  const { id } = req.params;

  //  Proper validation
  if (!id || !mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'Order id must be valid');
  }

  const record = await PaymentPending.findById(id);
  if (!record) throw new ApiError(404, 'Order not found');

  record.customer_contacted = !record.customer_contacted;
  record.customer_cancelled = true;
  await record.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        `${record.order_id} is ${record.customer_contacted ? 'marked as contacted' : 'unmarked'}`,
        record
      )
    );
});

// payment pending move to confirm
const createPaymentPendingToConfirmedOrdersBulk = asyncHandler(async (req, res) => {
  const { orders, status } = req.body;
  const orderIds = orders.map((o) => o._id);

  // Run bulk insert and bulk status update in parallel
  const [bulkResult, deletedFromPaymentPendingOrders] = await Promise.all([
    createOrdersBulk(ConfirmOrder, orders, 'confirmed'),
    PaymentPending.deleteMany({ _id: { $in: orderIds } }),
  ]);

  const { inserted, blacklistedCount } = bulkResult;

  // Single bulk update for all confirmed orders instead of per-id updates
  if (inserted.length && status) {
    await ConfirmOrder.updateMany(
      { _id: { $in: inserted.map((o) => o._id) } },
      { $set: { payment_type: status } }
    );
  }

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

module.exports = {
  fetchPaymentPendingOrders,
  fetchRefundFailedOrders,
  createPaymentPendingOrders,
  salesSummary,
  getPaymentPendingOrders,
  updateCustomerContacted,
  createPaymentPendingToConfirmedOrdersBulk,
};
