const express = require('express');
const router = express.Router();
const controller = require('../controllers/supportChatController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);
router.get('/my', authorize('customer'), controller.getMyMessages);
router.post('/my', authorize('customer'), controller.sendMyMessage);
router.get('/conversations', authorize('admin'), controller.getConversations);
router.post('/conversations/:customerId', authorize('admin'), controller.replyToCustomer);

module.exports = router;
