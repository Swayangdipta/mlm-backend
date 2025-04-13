const express = require('express');
const User = require('../models/user');
const adminMiddleware = require('../middlewares/adminMiddleware');
const Investment = require('../models/investment');

const router = express.Router();

// Get all users
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().populate('sponsor').select('-password');
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

router.get("/total-business", async (req, res) => {
  try {
      // Check if totalBusiness field exists in any document
      const users = await User.find({}).select("totalBusiness");

      if (!users || users.length === 0) {
          return res.status(200).json({ totalBusiness: 0 });
      }

      // Perform aggregation safely
      const totalBusiness = await User.aggregate([
          {
              $group: {
                  _id: null,
                  total: { $sum: { $ifNull: ["$totalBusiness", 0] } } // Handle null/undefined values
              }
          }
      ]);

      res.status(200).json({
          totalBusiness: totalBusiness.length > 0 ? totalBusiness[0].total : 0
      });
  } catch (error) {
      console.error("Error in /total-business:", error);
      res.status(500).json({ message: "Error fetching total business", error });
  }
});

router.get("/investments", async (req, res) => {
  try {
      const investments = await Investment.find().populate("user", "fullname username code ").sort({ createdAt: -1 });

      if (!investments || investments.length === 0) {
          return res.status(200).json({ message: "No investments found" });
      }

      res.status(200).json(investments);
  } catch (error) {
      console.error("Error in /investments:", error);
      res.status(500).json({ message: "Error fetching total investments", error });
  }
});

module.exports = router;
