// config/db.js
const mongoose = require('mongoose');

const mongoURL = 'mongodb+srv://mahzar:4422@cluster0.qgmfshp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'

mongoose.connect(mongoURL, {
  useUnifiedTopology: true,
  useNewUrlParser: true
});

const db = mongoose.connection;

db.on('open', () => {
  console.log('Connected to MongoDB');
});

db.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

module.exports = db;
