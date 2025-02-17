const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const userSchema = new Schema({
  username: {
    type: String,          
    required: true,       
    unique: true,                          
  },
  password: {
    type: String,         
    required: true         
  },
  createdAt: {
    type: Date,
    default: Date.now      
  },
  diabetesTransactionHashes: [{ type: String }],
  heartTransactionHashes: [{ type: String }],
  lungTransactionHashes: [{ type: String }]
});

const User = model('User', userSchema);
module.exports = User;

