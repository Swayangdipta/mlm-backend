const User = require('../models/user');

async function distributeLevelCommission(referrerId, amount) {
  try {
    let commissionRates = [0.03, 0.02, 0.02, 0.01, 0.01, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005];
    let currentReferrer = await User.findById(referrerId);
    let level = 0;

    while (currentReferrer && level < commissionRates.length) {
      if (currentReferrer.rank >= level + 1) {
        let commission = amount * commissionRates[level];

        await User.findByIdAndUpdate(currentReferrer._id, { $inc: { wallet_balance: commission } });
      }

      currentReferrer = await User.findById(currentReferrer.sponsor);
      level++;
    }

    console.log('Level commission distributed.');
  } catch (error) {
    console.error('Error distributing level commission:', error);
  }
}

module.exports = distributeLevelCommission;