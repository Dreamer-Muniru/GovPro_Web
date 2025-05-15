// app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./')

const app = express('./config/db.js');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('Welcome to the Ghana Project Tracker API');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
