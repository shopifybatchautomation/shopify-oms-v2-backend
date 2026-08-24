const ConfirmOrder = require('../models/confirmOrder.model');
const PendingOrder = require('../models/pendingOrder.model');
const PreCancelledOrder = require('../models/preCancelledOrder.model');
const CancelOrder = require('../models/cancelOrder.model');
const VoidedOrder = require('../models/voidedOrder.model');
const { HoldOrder } = require('../models/holdOrder.model');
const BlacklistedOrder = require('../models/blacklistedOrder.model');
const { buildDateRange } = require('../utils/dateUtils');
const { PENDING_REASONS } = require('../models/pendingOrder.model');

// Every table that participates in the "how many orders are in each bucket
// for this date range" dashboard view. `label` is what shows up in the
// grouped breakdown / what the frontend keys off of.
const TABLES = [
  { label: 'confirmed', Model: ConfirmOrder },
  { label: 'pending', Model: PendingOrder },
  { label: 'preCancelled', Model: PreCancelledOrder },
  { label: 'cancelledByAdmin', Model: CancelOrder },
  { label: 'voided', Model: VoidedOrder },
  { label: 'hold', Model: HoldOrder },
  { label: 'blacklisted', Model: BlacklistedOrder },
];

// Reasons that make up the "final pending" headline number (everything
// except the generic "Not Confirmed" catch-all).
const FINAL_PENDING_REASONS = ['Bad Address', 'High RTO Risk', 'Medium RTO Risk', 'High Value COD'];

/**
 * Builds the dashboard summary for a date range in two aggregations:
 *  1. A $unionWith across every order collection to get per-table and
 *     COD/Prepaid counts in one round trip.
 *  2. A separate $unwind on PendingOrder.pending_reason for the per-reason
 *     breakdown -- this has to be separate because an order can carry more
 *     than one reason at once (e.g. "High RTO Risk" AND "Bad Address"), so
 *     unwinding inside the unioned pipeline would double-count that order
 *     against the other tables' totals.
 */
const getDashboardSummary = async ({ startDate, endDate } = {}) => {
  const { start, end } = buildDateRange(startDate, endDate);
  const dateMatch = { order_date: { $gte: start, $lte: end } };

  const [first, ...rest] = TABLES;

  const pipeline = [
    { $match: dateMatch },
    { $addFields: { __table: first.label } },
    ...rest.map(({ label, Model }) => ({
      $unionWith: {
        coll: Model.collection.name,
        pipeline: [{ $match: dateMatch }, { $addFields: { __table: label } }],
      },
    })),
    {
      $group: {
        _id: { table: '$__table', payment_type: '$payment_type' },
        count: { $sum: 1 },
        totalPrice: { $sum: '$price' },
      },
    },
  ];

  const [grouped, pendingReasonRows] = await Promise.all([
    first.Model.aggregate(pipeline),
    PendingOrder.aggregate([
      { $match: dateMatch },
      { $unwind: '$pending_reason' },
      { $group: { _id: '$pending_reason', count: { $sum: 1 } } },
    ]),
  ]);

  // Start every bucket at 0 so the response shape is stable even when a
  // table has no rows in range (frontend doesn't need optional-chaining).
  const summary = {
    range: { startDate: start, endDate: end },
    confirmed: 0,
    pending: 0,
    preCancelled: 0,
    cancelledByAdmin: 0,
    voided: 0,
    hold: 0,
    blacklisted: 0,
    cod: 0,
    prepaid: 0,
    totalValue: 0,
    pendingBreakdown: Object.fromEntries(PENDING_REASONS.map((reason) => [reason, 0])),
    // "final pending" = pending orders held for Bad Address / High RTO Risk /
    // Medium RTO Risk / High Value COD (> ₹4000 COD) -- i.e. everything
    // except the generic "Not Confirmed" catch-all.
    finalPending: 0,
    breakdown: grouped,
  };

  const ORDER_FLOW_TABLES = new Set(['confirmed', 'pending', 'preCancelled', 'cancelledByAdmin']);

  for (const row of grouped) {
    const { table, payment_type } = row._id;
    if (Object.prototype.hasOwnProperty.call(summary, table)) {
      summary[table] += row.count;
    }

    if (ORDER_FLOW_TABLES.has(table)) {
      if (payment_type === 'Prepaid') summary.prepaid += row.count;
      else summary.cod += row.count;
      summary.totalValue += row.totalPrice || 0;
    }
  }

  for (const row of pendingReasonRows) {
    if (Object.prototype.hasOwnProperty.call(summary.pendingBreakdown, row._id)) {
      summary.pendingBreakdown[row._id] = row.count;
    }
  }

  summary.finalPending = FINAL_PENDING_REASONS.reduce(
    (sum, reason) => sum + (summary.pendingBreakdown[reason] || 0),
    0
  );

  summary.totalOrders =
    summary.confirmed + summary.pending + summary.preCancelled + summary.cancelledByAdmin;

  return summary;
};

module.exports = { getDashboardSummary, TABLES };
