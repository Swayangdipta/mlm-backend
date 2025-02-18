const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/user");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { username, email, password, sponsorId } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword, sponsorId });

    await newUser.save();

    if (sponsorId) {
      await placeInBinaryTree(sponsorId, newUser._id);
    }

    res.status(201).json({ message: "User registered successfully", user: newUser });

  } catch (error) {
    res.status(500).json({ message: "Error registering user", error });
  }
});

// Function to Place User in Binary MLM Tree
async function placeInBinaryTree(sponsorId, newUserId) {
  let sponsor = await User.findById(sponsorId);

  if (!sponsor) return;

  if (!sponsor.leftLeg) {
    sponsor.leftLeg = newUserId;
  } else if (!sponsor.rightLeg) {
    sponsor.rightLeg = newUserId;
  } else {
    const queue = [sponsor.leftLeg, sponsor.rightLeg];

    while (queue.length > 0) {
      const nextSponsorId = queue.shift();
      const nextSponsor = await User.findById(nextSponsorId);

      if (!nextSponsor.leftLeg) {
        nextSponsor.leftLeg = newUserId;
        await nextSponsor.save();
        return;
      } else if (!nextSponsor.rightLeg) {
        nextSponsor.rightLeg = newUserId;
        await nextSponsor.save();
        return;
      } else {
        queue.push(nextSponsor.leftLeg, nextSponsor.rightLeg);
      }
    }
  }

  await sponsor.save();
}

module.exports = router;