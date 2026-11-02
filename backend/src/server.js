require('dotenv').config();

const app = require('./app');
const { expireUnpaidVietQrOrders } = require('./controllers/orderController');
const { pollPendingSepayPayments, configured: sepayConfigured } = require('./services/sepayPollingService');

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

// Chế độ local không cần webhook: backend chủ động đối soát SePay mỗi 15 giây.
const pollSepay = () => pollPendingSepayPayments()
  .then(result => { if (result?.paid) console.log(`✅ SePay API: đã xác nhận ${result.paid} đơn thanh toán.`); })
  .catch(error => console.error('Không thể đối soát SePay API:', error.message));
if (sepayConfigured()) {
  pollSepay();
  setInterval(pollSepay, 15 * 1000);
} else {
  console.warn('ℹ️ SePay tự động đang chờ cấu hình SEPAY_API_TOKEN và SEPAY_ACCOUNT_NUMBER.');
}
