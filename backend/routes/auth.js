
const Project = require('../models/projects');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user')

router.get('/projects', async (req, res) => {
  const projects = await Project.find().sort({ createdAt: -1 });
  res.json(projects);
});

// Register route for non-admin users
router.post('/register', async (req, res) => {
  console.log('✅ Register route hit');
  const { username, password, fullName, phone } = req.body;

  if (!username || !password || !fullName || !phone) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const user = new User({ username, password, fullName, phone, isAdmin: false });
    await user.save();

    const token = jwt.sign(
      { id: user._id, username: user.username, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({ token });
  } catch (error) {
  if (error.code === 11000 && error.keyPattern?.username) {
    return res.status(400).json({ error: 'Username already exists. Try another one.' });
  }

  if (error.errors?.phone?.message) {
    return res.status(400).json({ error: error.errors.phone.message });
  }

  if (error.errors?.fullName?.message) {
    return res.status(400).json({ error: error.errors.fullName.message });
  }

  res.status(500).json({ error: 'Registration failed. Please try again.' });
}

});

// Login route for non-admin users
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // 🔍 Find user by username
  const user = await User.findOne({ username });
  if (!user || user.isAdmin) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // 🔐 Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  console.log('Password match result:', isMatch);

  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  let finalUser = user;
  // 🩺 Patch legacy users missing username
 if (!user.username) {
  const fallbackUsername =
    user.fullName || user.email?.split('@')[0] || `user_${user._id.toString().slice(-4)}`;
  await User.findByIdAndUpdate(user._id, { username: fallbackUsername });
  console.log('🔧 Patched legacy user with username:', fallbackUsername);

  // ✅ Reload user to get fresh username
  finalUser = await User.findById(user._id);
  console.log('🧬 Reloaded user for confirmation:', finalUser.username);
}

const token = jwt.sign(
  { id: finalUser._id, username: finalUser.username },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

  console.log('🎟️ Generated token:', token);
  res.status(200).json({ token });
});





module.exports = router;
