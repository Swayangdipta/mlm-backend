const mongoose = require('mongoose');

const BonusSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['daily', 'monthly'], required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Bonus', BonusSchema);
