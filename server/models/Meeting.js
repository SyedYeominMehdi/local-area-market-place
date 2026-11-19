const mongoose = require('mongoose');
const meetingSchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  title: { type: String, required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerName: { type: String, required: true },
  buyerPhone: { type: String, required: true },
  message: { type: String, default: '' },
  proposedAt: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
}, { timestamps: true });
module.exports = mongoose.model('Meeting', meetingSchema);
