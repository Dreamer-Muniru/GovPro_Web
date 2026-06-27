const Project = require('../models/projects');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user');

// ─────────────────────────────────────────────
// GET /api/auth/projects – sample helper route
router.get('/projects', async (req, res) => {
  const projects = await Project.find().sort({ createdAt: -1 });
  res.json(projects);
});

// ─────────────────────────────────────────────
// POST /api/auth/register  (regular users)
router.post('/register', async (req, res) => {
  // console.log('✅ Register route hit');
  const { username, password, region, district, fullName, phone } = req.body;

  if (!username || !password || !fullName || !phone || !region || !district) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const user = new User({ username, password, fullName, phone, region, district, isAdmin: false });
    await user.save();

    // Make sure we have a signing secret
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET is not set. Please define it in your environment variables.');
      return res
        .status(500)
        .json({ error: 'Server configuration error. Please contact support.' });
    }

    const token = await jwt.sign(
      { _id: user._id, username: user.username, isAdmin: user.isAdmin },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.username) {
      return res
        .status(400)
        .json({ error: 'Username already exists. Try another one.' });
    }

    if (error.errors?.phone?.message) {
      return res.status(400).json({ error: error.errors.phone.message });
    }

    if (error.errors?.fullName?.message) {
      return res.status(400).json({ error: error.errors.fullName.message });
    }
    if (error.errors?.region?.message) {
      return res.status(400).json({ error: error.errors.region.message });
    }
    if (error.errors?.district?.message) {
      return res.status(400).json({ error: error.errors.district.message });
    }

    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login  (regular users)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('❌ JWT_SECRET is not set. Cannot issue token.');
    return res
      .status(500)
      .json({ error: 'Server misconfiguration. Please contact support.' });
  }

  // 🔍 Find user by username
  const user = await User.findOne({ username });
  if (!user || user.isAdmin) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // 🔐 Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  // console.log('Password match result:', isMatch);

  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // ── Handle legacy users missing username
  let finalUser = user;
  if (!user.username) {
    const fallbackUsername =
      user.fullName || 
      user.email?.split('@')[0] ||
      `user_${user._id.toString().slice(-4)}`;
    await User.findByIdAndUpdate(user._id, { username: fallbackUsername });
    // console.log('🔧 Patched legacy user with username:', fallbackUsername);

    finalUser = await User.findById(user._id); // reload
    // console.log('🧬 Reloaded user for confirmation:', finalUser.username);
  }

  // ── Sign and return the JWT
  try {
   const token = jwt.sign(
  {
    id:       user._id,
    username: user.username,
    fullName: user.fullName  || '',
    phone:    user.phone     || '',
    region:   user.region    || '',
    district: user.district  || '',
    // isAdmin is NOT included here — regular user login only.
    // Admin login in authAdmin.js already sets isAdmin: true separately.
  },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);



    // console.log('🎟️ Generated token:', token);
    res.status(200).json({ token });
  } catch (err) {
    console.error('❌ Failed to sign JWT:', err);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

//User update route
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body };

    // 🔐 If password is being updated, hash it
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );

    if (!updatedUser) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(updatedUser);
  } catch (err) {
    console.error('❌ Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});





module.exports = router;