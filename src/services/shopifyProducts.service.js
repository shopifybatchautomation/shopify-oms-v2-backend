// shopify.products.js
const SHOP_URL = 'https://qurvii-india.myshopify.com/admin/api/2025-07/graphql.json';
const DEFAULT_LIMIT = 50;

/* ---------------- Core helpers ---------------- */

async function shopifyGraphQL(query, variables = {}, retries = 3) {
  const response = await fetch(SHOP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': process.env.ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();

  if (result.errors) {
    const throttled = result.errors.some((e) => e.extensions?.code === 'THROTTLED');
    if (throttled && retries > 0) {
      await new Promise((r) => setTimeout(r, 1000));
      return shopifyGraphQL(query, variables, retries - 1);
    }
    throw new Error(JSON.stringify(result.errors));
  }
  return result.data;
}

const PRODUCT_FIELDS = `
  id
  title
  handle
  status
  tags
  totalInventory
  updatedAt
  featuredImage {
    url
    altText
  }
  priceRangeV2 {
    minVariantPrice {
      amount
      currencyCode
    }
    maxVariantPrice {
      amount
      currencyCode
    }
  }

  variants(first: 50) {
    edges {
      node {
        id
        sku
        title
        inventoryQuantity
        price
        compareAtPrice
        image {
          url
        }
      }
    }
  }
`;

const PRODUCTS_QUERY = `
  query ($first: Int!, $after: String, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
    products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        cursor
        node {
          ${PRODUCT_FIELDS}
        }
      }
    }
  }
`;

const COUNT_QUERY = `
  query ($query: String) {
    productsCount(query: $query) {
      count
      precision
    }
  }
`;

/* ---------------- Reusable generic functions ---------------- */

async function fetchProductsCount(searchQuery) {
  const data = await shopifyGraphQL(COUNT_QUERY, { query: searchQuery });
  return data.productsCount.count;
}

async function fetchProductsPage({
  searchQuery,
  sortKey = 'CREATED_AT',
  reverse = true,
  cursor = null,
  limit = DEFAULT_LIMIT,
}) {
  const data = await shopifyGraphQL(PRODUCTS_QUERY, {
    first: limit,
    after: cursor,
    query: searchQuery,
    sortKey,
    reverse,
  });

  const { edges, pageInfo } = data.products;

  return {
    products: edges.map((e) => e.node),
    hasNextPage: pageInfo.hasNextPage,
    nextCursor: pageInfo.endCursor,
  };
}

async function getProducts(config, cursor = null, limit = DEFAULT_LIMIT) {
  const [total, page] = await Promise.all([
    cursor ? Promise.resolve(null) : fetchProductsCount(config.searchQuery),
    fetchProductsPage({ ...config, cursor, limit }),
  ]);

  return { total, ...page };
}

/* ---------------- Specific functions ---------------- */

const fetchOutOfStocksStyle = (cursor, limit) =>
  getProducts(
    {
      searchQuery: "status:active AND tag:'Out of stock'",
      sortKey: 'UPDATED_AT',
      reverse: true,
    },
    cursor,
    limit
  );

const fetchActiveProducts = (cursor, limit) =>
  getProducts(
    {
      searchQuery:
        "status:active AND tag_not:'Out of stock' AND inventory_quantity_not:0 AND out_of_stock_somewhere:false",
      sortKey: 'UPDATED_AT',
      reverse: true,
    },
    cursor,
    limit
  );

const fetchDraftProducts = (cursor, limit) =>
  getProducts({ searchQuery: 'status:draft', sortKey: 'UPDATED_AT', reverse: true }, cursor, limit);

const fetchPartialOutOfStockProducts = (cursor, limit) =>
  getProducts(
    {
      searchQuery: "status:active AND tag_not:'Out of stock' AND out_of_stock_somewhere:true",
      sortKey: 'UPDATED_AT',
      reverse: true,
    },
    cursor,
    limit
  );

module.exports = {
  fetchOutOfStocksStyle,
  fetchPartialOutOfStockProducts,
  fetchActiveProducts,
  fetchDraftProducts,
  fetchProductsCount,
};
