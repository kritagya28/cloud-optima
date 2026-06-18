const mongoose = require('mongoose');

const CostTrendSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  serviceName: {
    type: String,
    required: true,
    index: true
  },
  cost: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  period: {
    type: String,
    enum: ['daily', 'monthly'],
    default: 'monthly'
  }
});

module.exports = mongoose.model('CostTrend', CostTrendSchema);
