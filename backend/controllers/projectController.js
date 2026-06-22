
const Project = require('../models/projects');
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const stream = require('stream');

let gridBucket;
mongoose.connection.once('open', () => {
  gridBucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
});

exports.createProject = async (req, res) => {
  try {
    // debug logs removed

    // Accept multiple possible field names from frontend forms
    const title = req.body.title || req.body.projectTitle || '';
    const type = req.body.type || '';
    const otherType = req.body.otherType || req.body.other_type || '';
    const description = req.body.description || '';
    const region = req.body.region || '';
    const district = req.body.district || '';
    // location and gps may be sent as nested objects or flat fields
    const location = req.body.location || (req.body.location_address || req.body.location_city ? {
      address: req.body.location_address,
      city: req.body.location_city,
      region: req.body.location_region || req.body.region
    } : undefined);
    const gps = req.body.gps || (req.body.gps_latitude || req.body.gps_longitude ? {
      latitude: parseFloat(req.body.gps_latitude),
      longitude: parseFloat(req.body.gps_longitude)
    } : undefined);
    const contractor = req.body.contractor || '';
    const status = req.body.status || 'Uncompleted';
    const fundingSource = req.body.fundingSource || req.body.funding_source || '';
    const otherFundingSources = req.body.otherFundingSources || req.body.other_funding_source || '';
    const projectStartDate = req.body.projectStartDate || req.body.startDate || req.body.start_date || '';
    const submittedBy = req.body.submittedBy || req.body.submitted_by || '';

    const newProject = new Project({
      title,
      type,
      otherType,
      description,
      region,
      district,
      location: location || undefined,
      gps: gps || undefined,
      contractor: contractor || undefined,
      status,
      fundingSource: fundingSource || undefined,
      otherFundingSources: otherFundingSources || undefined,
      projectStartDate: projectStartDate || undefined,
      startDate: projectStartDate || undefined,
      submittedBy: submittedBy || undefined,
      dateSubmitted: new Date()
    });

    if (req.file && gridBucket) {
      try {
        await new Promise((resolve, reject) => {
          const readable = new stream.PassThrough();
          readable.end(req.file.buffer);
          const uploadStream = gridBucket.openUploadStream(req.file.originalname, {
            contentType: req.file.mimetype,
          });

          readable.pipe(uploadStream)
            .on('error', reject)
            .on('finish', () => {
              newProject.imageUrl = `/api/uploads/${uploadStream.id}`;
              resolve();
            });
        });
      } catch (uploadErr) {
        console.error('Project image upload error (saving without image):', uploadErr.message);
      }
    }

    await newProject.save();
    res.status(201).json({ success: true, project: newProject });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all projects
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, projects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};