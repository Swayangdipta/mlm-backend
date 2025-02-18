const express = require("express");
const User = require("../models/user");

const router = express.Router();

router.get("/downline/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).populate("leftLeg rightLeg");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: user.username,
      leftLeg: user.leftLeg ? user.leftLeg.username : null,
      rightLeg: user.rightLeg ? user.rightLeg.username : null,
    });

  } catch (error) {
    res.status(500).json({ message: "Error fetching downline", error });
  }
});

module.exports = router;
