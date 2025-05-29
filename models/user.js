const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  username: { type: String, unique: false, required: false },
  sponsor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  wallet_balance: { type: Number, default: 0 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  mobile: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  country: { type: String, required: true },
  rank: { type: Number, default: 0 }, // Rank based on business volume
  code: { type: String, default: null, unique: true }, // Referral code
  referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Stores direct referrals
  totalBusiness: { type: Number, default: 0 }, // Business volume from downline,
  status: { type: String, enum: ['active', 'inactive'], default: 'inactive' },
  activationDate: { type: Date, default: null },
  bankName: { type: String, default: null },
  accountNumber: { type: String, default: null },
  accountName: { type: String, default: null },
  ifscCode: { type: String, default: null },
  token_wallet: { type: Number, default: 0 }, // Token wallet balance
  current_wallet: { type: Number, default: 0 }, // Token wallet balance
  redeem_wallet: { type: Number, default: 0 }, // Token wallet balance
  staking_wallet: { type: Number, default: 0 }, // Staking wallet balance
  credits: [],
  withdrawals: [],
  referral_wallet: {type: Number, default: 0},
  isReferralBonusCreditedToSponsor: {type: Boolean, default: false},
  daily_rewards: {type: Number, default: 0},
  team_rewards: {type: Number, default: 0},
  monthly_rewards: {type: Number, default: 0},
  lifetime_rewards: {type: Number, default: 0},
  wallet_address: {type: String, default: null},
  pending_deposits: [],
  forgot_token: String,
  forgot_token_expiry: Date,
  isPackActivatedOnce: { type: Boolean, default: false }, // To track if pack is activated once
});

module.exports = mongoose.model('User', UserSchema);