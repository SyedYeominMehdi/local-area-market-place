const mongoose = require('mongoose');
const areas = require('../config/areas');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  area: { type: String, required: true, enum: areas },
  phone: { type: String, required: true, trim: true, maxlength: 20 },
  role: { type: String, enum: ['resident', 'admin'], default: 'resident' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
