const express = require('express');
const router = express.Router();
const Forum = require('../models/forums');
const upload = require('../middleware/upload');
const stream = require('stream');
const { GridFSBucket } = require('mongodb');
const mongoose = require('mongoose');

// Lazy-initialised GridFS bucket (same pattern used in other route files)
let gridBucket;
mongoose.connection.once('open', () => {
  gridBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
});

router.get('/:forumId', async (req, res) => {
  try {
    const forum = await Forum.findById(req.params.forumId)
      .populate('comments.createdBy', 'username')
      .populate('comments.replies.createdBy', 'username');

    res.json(forum ? forum.comments : []);
  } catch (error) {
    console.error('Error fetching comments:', error.message);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

router.post('/reply', async (req, res) => {
  try {
    const { forumId, parentId, content, createdBy } = req.body;
    const forum = await Forum.findById(forumId);
    if (!forum) return res.status(404).json({ error: 'Forum not found' });

    const findComment = (comments) => {
      for (let comment of comments) {
        if (comment._id.toString() === parentId) return comment;
        const found = findComment(comment.replies || []);
        if (found) return found;
      }
      return null;
    };

    const parentComment = findComment(forum.comments);
    if (!parentComment || !Array.isArray(parentComment.replies)) {
      return res.status(404).json({ error: 'Parent comment not found or invalid' });
    }

    parentComment.replies.push({
      content,
      createdBy,
      createdAt: new Date(),
      replies: [],
    });

    await forum.save();
    res.status(201).json({ message: 'Reply posted' });
  } catch (error) {
    console.error('Error posting reply:', error.message);
    res.status(500).json({ error: 'Failed to post reply' });
  }
});

// Comment posting
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { forumId, content, createdBy } = req.body;
    const forum = await Forum.findById(forumId);
    if (!forum) return res.status(404).json({ error: 'Forum not found' });

    const comment = {
      content,
      createdBy,
      createdAt: new Date(),
      replies: [],
    };

    if (req.file && gridBucket) {
      const readableStream = new stream.PassThrough();
      readableStream.end(req.file.buffer);

      const uploadStream = gridBucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });

      readableStream.pipe(uploadStream);

      uploadStream.on('finish', async () => {
        comment.imageUrl = `/api/uploads/${uploadStream.id}`;
        forum.comments.push(comment);
        await forum.save();
        res.status(201).json({ message: 'Comment posted', comment });
      });

      uploadStream.on('error', (error) => {
        console.error('Image upload error:', error.message);
        res.status(500).json({ error: 'Image upload failed' });
      });
    } else {
      forum.comments.push(comment);
      await forum.save();
      res.status(201).json({ message: 'Comment posted', comment });
    }
  } catch (error) {
    console.error('Error posting comment:', error.message);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

module.exports = router;