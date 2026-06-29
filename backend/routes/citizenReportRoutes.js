const express        = require('express');
const router         = express.Router();
const mongoose       = require('mongoose');
const { GridFSBucket } = require('mongodb');
const multer         = require('multer');
const CitizenReport  = require('../models/CitizenReport');
const verifyAdminToken = require('../middleware/verifyAdminToken');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

let gridBucket;
mongoose.connection.once('open', () => {
  gridBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
});

const uploadToGridFS = (buffer, originalname, mimetype) =>
  new Promise((resolve, reject) => {
    const stream = gridBucket.openUploadStream(originalname, { contentType: mimetype });
    const { Readable } = require('stream');
    const r = new Readable(); r.push(buffer); r.push(null);
    r.pipe(stream);
    stream.on('finish', () => resolve({ url: `/api/uploads/${stream.id}`, name: originalname }));
    stream.on('error',  reject);
  });

// ── POST /api/citizen-reports ─────────────────────────────────────────────────
// Public — no auth required. Rate limited to 1 report per project per half-month.
router.post('/', upload.single('photo'), async (req, res) => {
  try {
    const { projectId, observation, description, reporterName, reporterPhone } = req.body;

    if (!projectId || !observation) {
      return res.status(400).json({ error: 'Project ID and observation are required.' });
    }

    const period      = CitizenReport.getPeriod();
    const nextWindow  = CitizenReport.getNextWindowDate();

    // Check if a report already exists for this period
    const existing = await CitizenReport.findOne({ projectId, reportingPeriod: period });
    if (existing) {
      return res.status(429).json({
        error:         'rate_limited',
        message:       'A report has already been submitted for this project in the current reporting window.',
        existingDate:  existing.submittedAt,
        nextWindowDate: nextWindow,
        reportingPeriod: period,
      });
    }

    const report = new CitizenReport({
      projectId,
      reportingPeriod: period,
      observation,
      description:    description?.trim() || '',
      reporterName:   reporterName?.trim() || '',
      reporterPhone:  reporterPhone?.trim() || '',
    });

    // Upload photo if provided
    if (req.file && gridBucket) {
      const { url, name } = await uploadToGridFS(req.file.buffer, req.file.originalname, req.file.mimetype);
      report.photoUrl  = url;
      report.photoName = name;
    }

    await report.save();
    res.status(201).json({ message: 'Report submitted successfully. Thank you for your contribution.' });

  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key — race condition; treat same as rate limit
      const nextWindow = CitizenReport.getNextWindowDate();
      return res.status(429).json({
        error:          'rate_limited',
        message:        'A report has already been submitted for this project in the current reporting window.',
        nextWindowDate: nextWindow,
      });
    }
    console.error('CitizenReport POST error:', err.message);
    res.status(500).json({ error: 'Failed to submit report. Please try again.' });
  }
});

// ── GET /api/citizen-reports/project/:id ─────────────────────────────────────
// Public — returns the current period's report for a project (if any)
// so the citizen page can show whether this slot is taken.
router.get('/project/:id', async (req, res) => {
  try {
    const period   = CitizenReport.getPeriod();
    const existing = await CitizenReport.findOne({
      projectId: req.params.id,
      reportingPeriod: period,
    }).select('submittedAt observation status reportingPeriod');

    const nextWindow = CitizenReport.getNextWindowDate();

    res.json({
      period,
      nextWindowDate: nextWindow,
      existingReport: existing || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check report status.' });
  }
});

// ── GET /api/citizen-reports ──────────────────────────────────────────────────
// Admin only — returns all reports with project info
router.get('/', verifyAdminToken, async (req, res) => {
  try {
    const { region, district, status, projectId } = req.query;

    // We join with Project to filter by region/district
    let reports = await CitizenReport.find(projectId ? { projectId } : {})
      .populate('projectId', 'title type region district contractor status')
      .sort({ submittedAt: -1 })
      .lean();

    if (region)   reports = reports.filter(r => r.projectId?.region   === region);
    if (district) reports = reports.filter(r => r.projectId?.district === district);
    if (status)   reports = reports.filter(r => r.status === status);

    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

// ── PUT /api/citizen-reports/:id/status ───────────────────────────────────────
// Admin only — update report status + optional note
router.put('/:id/status', verifyAdminToken, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const update = { status };
    if (adminNote !== undefined) update.adminNote = adminNote;

    const report = await CitizenReport.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    ).populate('projectId', 'title district region');

    if (!report) return res.status(404).json({ error: 'Report not found.' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update report.' });
  }
});

module.exports = router;