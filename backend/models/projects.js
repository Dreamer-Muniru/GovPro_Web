const mongoose = require('mongoose');

// ── Comment sub-schema ────────────────────────────────────────────────────────
const commentSchema = new mongoose.Schema({
  comment:   { type: String, required: true },
  username:  { type: String },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

// ── Main project schema ───────────────────────────────────────────────────────
const projectSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    title:       { type: String, required: true, trim: true },
    type:        { type: String, trim: true },
    description: { type: String, trim: true },

    // ── Status & classification ───────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ['Resumed', 'Completed', 'Abandoned', 'Uncompleted'],
      default: 'Uncompleted',
    },
    approved: { type: Boolean, default: false },

    // ── Location ──────────────────────────────────────────────────────────────
    region:           { type: String, trim: true },
    district:         { type: String, trim: true },
    location_address: { type: String, trim: true },
    location_city:    { type: String, trim: true },
    location_region:  { type: String, trim: true },  // alias set by form
    gps: {
      latitude:  { type: String },
      longitude: { type: String },
    },

    // ── People & funding ──────────────────────────────────────────────────────
    contractor:          { type: String, trim: true },
    submittedBy:         { type: String, trim: true },
    fundingSource:       { type: String, trim: true },
    otherFundingSources: { type: String, trim: true },
    createdBy:           { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // ── Dates ─────────────────────────────────────────────────────────────────
    projectStartDate:       { type: Date },
    expectedCompletionDate: { type: Date },

    // ── Financial & progress (new fields) ─────────────────────────────────────
    completionPercentage: {
      type:    Number,
      min:     0,
      max:     100,
      default: 0,
    },
    totalCost:         { type: Number, min: 0, default: null },
    amountPaid:        { type: Number, min: 0, default: null },
    outstandingAmount: { type: Number, min: 0, default: null },

    // ── Media ─────────────────────────────────────────────────────────────────
    imageUrl: { type: String },

    // ── Comments ──────────────────────────────────────────────────────────────
    comments: [commentSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Project', projectSchema);