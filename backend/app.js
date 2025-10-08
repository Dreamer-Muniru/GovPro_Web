require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');
const stream = require('stream');
// const regionsRouter = require('./routes/regions')
const projectRoutes = require('./routes/projectRoutes');
const connectDB = require('./config/db'); // fixed path
const Project = require('./models/projects');
const forumRoutes = require('./routes/ForumRoutes');
const commentRoutes = require('./routes/commentRoutes'); 
// const Forums = require('./models/Forums')onst mongoose = require('mongoose');
// ==========================================
// const Project = require('./models/projects');
const Forum = require('./models/forums');
const User = require('./models/user');

// ========================================

const app = express();

// Connect to DB
connectDB();

let gridBucket;
mongoose.connection.once('open', () => {
  gridBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
  console.log('GridFS initialized');
});

const allowedOriginPatterns = [
  /^https?:\/\/localhost(?::\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/,
  /^https?:\/\/([a-z0-9-]+\.)*vercel\.app$/,
  /^https?:\/\/([a-z0-9-]+\.)*netlify\.app$/,
  /^https?:\/\/(www\.)?abandonedghana\.org$/,
  /^https?:\/\/govprotracker\.vercel\.app$/,
];
// CORS must come before any route handling
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOriginPatterns.some((re) => re.test(origin));
      if (isAllowed) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Body-parsing middleware **before** routes so req.body is populated
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// app.use('/api/regions', regionsRouter);
// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
const authAdminRoutes = require('./routes/authAdmin');
app.use('/api/admin-auth', authAdminRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/forums', forumRoutes);



// Multer setup (store images in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST route for creating a project with image (GridFS storage)
app.post('/api/projects', upload.single('image'), async (req, res) => {
  try {
    const {
      title,
      type,
      description,
      region,
      district,
      contractor,
      status,
      submittedBy,
      startDate,
      location_address,
      location_city,
      location_region,
      gps_latitude,
      gps_longitude,
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
        latitude: parseFloat(gps_latitude),
        longitude: parseFloat(gps_longitude),
      },
      contractor,
      status,
      projectStartDate: startDate,
      submittedBy,
    });

    if (req.file && gridBucket) {
      const readableStream = new stream.PassThrough();
      readableStream.end(req.file.buffer);

      const uploadStream = gridBucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });

      await new Promise((resolve, reject) => {
        readableStream.pipe(uploadStream);

        uploadStream.on('finish', async () => {
          try {
            project.imageUrl = `/api/uploads/${uploadStream.id}`;
            await project.save();
            res.status(201).json({ message: 'Project created successfully', project });
            resolve();
          } catch (err) {
            reject(err);
          }
        });

        uploadStream.on('error', reject);
      });
    } else {
      await project.save();
      res.status(201).json({ message: 'Project created successfully', project });
    }
  } catch (error) {
    console.error('Server error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// ===============================================

app.get('/api/users/count', async (req, res) => {
  try { res.json({ count: await User.countDocuments() }); }
  catch (e) { res.status(500).json({ error: 'Failed to count users' }); }
});


app.get('/api/user-stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).lean();
    const userIdObj = new mongoose.Types.ObjectId(userId);

    const [
      projectsCount,
      forumsCount,
      commentsTopAgg,
      commentsRepliesAgg,
      reactForumAgg,
      reactCommentAgg,
      reactReplyAgg
    ] = await Promise.all([
      // Projects created – matches submittedBy against id/username/fullName (best-effort)
      Project.countDocuments({
        submittedBy: { $in: [String(userId), user?.username, user?.fullName].filter(Boolean) }
      }),

      // Forums started by user
      Forum.countDocuments({ createdBy: userIdObj }),

      // Top-level comments made by user
      Forum.aggregate([
        { $unwind: { path: '$comments', preserveNullAndEmptyArrays: false } },
        { $match: { 'comments.createdBy': userIdObj } },
        { $count: 'count' }
      ]),

      // Replies made by user
      Forum.aggregate([
        { $unwind: { path: '$comments', preserveNullAndEmptyArrays: false } },
        { $unwind: { path: '$comments.replies', preserveNullAndEmptyArrays: false } },
        { $match: { 'comments.replies.createdBy': userIdObj } },
        { $count: 'count' }
      ]),

      // Reactions on forum posts by user
      Forum.aggregate([
        { $unwind: { path: '$reactions', preserveNullAndEmptyArrays: false } },
        { $match: { 'reactions.user': userIdObj } },
        { $count: 'count' }
      ]),

      // Reactions on comments by user
      Forum.aggregate([
        { $unwind: { path: '$comments', preserveNullAndEmptyArrays: false } },
        { $unwind: { path: '$comments.reactions', preserveNullAndEmptyArrays: false } },
        { $match: { 'comments.reactions.user': userIdObj } },
        { $count: 'count' }
      ]),

      // Reactions on replies by user
      Forum.aggregate([
        { $unwind: { path: '$comments', preserveNullAndEmptyArrays: false } },
        { $unwind: { path: '$comments.replies', preserveNullAndEmptyArrays: false } },
        { $unwind: { path: '$comments.replies.reactions', preserveNullAndEmptyArrays: false } },
        { $match: { 'comments.replies.reactions.user': userIdObj } },
        { $count: 'count' }
      ])
    ]);

    const commentsMade = (commentsTopAgg?.[0]?.count || 0) + (commentsRepliesAgg?.[0]?.count || 0);
    const reactionsGiven =
      (reactForumAgg?.[0]?.count || 0) +
      (reactCommentAgg?.[0]?.count || 0) +
      (reactReplyAgg?.[0]?.count || 0);

    res.json({
      projectsCreated: projectsCount || 0,
      forumsStarted: forumsCount || 0,
      commentsMade,
      reactionsGiven
    });
  } catch (err) {
    console.error('Error computing user stats:', err.message);
    res.status(500).json({ error: 'Failed to compute user stats' });
  }
});


// ===============================================

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

// Welcome route
app.get('/', (req, res) => {
  res.send('Welcome to the Ghana Project Tracker API');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});