const express = require('express');
const User = require('../models/user');
const authMiddleware = require('../middlewares/authMiddleware');
const _ = require('lodash');
const withdrawal = require('../models/withdrawal');
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

router.put('/user/:userId', async (req,res) => {
  try {       
    let user = await User.findById(req.params.userId)

    if(!user){
      return res.status(404).json({message: 'No User Found.'})
    }

    user = _.extend(user, req.body)

    await user.save()

    return res.status(200).json({message: 'Data updated.'})
  } catch (error) {
    res.status(500).json({ message: 'Error updating user data', error });
  }
})

router.put('/transfer/:userId/:memberId', async (req, res) => {
  try {
    const { userId, memberId } = req.params;
    const { amount } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount.' });
    }

    const user = await User.findById(userId);
    const transferToUser = await User.findById(memberId);

    if (!user) {
      return res.status(404).json({ message: 'No User Found.' });
    }

    if (!transferToUser) {
      return res.status(404).json({ message: 'Invalid User.' });
    }

    if (user.redeem_wallet < amount) {
      return res.status(400).json({ message: 'Insufficient balance in redeem wallet.' });
    }

    // Prepare update data for sender
    const updateSender = {
      $inc: { redeem_wallet: -amount },
      $push: {
        withdrawal: {
          purpose: 'Transfer',
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          amount: amount,
        },
      },
    };

    // Prepare update data for receiver
    const updateReceiver = {
      $inc: { token_wallet: amount },
      $push: {
        credits: {
          purpose: 'Transfer',
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          amount: amount,
        },
      },
    };

    await User.findByIdAndUpdate(userId, updateSender);
    await User.findByIdAndUpdate(memberId, updateReceiver);

    return res.status(200).json({ message: 'Transfer successful.' });
  } catch (error) {
    console.error('Transfer error:', error);
    return res.status(500).json({ message: 'Error processing transfer.', error });
  }
});

  
module.exports = router;