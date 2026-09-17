const getAccessToken = require('../utils/shopifyTokenGenerate');

async function testOrdersAccess() {
  const token = process.env.ACCESS_TOKEN;
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const fromDateISO = fromDate.toISOString().split('T')[0];

  let allOrders = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const afterClause = cursor ? `, after: "${cursor}"` : '';

    const response = await fetch(
      'https://qurvii-india.myshopify.com/admin/api/2026-01/graphql.json',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token,
        },
        body: JSON.stringify({
          query: `
            {
              orders(first: 250, sortKey: CREATED_AT, reverse: true, query: "financial_status:paid,expired,pending AND fulfillment_status:unfulfilled AND created_at:>=${fromDateISO}"${afterClause}) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                edges {
                  cursor
                  node {
                    id
                    name
                    createdAt
                    updatedAt
                    processedAt
                    closed
                    closedAt
                    cancelledAt
                    confirmed
                    displayFinancialStatus
                    displayFulfillmentStatus
                    paymentGatewayNames
                    transactions(first: 5) {
                      kind
                      status
                      gateway
                      amountSet {
                        shopMoney {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                }
              }
            }
          `,
        }),
      }
    );

    const result = await response.json();

    if (result.errors) {
      console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      break;
    }

    const orders = result.data.orders;
    allOrders = allOrders.concat(orders.edges.map((edge) => edge.node));

    hasNextPage = orders.pageInfo.hasNextPage;
    cursor = orders.pageInfo.endCursor;

    if (hasNextPage) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // const pendingOrders = allOrders.filter((o) => o.transactions.some((p) => p.status === 'PENDING'));
  const pendingOrders = allOrders.filter((o) =>
    o.paymentGatewayNames.some(
      (p) =>
        p?.toLowerCase() === 'cashfree payments' &&
        o.transactions.some((t) => t.kind === 'SALE' && t.status === 'PENDING')
    )
  );
  console.log('Total orders fetched:', pendingOrders.length);
  return pendingOrders;
}

async function refundFailedOrders(DAYS) {
  const token = process.env.ACCESS_TOKEN;
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - Number(DAYS));
  const fromDateISO = fromDate.toISOString().split('T')[0];

  let allOrders = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const afterClause = cursor ? `, after: "${cursor}"` : '';

    const response = await fetch(
      'https://qurvii-india.myshopify.com/admin/api/2025-07/graphql.json',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token,
        },
        body: JSON.stringify({
          query: `
            {
              orders(first: 250, sortKey: CREATED_AT, reverse: true, query: "fulfillment_status:fulfilled AND created_at:>=${fromDateISO}"${afterClause}) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                edges {
                  cursor
                  node {
                    id
                    name
                    createdAt
                    displayFinancialStatus
                    displayFulfillmentStatus
                    paymentGatewayNames
                    customer {
                      firstName
                      lastName
                      email
                      phone
                    }
                    shippingAddress {
                      phone
                    }
                    transactions(first: 10) {
                      kind
                      status
                      gateway
                      amountSet {
                        shopMoney {
                          amount
                          currencyCode
                        }
                      }
                    }
                  }
                }
              }
            }
          `,
        }),
      }
    );

    const result = await response.json();

    if (result.errors) {
      console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
      break;
    }

    const orders = result.data.orders;
    allOrders = allOrders.concat(orders.edges.map((edge) => edge.node));

    hasNextPage = orders.pageInfo.hasNextPage;
    cursor = orders.pageInfo.endCursor;

    if (hasNextPage) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log('Total orders fetched:', allOrders.length);

  const refundErrorOrders = allOrders.filter((order) =>
    order.transactions.some((txn) => txn.kind === 'REFUND' && txn.status === 'ERROR')
  );

  return refundErrorOrders;
}

// return orders
async function fetchOrdersForSummary(fromDateInput, toDateInput) {
  const token = process.env.ACCESS_TOKEN;

  const fromDate = fromDateInput
    ? new Date(fromDateInput)
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() - 90);
        return d;
      })();

  const toDate = toDateInput ? new Date(toDateInput) : new Date();

  const fromDateISO = fromDate.toISOString().split('T')[0];
  const toDateISO = toDate.toISOString().split('T')[0];

  let allOrders = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const afterClause = cursor ? `, after: "${cursor}"` : '';

    const response = await fetch(
      'https://qurvii-india.myshopify.com/admin/api/2026-01/graphql.json',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': token,
        },
        body: JSON.stringify({
          query: `
            {
              orders(first: 20, sortKey: CREATED_AT, reverse: true, query: "status:any AND created_at:>=${fromDateISO} AND created_at:<=${toDateISO}"${afterClause}) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                edges {
                  cursor
                  node {
                    id
                    name
                    createdAt
                    cancelledAt
                    displayFinancialStatus
                    displayFulfillmentStatus
                    paymentGatewayNames
                    totalPriceSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    currentTotalPriceSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    returns(first: 3) {
                      edges {
                        node {
                          id
                          status
                          returnLineItems(first: 5) {
                            edges {
                              node {
                                ... on ReturnLineItem {
                                  id
                                  quantity
                                  returnReason
                                  fulfillmentLineItem {
                                    lineItem {
                                      originalUnitPriceSet {
                                        shopMoney {
                                          amount
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                          exchangeLineItems(first: 5) {
                            edges {
                              node {
                                id
                                quantity
                                lineItems {
                                  title
                                  originalUnitPriceSet {
                                    shopMoney {
                                      amount
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                    transactions(first: 5) {
                      kind
                      status
                      amountSet {
                        shopMoney {
                          amount
                        }
                      }
                    }
                  }
                }
              }
            }
          `,
        }),
      }
    );

    const result = await response.json();

    if (result.errors) {
      const isCostError = result.errors.some((e) => e.extensions?.code === 'MAX_COST_EXCEEDED');

      if (isCostError) {
        console.error('Query cost too high:', JSON.stringify(result.errors, null, 2));
        throw new Error(
          `Shopify query cost limit exceeded (${result.errors[0]?.extensions?.cost}/1000). Reduce the 'first' values further.`
        );
      }

      console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
    }

    const orders = result.data?.orders;
    if (!orders) {
      throw new Error(
        'No orders data returned from Shopify — check logs above for the actual error.'
      );
    }

    allOrders = allOrders.concat(orders.edges.map((edge) => edge.node));

    hasNextPage = orders.pageInfo.hasNextPage;
    cursor = orders.pageInfo.endCursor;

    if (hasNextPage) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log('Total orders fetched:', allOrders.length);
  return allOrders;
}
module.exports = { testOrdersAccess, refundFailedOrders, fetchOrdersForSummary };
