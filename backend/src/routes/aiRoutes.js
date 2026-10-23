const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Chat với AI được mở cho khách vãng lai; chỉ thanh toán mới yêu cầu đăng nhập.
router.post('/chat', aiController.chat);

// Gợi ý công thức/nguyên liệu cũng cho phép khách vãng lai.
router.post('/suggest-recipe', aiController.suggestRecipe);

module.exports = router;
