const User = require('../models/user');

async function distributeDailyProfit() {
  try {
    const users = await User.find();

    for (const user of users) {
      if(user.dailyProfit <= user.staking_wallet){
        const dailyProfit = (user.staking_wallet * 0.04); // 0.50% of wallet balance

        await User.findByIdAndUpdate(user._id, { $inc: { daily_rewards: dailyProfit } });
      }
    }

    console.log('Daily profit distribution completed.');
  } catch (error) {
    console.error('Error distributing daily profit:', error);
  }
}

module.exports = distributeDailyProfit;
