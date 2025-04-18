const express = require('express');
const Deposit = require('../models/deposit');
const User = require('../models/user');
const authMiddleware = require('../middlewares/authMiddleware');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const Transaction = require('../models/Transaction');
const router = express.Router();

// Create an deposit request
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/create', upload.single('receipt'), async (req, res) => {
  try {
      const { amount } = req.body;
      if (amount <= 0) return res.status(400).json({ message: 'Invalid deposit amount' });

      if (!req.file) return res.status(400).json({ message: 'Receipt image is required' });

      // Upload file to Cloudinary
      const result = await cloudinary.uploader.upload_stream(
          { folder: 'deposit_receipts' }, // Store inside a folder
          async (error, result) => {
              if (error) return res.status(500).json({ message: 'Cloudinary upload failed', error });
              
              // Create Deposit
              const deposit = await Deposit.create({
                  user: req.body.user,
                  amount,
                  receiptUrl: result.secure_url // Save Cloudinary image URL
              });

              // Create Transaction
              const transaction = await Transaction.create({
                  user: req.body.user,
                  type: 'deposit',
                  amount,
                  referenceId: deposit._id, // Reference to the deposit
                  receiptUrl: result.secure_url // Save Cloudinary image URL
              });

              res.json({ message: 'Deposit request submitted', deposit, transaction });
          }
      );

      // Pipe file buffer into Cloudinary upload
      result.end(req.file.buffer);
  } catch (error) {
      res.status(500).json({ message: 'Server error', error });
  }
});

router.post('/approve/:depositId', authMiddleware(['admin']), async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.depositId);
    if (!deposit) return res.status(404).json({ message: 'Deposit not found' });

    if (deposit.status !== 'pending') return res.status(400).json({ message: 'Deposit already processed' });

    deposit.status = 'approved';
    deposit.approvedAt = new Date();
    await deposit.save();

    await User.findByIdAndUpdate(deposit.user, {
      $set: {current_wallet: deposit.amount},
      $inc: { wallet_balance: deposit.amount, staking_wallet: parseInt(deposit.amount) * 400, token_wallet: parseInt(deposit.amount) * 400 }, // Deposit added to wallet balance
      $push: {
        credits: {
          purpose: 'Deposit Approved',
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          amount: deposit.amount * 400,
        }
      }
    });

    res.json({ message: 'Deposit approved', deposit });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

router.get('/receipt/:id', async (req, res) => {
  try {
      const deposit = await Deposit.findById(req.params.id);
      if (!deposit || !deposit.receiptUrl) {
          return res.status(404).json({ message: 'Receipt not found' });
      }

      res.set('Content-Type', deposit.receipt.contentType);
      res.json({url: deposit.receiptUrl});
  } catch (error) {
      res.status(500).json({ message: 'Server error', error });
  }
});


module.exports = router;