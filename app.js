const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');
const distributeDailyProfit = require('./services/dailyProfit');
const distributeMonthlyRewards = require('./services/monthlyRewards');
const distributeLifetimeRewards = require('./services/lifetimeRewards');
require('dotenv').config();
const connectDB = require("./config/db.config");

const adminRoutes = require('./routes/adminRoutes');
const adminDashboardRoutes = require('./routes/adminDashboard');
const investmentRoutes = require('./routes/investmentRoutes');
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const treeRoutes = require('./routes/treeRoutes');
const commissionRoutes = require('./routes/commission');

const app = express();
app.use(express.json());
app.use(cors());
app.use(cookieParser());

// Connect to the database
connectDB();

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  await distributeDailyProfit();
});

// Run monthly on the 1st at midnight
cron.schedule('0 0 1 * *', async () => {
  await distributeMonthlyRewards();
});

// Run weekly on Sunday at midnight
cron.schedule('0 0 * * 0', async () => {
  await distributeLifetimeRewards();
});

// Define Routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/tree", treeRoutes);
app.use("/commission", commissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/investment', investmentRoutes);
app.use('/api/withdrawal', withdrawalRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
