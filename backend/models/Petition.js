// // models/Petition.js
// const mongoose = require('mongoose');

// const signatureSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   },
//   name: {
//     type: String,
//     required: true
//   },
//   email: {
//     type: String,
//     required: true
//   },
//   location: {
//     type: String,
//     default: ''
//   },
//   signedAt: {
//     type: Date,
//     default: Date.now
//   },
//   ipAddress: {
//     type: String
//   },
//   comment: {
//     type: String,
//     maxlength: 500
//   }
// });

// const petitionSchema = new mongoose.Schema({
//   project: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'projects', // Changed from 'Project' to match your model name
//     required: true,
//     unique: true
//   },
//   title: {
//     type: String,
//     required: true,
//     maxlength: 200
//   },
//   description: {
//     type: String,
//     required: true,
//     maxlength: 2000
//   },
//   targetSignatures: {
//     type: Number,
//     default: 1000,
//     min: 100
//   },
//   signatures: [signatureSchema],
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   status: {
//     type: String,
//     enum: ['active', 'completed', 'archived', 'successful'],
//     default: 'active'
//   },
//   milestones: [{
//     signatureCount: Number,
//     reachedAt: Date,
//     message: String
//   }],
//   updates: [{
//     title: String,
//     message: String,
//     createdAt: {
//       type: Date,
//       default: Date.now
//     },
//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User'
//     }
//   }],
//   tags: [String],
//   category: {
//     type: String,
//     enum: ['infrastructure', 'healthcare', 'education', 'housing', 'agriculture', 'other'],
//     default: 'infrastructure'
//   },
//   visibility: {
//     type: String,
//     enum: ['public', 'unlisted'],
//     default: 'public'
//   },
//   shares: {
//     type: Number,
//     default: 0
//   },
//   views: {
//     type: Number,
//     default: 0
//   }
// }, {
//   timestamps: true
// });

// // Index for faster queries
// petitionSchema.index({ project: 1 });
// petitionSchema.index({ status: 1 });
// petitionSchema.index({ createdAt: -1 });
// petitionSchema.index({ 'signatures.user': 1 });

// // Virtual for signature count
// petitionSchema.virtual('signatureCount').get(function() {
//   return this.signatures.length;
// });

// // Virtual for progress percentage
// petitionSchema.virtual('progressPercentage').get(function() {
//   return ((this.signatures.length / this.targetSignatures) * 100).toFixed(1);
// });

// // Method to check if target reached
// petitionSchema.methods.isTargetReached = function() {
//   return this.signatures.length >= this.targetSignatures;
// };

// // Method to add milestone
// petitionSchema.methods.addMilestone = function(count) {
//   const milestoneMessages = {
//     100: '🎉 100 signatures! Momentum is building!',
//     250: '💪 250 signatures! People are taking notice!',
//     500: '🔥 500 signatures! This is gaining serious traction!',
//     1000: '🚀 1,000 signatures! This is now a movement!',
//     2500: '⭐ 2,500 signatures! Authorities must respond!',
//     5000: '🏆 5,000 signatures! Historic achievement!'
//   };

//   if (milestoneMessages[count]) {
//     this.milestones.push({
//       signatureCount: count,
//       reachedAt: new Date(),
//       message: milestoneMessages[count]
//     });
//   }
// };

// // Pre-save middleware to update status
// petitionSchema.pre('save', function(next) {
//   if (this.isTargetReached() && this.status === 'active') {
//     this.status = 'completed';
//   }
//   next();
// });

// // Static method to get trending petitions
// petitionSchema.statics.getTrending = async function(limit = 10) {
//   const sevenDaysAgo = new Date();
//   sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

//   const petitions = await this.find({ status: 'active' })
//     .populate('project', 'name location')
//     .lean();

//   // Calculate trending score based on recent signatures
//   const withScores = petitions.map(petition => {
//     const recentSignatures = petition.signatures.filter(
//       sig => new Date(sig.signedAt) >= sevenDaysAgo
//     ).length;
    
//     return {
//       ...petition,
//       trendingScore: recentSignatures
//     };
//   });

//   return withScores
//     .sort((a, b) => b.trendingScore - a.trendingScore)
//     .slice(0, limit);
// };

// // Static method to get nearly completed petitions
// petitionSchema.statics.getNearlyCompleted = async function(limit = 5) {
//   const petitions = await this.find({ status: 'active' })
//     .populate('project', 'name location')
//     .lean();

//   return petitions
//     .filter(p => {
//       const progress = (p.signatures.length / p.targetSignatures) * 100;
//       return progress >= 75 && progress < 100;
//     })
//     .sort((a, b) => {
//       const progressA = (a.signatures.length / a.targetSignatures) * 100;
//       const progressB = (b.signatures.length / b.targetSignatures) * 100;
//       return progressB - progressA;
//     })
//     .slice(0, limit);
// };

// const Petition = mongoose.model('Petition', petitionSchema);

// module.exports = Petition;