const User = require('../models/user');
const Investment = require('../models/investment');
const Bonus = require('../models/bonus');

const DAILY_PERCENTAGE = 0.005; // 0.50% Daily Profit
const MONTHLY_BONUS_REQUIREMENT = 5000; // Business volume required for monthly bonus

// Daily Bonus Generation
const generateDailyBonus = async () => {
  try {
    const investments = await Investment.find();

    for (const investment of investments) {
      const dailyBonus = investment.amount * DAILY_PERCENTAGE;

      await Bonus.create({
        user: investment.user,
        amount: dailyBonus,
        type: 'daily',
      });

      await User.findByIdAndUpdate(investment.user, {
        $inc: { wallet_balance: dailyBonus },
      });
    }

    console.log('Daily bonus distributed successfully');
  } catch (error) {
    console.error('Error distributing daily bonus:', error);
  }
};

// Monthly Bonus Generation
const generateMonthlyBonus = async () => {
  try {
    const users = await User.find();
    
    for (const user of users) {
      const totalBusiness = await Investment.aggregate([
        { $match: { user: user._id } },
        { $group: { _id: null, totalInvestment: { $sum: '$amount' } } },
      ]);

      const businessVolume = totalBusiness.length ? totalBusiness[0].totalInvestment : 0;

      if (businessVolume >= MONTHLY_BONUS_REQUIREMENT) {
        const monthlyBonus = 50; // Fixed monthly bonus
        await Bonus.create({
          user: user._id,
          amount: monthlyBonus,
          type: 'monthly',
        });

        await User.findByIdAndUpdate(user._id, {
          $inc: { wallet_balance: monthlyBonus },
        });
      }
    }

    console.log('Monthly bonus distributed successfully');
  } catch (error) {
    console.error('Error distributing monthly bonus:', error);
  }
};

module.exports = { generateDailyBonus, generateMonthlyBonus };
