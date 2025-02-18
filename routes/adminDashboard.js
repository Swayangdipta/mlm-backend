const express = require('express');
const User = require('../models/user');
const adminMiddleware = require('../middlewares/adminMiddleware');

const router = express.Router();

// Get all users
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error });
  }
});

// Get user details
router.get('/user/:id', adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error });
  }
});

// Update user wallet balance
router.put('/update-wallet/:id', adminMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.wallet_balance += amount;
    await user.save();

    res.json({ message: 'Wallet balance updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating wallet balance', error });
  }
});

// Delete a user
router.delete('/delete-user/:id', adminMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error });
  }
});

module.exports = router;
