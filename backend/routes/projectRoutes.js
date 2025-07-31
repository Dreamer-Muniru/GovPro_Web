const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Project = require('../models/projects')
const verifyAdminToken = require('../middleware/verifyAdminToken');
const { createProject, getProjects } = require('../controllers/projectController');
const authenticateUser = require('../middleware/authenticateUser');
// const User = require('../models/user')
// POST /api/projects
router.post('/', createProject);

// GET /api/projects
// router.get('/', getProjects);

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid project ID format' });
  }

  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    console.error('Error fetching project:', err.message);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// GET /api/projects?approved=false
router.get('/', async (req, res) => {
  const { approved } = req.query;
  try {
    const query = approved ? { approved: approved === 'true' } : {};
    const projects = await Project.find(query);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); // or your GridFS setup

router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const updates = { ...req.body };

    if (req.file) {
      updates.image = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    const updated = await Project.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updated) return res.status(404).json({ error: 'Project not found' });
    res.json(updated);
  } catch (err) {
    console.error('Update error:', err.message);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', verifyAdminToken, async (req, res) => {
  try {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true });
    console.log('DELETE request received for ID:', req.params.id);

  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

router.post('/:id/comments', authenticateUser, async (req, res) => {
  console.log('=== COMMENT ROUTE CALLED ===');
  console.log('User ID from token:', req.user.id);
  console.log('Request body:', req.body);

  const { comment } = req.body;
  const { id } = req.params;

  try {
    // ✅ Fetch user from DB
    const user = await User.findById(req.user.id);
    if (!user) {
      console.log('❌ User not found for ID:', req.user.id);
      return res.status(404).json({ error: 'User not found' });
    }

    // ✅ Patch missing username for legacy users
    if (!user.username) {
      const fallback = user.name || user.fullname || user.email?.split('@')[0] || 'Anonymous';
      user.username = fallback;
      await user.save();
      console.log('🔧 Patched legacy user with username:', user.username);
    }

    // ✅ Fetch project
    const project = await Project.findById(id);
    if (!project) {
      console.log('❌ Project not found for ID:', id);
      return res.status(404).json({ error: 'Project not found' });
    }

    // ✅ Construct and attach comment
    const newComment = {
      userId: user._id,
      username: user.username,
      comment,
      createdAt: new Date()
    };

    project.comments.push(newComment);
    await project.save();

    // ✅ Return saved comment as plain object
    const savedComment = project.comments[project.comments.length - 1];
    const safeComment = savedComment.toObject ? savedComment.toObject() : savedComment;

    console.log('✅ Returned comment object:', safeComment);
    res.status(201).json({ message: 'Comment added', comment: safeComment });
  } catch (err) {
    console.error('🔥 Error posting comment:', err);
    res.status(500).json({ error: 'Could not post comment' });
  }
});



module.exports = router;
