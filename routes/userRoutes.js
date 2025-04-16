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
        
        console.log(users);
        
        for (let user of users) {
          downline.push(user); // Add user to the flat list
          const subDownline = await getDownline(user._id); // Recursively get more downline
          downline = downline.concat(subDownline); // Merge all downline into one array
        }
  
        return downline;
      }
      
      console.log(req.params.userId);
      
      const downline = await getDownline(req.params.userId);
      res.json(downline);
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error fetching downline', error });
    }
});

router.get('/:userId', async (req,res) => {
  try {
    const user = await User.findById(req.params.userId).populate('referrals')

    if(!user) res.status(404).json({message: 'No User Found.'})

      return res.status(200).json(user)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user data', error });
  }
})

router.get('/user/:userId', async (req,res) => {
  try {
    const user = await User.findOne({code: req.params.userId})

      if(!user){
        return res.status(404).json({message: 'No User Found.'})
      }
      
      return res.status(200).json({fullname: user.fullname || user.username})
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user data', error });
  }
})
  
module.exports = router;