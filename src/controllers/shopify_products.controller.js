const {
  fetchDraftProducts,
  fetchActiveProducts,
  fetchOutOfStocksStyle,
  fetchPartialOutOfStockProducts,
} = require('../services/shopifyProducts.service');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getPagination = (req) => {
  const { cursor, limit } = req.query;
  const parsed = parseInt(limit, 10);
  return {
    cursor: cursor || null,
    limit: Number.isNaN(parsed) ? 50 : Math.min(Math.max(parsed, 1), 250),
  };
};

// out of stock (tag based)
const getOutOfStocksProduct = asyncHandler(async (req, res) => {
  const { cursor, limit } = getPagination(req);
  const { total, products, hasNextPage, nextCursor } = await fetchOutOfStocksStyle(cursor, limit);

  res.status(200).json(
    new ApiResponse(200, 'Out of stocks product fetched', {
      total,
      count: products.length,
      hasNextPage,
      nextCursor,
      data: products,
    })
  );
});

// active products
const getActiveProducts = asyncHandler(async (req, res) => {
  const { cursor, limit } = getPagination(req);
  const { total, products, hasNextPage, nextCursor } = await fetchActiveProducts(cursor, limit);

  res.status(200).json(
    new ApiResponse(200, 'Active products fetched', {
      total,
      count: products.length,
      hasNextPage,
      nextCursor,
      data: products,
    })
  );
});

// draft products
const getDraftProducts = asyncHandler(async (req, res) => {
  const { cursor, limit } = getPagination(req);
  const { total, products, hasNextPage, nextCursor } = await fetchDraftProducts(cursor, limit);

  res.status(200).json(
    new ApiResponse(200, 'Draft products fetched', {
      total,
      count: products.length,
      hasNextPage,
      nextCursor,
      data: products,
    })
  );
});

// partial out of stock
const getPartialOutOfStock = asyncHandler(async (req, res) => {
  const { cursor, limit } = getPagination(req);
  const { total, products, hasNextPage, nextCursor } = await fetchPartialOutOfStockProducts(
    cursor,
    limit
  );

  res.status(200).json(
    new ApiResponse(200, 'Partial out of stock products fetched', {
      total,
      count: products.length,
      hasNextPage,
      nextCursor,
      data: products,
    })
  );
});

module.exports = {
  getOutOfStocksProduct,
  getActiveProducts,
  getDraftProducts,
  getPartialOutOfStock,
};
