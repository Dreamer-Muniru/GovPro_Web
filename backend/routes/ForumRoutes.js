const express = require('express');
const router = express.Router();
// const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const Forum = require('../models/forums');
const fs = require('fs');
const authenticateUser = require('../middleware/authenticateUser');
const upload = require('../middleware/upload'); // memory storage for GridFS
const stream = require('stream');
const { GridFSBucket } = require('mongodb');

// Resolve uploads directory relative to backend root and ensure it exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

let gridBucket;
mongoose.connection.once('open', () => {
  gridBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
});


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

      const saveAndRespond = async () => {
      await newForum.save();
      await newForum.populate('createdBy', 'username fullName');
      res.status(201).json(newForum);
    };

    if (req.file && gridBucket) {
      const readable = new stream.PassThrough();
      readable.end(req.file.buffer);
      const uploadStream = gridBucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });

      readable.pipe(uploadStream)
        .on('error', (err) => {
          console.error('Forum image upload error:', err.message);
          res.status(500).json({ error: 'Image upload failed' });
        })
        .on('finish', async () => {
          newForum.imageUrl = `/api/uploads/${uploadStream.id}`;
          await saveAndRespond();
        });
    } else {
      await saveAndRespond();
    }
  } catch (err) {
    console.error('Error creating forum:', err.message);
    res.status(500).json({ error: 'Failed to create forum' });
  }
});

module.exports = router;
