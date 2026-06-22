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
    const connectOptions = { useNewUrlParser: true, useUnifiedTopology: true };
    if (process.env.MONGO_DB_NAME) connectOptions.dbName = process.env.MONGO_DB_NAME;
    await mongoose.connect(mongoURL, connectOptions);
    console.log('✅ Connected to MongoDB — DB:', mongoose.connection.db.databaseName);
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
