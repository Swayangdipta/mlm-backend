const express = require('express');
const LifetimeReward = require('../models/LifetimeReward');
const { checkAndGrantLifetimeRewards } = require('../utils/lifetimeRewardCalculator');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Fetch user lifetime rewards
router.get('/my-lifetime-rewards', authMiddleware(['user']), async (req, res) => {
  try {
    const rewards = await LifetimeReward.find({ user: req.user.userId }).sort({ createdAt: -1 });
    res.json(rewards);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Admin triggers lifetime reward distribution
router.post('/generate-lifetime-rewards', authMiddleware(['admin']), async (req, res) => {
  try {
    await checkAndGrantLifetimeRewards();
    res.json({ message: 'Lifetime rewards processed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

module.exports = router;
