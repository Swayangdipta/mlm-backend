const mongoose = require('mongoose');

const DepositSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  daily_profit: { type: Number, default: 0 },
  receiptUrl: {
    type: String,
    default: 'https://res.cloudinary.com/dxkufsejm/image/upload/v1622680182/investment_receipts/default.png',
  },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'approved','rejected'], default: 'pending' },
});

module.exports = mongoose.model('Deposit', DepositSchema);
