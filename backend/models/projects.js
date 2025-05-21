// models/Project.js
const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'School', 'Hospital', 'Road', 'Residential Bungalow',
      'Market Stall', 'Drainage System', 'Bridge', 'Water System',
      'Power Project', 'Sanitation Facility', 'Government Office',
      'Sports & Recreation Center', 'Other'
    ],
    required: true,
  },
  otherType: { type: String }, // Only used if type === 'Other'

  description: { type: String, required: true },

  region: { type: String, required: true },
  district: { type: String, required: true },

  location: {
    address: String,
    city: String,
    region: String
  },

  gps: {
    latitude: Number,
    longitude: Number
  },

  contractor: { type: String, default: 'Unknown' },

  imageUrl: { type: String, required: true }, 

  status: {
    type: String,
    enum: ['Uncompleted', 'Abandoned', 'Resumed', 'Completed'],
    default: 'Uncompleted'
  },

  projectStartDate: { type: Date }, // NEW: Project Start Date

  dateSubmitted: { type: Date, default: Date.now },

  submittedBy: { type: String, default: 'Anonymous' }
});

module.exports = mongoose.model('Project', projectSchema);
