const express = require('express');
const multer = require('multer');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const requireAuth = require('../middleware/auth');
const Listing = require('../models/Listing');
const areas = require('../config/areas');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5 } });
const uploadDir = path.join(__dirname, '..', 'uploads');
const categories = ['Food', 'Clothing', 'Electronics', 'Furniture', 'Vehicles', 'Other'];

function imageExtension(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return '.jpg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return '.png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  return null;
}

router.get('/mine', requireAuth, async (req, res, next) => {
  try {
    const items = await Listing.find({ seller: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ listings: items.map(item => ({ id: item._id, title: item.title, description: item.description, price: item.price, category: item.category, area: item.area, status: item.status, purchased: !!item.purchase?.buyer, imageUrl: `/uploads/${item.imageName}` })) });
  } catch (error) { next(error); }
});

router.get('/purchases', requireAuth, async (req, res, next) => {
  try {
    const items = await Listing.find({ $or: [{ 'purchase.buyer': req.user._id }, { seller: req.user._id, 'purchase.buyer': { $exists: true } }] }).populate('seller', 'name phone').sort({ 'purchase.purchasedAt': -1 }).lean();
    res.json({ purchases: items.map(item => {
      const isBuyer = String(item.purchase.buyer) === String(req.user._id);
      return { id: item._id, title: item.title, imageUrl: item.imageName ? `/uploads/${item.imageName}` : null, amount: item.purchase.amount, purchasedAt: item.purchase.purchasedAt, role: isBuyer ? 'buyer' : 'seller', contact: isBuyer ? { name: item.seller?.name || 'Unavailable', phone: item.seller?.phone || '' } : { name: item.purchase.buyerName, phone: item.purchase.buyerPhone }, message: isBuyer ? '' : item.purchase.message };
    }) });
  } catch (error) { next(error); }
});

router.post('/:id/purchase', requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid listing ID.' });
    const { name, phone, message, expectedPrice } = req.body;
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 80 || typeof phone !== 'string' || !/^[+\d][\d\s-]{6,19}$/.test(phone.trim()) || typeof message !== 'string' || message.length > 300 || typeof expectedPrice !== 'number' || !Number.isFinite(expectedPrice) || expectedPrice < 0) return res.status(400).json({ message: 'Check your name, phone number and message.' });
    const item = await Listing.findOneAndUpdate({ _id: req.params.id, status: 'available', category: { $ne: 'Food' }, seller: { $ne: req.user._id }, price: expectedPrice }, { $set: { status: 'sold', purchase: { buyer: req.user._id, buyerName: name.trim(), buyerPhone: phone.trim(), message: message.trim(), amount: expectedPrice, purchasedAt: new Date() } } }, { new: true, runValidators: true });
    if (!item) return res.status(409).json({ message: 'This item is unavailable, is a food listing, belongs to you, or its price has changed. Refresh and try again.' });
    res.status(201).json({ message: 'Purchase recorded. Arrange payment and pickup with the seller.' });
  } catch (error) { next(error); }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid listing ID.' });
    const { title, description, price, category, area } = req.body;
    const priceText = typeof price === 'number' ? String(price) : price;
    const amount = Number(priceText);
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 80 || typeof description !== 'string' || !description.trim() || description.trim().length > 500 || typeof priceText !== 'string' || !/^\d+(\.\d{1,2})?$/.test(priceText) || !Number.isFinite(amount) || amount > 10000000 || !categories.includes(category) || !areas.includes(area)) return res.status(400).json({ message: 'Check the title, description, price, category and area.' });
    const item = await Listing.findOneAndUpdate({ _id: req.params.id, seller: req.user._id, status: 'available' }, { title: title.trim(), description: description.trim(), price: amount, category, area }, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Available listing not found.' });
    res.json({ message: 'Listing updated.' });
  } catch (error) { next(error); }
});

router.patch('/:id/sold', requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid listing ID.' });
    const item = await Listing.findOneAndUpdate({ _id: req.params.id, seller: req.user._id, status: 'available' }, { status: 'sold' }, { new: true });
    if (!item) return res.status(404).json({ message: 'Available listing not found.' });
    res.json({ message: 'Listing marked as sold.' });
  } catch (error) { next(error); }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid listing ID.' });
    const item = await Listing.findOneAndDelete({ _id: req.params.id, seller: req.user._id, 'purchase.buyer': { $exists: false } });
    if (!item) return res.status(404).json({ message: 'Listing not found or has a purchase record.' });
    // Images have server-generated names. If removal fails, keep the successful deletion.
    await fs.unlink(path.join(uploadDir, path.basename(item.imageName))).catch(error => { if (error.code !== 'ENOENT') console.error('Could not remove listing image:', error.message); });
    res.json({ message: 'Listing deleted.' });
  } catch (error) { next(error); }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    if (typeof req.query.area !== 'string' || !areas.includes(req.query.area)) return res.status(400).json({ message: 'Choose a valid area.' });
    const listings = await Listing.find({ area: req.query.area, status: 'available' }).populate('seller', 'name phone').sort({ createdAt: -1 }).lean();
    res.json({ listings: listings.map(item => ({ id: item._id, title: item.title, description: item.description, price: item.price, category: item.category, area: item.area, imageUrl: `/uploads/${item.imageName}`, isOwner: item.seller && String(item.seller._id) === String(req.user._id), seller: item.seller && { name: item.seller.name, phone: item.seller.phone }, createdAt: item.createdAt })) });
  } catch (error) { next(error); }
});

router.post('/', requireAuth, upload.single('image'), async (req, res, next) => {
  let savedPath;
  try {
    const { title, description, price, category, area } = req.body;
    const amount = Number(price);
    const extension = req.file && imageExtension(req.file.buffer);
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 80 || typeof description !== 'string' || !description.trim() || description.trim().length > 500 || typeof price !== 'string' || !/^\d+(\.\d{1,2})?$/.test(price) || !Number.isFinite(amount) || amount > 10000000 || !categories.includes(category) || !areas.includes(area)) {
      return res.status(400).json({ message: 'Check the title, description, price, category and area.' });
    }
    if (!extension) return res.status(400).json({ message: 'Choose a JPEG, PNG or WebP image, up to 5 MB.' });
    await fs.mkdir(uploadDir, { recursive: true });
    const imageName = crypto.randomUUID() + extension;
    savedPath = path.join(uploadDir, imageName);
    await fs.writeFile(savedPath, req.file.buffer, { flag: 'wx' });
    const item = await Listing.create({ title: title.trim(), description: description.trim(), price: amount, category, area, imageName, seller: req.user._id });
    res.status(201).json({ message: 'Listing created.', id: item.id });
  } catch (error) {
    if (savedPath) await fs.unlink(savedPath).catch(() => {});
    next(error);
  }
});

module.exports = router;
