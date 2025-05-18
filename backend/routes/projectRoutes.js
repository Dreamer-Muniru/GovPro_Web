const express = require('express');
const router = express.Router();
const { createProject, getProjects } = require('../controllers/projectController');

// Route: POST /api/projects
router.post('/projects', createProject);
// GET - Fetch all projects
router.get('/', getProjects);

module.exports = router;
