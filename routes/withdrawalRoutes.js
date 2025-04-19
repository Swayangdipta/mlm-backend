const express = require('express');
const Withdrawal = require('../models/withdrawal');
const User = require('../models/user');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Request withdrawal
router.post('/request', async (req, res) => {
  try {
    const { amount } = req.body;
    const user = await User.findById(req.body.user);

    if (amount <= 0 || amount > user.wallet_balance) {
      return res.status(400).json({ message: 'Invalid withdrawal amount' });
    }

    const withdrawal = await Withdrawal.create({
      user: user._id,
      amount,
    });    

    await User.findByIdAndUpdate(user._id, { $inc: { wallet_balance: -amount } });

    res.json({ message: 'Withdrawal request submitted', withdrawal });
  } catch (error) {
    console.log(error);
    
    res.status(500).json({ message: 'Server error', error });
  }
});

// Admin approves a withdrawal
router.post('/approve/:withdrawalId', async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.withdrawalId);
    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' });

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ message: 'Withdrawal already processed' });
    }

    withdrawal.status = 'approved';
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    res.json({ message: 'Withdrawal approved', withdrawal });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Fetch user withdrawals
router.get('/my-withdrawals', async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ user: req.user.userId }).sort({ requestedAt: -1 });
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Fetch all withdrawals (Admin)
router.get('/all', async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find().populate('user', 'username email');
    res.status(200).json(withdrawals);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

module.exports = router;