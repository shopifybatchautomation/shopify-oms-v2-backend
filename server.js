require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/db/connectDB');
const globalErrorHandler = require('./src/middlewares/globalErrorHandler');
const ApiError = require('./src/utils/ApiError');
const app = express();

// -- Return & Inventory Management module (unrelated to order management,
// left untouched as requested; already lives in the same MVC layout). --
const returnTableRoutes = require('./src/routes/returnTable.route');
const pressTableRoutes = require('./src/routes/pressTable.route');
const shipReturnRoutes = require('./src/routes/shipReturn.route');
const inventoryTableRoutes = require('./src/routes/inventoryTable.route');
const returnLogRoutes = require('./src/routes/returnLog.routes');
const productRoutes = require('./src/routes/productRoutes.js');

// -- Order management module (rewritten) --
const confirmOrderRoutes = require('./src/routes/confirmOrder.routes');
const pendingOrderRoutes = require('./src/routes/pendingOrder.routes');
const preCancelledOrderRoutes = require('./src/routes/preCancelledOrder.routes');
const cancelOrderRoutes = require('./src/routes/cancelOrder.routes');
const holdOrderRoutes = require('./src/routes/holdOrder.routes');
const voidedOrderRoutes = require('./src/routes/voidedOrder.routes');
const blacklistedOrderRoutes = require('./src/routes/blacklistedOrder.routes');
const blacklistedCustomerRoutes = require('./src/routes/blacklistedCustomer.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const processedOrdersRoutes = require('./src/routes/processedOrder.routes');
const orderStatsRoutes = require('./src/routes/orderStats.routes.js');

const PORT = process.env.PORT || 5000;

// global middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://shopifyomsv2.netlify.app',
      'https://shopifyomsv3.netlify.app',
      'https://shopifyomsv4.netlify.app',
      'https://qurvii-order-dashboard.netlify.app',
      'https://p-finder.netlify.app',
    ],
  })
);

// routes for return & inventory management
app.use('/api/v1/return-table', returnTableRoutes);
app.use('/api/v1/press-table', pressTableRoutes);
app.use('/api/v1/ship-record', shipReturnRoutes);
app.use('/api/v1/inventory-table', inventoryTableRoutes);
app.use('/api/v1/return-log', returnLogRoutes);
app.use('/api/v1/products', productRoutes);

// routes for order management
app.use('/api/v1/orders', confirmOrderRoutes);
app.use('/api/v1/orders', pendingOrderRoutes);
app.use('/api/v1/orders', preCancelledOrderRoutes);
app.use('/api/v1/orders', cancelOrderRoutes);
app.use('/api/v1/orders', holdOrderRoutes);
app.use('/api/v1/orders', voidedOrderRoutes);
app.use('/api/v1/orders', processedOrdersRoutes);
app.use('/api/v1/orders', blacklistedOrderRoutes);
app.use('/api/v1/customers', blacklistedCustomerRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/orders', orderStatsRoutes);

// mongodb connection
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`The server is running on ${PORT}`);
    });
  })
  .catch((error) => {
    throw new ApiError(500, 'Failed to connect with database!');
  });

// global error middleware (must be registered last)
app.use(globalErrorHandler);
