const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  authId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  awsCredentials: {
    accessKeyId: {
      type: String,
      default: ''
    },
    secretAccessKey: {
      type: String,
      default: ''
    },
    region: {
      type: String,
      default: 'ap-southeast-2'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
