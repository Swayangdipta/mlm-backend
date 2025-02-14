// app.js
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const app = express();
app.use(express.json());
app.use(cors())
app.use(cookieParser())

// Replace with your MongoDB connection string as needed
mongoose.connect(process.env.DB_URI).then(() => {
  console.log("DB Connection Established!");
}).catch(err => {
  console.error(err);
});

// Secret for JWT (change this for production use)
const JWT_SECRET = 'your_jwt_secret_here';

/*
 * ========================
 * Mongoose Models
 * ========================
 */

// User Schema (supports both normal and admin accounts)
const UserSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  username: { type: String, unique: true, required: true },
  sponsor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  wallet_balance: { type: Number, default: 0 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  mobile: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  country: { type: String, required: true },
  rank: { type: Number, default: 0 }, // Rank of the user based on business volume
  code: { type: String, default: null, unique: true }, // Referral code for the user
});
const User = mongoose.model('User', UserSchema);

// Investment Schema
const InvestmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  // Base daily profit percentage (e.g., 0.5 means 0.5%)
  daily_profit_percentage: { type: Number, default: 0.5 },
  start_date: { type: Date, default: Date.now },
  last_profit_date: { type: Date, default: Date.now },
});
const Investment = mongoose.model('Investment', InvestmentSchema);

// Transaction Schema (logs investments, profits, rewards, etc.)
const TransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true }, // e.g., 'investment', 'profit', 'reward'
  amount: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
});
const Transaction = mongoose.model('Transaction', TransactionSchema);

/*
 * ========================
 * Helper Functions
 * ========================
 */

/**
 * Calculate the matrix bonus percentage for a user based on the number of referrals.
 *
 * The level structure is:
 *   Level 1: 3% (requires 1 referral)
 *   Level 2: 2% (requires 1 additional referral)
 *   Level 3: 2% (requires 1 additional referral)
 *   Level 4: 1% (requires 1 additional referral)
 *   Level 5: 1% (requires 1 additional referral)
 *   Levels 6-14: 0.5% each (each requires 1 additional referral)
 */
async function calculateMatrixBenefit(user) {
  const referralCount = await User.countDocuments({ sponsor: user._id });
  const levelDetails = [
    { level: 1, benefit: 3, req: 1 },
    { level: 2, benefit: 2, req: 1 },
    { level: 3, benefit: 2, req: 1 },
    { level: 4, benefit: 1, req: 1 },
    { level: 5, benefit: 1, req: 1 },
    { level: 6, benefit: 0.5, req: 1 },
    { level: 7, benefit: 0.5, req: 1 },
    { level: 8, benefit: 0.5, req: 1 },
    { level: 9, benefit: 0.5, req: 1 },
    { level: 10, benefit: 0.5, req: 1 },
    { level: 11, benefit: 0.5, req: 1 },
    { level: 12, benefit: 0.5, req: 1 },
    { level: 13, benefit: 0.5, req: 1 },
    { level: 14, benefit: 0.5, req: 1 },
  ];
  let total_required = 0;
  let total_benefit = 0;
  for (let level of levelDetails) {
    total_required += level.req;
    if (referralCount >= total_required) {
      total_benefit += level.benefit;
    } else {
      break;
    }
  }
  return total_benefit;
}

/**
 * Calculate the daily profit for an investment.
 *
 * The profit per day is calculated as:
 *   profit = investment.amount * ((base rate + matrix bonus) / 100)
 *
 * It calculates the profit for the number of days passed since the last profit calculation.
 */
async function calculateDailyProfitForInvestment(investment) {
  const now = new Date();
  const lastDate = new Date(investment.last_profit_date);
  const diffTime = now - lastDate;
  const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (daysPassed <= 0) {
    return { profit: 0, newDate: lastDate };
  }
  // Retrieve the user document to calculate matrix bonus
  const user = await User.findById(investment.user);
  const matrixBonus = await calculateMatrixBenefit(user);
  const baseRate = investment.daily_profit_percentage;
  const dailyRate = baseRate + matrixBonus; // Combined daily profit rate in percentage
  const profit = daysPassed * investment.amount * (dailyRate / 100);
  return { profit, newDate: now };
}

/**
 * Check lifetime rewards based on the user's total investments and referral count.
 *
 * Example thresholds:
 *   - $1000 business and at least 10 referrals → $20 reward
 *   - $1500 business and at least 20 referrals → $50 reward
 *   - $2000 business and at least 40 referrals → $100 reward
 */
async function checkLifetimeRewards(user) {
  const investments = await Investment.find({ user: user._id });
  const totalInvestment = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const referralCount = await User.countDocuments({ sponsor: user._id });
  let rewards = [];
  if (totalInvestment >= 2000 && referralCount >= 40) {
    rewards.push({ business: 2000, reward: 100 });
  } else if (totalInvestment >= 1500 && referralCount >= 20) {
    rewards.push({ business: 1500, reward: 50 });
  } else if (totalInvestment >= 1000 && referralCount >= 10) {
    rewards.push({ business: 1000, reward: 20 });
  }
  return rewards;
}

/**
 * Check monthly rewards based on the "left leg" and "right leg" business volumes.
 *
 * In this simplified model:
 *   - The first referral’s investments constitute the left leg.
 *   - The second referral’s investments constitute the right leg.
 *   - If total business is $10,000 or more → $150 reward.
 *   - Else if total business is $5,000 or more → $50 reward.
 */
async function checkMonthlyRewards(user) {
  const referrals = await User.find({ sponsor: user._id }).sort({ createdAt: 1 });
  let left_leg_volume = 0;
  let right_leg_volume = 0;
  if (referrals.length > 0) {
    const leftInvestments = await Investment.find({ user: referrals[0]._id });
    left_leg_volume = leftInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  }
  if (referrals.length > 1) {
    const rightInvestments = await Investment.find({ user: referrals[1]._id });
    right_leg_volume = rightInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  }
  const totalBusiness = left_leg_volume + right_leg_volume;
  let rewards = [];
  if (totalBusiness >= 10000) {
    rewards.push({
      monthly_reward: 150,
      details: 'Achieved $10,000 business (60x/40x rule)',
    });
  } else if (totalBusiness >= 5000) {
    rewards.push({
      monthly_reward: 50,
      details: 'Achieved $5,000 business (left leg 40%, right leg 60%)',
    });
  }
  return rewards;
}

/*
 * ========================
 * Middleware for Admin Authentication
 * ========================
 */

function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err)
      return res.status(403).json({ error: 'Failed to authenticate token' });
    if (decoded.role !== 'admin')
      return res.status(403).json({ error: 'Not authorized' });
    req.user = decoded; // Attach user info to the request
    next();
  });
}

/*
 * ========================
 * API Endpoints
 * ========================
 */

/**
 * User Registration
 * Expects JSON with:
 *   - username
 *   - password
 *   - sponsor (optional, sponsor's username)
 *
 * An AI fee of $10 is deducted from the wallet_balance.
 */
app.post('/register', async (req, res) => {
  try {
    const { username, password, sponsor, rank, fullname, country, mobile, email } = req.body;
    console.log(req.body);
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.status(400).json({ error: 'Username already exists' });

    let sponsorUser = null;
    if (sponsor) {
      sponsorUser = await User.findOne({ username: sponsor });
      if (!sponsorUser)
        return res.status(400).json({ error: 'Sponsor not found' });
    }

    let currentRank = 0;

    if(rank){
      if(sponsorUser && rank > sponsorUser.rank){
        return res.status(400).json({ error: 'Rank cannot be higher than sponsor rank' });
      }else{
        currentRank = rank;
      }
    }else{
      if(sponsorUser){
        currentRank = sponsorUser.rank - 1;
      }else{
        currentRank = 0;
      }
    }

    const generateCode = () => {
      return Math.floor(1000000 + Math.random() * 9000000)
    }

    let code = generateCode()

    const isCodeUnique = async (code) => {
      const user = await User.findOne({ code })
      if(user){
        return false
      } else {
        return true
      }
    }

    let isUnique = await isCodeUnique(code)
    
    while(!isUnique){
      code = generateCode()
      isUnique = await isCodeUnique(code)
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      fullname,
      country,
      mobile,
      email,
      password: hashedPassword,
      sponsor: sponsorUser ? sponsorUser._id : null,
      wallet_balance: -10, // Deduct AI fee of $10 on registration
      role: 'user',
      rank: currentRank,
      code
    });
    await newUser.save();
    res.json({ message: 'User registered successfully', username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Admin Registration
 * Expects JSON with:
 *   - username
 *   - password
 *
 * Creates an admin account.
 */
app.post('/admin/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password are required' });
    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.status(400).json({ error: 'Username already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new User({
      username,
      password: hashedPassword,
      role: 'admin',
      wallet_balance: 0,
    });
    await newAdmin.save();
    res.json({ message: 'Admin registered successfully', username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Login Endpoint
 * Expects JSON with:
 *   - username
 *   - password
 *
 * Returns a JWT token. (Admins can use this token to access admin-only routes.)
 */
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(req.body);
    
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password are required' });
    const user = await User.findOne({ username });
    if (!user)
      return res.status(400).json({ error: 'User not found' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ error: 'Invalid password' });
    const payload = { id: user._id, username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    res.json({ message: 'Login successful', token, user: {...payload, 
      code: user.code, rank: user.rank, 
      wallet_balance: user.wallet_balance, 
      country: user.country, email: user.email, 
      mobile: user.mobile} });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Investment Endpoint
 * Expects JSON with:
 *   - username
 *   - amount (should be one of the available packages, e.g., 10, 20, 30, 50, 100, 200, 300, 500, 1000)
 *   - daily_profit_percentage (optional; default is 0.5)
 */
app.post('/invest', async (req, res) => {
  try {
    const { username, amount, daily_profit_percentage } = req.body;
    if (!username || !amount)
      return res.status(400).json({ error: 'Username and amount are required' });
    const user = await User.findOne({ username });
    if (!user)
      return res.status(404).json({ error: 'User not found' });
    const inv = new Investment({
      user: user._id,
      amount,
      daily_profit_percentage: daily_profit_percentage || 0.5,
      start_date: new Date(),
      last_profit_date: new Date(),
    });
    await inv.save();
    // Record the investment transaction
    const trans = new Transaction({
      user: user._id,
      type: 'investment',
      amount,
    });
    await trans.save();
    res.json({ message: 'Investment successful', amount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Process Daily Profits
 * This endpoint simulates a daily job that calculates and credits profits for all investments.
 * It is protected by the adminAuth middleware.
 */
app.get('/process_profits', adminAuth, async (req, res) => {
  try {
    const investments = await Investment.find({});
    for (const inv of investments) {
      const { profit, newDate } = await calculateDailyProfitForInvestment(inv);
      if (profit > 0) {
        inv.last_profit_date = newDate;
        await inv.save();
        // Credit the profit to the user's wallet balance
        await User.findByIdAndUpdate(inv.user, { $inc: { wallet_balance: profit } });
        const trans = new Transaction({
          user: inv.user,
          type: 'profit',
          amount: profit,
        });
        await trans.save();
      }
    }
    res.json({ message: 'Daily profits processed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Lifetime Rewards Endpoint
 * Query parameter:
 *   - username: The user for whom to check lifetime rewards.
 */
app.get('/lifetime_rewards', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username)
      return res.status(400).json({ error: 'Username required' });
    const user = await User.findOne({ username });
    if (!user)
      return res.status(404).json({ error: 'User not found' });
    const rewards = await checkLifetimeRewards(user);
    res.json({ lifetime_rewards: rewards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Monthly Rewards Endpoint
 * Query parameter:
 *   - username: The user for whom to check monthly rewards.
 */
app.get('/monthly_rewards', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username)
      return res.status(400).json({ error: 'Username required' });
    const user = await User.findOne({ username });
    if (!user)
      return res.status(404).json({ error: 'User not found' });
    const rewards = await checkMonthlyRewards(user);
    res.json({ monthly_rewards: rewards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/', (req, res) => {
  res.send('Welcome to the MLM API');
});

/*
 * ========================
 * Start the Server
 * ========================
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
