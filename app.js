const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');
const distributeDailyProfit = require('./services/dailyProfit');
const distributeMonthlyRewards = require('./services/monthlyRewards');
const distributeLifetimeRewards = require('./services/lifetimeRewards');
require('dotenv').config();
const connectDB = require("./config/db.config");
const axios = require('axios');
const adminRoutes = require('./routes/adminRoutes');
const adminDashboardRoutes = require('./routes/adminDashboard');
const investmentRoutes = require('./routes/investmentRoutes');
const depositRoutes = require('./routes/depositRoutes');
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const treeRoutes = require('./routes/treeRoutes');
const commissionRoutes = require('./routes/commission');
const distributeLevelCommission = require('./services/levelCommission');

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

cron.schedule(
  '10 0 * * *',
  async () => {
    await distributeLevelCommission();
  },
  {
    timezone: 'Asia/Kolkata'
  }
);



// // Run monthly on the 1st at midnight
// cron.schedule('0 0 1 * *', async () => {
//   await distributeMonthlyRewards();
// });

// // Run weekly on Sunday at midnight
// cron.schedule('0 0 * * 0', async () => {
//   await distributeLifetimeRewards();
// });

// Define Routes
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/tree", treeRoutes);
app.use("/commission", commissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/investment', investmentRoutes);
app.use('/api/deposit', depositRoutes);
app.use('/api/withdrawal', withdrawalRoutes);

app.get('/ping', (req, res) => {
  res.status(200).send('Pong');
});

// Self-ping to keep the app awake every 10 minutes (300,000 ms)
setInterval(() => {
  axios.get(process.env.BACKEND_URL+'/ping') // Use your Render URL here instead of localhost
    .then(response => {
      console.log('Ping successful:', response.data);
    })
    .catch(error => {
      console.error('Error with self-ping:', error);
    });
}, 600000); // 10 minutes interval (300,000 ms)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
