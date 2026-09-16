const PaymentPending = require('../models/payment_pending.model');
const { createOrdersBulk } = require('../services/order.service');
const {
  testOrdersAccess,
  refundFailedOrders,
  fetchOrdersForSummary,
} = require('../services/paymentPending.service');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const summarizeOrdersReport = require('../utils/summarizeReturnOrders');

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

module.exports = {
  fetchPaymentPendingOrders,
  fetchRefundFailedOrders,
  createPaymentPendingOrders,
  salesSummary,
};
