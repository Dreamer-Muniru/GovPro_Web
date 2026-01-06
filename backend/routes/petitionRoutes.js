// // routes/petitionRoutes.js
// const express = require('express');
// const router = express.Router();
// // const { protect } = require('../middleware/authMiddleware');
// const protect = require('../middleware/authenticateUser');

// const Petition = require('../models/Petition')
// const Project = require('../models/projects')

// // @desc    Create a new petition for a project
// // @route   POST /api/petitions/create
// // @access  Private
// router.post('/create', protect, async (req, res) => {
//   try {
//     const { projectId, title, description, targetSignatures } = req.body;

//     // Check if project exists
//     const project = await Project.findById(projectId);
//     if (!project) {
//       return res.status(404).json({ message: 'Project not found' });
//     }

//     // Check if petition already exists for this project
//     const existingPetition = await Petition.findOne({ project: projectId });
//     if (existingPetition) {
//       return res.status(400).json({ message: 'Petition already exists for this project' });
//     }

//     // Create petition
//     const petition = await Petition.create({
//       project: projectId,
//       title,
//       description,
//       targetSignatures: targetSignatures || 1000,
//       createdBy: req.user._id,
//       signatures: [{
//         user: req.user._id,
//         name: req.user.name,
//         email: req.user.email,
//         location: req.user.location || '',
//         signedAt: new Date()
//       }]
//     });

//     await petition.populate('project', 'name location');
    
//     res.status(201).json(petition);
//   } catch (error) {
//     console.error('Error creating petition:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// // @desc    Get petition by project ID
// // @route   GET /api/petitions/project/:projectId
// // @access  Public
// router.get('/project/:projectId', async (req, res) => {
//   try {
//     const petition = await Petition.findOne({ project: req.params.projectId })
//       .populate('project', 'name location description')
//       .populate('createdBy', 'name');

//     if (!petition) {
//       return res.status(404).json({ message: 'No petition found for this project' });
//     }

//     res.json(petition);
//   } catch (error) {
//     console.error('Error fetching petition:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// // @desc    Sign a petition
// // @route   POST /api/petitions/:id/sign
// // @access  Private
// router.post('/:id/sign', protect, async (req, res) => {
//   try {
//     const { name, email, location } = req.body;
//     const petition = await Petition.findById(req.params.id);

//     if (!petition) {
//       return res.status(404).json({ message: 'Petition not found' });
//     }

//     // Check if user already signed
//     const alreadySigned = petition.signatures.some(
//       sig => sig.user && sig.user.toString() === req.user._id.toString()
//     );

//     if (alreadySigned) {
//       return res.status(400).json({ message: 'You have already signed this petition' });
//     }

//     // Add signature
//     petition.signatures.push({
//       user: req.user._id,
//       name: name || req.user.name,
//       email: email || req.user.email,
//       location: location || req.user.location || '',
//       signedAt: new Date()
//     });

//     await petition.save();
//     await petition.populate('project', 'name location');

//     res.json(petition);
//   } catch (error) {
//     console.error('Error signing petition:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// // @desc    Check if user has signed petition
// // @route   GET /api/petitions/:id/has-signed
// // @access  Private
// router.get('/:id/has-signed', protect, async (req, res) => {
//   try {
//     const petition = await Petition.findById(req.params.id);

//     if (!petition) {
//       return res.status(404).json({ message: 'Petition not found' });
//     }

//     const hasSigned = petition.signatures.some(
//       sig => sig.user && sig.user.toString() === req.user._id.toString()
//     );

//     res.json({ hasSigned });
//   } catch (error) {
//     console.error('Error checking signature:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// // @desc    Get all petitions (with filters)
// // @route   GET /api/petitions
// // @access  Public
// router.get('/', async (req, res) => {
//   try {
//     const { status, sortBy } = req.query;
//     let query = {};

//     // Filter by status if provided
//     if (status) {
//       query.status = status;
//     }

//     let petitions = await Petition.find(query)
//       .populate('project', 'name location')
//       .populate('createdBy', 'name');

//     // Sort petitions
//     if (sortBy === 'signatures') {
//       petitions = petitions.sort((a, b) => b.signatures.length - a.signatures.length);
//     } else if (sortBy === 'recent') {
//       petitions = petitions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
//     }

//     res.json(petitions);
//   } catch (error) {
//     console.error('Error fetching petitions:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// // @desc    Get petition statistics
// // @route   GET /api/petitions/:id/stats
// // @access  Public
// router.get('/:id/stats', async (req, res) => {
//   try {
//     const petition = await Petition.findById(req.params.id);

//     if (!petition) {
//       return res.status(404).json({ message: 'Petition not found' });
//     }

//     const totalSignatures = petition.signatures.length;
//     const progress = (totalSignatures / petition.targetSignatures) * 100;

//     // Get signatures by location
//     const signaturesByLocation = petition.signatures.reduce((acc, sig) => {
//       const location = sig.location || 'Unknown';
//       acc[location] = (acc[location] || 0) + 1;
//       return acc;
//     }, {});

//     // Get recent growth (last 7 days)
//     const sevenDaysAgo = new Date();
//     sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
//     const recentSignatures = petition.signatures.filter(
//       sig => new Date(sig.signedAt) >= sevenDaysAgo
//     ).length;

//     res.json({
//       totalSignatures,
//       targetSignatures: petition.targetSignatures,
//       progress: progress.toFixed(1),
//       signaturesByLocation,
//       recentSignatures,
//       createdAt: petition.createdAt,
//       status: petition.status
//     });
//   } catch (error) {
//     console.error('Error fetching petition stats:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// });

// module.exports = router;