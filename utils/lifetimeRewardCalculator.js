const User = require('../models/user');
const Investment = require('../models/investment');
const LifetimeReward = require('../models/lifetimeReward');

const REWARD_TIERS = [
  { businessVolume: 1000, requiredReferrals: 10, rewardAmount: 20 },
  { businessVolume: 1500, requiredReferrals: 20, rewardAmount: 50 },
  { businessVolume: 2000, requiredReferrals: 40, rewardAmount: 100 },
];

const checkAndGrantLifetimeRewards = async () => {
  try {
    const users = await User.find();

    for (const user of users) {
      const totalBusiness = await Investment.aggregate([
        { $match: { user: user._id } },
        { $group: { _id: null, totalInvestment: { $sum: '$amount' } } },
      ]);

      const businessVolume = totalBusiness.length ? totalBusiness[0].totalInvestment : 0;
      const directReferrals = await User.countDocuments({ sponsor: user._id });

      for (const tier of REWARD_TIERS) {
        const existingReward = await LifetimeReward.findOne({
          user: user._id,
          businessVolume: tier.businessVolume,
        });

        if (!existingReward && businessVolume >= tier.businessVolume && directReferrals >= tier.requiredReferrals) {
          await LifetimeReward.create({
            user: user._id,
            rewardAmount: tier.rewardAmount,
            businessVolume: tier.businessVolume,
            requiredReferrals: tier.requiredReferrals,
          });

          await User.findByIdAndUpdate(user._id, {
            $inc: { wallet_balance: tier.rewardAmount },
          });

          console.log(`Lifetime reward of $${tier.rewardAmount} granted to ${user.username}`);
        }
      }
    }
  } catch (error) {
    console.error('Error processing lifetime rewards:', error);
  }
};

module.exports = { checkAndGrantLifetimeRewards };