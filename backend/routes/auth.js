const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Project = require('../models/projects')

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'yoursecret';


// Register
router.post('/register', [
  body('username').notEmpty(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { username, password } = req.body;
  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ msg: 'Username already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed });
    await user.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    res.json({ token, user: { id: user._id, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});



router.get('/projects', async (req, res) => {
  const projects = await Project.find().sort({ createdAt: -1 });
  res.json(projects);
});


// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    res.json({ token, user: { id: user._id, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
