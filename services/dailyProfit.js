const User = require('../models/user');

async function distributeDailyProfit() {
  try {
    const users = await User.find();

    for (const user of users) {
      const hasDownlines = user.downlines && user.downlines.length > 0;
      const profitCap = hasDownlines ? user.staking_wallet * 2 : user.staking_wallet;
      
      if (user.current_wallet <= profitCap) {
        if(user.staking_wallet <= 0) {
          console.log(`❌ ${user.name || user._id} has no staking wallet balance.`);
          continue;
        }
        const dailyProfit = user.staking_wallet * (0.04 / 30.4);

        const updateData = {
          $inc: {
            daily_rewards: dailyProfit,
            redeem_wallet: dailyProfit,
          },
          $push: {
            credits: {
              purpose: 'Daily',
              date: new Date().toLocaleDateString(),
              time: new Date().toLocaleTimeString(),
              amount: dailyProfit,
            },
          },
        };

        await User.findByIdAndUpdate(user._id, updateData);
        console.log(`✅ Distributed ${dailyProfit.toFixed(2)} token to ${user.name || user._id}`);
      }
    }

    console.log('🎉 Daily profit distribution completed.');
  } catch (error) {
    console.error('❌ Error distributing daily profit:', error);
  }
}

module.exports = distributeDailyProfit;