const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { type: String, 
    required: [true, 'Full name is required'], 
    trim: true 
  },
  phone: {
  type: String,
  required: [true, 'Phone number is required'],
  validate: {
    validator: function (v) {
      return /^(\+233\d{9}|233\d{9}|0\d{9})$/.test(v);
    },
    message: props => `${props.value} is not a valid Ghanaian phone number. Use +233XXXXXXXXX or 0XXXXXXXXX`,
  },
},
  username: { 
    type: String, 
    username: { type: String, required: true },
    // unique: true, 
    // trim: true 
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'] },
  isAdmin: { 
    type: Boolean, 
    default: false 
  },
}, { timestamps: true }); 

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);
