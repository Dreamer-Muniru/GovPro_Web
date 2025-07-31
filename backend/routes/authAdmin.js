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

  const token = await jwt.sign({ id: user._id, isAdmin: true }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });

  res.json({ token });
});


module.exports = router;
