const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');
const stream = require('stream');
require('dotenv').config();

const connectDB = require('../backend/config/db');
const Project = require('./models/projects');

const app = express();

// Connect to DB
connectDB();

const conn = mongoose.connection;
let gfs, gridBucket;
conn.once('open', () => {
  gridBucket = new GridFSBucket(conn.db, { bucketName: 'uploads' });
  console.log('GridFS initialized');
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer setup (store images in memory instead of local disk)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST route for creating a project with image (GridFS storage)
app.post('/api/projects', upload.single('image'), async (req, res) => {
  try {
    const {
      title, type, description, region, district,
      contractor, status, submittedBy, startDate,
      location_address, location_city, location_region,
      gps_latitude, gps_longitude
    } = req.body;

    const project = new Project({
      title,
      type,
      description,
      region,
      district,
      location: {
        address: location_address,
        city: location_city,
        region: location_region,
      },
      gps: {
        latitude: gps_latitude,
        longitude: gps_longitude
      },
      contractor,
      status,
      startDate,
      submittedBy
    });

    if (req.file) {
      const readableStream = new stream.PassThrough();
      readableStream.end(req.file.buffer);

      const uploadStream = gridBucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });

      readableStream.pipe(uploadStream);
      
      uploadStream.on('finish', async () => {
        project.imageUrl = `/api/uploads/${uploadStream.id}`;
        await project.save();
        res.status(201).json({ message: 'Project created successfully', project });
      });
    } else {
      await project.save();
      res.status(201).json({ message: 'Project created successfully', project });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET route for retrieving images from GridFS
app.get('/api/uploads/:id', async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const downloadStream = gridBucket.openDownloadStream(fileId);

    res.setHeader('Content-Type', 'image/png'); 
    downloadStream.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(404).json({ message: 'Image not found' });
  }
});

// Include other routes
const projectRoutes = require('./routes/projectRoutes');
app.use('/api/projects', projectRoutes);
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);


// Welcome route
app.get('/', (req, res) => {
  res.send('Welcome to the Ghana Project Tracker API');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
