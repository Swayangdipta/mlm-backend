const User = require('../models/user');

function getEligibleLevels(referralCount) {
  if (referralCount >= 5) return 21;
  if (referralCount === 4) return 15;
  if (referralCount === 3) return 10;
  if (referralCount === 2) return 4;
  if (referralCount === 1) return 2;
  return 0;
}

async function getDirectReferralsCount(userId) {
  return await User.countDocuments({ sponsor: userId });
}

async function distributeLevelCommission(referrerId, baseAmount) {
  try {
    const commissionRates = [0.10, 0.05, 0.05, 0.05, 0.03, 0.03, 0.03, 0.03, 0.02, 0.02, 0.02, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01];
    let currentUser = await User.findById(referrerId);
    let level = 0;
    const visited = new Set();

    let prevCommission = baseAmount * commissionRates[0]; // Level 0 user gets commission based on baseAmount

    // Give commission to referrerId (first person)
    if (currentUser) {
      await User.findByIdAndUpdate(currentUser._id, {
        $inc: { wallet_balance: prevCommission },
        $push: {
          credits: {
            purpose: 'Team',
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            amount: prevCommission,
          }
        }
      });

      console.log(`Level 1: ${currentUser.name || 'Unnamed'} (ID: ${currentUser._id}) earned ₹${prevCommission.toFixed(2)}`);
      level = 1;
    }

    // Move up the sponsor chain
    while (currentUser && currentUser.sponsor && level < commissionRates.length - 1) {
      const upline = await User.findById(currentUser.sponsor);
      if (!upline || visited.has(upline._id.toString())) break;
      visited.add(upline._id.toString());

      const directReferrals = await getDirectReferralsCount(upline._id);
      const maxLevel = getEligibleLevels(directReferrals);

      if (level < maxLevel) {
        const rate = commissionRates[level];
        const commission = prevCommission * rate;

        await User.findByIdAndUpdate(upline._id, {
          $inc: { wallet_balance: commission, redeem_wallet: commission },
          $push: {
            credits: {
              purpose: 'Team',
              date: new Date().toLocaleDateString(),
              time: new Date().toLocaleTimeString(),
              amount: commission,
            }
          }
        });

        console.log(`Level ${level + 1}: ${upline.name || 'Unnamed'} (ID: ${upline._id}) earned ₹${commission.toFixed(2)} (from downline’s ₹${prevCommission.toFixed(2)})`);
        prevCommission = commission;
      }

      currentUser = upline;
      level++;
    }

    console.log('Team commission distributed.');
    return true
  } catch (error) {
    console.error('Error distributing team commission:', error);
    return false
  }
}

module.exports = distributeLevelCommission;