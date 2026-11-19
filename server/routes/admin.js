const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Listing = require('../models/Listing');

router.use(auth, (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Admin access required.' }));
router.get('/overview', async (req, res, next) => {
  try {
    const users = await User.find().select('name email area role createdAt').sort({ createdAt: -1 }).lean();
    const listings = await Listing.find().populate('seller', 'name').sort({ createdAt: -1 }).lean();
    res.json({ users: users.map(u => ({ id: u._id, name: u.name, email: u.email, area: u.area, role: u.role })), listings: listings.map(l => ({ id: l._id, title: l.title, area: l.area, status: l.status, seller: l.seller?.name || 'Unavailable' })) });
  } catch (error) { next(error); }
});
router.patch('/listings/:id/remove', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid listing ID.' });
    const item = await Listing.findOneAndUpdate({ _id: req.params.id, status: 'available' }, { status: 'removed' }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Available listing not found.' });
    res.json({ message: 'Listing removed from browsing.' });
  } catch (error) { next(error); }
});
module.exports = router;
