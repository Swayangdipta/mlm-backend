const User = require('../models/user');

async function distributeDailyProfit() {
  try {
    const users = await User.find();

    for (const user of users) {
      const dailyProfit = (user.wallet_balance * 0.005); // 0.50% of wallet balance

      await User.findByIdAndUpdate(user._id, { $inc: { wallet_balance: dailyProfit } });
    }

    console.log('Daily profit distribution completed.');
  } catch (error) {
    console.error('Error distributing daily profit:', error);
  }
}

module.exports = distributeDailyProfit;
