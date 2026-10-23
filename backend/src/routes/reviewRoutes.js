const express = require('express');
const multer = require('multer');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middlewares/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 4, fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^(image|video)\//.test(file.mimetype)) return cb(null, true);
    cb(new Error('Chỉ hỗ trợ ảnh hoặc video trong đánh giá.'));
  }
});

router.get('/:product_id', reviewController.getReviews);
router.post('/', authenticate, authorize('customer'), upload.array('media', 4), reviewController.createReview);

module.exports = router;
