const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const { getDashboardSummary } = require('../services/dashboard.service');

// GET /dashboard/summary?startDate=&endDate=
// Defaults to "today" when no range is supplied.
const getSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const summary = await getDashboardSummary({ startDate, endDate });
  res.status(200).json(new ApiResponse(200, 'Dashboard summary fetched successfully.', summary));
});

module.exports = { getSummary };
