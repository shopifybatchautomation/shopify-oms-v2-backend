const PreCancelledOrder = require('../models/preCancelledOrder.model');
const CancelOrder = require('../models/cancelOrder.model');
const BlacklistedOrder = require('../models/blacklistedOrder.model');
const ProcessedOrder = require('../models/processedOrder.model');
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

// 🔧 Helper: format date range once
const formatDateRange = (start, end) =>
  `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`;

const getOrdersStats = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.body;

  // ── Validation ────────────────────────────────
  if (!startDate || !endDate) {
    throw new ApiError(400, 'startDate and endDate are required');
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start) || isNaN(end)) {
    throw new ApiError(400, 'Invalid date format');
  }

  if (start > end) {
    throw new ApiError(400, 'startDate must be before endDate');
  }

  // Make end inclusive (end of day)
  end.setHours(23, 59, 59, 999);

  // ── Run all 4 aggregations in parallel ────────
  const [preCancelledCount, cancelledOrderCount, blacklistedOrderCount, processedOrderCount] =
    await Promise.all([
      getCount(PreCancelledOrder, start, end),
      getCount(CancelOrder, start, end),
      getCount(BlacklistedOrder, start, end),
      getCount(ProcessedOrder, start, end),
    ]);

  // ── Build response ────────────────────────────
  const data = {
    date_range: formatDateRange(start, end),
    preCancelledCount,
    cancelledOrderCount,
    blacklistedOrderCount,
    processedOrderCount,
  };

  res
    .status(200)
    .json(new ApiResponse(200, `Orders stats fetched for ${startDate} to ${endDate}`, data));
});

module.exports = getOrdersStats;
