const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middlewares/auth');

// SePay webhook - không cần auth JWT (dùng API Token của SePay)
router.post('/sepay-webhook', paymentController.sePayWebhook);

// VietQR cho đơn hàng cụ thể
router.get('/vietqr/:order_id', authenticate, paymentController.getVietQR);

// Admin xem lịch sử thanh toán
router.get('/', authenticate, authorize('admin'), paymentController.getPayments);

module.exports = router;
