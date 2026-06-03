const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURL = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoURL) {
    console.error(
      '❌ MongoDB connection error: MONGO_URI or MONGODB_URI is not set. Copy backend/.env.example to .env and add your Atlas connection string.'
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoURL);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    if (err.message.includes('querySrv')) {
      console.error(
        '   Tip: DNS SRV lookup failed. In Atlas → Connect → Drivers, copy the "Standard connection string" into MONGO_URI (see backend/.env.example).'
      );
    }
    process.exit(1);
  }
};

module.exports = connectDB;
