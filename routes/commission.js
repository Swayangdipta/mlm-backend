const express = require("express");
const User = require("../models/user");

const router = express.Router();

const levelPercentages = [3, 2, 2, 1, 1, 0.5, 0.5, 0.5, 0.5, 0.5];

router.post("/calculate-commission/:userId", async (req, res) => {
  const { userId } = req.params;
  const { investmentAmount } = req.body;

  try {
    let user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    let sponsor = await User.findById(user.sponsorId);
    let level = 0;

    while (sponsor && level < levelPercentages.length) {
      let commission = (investmentAmount * levelPercentages[level]) / 100;
      sponsor.wallet_balance += commission;
      await sponsor.save();

      sponsor = await User.findById(sponsor.sponsorId);
      level++;
    }

    res.json({ message: "Commission distributed successfully" });

  } catch (error) {
    res.status(500).json({ message: "Error calculating commission", error });
  }
});

module.exports = router;