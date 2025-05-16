const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const projectRoutes = require('./routes/projectRoutes');
app.use('/api/projects', projectRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to the Ghana Project Tracker API');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
