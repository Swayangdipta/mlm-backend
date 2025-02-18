const User = require('../models/user');

async function distributeMonthlyRewards() {
  try {
    const users = await User.find();

    for (const user of users) {
      let reward = 0;

      if (user.wallet_balance >= 5000) reward = 50;
      if (user.wallet_balance >= 10000) reward = 150;

      if (reward > 0) {
        await User.findByIdAndUpdate(user._id, { $inc: { wallet_balance: reward } });
      }
    }

    console.log('Monthly rewards distribution completed.');
  } catch (error) {
    console.error('Error distributing monthly rewards:', error);
  }
}

module.exports = distributeMonthlyRewards;
