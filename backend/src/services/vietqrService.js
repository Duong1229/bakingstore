/**
 * VietQR & SePay Service
 * Xử lý tạo mã QR thanh toán ngân hàng VietQR chuẩn NAPAS247
 * và xác thực/phân tích dữ liệu giao dịch từ SePay Webhook.
 */

/**
 * Tạo URL hình ảnh mã VietQR (VietQR.io)
 * @param {Object} params - { amount, orderCode, bankCode, accountNo, accountName }
 * @returns {string} URL ảnh QR VietQR
 */
exports.generateVietQRUrl = ({ amount, orderCode, bankCode, accountNo, accountName }) => {
  const bank = bankCode || process.env.BANK_CODE || 'MB';
  const acc = accountNo || process.env.BANK_ACCOUNT_NO || '0123456789';
  const name = encodeURIComponent(accountName || process.env.BANK_ACCOUNT_NAME || 'BAKING STORE');
  const amt = Math.round(Number(amount) || 0);
  const des = encodeURIComponent(orderCode || '');

  return `https://img.vietqr.io/image/${bank}-${acc}-compact2.png?amount=${amt}&addInfo=${des}&accountName=${name}`;
};

/**
 * Tạo URL ảnh QR SePay (dự phòng)
 * @param {Object} params - { amount, orderCode, bankCode, accountNo }
 * @returns {string} URL ảnh QR SePay
 */
exports.generateSepayQRUrl = ({ amount, orderCode, bankCode, accountNo }) => {
  const bank = bankCode || process.env.BANK_CODE || 'MB';
  const acc = accountNo || process.env.BANK_ACCOUNT_NO || '0123456789';
  const amt = Math.round(Number(amount) || 0);
  const des = encodeURIComponent(orderCode || '');

  return `https://qr.sepay.vn/img?bank=${bank}&acc=${acc}&template=compact&amount=${amt}&des=${des}`;
};

/**
 * Phân tích nội dung chuyển khoản ngân hàng để trích xuất mã đơn hàng
 * Chuẩn mã đơn hàng: BAKE + 4 chữ số (VD: BAKE1234)
 * @param {string} content - Nội dung giao dịch ngân hàng
 * @returns {string|null} Mã đơn hàng hoặc null
 */
exports.parseOrderCode = (content) => {
  if (!content) return null;
  const match = content.match(/BAKE\d{4}/i);
  return match ? match[0].toUpperCase() : null;
};

/**
 * Xác thực API Token SePay Webhook
 * @param {string} authHeader - Giá trị Authorization hoặc X-API-Token trong request header
 * @returns {boolean} True nếu hợp lệ
 */
exports.verifyWebhookToken = (authHeader) => {
  const configuredKey = process.env.SEPAY_API_KEY;
  // Nếu chưa cấu hình key trên môi trường dev thì cho qua
  if (!configuredKey || configuredKey === 'your_sepay_webhook_api_token') {
    return true;
  }
  const expectedBearer = `Apikey ${configuredKey}`;
  return authHeader === expectedBearer || authHeader === configuredKey;
};
