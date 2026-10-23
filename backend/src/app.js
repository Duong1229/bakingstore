const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Healthcheck Route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: '🍰 Baking Store AI Backend API is running smoothly!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/banners', require('./routes/bannerRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/support-chat', require('./routes/supportChatRoutes'));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: `Route ${req.method} ${req.originalUrl} không tồn tại.` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack || err);
  const unavailable = /fetch failed|ENOTFOUND|network/i.test(String(err.message || err));
  res.status(err.status || (unavailable ? 503 : 500)).json({
    status: 'error',
    message: unavailable ? 'Dữ liệu cửa hàng đang tạm thời mất kết nối. Vui lòng thử lại sau.' : (err.message || 'Đã xảy ra lỗi máy chủ nội bộ')
  });
});

module.exports = app;
