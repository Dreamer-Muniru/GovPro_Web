const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Forum = require('../models/forums');
const authenticateUser = require('../middleware/authenticateUser');

// Resolve uploads directory relative to backend root and ensure it exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Use disk storage to save files locally
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

//Get all forum posts, with optional filtering by region and district
router.get('/', async (req, res) => {
  try {
    const { region, district } = req.query;
    const filter = {};
    if (region) filter.region = region;
    if (district) filter.district = district;
    const forums = await Forum.find(filter)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username fullName');

    res.json(forums);
  } catch (err) {
    console.error('Error fetching forums:', err.message);
    res.status(500).json({ error: 'Failed to fetch forums' });
  }
});

// React to a forum post (like, love, angry, etc.)
router.post('/:id/react', async (req, res) => {
  try {
    const { type, userId } = req.body;
    const forum = await Forum.findById(req.params.id);
    if (!forum) return res.status(404).json({ error: 'Forum not found' });

    // Remove any existing reaction by this user
    forum.reactions = forum.reactions.filter(
      (r) => r.user.toString() !== userId
    );

    // Add new reaction
    forum.reactions.push({ type, user: userId });

    await forum.save();
    res.status(200).json(forum.reactions);
  } catch (err) {
    console.error('Error reacting to forum:', err.message);
    res.status(500).json({ error: 'Failed to react' });
  }
});

// Reacting to comments 
router.post('/:forumId/comments/:commentId/react', async (req, res) => {
  try {
    const { type, userId } = req.body;
    const forum = await Forum.findById(req.params.forumId);
    if (!forum) return res.status(404).json({ error: 'Forum not found' });

    const comment = forum.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    // Remove existing reaction by user
    comment.reactions = comment.reactions.filter(r => r.user.toString() !== userId);

    // Add new reaction
    comment.reactions.push({ type, user: userId });

    await forum.save();
    res.status(200).json(comment.reactions);
  } catch (err) {
    console.error('Error reacting to comment:', err.message);
    res.status(500).json({ error: 'Failed to react to comment' });
  }
});



//Get a specific forum post by ID
router.get('/:id', async (req, res) => {
  try {
    const forum = await Forum.findById(req.params.id).populate('createdBy', 'username fullName');
    if (!forum) return res.status(404).json({ error: 'Forum not found' });
    res.json(forum);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch forum' });
  }
});

//Create a forum post with optional image
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { title, description, region, district, createdBy } = req.body;

    if (!title || !region || !district || !createdBy) {
      return res.status(400).json({ error: 'title, region, district and createdBy are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(createdBy)) {
      return res.status(400).json({ error: 'Invalid createdBy' });
    }

    const newForum = new Forum({
      title,
      description,
      region,
      district,
      createdBy,
      createdAt: new Date()
    });

    if (req.file) {
      // Publicly accessible path served by backend app.js static mount
      newForum.imageUrl = `/uploads/${req.file.filename}`;
    }

    await newForum.save();
    await newForum.populate('createdBy', 'username fullName');

    res.status(201).json(newForum);
  } catch (err) {
    console.error('Error creating forum:', err.message);
    res.status(500).json({ error: 'Failed to create forum' });
  }
});

// Update a forum (owner only)
router.put('/:id', authenticateUser, upload.single('image'), async (req, res) => {
  try {
    const forum = await Forum.findById(req.params.id);
    if (!forum) return res.status(404).json({ error: 'Forum not found' });

    const requesterId = req.user._id || req.user.id;
    if (forum.createdBy.toString() !== String(requesterId)) {
      return res.status(403).json({ error: 'Not authorized to edit this forum' });
    }

    const { title, description, region, district } = req.body;
    if (title !== undefined) forum.title = title;
    if (description !== undefined) forum.description = description;
    if (region !== undefined) forum.region = region;
    if (district !== undefined) forum.district = district;

    if (req.file) {
      forum.imageUrl = `/uploads/${req.file.filename}`;
    }

    await forum.save();
    await forum.populate('createdBy', 'username fullName');
    res.json(forum);
  } catch (err) {
    console.error('Error updating forum:', err.message);
    res.status(500).json({ error: 'Failed to update forum' });
  }
});

// Delete a forum (owner only)
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const forum = await Forum.findById(req.params.id);
    if (!forum) return res.status(404).json({ error: 'Forum not found' });

    const requesterId = req.user._id || req.user.id;
    if (forum.createdBy.toString() !== String(requesterId)) {
      return res.status(403).json({ error: 'Not authorized to delete this forum' });
    }

    await forum.deleteOne();
    res.json({ message: 'Forum deleted' });
  } catch (err) {
    console.error('Error deleting forum:', err.message);
    res.status(500).json({ error: 'Failed to delete forum' });
  }
});

module.exports = router;
