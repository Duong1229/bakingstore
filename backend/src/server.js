const app = require('./app');
const { expireUnpaidVietQrOrders } = require('./controllers/orderController');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Baking Store Backend đang chạy tại http://localhost:${PORT}`);
  console.log(`📡 Healthcheck API: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});

// Check periodically so unpaid VietQR reservations are cancelled after 24 hours
// even when the customer does not revisit the order page.
setInterval(() => {
  expireUnpaidVietQrOrders().catch(error => console.error('Không thể tự hủy đơn VietQR quá hạn:', error.message));
}, 15 * 60 * 1000);
expireUnpaidVietQrOrders().catch(error => console.error('Không thể kiểm tra đơn VietQR quá hạn:', error.message));
