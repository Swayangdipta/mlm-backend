const express = require('express');
const Investment = require('../models/investment');
const User = require('../models/user');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const Transaction = require('../models/Transaction');
const router = express.Router();

// Create an investment request
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/create', async (req, res) => {
  try {
      const { amount, user } = req.body;
      
      if (!user) return res.status(400).json({ message: 'User is required' });
      if (amount <= 0) return res.status(400).json({ message: 'Invalid investment amount' });

      const userExists = await User.find({code: user});
      if (!userExists) return res.status(404).json({ message: 'User not found' });
      
      if (amount > userExists[0].wallet_balance) return res.status(400).json({ message: 'Insufficient wallet balance' });
      // Create Investment
      const investment = await Investment.create({
          user: userExists[0]._id,
          amount,
          plan: amount + '$',
      });

      // Create Transaction
      const transaction = await Transaction.create({
          user: userExists[0]._id,
          type: 'investment',
          amount,
          status: 'completed',
          referenceId: investment._id, // Reference to the investment
      });

      userExists[0].wallet_balance -= amount;
      await userExists[0].save();

      res.json({ message: 'Investment request submitted', investment, transaction });

  } catch (error) {
    console.log(error);
    
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
router.post('/my-investments', async (req, res) => {
  try {
    const investments = await Investment.find({ user: req.body.user }).sort({ createdAt: -1 });
    
    let total = 0;
    investments.forEach(investment => {
      total += investment.amount;
    });
    res.json({investments, total});
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Fetch user transactions
router.post('/my-transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.body.user }).sort({ createdAt: -1 });
    
    res.json({transactions});
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

router.get('/receipt/:id', async (req, res) => {
  try {
      const investment = await Investment.findById(req.params.id);
      if (!investment || !investment.receipt) {
          return res.status(404).json({ message: 'Receipt not found' });
      }

      res.set('Content-Type', investment.receipt.contentType);
      res.send(investment.receipt.data);
  } catch (error) {
      res.status(500).json({ message: 'Server error', error });
  }
});


module.exports = router;
