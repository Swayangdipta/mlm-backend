const User = require('../models/user');

function getEligibleLevels(referralCount) {
  if (referralCount >= 5) return 21;
  if (referralCount === 4) return 15;
  if (referralCount === 3) return 10;
  if (referralCount === 2) return 4;
  if (referralCount === 1) return 2;
  return 0;
}

async function distributeDailyTeamRewards() {
  try {
    // 1. Load all users once
    const users = await User.find({});
    // Build a map: userId → userDoc
    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = u;
    });

    // 2. Build referral map from each user’s `referrals` array
    //    so referralMap[uplineId] = [ userDoc, userDoc, ... ]
    const referralMap = {};
    users.forEach(u => {
      const uplineId = u._id.toString();
      referralMap[uplineId] = (u.referrals || [])
        .map(rid => userMap[rid.toString()])
        .filter(Boolean);
    });

    // 3. Commission rates by level
    const commissionRates = [
      /* Level 1 */ 0.10,
      /* Level 2 */ 0.05,
      /* Level 3 */ 0.05,
      /* Level 4 */ 0.04,
      /* Level 5 */ 0.04,
    
      /* Level 6 */ 0.03,
      /* Level 7 */ 0.03,
      /* Level 8 */ 0.03,
      /* Level 9 */ 0.03,
    
      /* Level 10 */ 0.02,
      /* Level 11 */ 0.02,
      /* Level 12 */ 0.02,
      /* Level 13 */ 0.02,
      /* Level 14 */ 0.02,
      /* Level 15 */ 0.02,
      /* Level 16 */ 0.02,
      /* Level 17 */ 0.02,
      /* Level 18 */ 0.02,
      /* Level 19 */ 0.02,
      /* Level 20 */ 0.02,
    
      /* Level 21 */ 0.01,
      /* Level 22 */ 0.01,
      /* Level 23 */ 0.01,
      /* Level 24 */ 0.01,
      /* Level 25 */ 0.01,
      /* Level 26 */ 0.01,
      /* Level 27 */ 0.01,
      /* Level 28 */ 0.01,
      /* Level 29 */ 0.01,
      /* Level 30 */ 0.01,
    ];
    

    // 4. Iterate each user as the “upline”
    for (const upline of users) {
      const uplineId    = upline._id.toString();
      const directCount = (referralMap[uplineId] || []).length;
      const maxLevel    = getEligibleLevels(directCount);
      if (maxLevel < 1) continue;  // no team levels for this user

      // 5. BFS through downlines up to maxLevel
      let queue = referralMap[uplineId].slice(); // direct referrals
      let level = 1;
      const visited = new Set();

      while (level <= maxLevel && queue.length) {
        const nextQueue = [];

        for (const down of queue) {
          const downId = down._id.toString();
          if (visited.has(downId)) continue;
          visited.add(downId);

          // 6. Compute daily profit & commission
          const dailyProfit = down.staking_wallet * (0.04 / 30.4);
          const rate        = commissionRates[level - 1] || 0;
          const commission  = dailyProfit * rate;

          // 7. Update the upline’s redeem_wallet & team_rewards
          await User.findByIdAndUpdate(
            uplineId,
            {
              $inc: {
                redeem_wallet: commission,
                team_rewards: commission
              },
              $push: {
                credits: {
                  purpose: 'Team Reward',
                  date: new Date().toLocaleDateString(),
                  time: new Date().toLocaleTimeString(),
                  amount: commission,
                  from: down._id,
                  level
                }
              }
            }
          );

          // 8. Queue this downline’s direct referrals for next level
          const children = referralMap[downId] || [];
          nextQueue.push(...children);
        }

        queue = nextQueue;
        level++;
      }
    }

    console.log('✅ Daily team rewards distribution complete.');
    return true;
  } catch (err) {
    console.error('❌ Error in distributeDailyTeamRewards:', err);
    return false;
  }
}

module.exports = distributeDailyTeamRewards;