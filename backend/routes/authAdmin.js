const router        = require('express').Router();
const jwt           = require('jsonwebtoken');
const bcrypt        = require('bcryptjs');
const User          = require('../models/user');
const verifyAdminToken = require('../middleware/verifyAdminToken');

// ── POST /api/admin-auth/login ───────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user || !user.isAdmin) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user._id, username: user.username, fullName: user.fullName, isAdmin: true },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  res.json({ token });
});

// ── POST /api/admin-auth/create-user ────────────────────────────────────────
// Creates a new MMDCE district official account. Admin-only.
router.post('/create-user', verifyAdminToken, async (req, res) => {
  const { fullName, phone, username, password, region, district } = req.body;

  if (!fullName || !phone || !username || !password || !region || !district) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(409).json({ error: 'Username already taken. Choose another.' });
    }

    const newUser = await User.create({
      fullName,
      phone,
      username,
      password,      // hashed by the pre-save hook in user.js
      region,
      district,
      isAdmin: false, // MMDCE accounts are never admins
    });

    res.status(201).json({
      message: 'Account created successfully.',
      user: {
        _id:      newUser._id,
        fullName: newUser.fullName,
        username: newUser.username,
        region:   newUser.region,
        district: newUser.district,
        phone:    newUser.phone,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Username already taken.' });
    }
    if (err.errors?.phone?.message) {
      return res.status(400).json({ error: err.errors.phone.message });
    }
    console.error('Create-user error:', err.message);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// ── GET /api/admin-auth/users ────────────────────────────────────────────────
// Returns all non-admin users (MMDCE officials). Admin-only.
router.get('/users', verifyAdminToken, async (req, res) => {
  try {
    const users = await User.find({ isAdmin: false })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// ── DELETE /api/admin-auth/users/:id ────────────────────────────────────────
router.delete('/users/:id', verifyAdminToken, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

module.exports = router;