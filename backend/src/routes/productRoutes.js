const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middlewares/auth');

// Public routes
router.get('/', productController.getProducts);
router.get('/categories', productController.getCategories);
router.post('/validate-cart', productController.validateCart);
router.get('/sku/:sku', productController.getProductBySku);
router.get('/barcode/:barcode', productController.getProductByBarcode);
router.get('/admin-list', authenticate, authorize('admin'), productController.getProducts);
router.get('/:id/price-history', authenticate, authorize('admin'), productController.getPriceHistory);
router.get('/:slug', productController.getProductBySlug);

// Admin only routes
router.post('/', authenticate, authorize('admin'), productController.createProduct);
router.put('/:id', authenticate, authorize('admin'), productController.updateProduct);
router.delete('/:id', authenticate, authorize('admin'), productController.deleteProduct);

module.exports = router;
