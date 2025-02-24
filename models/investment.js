const mongoose = require('mongoose');

const InvestmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  plan: { type: String, enum: ['10$', '20$', '30$', '50$', '100$', '200$', '300$', '500$', '1000$'] },
  daily_profit: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
});

module.exports = mongoose.model('Investment', InvestmentSchema);
