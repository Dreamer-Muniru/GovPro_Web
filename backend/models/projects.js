const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, required: true },
  description: { type: String },
  region: { type: String, required: true },
  district: { type: String, required: true },
  location: { type: String, required: true },
  gps: {
    lat: { type: String },
    lng: { type: String }
  },
  contractorName: { type: String },
  imageUrl: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
