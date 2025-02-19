const express = require('express');
const User = require('../models/user');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Recursive function to fetch the entire downline tree
router.get('/downline/:userId', async (req, res) => {
    try {
      async function getDownline(userId) {
        let downline = [];
        const users = await User.find({ sponsor: userId }).populate('sponsor', 'code').select('fullname username _id code rank sponsor totalBusiness createdAt');
  
        for (let user of users) {
          downline.push(user); // Add user to the flat list
          const subDownline = await getDownline(user._id); // Recursively get more downline
          downline = downline.concat(subDownline); // Merge all downline into one array
        }
  
        return downline;
      }
  
      const downline = await getDownline(req.params.userId);
      res.json(downline);
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error fetching downline', error });
    }
  });
  
module.exports = router;