const mongoose = require('mongoose');

const BlockHashSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    blockHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const BlockHash = mongoose.model('BlockHash', BlockHashSchema);

module.exports = BlockHashSchema;
