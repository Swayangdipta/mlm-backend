const express = require('express');
const Bonus = require('../models/bonus');
const { generateDailyBonus, generateMonthlyBonus } = require('../utils/bonusCalculator');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Fetch user bonuses
router.get('/my-bonuses', authMiddleware(['user']), async (req, res) => {
  try {
    const bonuses = await Bonus.find({ user: req.user.userId }).sort({ createdAt: -1 });
    res.json(bonuses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Admin triggers bonus distribution
router.post('/generate-daily', authMiddleware(['admin']), async (req, res) => {
  try {
    await generateDailyBonus();
    res.json({ message: 'Daily bonus distributed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

router.post('/generate-monthly', authMiddleware(['admin']), async (req, res) => {
  try {
    await generateMonthlyBonus();
    res.json({ message: 'Monthly bonus distributed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

module.exports = router;
