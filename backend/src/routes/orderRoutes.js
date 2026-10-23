const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, authorize } = require('../middlewares/auth');

// Tạo đơn hàng (khách đăng nhập hoặc POS staff)
router.post('/', authenticate, orderController.createOrder);
router.post('/validate-voucher', orderController.validateVoucher);
router.get('/pos/customers', authenticate, authorize('admin', 'staff'), orderController.searchPosCustomers);
router.post('/pos/customers', authenticate, authorize('admin', 'staff'), orderController.createPosCustomer);

// Khách hàng xem đơn của mình
router.get('/my', authenticate, authorize('customer'), orderController.getMyOrders);

// In hóa đơn nhiệt K80 và in phiếu soạn hàng kho FEFO
router.get('/:id/receipt', authenticate, authorize('admin', 'staff'), orderController.getReceipt);
router.get('/:id/picking-slip', authenticate, authorize('admin', 'staff'), orderController.getPickingSlip);
router.put('/:id/cancel', authenticate, authorize('customer'), orderController.cancelMyOrder);

// Chi tiết đơn hàng
router.get('/:id', authenticate, orderController.getOrderDetail);

// Admin / Staff quản lý đơn hàng
router.get('/', authenticate, authorize('admin', 'staff'), orderController.getAllOrders);
router.put('/:id/status', authenticate, authorize('admin', 'staff'), orderController.updateOrderStatus);

module.exports = router;
