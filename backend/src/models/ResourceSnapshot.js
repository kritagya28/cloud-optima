const mongoose = require('mongoose');

const ResourceSnapshotSchema = new mongoose.Schema({
  resourceId: {
    type: String,
    required: true,
    index: true
  },
  resourceName: {
    type: String,
    default: ''
  },
  resourceType: {
    type: String,
    required: true,
    enum: ['EC2', 'EBS', 'S3', 'EIP'],
    index: true
  },
  region: {
    type: String,
    required: true,
    default: 'us-east-1'
  },
  status: {
    type: String,
    default: 'active'
  },
  metrics: {
    cpuUtilizationAvg: Number,
    sizeGB: Number,
    unattachedSince: Date,
    lastAccessed: Date
  },
  costEstimation: {
    type: Number, // Estimated monthly cost in USD
    required: true,
    default: 0
  },
  potentialSavings: {
    type: Number, // Potential savings if optimized in USD
    required: true,
    default: 0
  },
  optimizationStatus: {
    type: String,
    required: true,
    enum: ['active', 'idle', 'orphaned', 'underutilized'],
    default: 'active'
  },
  recommendation: {
    type: String,
    default: ''
  },
  scannedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ResourceSnapshot', ResourceSnapshotSchema);
