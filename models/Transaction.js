const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { 
        type: String, 
        enum: ['deposit', 'withdrawal', 'profit', 'investment'], 
        required: true 
    },
    amount: { type: Number, required: true, min: 0 },
    status: { 
        type: String, 
        enum: ['pending', 'completed', 'failed'], 
        default: 'pending' 
    },
    paymentMethod: {
        type: String, 
        enum: ['bank', 'crypto', 'paypal', 'other'], 
        default: 'crypto'
    },
    referenceId: { type: String, default: null }, // Reference for external transactions
    receiptUrl: {
        type: String,
        default: null
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
