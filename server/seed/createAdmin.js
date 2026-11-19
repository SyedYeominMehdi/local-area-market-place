require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function main() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL) || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8 || Buffer.byteLength(ADMIN_PASSWORD, 'utf8') > 72) throw new Error('Set ADMIN_EMAIL and a password of at least 8 characters (max 72 bytes) in this terminal.');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/local_area_marketplace');
  await User.init();
  const email = ADMIN_EMAIL.trim().toLowerCase();
  if (await User.exists({ email })) throw new Error('An account with that email already exists. Choose another email.');
  await User.create({ name: 'Administrator', email, password: await bcrypt.hash(ADMIN_PASSWORD, 10), area: require('../config/areas')[0], phone: '0000000000', role: 'admin' });
  console.log('Admin account created.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
