// scripts/createAdmin.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../models/user');

console.log('MONGO_URI:', process.env.MONGO_URI); 
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const exists = await User.findOne({ username: 'admin' });
  if (!exists) {
    await User.create({
      username: 'admin_dreamer',
      password: 'Dreamer4422#', 
      isAdmin: false,
    });
    console.log('✅ Admin user created');
  } else {
    console.log('⚠️ Admin user already exists');
  }
  mongoose.disconnect();
});
