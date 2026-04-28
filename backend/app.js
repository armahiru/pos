const express = require('express');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { connectDB } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// Gzip compression
app.use(compression());

// CORS — restrict to app origin in production
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting on auth routes — 20 attempts per 15 min
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }));
// General API rate limit — 300 requests per 15 min
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
// Image upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only images allowed'), false);
}});

// JSON body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware — stored in MongoDB so sessions survive restarts
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      touchAfter: 24 * 3600 // lazy session update
    }),
    cookie: {
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    }
  })
);

// Static file serving — serves the frontend folder
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Image upload endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: { message: 'No file uploaded' } });
  res.json({ success: true, data: { imageUrl: `/uploads/${req.file.filename}` } });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'YGLC Shop API is running' });
});

// MoMo config for QR code
app.get('/api/config/momo', (req, res) => {
  res.json({
    success: true,
    data: {
      momoNumber: process.env.MOMO_NUMBER || '',
      momoName: process.env.MOMO_NAME || 'Store'
    }
  });
});

// Verify admin PIN for protected operations
app.post('/api/verify-pin', (req, res) => {
  const { pin } = req.body;
  const adminPin = process.env.ADMIN_PIN || '1234';
  if (pin === adminPin) {
    res.json({ success: true });
  } else {
    res.status(403).json({ success: false, error: { code: 'INVALID_PIN', message: 'Incorrect admin PIN' } });
  }
});

// Module routes
app.use(require('./modules/auth/authRoutes'));
app.use(require('./modules/dashboard/dashboardRoutes'));
app.use(require('./modules/product/productRoutes'));
app.use(require('./modules/inventory/inventoryRoutes'));
app.use(require('./modules/sales/salesRoutes'));
app.use(require('./modules/payment/paymentRoutes'));
app.use(require('./modules/customer/customerRoutes'));
app.use(require('./modules/receipt/receiptRoutes'));
app.use(require('./modules/report/reportRoutes'));
app.use(require('./modules/backup/backupRoutes'));

// Global error-handling middleware (must be registered last)
app.use(errorHandler);

// Start server only when run directly
if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`POS System server running on port ${PORT}`);
    });
  });
}

module.exports = app;
