const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // or bcrypt
const User = require('../models/user');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user || !user.isAdmin) {
    console.log('Login attempt for:', username);
    console.log('User found in DB:', user);

    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // ✅ Add these logs right here
  console.log('User found:', user?.username);
  const isMatch = await bcrypt.compare(password, user.password);
  
  console.log('Password comparison result:', isMatch);

  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('❌ JWT_SECRET is not set. Cannot issue token.');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    const token = await jwt.sign({ id: user._id, isAdmin: true }, jwtSecret, {
      expiresIn: '1d',
    });

    res.json({ token });
  } catch (err) {
    console.error('❌ Failed to sign JWT:', err);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});


module.exports = router;
