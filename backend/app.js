const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const connectDB = require('../backend/config/db')
const Project = require('./models/projects')


const app = express();

// Connect to DB
connectDB();


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve static image uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// POST route for creating project with image
app.post('/api/projects', upload.single('image'), async (req, res) => {
  try {
    const {
      title, type, description, region, district,
      contractor, status, submittedBy, startDate
    } = req.body;

    const project = new Project({
      title,
      type,
      description,
      region,
      district,
      location: {
        address: req.body['location[address]'],
        city: req.body['location[city]'],
        region: req.body['location[region]']
      },
      gps: {
        latitude: req.body['gps[latitude]'],
        longitude: req.body['gps[longitude]']
      },
      contractor,
      status,
      startDate,
      submittedBy,
      imageUrl: req.file ? `/uploads/${req.file.filename}` : ''
    });

    await project.save();
    res.status(201).json({ message: 'Project created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Include other routes (e.g., GET all projects, GET by ID)
const projectRoutes = require('./routes/projectRoutes');
app.use('/api/projects', projectRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.send('Welcome to the Ghana Project Tracker API');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
