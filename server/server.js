require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDatabase = require('./config/db');
const authRoutes = require('./routes/auth');
const User = require('./models/User');
const areas = require('./config/areas');
const listings = require('./routes/listings');
const meetings = require('./routes/meetings');
const admin = require('./routes/admin');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/local_area_marketplace';
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());
app.use('/uploads', (req, res, next) => { res.set('X-Content-Type-Options', 'nosniff'); next(); }, express.static(path.join(__dirname, 'uploads'), { index: false }));
app.get('/api/areas', (req, res) => res.json({ areas }));
app.get('/api/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'unavailable', database: connected ? 'connected' : 'disconnected' });
});
app.use('/api/auth', authRoutes);
app.use('/api/listings', listings);
app.use('/api/meetings', meetings);
app.use('/api/admin', admin);
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON.' });
  if (err.name === 'MulterError') return res.status(400).json({ message: 'Invalid upload. Choose one image up to 5 MB.' });
  console.error('Request failed:', err.message);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('Set JWT_SECRET to a unique secret of at least 32 characters in server/.env.');
    process.exitCode = 1;
    return;
  }
  try {
    await connectDatabase(mongoUri);
    await User.init();
    app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
  } catch (error) {
    console.error('Could not start server: MongoDB connection failed.', error.message);
    process.exitCode = 1;
  }
}
start();
