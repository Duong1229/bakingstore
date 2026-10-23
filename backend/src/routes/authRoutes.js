const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.get('/google-config', authController.getGoogleConfig);
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, authController.updateMe);
router.put('/me/password', authenticate, authController.changePassword);
router.delete('/me', authenticate, authController.deleteMe);

module.exports = router;
