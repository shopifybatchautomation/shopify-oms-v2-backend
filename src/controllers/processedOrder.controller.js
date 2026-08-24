const ProcessedOrder = require('../models/processedOrder.model.js');
const ConfirmedOrder = require('../models/confirmOrder.model.js');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const { createOrdersBulk, listOrders } = require('../services/order.service');

// GET /api/v1/orders/processed
const getProcessedOrder = asyncHandler(async (req, res) => {
  const { records, pagination } = await listOrders(ProcessedOrder, req.query, [
    'order_id',
    'size',
    'shipping_method',
    'payment_status',
  ]);
  res
    .status(200)
    .json(new ApiResponse(200, 'Processed orders fetched successfully.', { records, pagination }));
});

// POST /api/v1/orders/processed/bulk - Move orders from confirmed to processed
const createProcessedOrder = asyncHandler(async (req, res) => {
  const { orderIds } = req.body; // Expect array of order IDs

  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    return res.status(400).json(new ApiResponse(400, 'Please provide order IDs to process.'));
  }

  // Step 1: Find the confirmed orders
  const confirmedOrders = await ConfirmedOrder.find({
    order_id: { $in: orderIds },
  });

  if (confirmedOrders.length === 0) {
    return res.status(404).json(new ApiResponse(404, 'No confirmed orders found to process.'));
  }

  // Step 2: Prepare processed orders data
  const processedOrdersData = confirmedOrders.map((order) => ({
    ...order.toObject(),
    processed_by: req.user?.email || 'system', // Track who processed
    processed_at: new Date(),
    // Remove _id and __v so they get new ones
    _id: undefined,
    __v: undefined,
  }));

  // Step 3: Insert into processed orders collection
  const inserted = await ProcessedOrder.insertMany(processedOrdersData);

  // Step 4: Remove from confirmed orders collection
  const deleted = await ConfirmedOrder.deleteMany({
    order_id: { $in: orderIds },
  });

  res.status(201).json(
    new ApiResponse(
      201,
      `${inserted.length} order(s) moved to processed and removed from confirmed.`,
      {
        movedCount: inserted.length,
        deletedCount: deleted.deletedCount,
        processedOrders: inserted,
      }
    )
  );
});

// Alternative: POST /api/v1/orders/processed/bulk - With orders data directly
const createProcessedOrderDirect = asyncHandler(async (req, res) => {
  const orders = req.body.orders || req.body;

  // Add processed_by field
  const ordersWithProcessedBy = orders.map((order) => ({
    ...order,
    processed_by: req.user?.email || 'system',
    processed_at: new Date(),
  }));

  const { inserted } = await createOrdersBulk(ProcessedOrder, ordersWithProcessedBy, 'processed');

  // Remove from confirmed (optional - if you want to auto-remove)
  if (orders && orders.length > 0) {
    const orderIds = orders.map((o) => o.order_id);
    await ConfirmedOrder.deleteMany({ order_id: { $in: orderIds } });
  }

  res
    .status(201)
    .json(new ApiResponse(201, `${inserted.length} processed order(s) recorded.`, { inserted }));
});

module.exports = { createProcessedOrder, getProcessedOrder, createProcessedOrderDirect };
