const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const jwt = require('jsonwebtoken');
const { sendEmail } = require("../services/emailService");

const router = express.Router();

// User Login Route
router.post('/login', async (req, res) => {
  try {
      const { username, email, password } = req.body;

      // Find user by username or email
      const user = await User.findOne({ 
          $or: [{ code: username }, { email: username }] 
      });

      if (!user) {
          return res.status(400).json({ message: "Invalid username or email" });
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          return res.status(400).json({ message: "Invalid password" });
      }

      // Generate JWT token
      const token = jwt.sign(
          { id: user._id, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: "7d" } // Token expires in 7 days
      );

      // Only return the sum of the withdrawal amounts
      let withdrawal_amount = 0 

      user.withdrawals.forEach((item) => {
        withdrawal_amount += parseFloat(item.amount) 
      })

      console.log(withdrawal_amount);
      

      res.json({
          message: "Login successful",
          token,
          user: {
              id: user._id,
              fullname: user.fullname,
              username: user.username,
              code: user.code,
              rank: user.rank,
              email: user.email,
              role: user.role,
              wallet_balance: user.wallet_balance,
              mobile: user.mobile,
              staking_wallet: user.staking_wallet,
              token_wallet: user.token_wallet,
              bankName: user.bankName,
              ifscCode: user.ifscCode,
              accountName: user.accountName,
              accountNumber: user.accountNumber,
              redeem_wallet: user.redeem_wallet ? user.redeem_wallet : 0,
              referral_wallet: user.referral_wallet,
              wallet_address: user.wallet_address || null,
              withdrawals: withdrawal_amount,
          }
      });

  } catch (error) {
      res.status(500).json({ message: "Server error" });
  }
});

// User Registration Route
router.post("/register", async (req, res) => {
  const { fullname, username, email, password, sponsorId, mobile, country, rank } = req.body;

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    if(!sponsorId){
      return res.status(400).json({ message: "Sponsor Id is mandatory!" }); 
    }

    let sponsor = null;
    let tempRank = rank
    // If a sponsorId is provided, find the sponsor by their code
    if (sponsorId) {
      let tempSponsorId = sponsorId.trim()
      sponsor = await User.findOne({ code: tempSponsorId });      

      if (!sponsor) {
        return res.status(400).json({ message: "Invalid sponsor code" });
      }

      if(rank){
        if(rank > sponsor.rank){
          return res.status(400).json({ message: "Invalid rank" }); 
        }

        tempRank = rank
      }else{
        tempRank = sponsor.rank - 1
      }
    }

    // Create new user
    const newUser = new User({
      fullname,
      username,
      email,
      password: hashedPassword,
      sponsor: sponsor ? sponsor._id : null, // Store sponsor's _id
      mobile,
      country,
      rank: tempRank
    });

    // Generate unique referral code for the new user
    let tempCode;
    do {
      tempCode = Math.floor(100000 + Math.random() * 900000);
    } while (await User.findOne({ code: tempCode })); // Ensure uniqueness

    newUser.code = tempCode;

    // Save new user
    await newUser.save();

    // If sponsor exists, update their referrals list
    if (sponsor) {
      sponsor.referrals.push(newUser._id);
      await sponsor.save();
    }

    const isMailSent = await sendEmail({receiver: newUser.email, fullname: newUser.fullname, code: newUser.code, password: password});

    if(isMailSent){
      console.log("Email sent successfully!");
    }else{
      console.log("Error sending email!");
    }

    res.status(201).json({ message: "User registered successfully", user: newUser });

  } catch (error) {
    res.status(500).json({ message: "Error registering user", error });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate a unique token for password reset
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    user.forgot_token = token;
    user.forgot_token_expiry = Date.now() + 3600000; // Token expires in 1 hour
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    const isMailSent = await sendEmail({receiver: user.email, fullname: user.fullname, link: resetLink, type: 'forgot'});
    
    if(isMailSent){
      res.status(201).json({ message: "A link to reset your password have been sent to tour registered email address." });
    }
    else{
      res.status(500).json({ message: "Faild to create reset link, try again later!" });
    }
  }catch (error) {
    res.status(500).json({ message: "Server error" });
  }
}
);

router.put('/reset-password/:token', async (req, res) => {
  const { password } = req.body;
  const token = req.params.token;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.forgot_token !== token || Date.now() > user.forgot_token_expiry) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.forgot_token = null; // Clear the token after use
    user.forgot_token_expiry = null; // Clear the expiry date

    await user.save();

    res.status(201).json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});



module.exports = router;