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
  otherType: { type: String }, 

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

  imageUrl: { type: String }, 
  
  imageData: {
    type: Buffer, // Storing image binary data (if needed)
    contentType: String
  },

  status: {
    type: String,
    enum: ['Uncompleted', 'Abandoned', 'Resumed', 'Completed'],
    default: 'Uncompleted'
  },
  approved: {
  type: Boolean,
  default: false,
}, 
// Adding comments to the project schema
comments: [
  {
    comment: String,
    username: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    district: { type: String },
    createdAt: { type: Date, default: Date.now }
  }
],

  projectStartDate: { type: Date },

  dateSubmitted: { type: Date, default: Date.now },

  submittedBy: { type: String, default: 'Anonymous' }
},{ timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
