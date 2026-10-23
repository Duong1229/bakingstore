const express = require('express');
const controller = require('../controllers/bannerController');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();
router.get('/', controller.getPublic);
router.get('/admin', authenticate, authorize('admin'), controller.getAdmin);
router.post('/admin', authenticate, authorize('admin'), controller.create);
router.put('/admin/:id', authenticate, authorize('admin'), controller.update);
router.delete('/admin/:id', authenticate, authorize('admin'), controller.remove);

module.exports = router;
