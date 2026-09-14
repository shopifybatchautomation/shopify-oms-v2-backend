const PreCancelledOrder = require('../models/preCancelledOrder.model');
const CancelOrder = require('../models/cancelOrder.model');
const BlacklistedOrder = require('../models/blacklistedOrder.model');
const ProcessedOrder = require('../models/processedOrder.model');
const ConfirmOrder = require('../models/confirmOrder.model');
const PendingOrder = require('../models/pendingOrder.model');
const VoidedOrder = require('../models/voidedOrder.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

// 🔧 Reusable aggregation pipeline builder
const buildSumPipeline = (start, end) => [
  {
    $match: {
      createdAt: { $gte: start, $lte: end },
    },
  },
  {
    $group: {
      _id: null,
      count: { $sum: { $ifNull: ['$quantity', 0] } },
    },
  },
];

// 🔧 Helper: run pipeline & return count (0 if empty)
const getCount = async (Model, start, end) => {
  const result = await Model.aggregate(buildSumPipeline(start, end));
  return result[0]?.count || 0;
};

// 🔧 Helper: format date range in UTC (ISO)
const formatDateRangeUTC = (start, end) => `${start.toISOString()} to ${end.toISOString()}`;

// 🔧 Helper: format date range in IST (for display)
const formatDateRangeIST = (start, end) => {
  const IST_OFFSET_MS = 330 * 60 * 1000;
  const toIST = (d) => new Date(d.getTime() + IST_OFFSET_MS).toISOString().replace('Z', '+05:30');
  return `${toIST(start)} to ${toIST(end)}`;
};

// 🇮🇳 IST offset in minutes (UTC +5:30)
const IST_OFFSET_MINUTES = 330;

/**
 * Convert a date string to UTC Date.
 * - Agar input mein timezone hai (Z or +05:30) → directly parse karo
 * - Warna input ko IST maano → UTC mein convert karo
 */
const parseToUTC = (dateInput) => {
  const str = String(dateInput).trim();

  // Case 1: Already timezone info present (Z, +05:30, -03:00 etc.)
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(str);
  if (hasTimezone) {
    return new Date(str);
  }

  // Case 2: No timezone → assume IST → convert to UTC
  // "2026-09-10T04:00:00" (IST) → "2026-09-09T22:30:00.000Z" (UTC)
  const asIfUTC = new Date(str + 'Z');
  return new Date(asIfUTC.getTime() - IST_OFFSET_MINUTES * 60 * 1000);
};

const getOrdersStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.body;

  // ── Validation ────────────────────────────────
  if (!startDate || !endDate) {
    throw new ApiError(400, 'startDate and endDate are required');
  }

  // ✅ Convert both to UTC Date objects
  const startUTC = parseToUTC(startDate);
  const endUTC = parseToUTC(endDate);

  if (isNaN(startUTC) || isNaN(endUTC)) {
    throw new ApiError(400, 'Invalid date format');
  }

  if (startUTC > endUTC) {
    throw new ApiError(400, 'startDate must be before endDate');
  }

  // Debug log (optional) — check karo UTC conversion sahi hua
  console.log('🕒 IST input:', startDate, '→', endDate);
  console.log('🌐 UTC query:', startUTC.toISOString(), '→', endUTC.toISOString());

  // ── Run all aggregations in parallel ──────────
  const [
    preCancelledCount,
    cancelledOrderCount,
    blacklistedOrderCount,
    processedOrderCount,
    confirmOrderCount,
    pendingOrderCount,
    voidedOrderCount,
  ] = await Promise.all([
    getCount(PreCancelledOrder, startUTC, endUTC),
    getCount(CancelOrder, startUTC, endUTC),
    getCount(BlacklistedOrder, startUTC, endUTC),
    getCount(ProcessedOrder, startUTC, endUTC),
    getCount(ConfirmOrder, startUTC, endUTC),
    getCount(PendingOrder, startUTC, endUTC),
    getCount(VoidedOrder, startUTC, endUTC),
  ]);

  // ── Derived values ────────────────────────────
  const productionOrder = confirmOrderCount + processedOrderCount;
  const totalOrder =
    preCancelledCount +
    cancelledOrderCount +
    blacklistedOrderCount +
    processedOrderCount +
    confirmOrderCount +
    pendingOrderCount +
    voidedOrderCount;

  // ── Build response ────────────────────────────
  const data = {
    // Query info (both formats for clarity)
    query: {
      input_ist: { startDate, endDate },
      utc: {
        start: startUTC.toISOString(),
        end: endUTC.toISOString(),
      },
      ist: {
        start: formatDateRangeIST(startUTC, startUTC).split(' to ')[0],
        end: formatDateRangeIST(endUTC, endUTC).split(' to ')[1],
      },
    },
    date_range_utc: formatDateRangeUTC(startUTC, endUTC),

    // Counts
    preCancelledCount,
    cancelledOrderCount,
    blacklistedOrderCount,
    processedOrderCount,
    confirmOrderCount,
    pendingOrderCount,
    voidedOrderCount,

    // Totals
    productionOrder,
    totalOrder,
  };

  res
    .status(200)
    .json(new ApiResponse(200, `Orders stats fetched for ${startDate} to ${endDate}`, data));
});

module.exports = getOrdersStats;
