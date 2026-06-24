const express    = require('express');
const router     = express.Router();
const mongoose   = require('mongoose');
const { GridFSBucket } = require('mongodb');
const multer     = require('multer');
const Contractor = require('../models/contractor');
const verifyAdminToken = require('../middleware/verifyAdminToken');

// Store files in memory then pipe to GridFS
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

let gridBucket;
mongoose.connection.once('open', () => {
  gridBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
});

// Helper: upload a single buffer to GridFS, return { url, name }
const uploadToGridFS = (buffer, originalname, mimetype) => new Promise((resolve, reject) => {
  const uploadStream = gridBucket.openUploadStream(originalname, { contentType: mimetype });
  const { Readable } = require('stream');
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  readable.pipe(uploadStream);
  uploadStream.on('finish', () => resolve({ url: `/api/uploads/${uploadStream.id}`, name: originalname }));
  uploadStream.on('error', reject);
});

// ── GET /api/contractors ─────────────────────────────────────────────────────
router.get('/', verifyAdminToken, async (req, res) => {
  try {
    const contractors = await Contractor.find().sort({ onboardedAt: -1 });
    res.json(contractors);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch contractors.' }); }
});

// ── GET /api/contractors/:id ─────────────────────────────────────────────────
router.get('/:id', verifyAdminToken, async (req, res) => {
  try {
    const c = await Contractor.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Contractor not found.' });
    res.json(c);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch contractor.' }); }
});

// ── POST /api/contractors ─────────────────────────────────────────────────────
// Onboard a new contractor with optional document uploads
router.post('/', verifyAdminToken, upload.fields([
  { name: 'documents', maxCount: 20 },
]), async (req, res) => {
  try {
    const {
      companyName, registrationNumber, category, status,
      contactName, contactPhone, contactEmail,
      address, region, district, notes,
    } = req.body;

    if (!companyName || !registrationNumber || !category) {
      return res.status(400).json({ error: 'Company name, registration number, and category are required.' });
    }

    const documentTypes = req.body.documentTypes
      ? (Array.isArray(req.body.documentTypes) ? req.body.documentTypes : [req.body.documentTypes])
      : [];

    const files = req.files?.documents || [];
    const documents = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const { url, name } = await uploadToGridFS(f.buffer, f.originalname, f.mimetype);
      documents.push({
        name,
        fileUrl: url,
        fileName: f.originalname,
        type: documentTypes[i] || 'other',
      });
    }

    const contractor = await Contractor.create({
      companyName, registrationNumber, category,
      status: status || 'Active',
      contactPerson: { name: contactName, phone: contactPhone, email: contactEmail },
      address, region, district, notes,
      documents,
    });

    res.status(201).json(contractor);
  } catch (e) {
    console.error('Contractor create error:', e.message);
    res.status(500).json({ error: 'Failed to onboard contractor.' });
  }
});

// ── PUT /api/contractors/:id ─────────────────────────────────────────────────
router.put('/:id', verifyAdminToken, async (req, res) => {
  try {
    const allowed = ['status','notes','address','region','district'];
    const update  = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
    const c = await Contractor.findByIdAndUpdate(req.params.id, { $set: update }, { new: true });
    if (!c) return res.status(404).json({ error: 'Contractor not found.' });
    res.json(c);
  } catch (e) { res.status(500).json({ error: 'Failed to update contractor.' }); }
});

// ── DELETE /api/contractors/:id ──────────────────────────────────────────────
router.delete('/:id', verifyAdminToken, async (req, res) => {
  try {
    await Contractor.findByIdAndDelete(req.params.id);
    res.json({ message: 'Contractor removed.' });
  } catch (e) { res.status(500).json({ error: 'Failed to delete contractor.' }); }
});

// ── POST /api/contractors/:id/documents ─────────────────────────────────────
router.post('/:id/documents', verifyAdminToken, upload.fields([{ name: 'documents', maxCount: 20 }]), async (req, res) => {
  try {
    const c = await Contractor.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Contractor not found.' });

    const documentTypes = req.body.documentTypes
      ? (Array.isArray(req.body.documentTypes) ? req.body.documentTypes : [req.body.documentTypes])
      : [];

    const files = req.files?.documents || [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const { url, name } = await uploadToGridFS(f.buffer, f.originalname, f.mimetype);
      c.documents.push({ name, fileUrl: url, fileName: f.originalname, type: documentTypes[i] || 'other' });
    }
    await c.save();
    res.json(c.documents);
  } catch (e) { res.status(500).json({ error: 'Failed to upload documents.' }); }
});

// ── DELETE /api/contractors/:id/documents/:docId ─────────────────────────────
router.delete('/:id/documents/:docId', verifyAdminToken, async (req, res) => {
  try {
    const c = await Contractor.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found.' });
    c.documents = c.documents.filter(d => d._id.toString() !== req.params.docId);
    await c.save();
    res.json({ message: 'Document removed.' });
  } catch (e) { res.status(500).json({ error: 'Failed to remove document.' }); }
});

// ── POST /api/contractors/:id/progress ──────────────────────────────────────
router.post('/:id/progress', verifyAdminToken, upload.single('file'), async (req, res) => {
  try {
    const c = await Contractor.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found.' });

    const entry = {
      description: req.body.description,
      date: req.body.date ? new Date(req.body.date) : new Date(),
    };

    if (req.file) {
      const { url, name } = await uploadToGridFS(req.file.buffer, req.file.originalname, req.file.mimetype);
      entry.fileUrl  = url;
      entry.fileName = name;
    }

    c.workProgress.push(entry);
    await c.save();
    res.json(c.workProgress);
  } catch (e) { res.status(500).json({ error: 'Failed to add progress.' }); }
});

// ── POST /api/contractors/:id/payments ──────────────────────────────────────
router.post('/:id/payments', verifyAdminToken, upload.fields([
  { name: 'receipt',     maxCount: 1 },
  { name: 'certificate', maxCount: 1 },
]), async (req, res) => {
  try {
    const c = await Contractor.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found.' });

    const payment = {
      description: req.body.description,
      amount:      parseFloat(req.body.amount),
      status:      req.body.status || 'Pending',
      date:        req.body.date ? new Date(req.body.date) : new Date(),
    };

    if (req.files?.receipt?.[0]) {
      const f = req.files.receipt[0];
      const { url, name } = await uploadToGridFS(f.buffer, f.originalname, f.mimetype);
      payment.receiptUrl      = url;
      payment.receiptFileName = name;
    }
    if (req.files?.certificate?.[0]) {
      const f = req.files.certificate[0];
      const { url, name } = await uploadToGridFS(f.buffer, f.originalname, f.mimetype);
      payment.certUrl      = url;
      payment.certFileName = name;
    }

    c.paymentRecords.push(payment);
    await c.save();
    res.json(c.paymentRecords);
  } catch (e) { res.status(500).json({ error: 'Failed to add payment.' }); }
});

module.exports = router;