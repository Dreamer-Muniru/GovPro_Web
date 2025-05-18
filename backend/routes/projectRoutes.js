const express = require('express');
const router = express.Router();
const { createProject } = require('../controllers/projectController');

// Route: POST /api/projects
router.post('/projects', createProject);

module.exports = router;
