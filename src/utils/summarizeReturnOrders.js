function summarizeOrdersReport(orders) {
  const round2 = (n) => Number(n.toFixed(2));

  let totalOrders = orders.length;
  let cancelledOrdersCount = 0;
  let grossSalesAmount = 0;
  let netSalesAmount = 0;

  let ordersWithReturnCount = 0;
  let totalReturnRequests = 0;
  let totalReturnedQuantity = 0;
  let totalReturnedAmount = 0;

  let totalRefundedAmount = 0;
  let totalRefundFailedAmount = 0;
  let totalRefundPendingAmount = 0;
  let refundSuccessCount = 0;
  let refundErrorCount = 0;
  let refundPendingCount = 0;

  const returnStatusBreakdown = {};
  const returnReasonBreakdown = {};
  const paymentGatewayBreakdown = {};

  orders.forEach((order) => {
    const isCancelled = !!order.cancelledAt;
    if (isCancelled) cancelledOrdersCount += 1;

    const grossAmount = parseFloat(order.totalPriceSet?.shopMoney?.amount || 0);
    const netAmount = parseFloat(order.currentTotalPriceSet?.shopMoney?.amount || 0);

    if (!isCancelled) {
      grossSalesAmount += grossAmount;
      netSalesAmount += netAmount;
    }

    // Payment gateway wise breakdown
    (order.paymentGatewayNames || []).forEach((gw) => {
      if (!paymentGatewayBreakdown[gw]) {
        paymentGatewayBreakdown[gw] = { orderCount: 0, amount: 0 };
      }
      if (!isCancelled) {
        paymentGatewayBreakdown[gw].orderCount += 1;
        paymentGatewayBreakdown[gw].amount += grossAmount;
      }
    });

    // Returns
    const returnEdges = order.returns?.edges || [];
    if (returnEdges.length > 0) ordersWithReturnCount += 1;
    totalReturnRequests += returnEdges.length;

    returnEdges.forEach(({ node: ret }) => {
      returnStatusBreakdown[ret.status] = (returnStatusBreakdown[ret.status] || 0) + 1;

      (ret.returnLineItems?.edges || []).forEach(({ node: item }) => {
        const qty = item.quantity || 0;
        totalReturnedQuantity += qty;

        const unitPrice = parseFloat(
          item.fulfillmentLineItem?.lineItem?.originalUnitPriceSet?.shopMoney?.amount || 0
        );
        totalReturnedAmount += unitPrice * qty;

        const reason = item.returnReason || 'UNSPECIFIED';
        returnReasonBreakdown[reason] = (returnReasonBreakdown[reason] || 0) + 1;
      });
    });

    // Refund transactions
    const refundTxns = (order.transactions || []).filter((t) => t.kind === 'REFUND');
    refundTxns.forEach((txn) => {
      const amount = parseFloat(txn.amountSet?.shopMoney?.amount || 0);
      if (txn.status === 'SUCCESS') {
        totalRefundedAmount += amount;
        refundSuccessCount += 1;
      } else if (txn.status === 'ERROR' || txn.status === 'FAILURE') {
        totalRefundFailedAmount += amount;
        refundErrorCount += 1;
      } else if (txn.status === 'PENDING') {
        totalRefundPendingAmount += amount;
        refundPendingCount += 1;
      }
    });
  });

  return {
    orders: {
      totalOrders,
      cancelledOrders: cancelledOrdersCount,
      validOrders: totalOrders - cancelledOrdersCount,
    },
    sales: {
      grossSalesAmount: round2(grossSalesAmount),
      netSalesAmount: round2(netSalesAmount),
      averageOrderValue:
        totalOrders - cancelledOrdersCount > 0
          ? round2(grossSalesAmount / (totalOrders - cancelledOrdersCount))
          : 0,
    },
    returns: {
      ordersWithReturn: ordersWithReturnCount,
      totalReturnRequests,
      totalReturnedQuantity,
      totalReturnedAmount: round2(totalReturnedAmount),
      returnStatusBreakdown,
      returnReasonBreakdown,
    },
    refunds: {
      totalRefundedAmount: round2(totalRefundedAmount),
      totalRefundFailedAmount: round2(totalRefundFailedAmount),
      totalRefundPendingAmount: round2(totalRefundPendingAmount),
      refundSuccessCount,
      refundErrorCount,
      refundPendingCount,
    },
    paymentGatewayBreakdown: Object.fromEntries(
      Object.entries(paymentGatewayBreakdown).map(([gw, data]) => [
        gw,
        { orderCount: data.orderCount, amount: round2(data.amount) },
      ])
    ),
  };
}

module.exports = summarizeOrdersReport;
