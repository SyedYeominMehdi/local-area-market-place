const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const areas = require('../config/areas');

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, area: user.area, phone: user.phone, role: user.role };
}
function sendSession(res, user, status = 200) {
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
  res.status(status).json({ token, user: publicUser(user) });
}

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, area, phone } = req.body;
    if (![name, email, password, area, phone].every(value => typeof value === 'string')) {
      return res.status(400).json({ message: 'Please fill in all fields.' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!name.trim() || name.trim().length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254 || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72 || !areas.includes(area) || !/^[+\d][\d\s-]{6,19}$/.test(phone.trim())) {
      return res.status(400).json({ message: 'Enter a valid name, email, phone and area. Password must have at least 8 characters and at most 72 UTF-8 bytes.' });
    }
    const user = await User.create({ name: name.trim(), email: normalizedEmail, password: await bcrypt.hash(password, 10), area, phone: phone.trim() });
    sendSession(res, user, 201);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 72) return res.status(400).json({ message: 'Enter your email and password.' });
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Invalid email or password.' });
    sendSession(res, user);
  } catch (error) { next(error); }
};

exports.me = (req, res) => res.json({ user: publicUser(req.user) });
