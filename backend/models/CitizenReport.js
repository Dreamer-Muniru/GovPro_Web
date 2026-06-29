const mongoose = require('mongoose');

// Reporting period: "YYYY-MM-A" = 1st–15th, "YYYY-MM-B" = 16th–end of month
const getPeriod = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-${date.getDate() <= 15 ? 'A' : 'B'}`;
};

const getNextWindowDate = (date = new Date()) => {
  const d = date.getDate();
  if (d <= 15) {
    // Next window: 16th of this month
    return new Date(date.getFullYear(), date.getMonth(), 16);
  } else {
    // Next window: 1st of next month
    return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  }
};

const citizenReportSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true,
  },
  reportingPeriod: {
    type: String,     // "2025-06-A" or "2025-06-B"
    required: true,
  },
  observation: {
    type: String,
    enum: [
      'progressing',   // Work is progressing well
      'stalled',       // Work has stopped
      'abandoned',     // Site looks abandoned
      'completed',     // Work appears completed
      'poor_quality',  // Quality concerns
      'other',         // Other concern
    ],
    required: true,
  },
  description: { type: String, trim: true, maxlength: 500 },
  photoUrl:    { type: String },   // GridFS URL
  photoName:   { type: String },
  reporterName:  { type: String, trim: true },
  reporterPhone: { type: String, trim: true },
  status: {
    type: String,
    enum: ['Pending', 'Acknowledged', 'Escalated', 'Resolved'],
    default: 'Pending',
  },
  adminNote: { type: String, trim: true },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// One report per project per reporting period
citizenReportSchema.index({ projectId: 1, reportingPeriod: 1 }, { unique: true });

citizenReportSchema.statics.getPeriod       = getPeriod;
citizenReportSchema.statics.getNextWindowDate = getNextWindowDate;

module.exports = mongoose.model('CitizenReport', citizenReportSchema);