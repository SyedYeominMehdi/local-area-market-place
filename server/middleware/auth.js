const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function requireAuth(req, res, next) {
  const header = req.get('Authorization') || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Please log in.' });
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'Account not found. Please log in again.' });
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session invalid or expired. Please log in again.' });
    }
    next(error);
  }
};
