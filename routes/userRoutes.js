const express = require('express');
const User = require('../models/user');
const Deposit = require('../models/deposit');
const authMiddleware = require('../middlewares/authMiddleware');
const _ = require('lodash');
const withdrawal = require('../models/withdrawal');
const router = express.Router();

// Recursive function to fetch the entire downline tree
router.get('/downline/:userId', async (req, res) => {
    try {
      async function getDownline(userId) {
        let downline = [];
        
        const users = await User.find({ sponsor: userId }).populate('sponsor', 'code').select('fullname username _id code rank sponsor totalBusiness createdAt wallet_balance status');
        
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

router.get('/:userId', async (req,res) => {
  try {
    let user = await User.findById(req.params.userId).populate('referrals')
 
    if(!user) res.status(404).json({message: 'No User Found.'})

          
    let withdrawal_amount = 0 

    user.withdrawals.forEach((item) => {
      withdrawal_amount += parseFloat(item.amount) 
    })

    user.withdrawalAmount = withdrawal_amount

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

router.get('/getname/:userId', async (req,res) => {
  try {
    const user = await User.findById(req.params.userId)

      if(!user){
        return res.status(404).json({message: 'No User Found.'})
      }
      
      return res.status(200).json({fullname: user.fullname || user.username})
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user data', error });
  }
})

router.get('/referral-benefits/:userId', async (req,res) => {
  try {
    const user = await User.findById(req.params.userId)
      
      if(!user){
        return res.status(404).json({message: 'No User Found.'})
      }

      let benefits = []

      user.credits.forEach(credit => {
        if(credit.purpose.includes('Referral')){
          benefits.push(credit)
        }
      }
      )
      
      return res.status(200).json(benefits)
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user data', error });
  }
})

router.get('/deposits/:userId', async (req,res) => {
  try {
    const user = await User.findById(req.params.userId)
      console.log("UserID", req.params.userId)
      console.log("User", user);
      
      if(!user){
        return res.status(404).json({message: 'No User Found.'})
      }

      console.log("Deposits", user.credits);
      
      
      return res.status(200).json(user.credits.sort((a,b) => new Date(a.date) - new Date(b.date)))
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user data', error });
  }
})

router.get('/withdrawals/:userId', async (req,res) => {
  try {
    const user = await User.findById(req.params.userId)

      if(!user){
        return res.status(404).json({message: 'No User Found.'})
      }
      
      return res.status(200).json(user.withdrawals.sort((a, b) => new Date(a.date) - new Date(b.date))) 
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

router.put('/activate/pack/:userId', async (req,res) => {

  try {
    const { userId } = req.params;
    const { amount } = req.body;

    console.log("UserId", amount);
    

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'No User Found.' });
    }

    if(amount <= 0 || isNaN(amount)) {
      return res.status(400).json({ message: 'Invalid amount.' });
    }

    if(amount > user.redeem_wallet / 400) {
      return res.status(400).json({ message: 'Insufficient balance in redeem wallet.' });
    }

    if(amount < (user.current_wallet / 400) + 100) {
      return res.status(400).json({ message: 'Activating new pack requires $100 more than previous pack' });
    }

        await User.findByIdAndUpdate(user._id, {
          $set: {current_wallet: parseInt(amount) * 400, pending_deposits: [], activationDate:  new Date(), status: 'active'}, // Set the current wallet to the deposit amount
          $inc: { wallet_balance: amount, staking_wallet: parseInt(amount) * 400, token_wallet: parseInt(amount) * 400, redeem_wallet: -parseInt(amount) * 400 }, // Deposit added to wallet balance
          $push: {
            credits: {
              purpose: 'Pack Activation',
              date: new Date().toLocaleDateString(),
              time: new Date().toLocaleTimeString(),
              amount: amount * 400,
            },
            withdrawals: {
              purpose: 'Pack Activation',
              date: new Date().toLocaleDateString(),
              time: new Date().toLocaleTimeString(),
              amount: amount * 400,
            },
          }
        });

    return res.status(200).json({ message: 'Pack activated successfully.' });
  } catch (error) {
    console.error('Error activating user:', error);
    return res.status(500).json({ message: 'Error activating user.', error });
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
    const transferToUser = await User.findOne({code: memberId});

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
        withdrawals: {
          purpose: 'Transfer',
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          amount: amount,
          toUserCode: transferToUser.code,
          toUserName: transferToUser.fullname || transferToUser.username,
        },
      },
    };

    // Prepare update data for receiver
    const updateReceiver = {
      $inc: { redeem_wallet: amount },
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
    await User.findByIdAndUpdate(transferToUser._id, updateReceiver);

    return res.status(200).json({ message: 'Transfer successful.' });
  } catch (error) {
    console.error('Transfer error:', error);
    return res.status(500).json({ message: 'Error processing transfer.', error });
  }
});

// Recursive function to calculate business
const calculateBusiness = async (userId) => {
  let total = 0;

  // Find this user's deposits
  const deposits = await Deposit.find({ user: userId, status: 'approved' });
  deposits.forEach(deposit => {
    total += deposit.amount;
  });

  // Find this user's referrals
  const user = await User.findById(userId).populate('referrals');

  if (user?.referrals?.length > 0) {
    for (const referral of user.referrals) {
      total += await calculateBusiness(referral._id); // recursively calculate referral's business
    }
  }

  return total;
};

router.get('/team-business/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ message: 'No User Found.' });
    }

    const totalBusiness = await calculateBusiness(userId);

    return res.status(200).json({ totalBusiness, topName: userExists.fullname || userExists.username, topCode: userExists.code });
  } catch (error) {
    console.error('Error fetching total business:', error);
    return res.status(500).json({ message: 'Error fetching total business.', error });
  }
});

module.exports = router;

  
module.exports = router;