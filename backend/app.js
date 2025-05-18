const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// DB Connection
connectDB();

// Routes
const projectRoutes = require('./routes/projectRoutes');
app.use('/api', projectRoutes);

// Default Route
app.get('/', (req, res) => {
  res.send('🌍 Welcome to the Ghana Project Tracker API');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
