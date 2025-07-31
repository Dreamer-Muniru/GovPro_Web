// scripts/createAdmin.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

// const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/user');
console.log('MONGO_URI:', process.env.MONGO_URI); 
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const exists = await User.findOne({ username: 'admin' });
  if (!exists) {
    // const hashed = await bcrypt.hash('Dreamer4422#', 10);
    await User.create({
      username: 'admin_dreamer',
      password: 'Dreamer4422#', 
      fullName: 'Admin Dreamer',
      phone: '+233200000000',
      // password: hashed,
      isAdmin: true,
    });
    console.log('✅ Admin user created');
  } else {
    console.log('⚠️ Admin user already exists');
  }
  mongoose.disconnect();
});
