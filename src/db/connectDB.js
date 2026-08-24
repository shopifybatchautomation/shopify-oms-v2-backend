const mongoose = require('mongoose');
const DB_NAME = 'shopify-oms-v2';
const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(`${MONGODB_URI}/${DB_NAME}`);
    console.log(`Mongodb connection at : ${connection.connection.host}`);
  } catch (error) {
    console.log('Failed to connect with database');
  }
};

module.exports = connectDB;
