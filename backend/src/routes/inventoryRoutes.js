const express = require('express');
const multer = require('multer');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middlewares/auth');

// Upload file Excel vào bộ nhớ tạm (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file Excel (.xlsx, .xls)'), false);
    }
  }
});

// Staff & Admin: xem kho, vị trí kho
router.get('/batches', authenticate, authorize('admin', 'staff'), inventoryController.getBatches);
router.get('/stock', authenticate, authorize('admin', 'staff'), inventoryController.getStockSummary);
router.get('/locations', authenticate, authorize('admin', 'staff'), inventoryController.getLocations);

// Admin only: tải template, nhập kho và quản lý vị trí
router.get('/download-template', authenticate, authorize('admin', 'staff'), inventoryController.downloadTemplate);
router.post('/batches', authenticate, authorize('admin'), inventoryController.addBatch);
router.put('/batches/:id', authenticate, authorize('admin'), inventoryController.updateBatch);
router.delete('/batches/:id', authenticate, authorize('admin'), inventoryController.deleteBatch);
router.put('/batches/:id/status', authenticate, authorize('admin'), inventoryController.updateBatchStatus);
router.post('/batches/:id/dispose', authenticate, authorize('admin'), inventoryController.disposeExpiredBatch);
router.post('/disposals/export', authenticate, authorize('admin'), inventoryController.exportExpiredDisposals);
router.post('/import-excel', authenticate, authorize('admin'), upload.single('file'), inventoryController.importExcel);
router.put('/locations/:id', authenticate, authorize('admin'), inventoryController.updateLocation);

module.exports = router;
