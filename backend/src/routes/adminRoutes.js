const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/auth');

// Báo cáo doanh thu được nhân viên xem để giao ca/đối soát; các chức năng khác chỉ admin.
router.use(authenticate);
router.get('/revenue', authorize('admin', 'staff'), adminController.getRevenue);
router.get('/reviews', authorize('admin', 'staff'), adminController.getStoreReviews);
router.put('/reviews/:id/response', authorize('admin', 'staff'), adminController.respondToReview);
router.get('/customers', authorize('admin', 'staff'), (req, res, next) => {
  req.query.role = 'customer';
  return adminController.getUsers(req, res, next);
});
router.post('/customers', authorize('admin', 'staff'), (req, res, next) => {
  req.body.role = 'customer';
  return adminController.createUser(req, res, next);
});
router.put('/customers/:id', authorize('admin', 'staff'), adminController.updateCustomerForStaff);
router.use(authorize('admin'));

router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.get('/suppliers', adminController.getSuppliers);
router.post('/categories', adminController.categoryCrud.create);
router.put('/categories/:id', adminController.categoryCrud.update);
router.delete('/categories/:id', adminController.categoryCrud.remove);
router.post('/suppliers', adminController.supplierCrud.create);
router.put('/suppliers/:id', adminController.supplierCrud.update);
router.delete('/suppliers/:id', adminController.supplierCrud.remove);
router.get('/vouchers', adminController.getVouchers);
router.post('/vouchers', adminController.createVoucher);
router.put('/vouchers/:id', adminController.updateVoucher);
router.delete('/vouchers/:id', adminController.voucherCrud.remove);

module.exports = router;
