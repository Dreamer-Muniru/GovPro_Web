require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');
const stream = require('stream');
const projectRoutes = require('./routes/projectRoutes');
const connectDB = require('./config/db'); // fixed path
const Project = require('./models/projects');

const app = express();

// Connect to DB
connectDB();

let gridBucket;
mongoose.connection.once('open', () => {
  gridBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
  console.log('GridFS initialized');
});

// CORS setup
const allowedOrigins = [
  'https://govprotracker.vercel.app',
  'http://localhost:3000',

];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer setup (store images in memory)
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

    if (req.file && gridBucket) {
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
    if (!gridBucket) throw new Error('GridFS not initialized');
    const downloadStream = gridBucket.openDownloadStream(fileId);

    res.setHeader('Content-Type', 'image/png');
    downloadStream.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(404).json({ message: 'Image not found' });
  }
});

app.use('/favicon.ico', express.static(path.join(__dirname, 'public', 'favicon.ico')));

// API routes
app.use('/api/projects', projectRoutes);

// Auth routes (make sure these files exist and export a router)
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
} catch (e) {
  console.warn('auth.js not found or failed to load');
}
try {
  const authAdminRoutes = require('./routes/authAdmin');
  app.use('/api/admin-auth', authAdminRoutes);
} catch (e) {
  console.warn('authAdmin.js not found or failed to load');
}

// Welcome route
app.get('/', (req, res) => {
  res.send('Welcome to the Ghana Project Tracker API');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});