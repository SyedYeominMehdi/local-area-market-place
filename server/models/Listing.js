const mongoose = require('mongoose');
const areas = require('../config/areas');

const listingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  price: { type: Number, required: true, min: 0, max: 10000000 },
  category: { type: String, required: true, enum: ['Food', 'Clothing', 'Electronics', 'Furniture', 'Vehicles', 'Other'] },
  area: { type: String, required: true, enum: areas },
  imageName: { type: String, required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['available', 'sold', 'removed'], default: 'available' },
  purchase: {
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    buyerName: String,
    buyerPhone: String,
    message: String,
    amount: Number,
    purchasedAt: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model('Listing', listingSchema);
