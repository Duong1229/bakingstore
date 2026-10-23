const jwt = require('jsonwebtoken');
require('dotenv').config();

// Xác thực JWT Token
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
};

// Phân quyền RBAC - Kiểm tra vai trò
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Bạn không có quyền thực hiện hành động này. Yêu cầu quyền: ${roles.join(', ')}.`
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
