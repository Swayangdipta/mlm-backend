const express = require('express');
const Investment = require('../models/investment');
const User = require('../models/user');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Create an investment request
router.post('/create', authMiddleware(['user']), async (req, res) => {
  try {
    const { amount } = req.body;
    if (amount <= 0) return res.status(400).json({ message: 'Invalid investment amount' });

    const investment = await Investment.create({
      user: req.user.userId,
      amount,
    });

    res.json({ message: 'Investment request submitted', investment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Admin approves an investment
router.post('/approve/:investmentId', authMiddleware(['admin']), async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.investmentId);
    if (!investment) return res.status(404).json({ message: 'Investment not found' });

    if (investment.status !== 'pending') return res.status(400).json({ message: 'Investment already processed' });

    investment.status = 'approved';
    investment.approvedAt = new Date();
    await investment.save();

    await User.findByIdAndUpdate(investment.user, {
      $inc: { wallet_balance: investment.amount * 2 }, // Investment doubles as per requirement
    });

    res.json({ message: 'Investment approved and doubled', investment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Fetch user investments
router.get('/my-investments', authMiddleware(['user']), async (req, res) => {
  try {
    const investments = await Investment.find({ user: req.user.userId }).sort({ createdAt: -1 });
    res.json(investments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Fetch all investments (Admin)
router.get('/all', authMiddleware(['admin']), async (req, res) => {
  try {
    const investments = await Investment.find().populate('user', 'username email');
    res.json(investments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

module.exports = router;
