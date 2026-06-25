const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const multer   = require('multer');
const Project  = require('../models/projects');
const authenticateUser = require('../middleware/authenticateUser');

// ── GridFS setup ──────────────────────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

let gridBucket;
mongoose.connection.once('open', () => {
  gridBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
});

// ── Helper: parse a number field safely (returns null if blank/NaN) ──────────
const toNum = (val) => {
  if (val === '' || val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
};

// ── Helper: parse a date field safely (returns null if blank/invalid) ────────
const toDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// ── GET /api/projects ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    console.error('GET /projects error:', err.message);
    res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

// ── GET /api/projects/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    res.json(project);
  } catch (err) {
    console.error('GET /projects/:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch project.' });
  }
});

// ── POST /api/projects ────────────────────────────────────────────────────────
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const b = req.body;

    const projectData = {
      title:               b.title,
      type:                b.type,
      description:         b.description,
      status:              b.status,
      region:              b.region,
      district:            b.district,
      location_address:    b.location_address,
      location_city:       b.location_city,
      location_region:     b.location_region || b.region,
      gps: {
        latitude:  b.gps_latitude,
        longitude: b.gps_longitude,
      },
      contractor:          b.contractor,
      submittedBy:         b.submittedBy,
      fundingSource:       b.fundingSource,
      otherFundingSources: b.otherFundingSources,
      projectStartDate:    toDate(b.projectStartDate || b.startDate),

      // ── new financial & progress fields ─────────────────────────────────────
      completionPercentage:   toNum(b.completionPercentage) ?? 0,
      totalCost:              toNum(b.totalCost),
      amountPaid:             toNum(b.amountPaid),
      outstandingAmount:      toNum(b.outstandingAmount),
      expectedCompletionDate: toDate(b.expectedCompletionDate),
    };

    // Upload image to GridFS if provided
    if (req.file && gridBucket) {
      const uploadStream = gridBucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });
      uploadStream.end(req.file.buffer);

      await new Promise((resolve, reject) => {
        uploadStream.on('finish', resolve);
        uploadStream.on('error',  reject);
      });

      projectData.imageUrl = `/api/uploads/${uploadStream.id}`;
    }

    const project = await Project.create(projectData);
    res.status(201).json(project);
  } catch (err) {
    console.error('POST /projects error:', err.message);
    res.status(500).json({ error: 'Failed to create project.' });
  }
});

// ── PUT /api/projects/:id ─────────────────────────────────────────────────────
router.put('/:id', authenticateUser, upload.single('image'), async (req, res) => {
  try {
    const b       = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    // Access control: any authenticated user can update projects.
    // This platform is for civic reporting — officials across a district all
    // need to update progress on public government projects.
    // Admins can always update. Non-authenticated requests are blocked by
    // the authenticateUser middleware before this point.
    // (No further restriction needed here.)

    // Scalar text fields
    const textFields = [
      'title', 'type', 'description', 'status',
      'region', 'district', 'location_address', 'location_city', 'location_region',
      'contractor', 'submittedBy', 'fundingSource', 'otherFundingSources',
    ];
    textFields.forEach(f => { if (b[f] !== undefined) project[f] = b[f]; });

    // GPS
    if (b.gps_latitude  !== undefined) project.gps.latitude  = b.gps_latitude;
    if (b.gps_longitude !== undefined) project.gps.longitude = b.gps_longitude;

    // Dates
    if (b.projectStartDate || b.startDate) {
      project.projectStartDate = toDate(b.projectStartDate || b.startDate);
    }
    if (b.expectedCompletionDate !== undefined) {
      project.expectedCompletionDate = toDate(b.expectedCompletionDate);
    }

    // Financial & progress fields
    if (b.completionPercentage !== undefined) project.completionPercentage = toNum(b.completionPercentage) ?? project.completionPercentage;
    if (b.totalCost            !== undefined) project.totalCost            = toNum(b.totalCost);
    if (b.amountPaid           !== undefined) project.amountPaid           = toNum(b.amountPaid);
    if (b.outstandingAmount    !== undefined) project.outstandingAmount    = toNum(b.outstandingAmount);

    // New image
    if (req.file && gridBucket) {
      const uploadStream = gridBucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });
      uploadStream.end(req.file.buffer);
      await new Promise((resolve, reject) => {
        uploadStream.on('finish', resolve);
        uploadStream.on('error',  reject);
      });
      project.imageUrl = `/api/uploads/${uploadStream.id}`;
    }

    await project.save();
    res.json(project);
  } catch (err) {
    console.error('PUT /projects/:id error:', err.message);
    res.status(500).json({ error: 'Failed to update project.' });
  }
});

// ── PUT /api/projects/:id/approve ────────────────────────────────────────────
router.put('/:id/approve', authenticateUser, async (req, res) => {
  try {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin only.' });
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { $set: { approved: req.body.approved } },
      { new: true }
    );
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    res.json({ approved: project.approved });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update approval.' });
  }
});

// ── DELETE /api/projects/:id ──────────────────────────────────────────────────
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    // Any authenticated user may delete a project.
    // (authenticateUser middleware already blocks unauthenticated requests.)
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted.' });
  } catch (err) {
    console.error('DELETE /projects/:id error:', err.message);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

// ── POST /api/projects/:id/comments ──────────────────────────────────────────
router.post('/:id/comments', authenticateUser, async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment?.trim()) return res.status(400).json({ error: 'Comment cannot be empty.' });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    project.comments.push({
      comment:  comment.trim(),
      username: req.user?.username || req.user?.fullName || 'Unknown',
      userId:   req.user?._id || req.user?.id,
    });

    await project.save();
    res.status(201).json(project.comments);
  } catch (err) {
    console.error('POST /projects/:id/comments error:', err.message);
    res.status(500).json({ error: 'Failed to post comment.' });
  }
});

module.exports = router;