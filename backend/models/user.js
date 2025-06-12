const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  googleId: { type: String }, // for OAuth users
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
