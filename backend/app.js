const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./config/db')

const app = express()

// Middleware
app.use(cors());
app.use(express.json());

const projectRoutes = require('./routes/projectRoutes');
app.use('/api', projectRoutes);
app.use('/api/projects', projectRoutes);
// Routes
app.get('/', (req, res) => {
  res.send('Welcome to the Ghana Project Tracker API');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});