const User = require('../models/user');

async function distributeLifetimeRewards() {
  try {
    const users = await User.find();

    for (const user of users) {
      let reward = 0;

      if (user.wallet_balance >= 1000 && user.rank >= 10) reward = 20;
      if (user.wallet_balance >= 1500 && user.rank >= 20) reward = 50;
      if (user.wallet_balance >= 2000 && user.rank >= 40) reward = 100;

      if (reward > 0) {
        await User.findByIdAndUpdate(user._id, { $inc: { wallet_balance: reward } });
      }
    }

    console.log('Lifetime rewards distribution completed.');
  } catch (error) {
    console.error('Error distributing lifetime rewards:', error);
  }
}

module.exports = distributeLifetimeRewards;