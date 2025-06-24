// scripts/createAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const exists = await User.findOne({ username: 'admin' });
  if (!exists) {
    await User.create({
      username: 'dreamerAdmin',
      password: 'admin123', // 🔐 Change this after first login!
      isAdmin: true,
    });
    console.log('✅ Admin user created');
  } else {
    console.log('⚠️ Admin user already exists');
  }
  mongoose.disconnect();
});
