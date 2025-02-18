const express = require('express');
const User = require('../models/user');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Recursive function to fetch the entire downline tree
const getDownlineTree = async (userId) => {
  const directDownline = await User.find({ sponsor: userId });

  return Promise.all(
    directDownline.map(async (user) => ({
      id: user._id,
      username: user.username,
      referrals: await getDownlineTree(user._id),
    }))
  );
};

router.get('/downline/:userId', authMiddleware(['user', 'admin']), async (req, res) => {
    try {
      async function getDownline(userId) {
        const users = await User.find({ sponsor: userId }).select('fullname username _id');
        let downline = [];
  
        for (let user of users) {
          const subDownline = await getDownline(user._id);
          downline.push({ user, subDownline });
        }
  
        return downline;
      }
  
      const downline = await getDownline(req.params.userId);
      res.json(downline);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching downline', error });
    }
  });
  
module.exports = router;