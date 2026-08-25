const VoidedOrder = require('../models/voidedOrder.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const { listOrders, createOrdersBulk } = require('../services/order.service');
const ApiError = require('../utils/ApiError.js');
const { BlackListedCustomer } = require('../models/blacklisted_customer.model');
const mongoose = require('mongoose');
const CancelOrder = require('../models/cancelOrder.model.js');

// GET /api/v1/orders/voided
// const getVoidedOrders = asyncHandler(async (req, res) => {
//   const { records, pagination } = await listOrders(VoidedOrder, req.query, [
//     'order_id',
//     'size',
//     'shipping_method',
//     'payment_status',
//   ]);
//   res
//     .status(200)
//     .json(new ApiResponse(200, 'Voided orders fetched successfully.', { records, pagination }));
// });

// const getVoidedOrders = asyncHandler(async (req, res) => {
//   // Process using aggregation pipeline
//   await autoMoveBlacklistedOrders();

//   const { records, pagination } = await listOrders(VoidedOrder, req.query, [
//     'order_id',
//     'size',
//     'shipping_method',
//     'payment_status',
//   ]);

//   res
//     .status(200)
//     .json(new ApiResponse(200, 'Voided orders fetched successfully.', { records, pagination }));
// });
const getVoidedOrders = asyncHandler(async (req, res) => {
  // Process blacklisted orders
  try {
    await processBlacklistedOrdersFixed();
  } catch (error) {
    console.error('Background processing error:', error);
    // Don't throw - continue
  }

  // Fetch remaining voided orders
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

// Fixed version with proper matching
const processBlacklistedOrdersFixed = async () => {
  try {
    // 1. Get all voided orders
    const voidedOrders = await VoidedOrder.find({}).lean();
    if (voidedOrders.length === 0) return;

    // 2. Get all blacklisted customers
    const blacklisted = await BlackListedCustomer.find({}).lean();
    if (blacklisted.length === 0) return;

    // 3. Build lookup maps
    const blockedEmails = new Set();
    const blockedPhones = new Set();
    const blockedIds = new Set();

    blacklisted.forEach((b) => {
      if (b.email) blockedEmails.add(b.email.toLowerCase().trim());
      if (b.customer_id) {
        const clean = String(b.customer_id).replace(/[^0-9]/g, '');
        blockedPhones.add(clean);
        blockedIds.add(clean);
      }
    });

    console.log('📧 Blocked emails:', [...blockedEmails]);
    console.log('📞 Blocked phones:', [...blockedPhones]);

    // 4. Find orders to move
    const ordersToMove = voidedOrders.filter((order) => {
      // Check email
      if (order.customer_email) {
        const email = order.customer_email.toLowerCase().trim();
        if (blockedEmails.has(email)) {
          console.log(`✅ Email match: ${email}`);
          return true;
        }
      }

      // Check contact number
      if (order.contact_number) {
        const clean = String(order.contact_number).replace(/[^0-9]/g, '');
        // Try multiple variations
        const variations = [
          clean,
          clean.replace(/^91/, ''),
          clean.replace(/^0/, ''),
          clean.replace(/^919/, '9'),
        ];

        for (const v of variations) {
          if (blockedPhones.has(v) || blockedIds.has(v)) {
            console.log(`✅ Phone match: ${order.contact_number} -> ${v}`);
            return true;
          }
        }
      }

      return false;
    });

    console.log(`📦 Orders to move: ${ordersToMove.length}`);

    if (ordersToMove.length === 0) return;

    // 5. Check for duplicates
    const orderIds = ordersToMove.map((o) => o.order_id);
    const existing = await CancelOrder.find(
      { order_id: { $in: orderIds } },
      { order_id: 1 }
    ).lean();

    const existingIds = new Set(existing.map((e) => e.order_id));
    const newOrders = ordersToMove.filter((o) => !existingIds.has(o.order_id));

    if (newOrders.length === 0) return;

    // 6. Move to CancelOrder
    await CancelOrder.insertMany(
      newOrders.map((o) => ({
        ...o,
        cancelled_at: new Date(),
        customer_blocked: true,
        moved_automatically: true,
        moved_reason: 'Customer already blacklisted',
      }))
    );

    // 7. Delete from VoidedOrder
    const idsToDelete = [...new Set(newOrders.map((o) => o.order_id))];
    await VoidedOrder.deleteMany({ order_id: { $in: idsToDelete } });

    console.log(`✅ Successfully moved ${newOrders.length} orders to cancelled`);
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
};

const autoMoveBlacklistedOrders = async () => {
  try {
    // Use aggregation to find and move orders in one go
    const pipeline = [
      // Look up blacklisted customers
      {
        $lookup: {
          from: 'blacklistedcustomers',
          let: {
            contact: '$contact_number',
            email: '$customer_email',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [{ $eq: ['$customer_id', '$$contact'] }, { $eq: ['$email', '$$email'] }],
                },
              },
            },
          ],
          as: 'blacklisted',
        },
      },
      // Filter only orders with blacklisted customers
      {
        $match: {
          'blacklisted.0': { $exists: true },
        },
      },
      // Check if already in CancelOrder
      {
        $lookup: {
          from: 'cancelorders',
          localField: 'order_id',
          foreignField: 'order_id',
          as: 'alreadyCancelled',
        },
      },
      {
        $match: {
          'alreadyCancelled.0': { $exists: false },
        },
      },
      // Prepare documents for insertion
      {
        $addFields: {
          cancelled_at: new Date(),
          customer_blocked: true,
          moved_automatically: true,
          moved_reason: 'Customer already blacklisted',
        },
      },
    ];

    // Get orders to move
    const ordersToMove = await VoidedOrder.aggregate(pipeline);

    if (ordersToMove.length === 0) return;

    // Extract order IDs
    const orderIds = ordersToMove.map((o) => o.order_id);

    // Use session for transaction (if replica set available)
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // Insert into CancelOrder
      await CancelOrder.insertMany(
        ordersToMove.map((o) => ({
          ...o,
          original_voided_id: o._id,
        })),
        { session }
      );

      // Delete from VoidedOrder
      await VoidedOrder.deleteMany({ order_id: { $in: orderIds } }, { session });

      await session.commitTransaction();
      console.log(`✅ Auto-moved ${ordersToMove.length} orders using aggregation`);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Error in auto-move:', error);
    // Don't throw - just log
  }
};
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

// POST /api/v1/orders/voided/block
const blockCustomerAndOrderMoveToCancelledOrder = asyncHandler(async (req, res, next) => {
  const { order_id } = req.body;

  if (!order_id) {
    throw new ApiError(400, 'order_id is required');
  }

  try {
    // Step 1: Find all voided orders
    const voidedOrders = await VoidedOrder.find({ order_id });

    if (!voidedOrders || voidedOrders.length === 0) {
      throw new ApiError(404, 'No orders found in voided collection');
    }

    // Step 2: Check if already processed (Atomic check)
    const existingCancel = await CancelOrder.findOne({ order_id });
    if (existingCancel) {
      return res.status(200).json(
        new ApiResponse(200, {
          message: 'Order(s) already cancelled',
          orderId: order_id,
          status: 'already_processed',
          totalOrders: voidedOrders.length,
        })
      );
    }

    const firstOrder = voidedOrders[0];
    const nameParts = firstOrder.customer_name?.trim()?.split(/\s+/) || [];

    // Step 3: Block customer atomically
    const customerBlockResult = await BlackListedCustomer.findOneAndUpdate(
      {
        $or: [{ customer_id: firstOrder.contact_number }, { email: firstOrder.customer_email }],
      },
      {
        $setOnInsert: {
          customer_id: firstOrder.contact_number || 0,
          email: firstOrder.customer_email || '',
          first_name: nameParts[0] || '',
          last_name: nameParts.slice(1).join(' ') || '',
          blocked_at: new Date(),
          order_ids: [order_id],
          total_orders_blocked: voidedOrders.length,
        },
        $addToSet: { order_ids: order_id },
        $set: {
          total_orders_blocked: voidedOrders.length,
          last_updated: new Date(),
        },
      },
      {
        upsert: true,
        new: true, // Return updated document
      }
    );

    const isNewBlock = customerBlockResult._id && customerBlockResult.order_ids?.length === 1;

    // Step 4: Insert into CancelOrder
    const cancelledDocuments = voidedOrders.map((order) => ({
      ...order.toObject(),
      cancelled_at: new Date(),
      customer_blocked: true,
      original_voided_id: order._id,
      moved_from_voided: true,
    }));

    await CancelOrder.insertMany(cancelledDocuments);

    // Step 5: Delete from VoidedOrder
    const deleteResult = await VoidedOrder.deleteMany({ order_id });

    res.status(200).json(
      new ApiResponse(200, {
        message: isNewBlock
          ? `Customer blocked and ${voidedOrders.length} order(s) moved to cancelled`
          : `Customer already blocked. ${voidedOrders.length} order(s) moved to cancelled.`,
        orderId: order_id,
        summary: {
          totalVoidedOrders: voidedOrders.length,
          ordersCancelled: cancelledDocuments.length,
          ordersRemoved: deleteResult.deletedCount,
          blockStatus: isNewBlock ? 'newly_blocked' : 'already_blocked',
        },
        timestamp: new Date(),
      })
    );
  } catch (error) {
    console.error('Error in blockCustomerAndOrderMoveToCancelledOrder:', error);

    if (error.code === 11000) {
      throw new ApiError(409, 'Duplicate key error. Order might already be processed.');
    }
    throw new ApiError(500, `Failed to process order(s): ${error.message}`);
  }
});

module.exports = {
  getVoidedOrders,
  createVoidedOrdersBulk,
  blockCustomerAndOrderMoveToCancelledOrder,
};
