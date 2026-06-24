const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  name:      { type: String },
  fileUrl:   { type: String },
  fileName:  { type: String },
  type:      { type: String, enum: ['businessCertificate','taxClearance','incorporation','insurance','other'], default: 'other' },
  uploadedAt:{ type: Date, default: Date.now },
});

const progressSchema = new mongoose.Schema({
  description:{ type: String, required: true },
  date:       { type: Date, default: Date.now },
  fileUrl:    { type: String },
  fileName:   { type: String },
  uploadedAt: { type: Date, default: Date.now },
});

const paymentSchema = new mongoose.Schema({
  description:   { type: String, required: true },
  amount:        { type: Number, required: true },
  currency:      { type: String, default: 'GHS' },
  date:          { type: Date, default: Date.now },
  status:        { type: String, enum: ['Pending','Approved','Paid','Rejected'], default: 'Pending' },
  receiptUrl:    { type: String },
  receiptFileName:{ type: String },
  certUrl:       { type: String },
  certFileName:  { type: String },
  uploadedAt:    { type: Date, default: Date.now },
});

const contractorSchema = new mongoose.Schema({
  companyName:        { type: String, required: true, trim: true },
  registrationNumber: { type: String, required: true, trim: true },
  category:           { type: String, required: true },
  status:             { type: String, enum: ['Active','Suspended','Blacklisted'], default: 'Active' },
  contactPerson: {
    name:  { type: String },
    phone: { type: String },
    email: { type: String },
  },
  address:   { type: String },
  region:    { type: String },
  district:  { type: String },
  notes:     { type: String },
  documents:     [documentSchema],
  workProgress:  [progressSchema],
  paymentRecords:[paymentSchema],
  onboardedAt:   { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Contractor', contractorSchema);