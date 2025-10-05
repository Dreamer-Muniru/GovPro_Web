const mongoose = require('mongoose');

const ForumSchema = new mongoose.Schema({
  title: String,
  description: String,
  region: String,
  district: String,
  imageUrl: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  createdAt: { type: Date, default: Date.now }, 

 reactions: [
  {
    type: { type: String, required: true }, // e.g., 'like', 'dislike'
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  }
],


  comments: [
    {
      content: String,
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now },
      imageUrl: String,
       reactions: [
      {
        type: { type: String },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      }
    ],


      replies: [
        {
          content: String,
          createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          createdAt: { type: Date, default: Date.now },
          imageUrl: String,
           reactions: [
          {
            type: { type: String },
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
          }
        ],
        }
      ]
    }
  ]
});

module.exports = mongoose.model('Forum', ForumSchema);
