const mongoose = require('mongoose');

const LifetimeRewardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rewardAmount: { type: Number, required: true },
  businessVolume: { type: Number, required: true },
  requiredReferrals: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('LifetimeReward', LifetimeRewardSchema);
