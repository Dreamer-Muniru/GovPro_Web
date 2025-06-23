const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Project = require('../models/projects')
const verifyAdminToken = require('../middleware/verifyAdminToken');
const { createProject, getProjects } = require('../controllers/projectController');

// POST /api/projects
router.post('/', createProject);

// GET /api/projects
router.get('/', getProjects);

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


module.exports = router;
