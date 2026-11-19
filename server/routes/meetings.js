const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Meeting = require('../models/Meeting');
const Listing = require('../models/Listing');

router.get('/', auth, async (req, res, next) => {
  try {
    const meetings = await Meeting.find({ $or: [{ buyer: req.user._id }, { seller: req.user._id }] }).populate('seller', 'name phone').populate('listing', 'status').sort({ createdAt: -1 }).lean();
    res.json({ meetings: meetings.map(item => {
      const isSeller = String(item.seller?._id) === String(req.user._id);
      return { id: item._id, title: item.title, role: isSeller ? 'seller' : 'buyer', status: item.status, proposedAt: item.proposedAt, available: item.listing?.status === 'available', contact: isSeller ? { name: item.buyerName, phone: item.buyerPhone } : { name: item.seller?.name || 'Unavailable', phone: item.seller?.phone || '' }, message: isSeller ? item.message : '' };
    }) });
  } catch (error) { next(error); }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const { listingId, name, phone, message, proposedAt } = req.body;
    if (!mongoose.isValidObjectId(listingId) || typeof name !== 'string' || !name.trim() || name.trim().length > 80 || typeof phone !== 'string' || !/^[+\d][\d\s-]{6,19}$/.test(phone.trim()) || typeof message !== 'string' || message.length > 300 || typeof proposedAt !== 'string') return res.status(400).json({ message: 'Check the meeting details.' });
    const date = new Date(proposedAt);
    if (!Number.isFinite(date.getTime()) || date <= new Date()) return res.status(400).json({ message: 'Choose a future date and time.' });
    const listing = await Listing.findOne({ _id: listingId, status: 'available', seller: { $ne: req.user._id } });
    if (!listing) return res.status(409).json({ message: 'This item is unavailable or belongs to you.' });
    await Meeting.create({ listing: listing._id, title: listing.title, buyer: req.user._id, seller: listing.seller, buyerName: name.trim(), buyerPhone: phone.trim(), message: message.trim(), proposedAt: date });
    res.status(201).json({ message: 'Meeting requested. The seller must accept it.' });
  } catch (error) { next(error); }
});

router.patch('/:id', auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !['accepted', 'declined'].includes(req.body.status)) return res.status(400).json({ message: 'Invalid request.' });
    const meeting = await Meeting.findOne({ _id: req.params.id, seller: req.user._id, status: 'pending' });
    if (!meeting) return res.status(404).json({ message: 'Pending request not found.' });
    if (req.body.status === 'accepted' && !(await Listing.exists({ _id: meeting.listing, status: 'available' }))) return res.status(409).json({ message: 'This item is no longer available; decline the request instead.' });
    const updated = await Meeting.findOneAndUpdate({ _id: meeting._id, seller: req.user._id, status: 'pending' }, { status: req.body.status }, { new: true });
    if (!updated) return res.status(409).json({ message: 'This request has already been answered.' });
    res.json({ message: `Meeting ${updated.status}.` });
  } catch (error) { next(error); }
});
module.exports = router;
