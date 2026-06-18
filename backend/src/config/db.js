const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cloud-cost-dashboard';
    
    // In actual production, the connection parameters would be customized
    const conn = await mongoose.connect(connUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    // Throw error so caller index.js can catch it and continue in simulation mode
    throw error;
  }
};

module.exports = connectDB;
