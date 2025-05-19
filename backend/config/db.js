const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURL = 'mongodb+srv://mahzar:4422@cluster0.qgmfshp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

    await mongoose.connect(mongoURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1); // Exit the app if DB connection fails
  }
};

module.exports = connectDB;
