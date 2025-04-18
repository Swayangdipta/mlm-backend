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
              referral_wallet: user.referral_wallet
          }
      });

  } catch (error) {
      console.error(error);
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
      sponsor.referral_wallet = sponsor.referral_wallet + sponsor.staking_wallet * 0.05
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
    console.error(error);
    res.status(500).json({ message: "Error registering user", error });
  }
});

module.exports = router;