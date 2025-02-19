const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  username: { type: String, unique: true, required: true },
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
});

module.exports = mongoose.model('User', UserSchema);