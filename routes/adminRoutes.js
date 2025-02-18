const express = require('express');
const Admin = require('../models/admin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Admin Registration
router.post('/register', async (req, res) => {
  try {
    const { fullname, username, password } = req.body;

    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) return res.status(400).json({ message: 'Admin already exists' });

    const newAdmin = new Admin({ fullname, username, password });
    await newAdmin.save();

    res.json({ message: 'Admin registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering admin', error });
  }
});

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(400).json({ message: 'Invalid username or password' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid username or password' });

    const token = jwt.sign({ adminId: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error });
  }
});

module.exports = router;
