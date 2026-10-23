const supabase = require('../config/supabase');
const vietqrService = require('../services/vietqrService');

// [POST] /api/payments/sepay-webhook - Nhận Webhook từ SePay khi có tiền chuyển vào
exports.sePayWebhook = async (req, res, next) => {
  try {
    // Xác thực API Token SePay
    const apiToken = req.headers['authorization'] || req.headers['x-api-token'] || '';
    if (!vietqrService.verifyWebhookToken(apiToken)) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized webhook request.' });
    }

    const payload = req.body;
    const { content, transferAmount, referenceCode, transactionDate, accountNumber } = payload;

    if (!content || !transferAmount) {
      return res.status(400).json({ status: 'error', message: 'Thiếu dữ liệu webhook.' });
    }

    // Tìm mã đơn hàng BAKE#### trong nội dung chuyển khoản bằng Service
    const orderCode = vietqrService.parseOrderCode(content);
    if (!orderCode) {
      // Không tìm thấy mã đơn hàng - giao dịch không liên quan
      return res.json({ status: 'success', message: 'Giao dịch không liên quan đến đơn hàng nào.' });
    }

    // Tìm đơn hàng trong DB
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, order_code, final_amount, payment_status')
      .eq('order_code', orderCode)
      .single();

    if (orderErr || !order) {
      return res.json({ status: 'success', message: `Không tìm thấy đơn hàng: ${orderCode}` });
    }
    if (order.payment_status === 'paid') {
      return res.json({ status: 'success', message: `Đơn ${orderCode} đã được ghi nhận thanh toán trước đó.` });
    }

    // Lưu bản ghi thanh toán
    await supabase.from('payments').insert({
      order_id: order.id,
      gateway: 'sepay',
      transaction_code: referenceCode,
      bank_account_number: accountNumber,
      amount: transferAmount,
      payment_time: transactionDate ? new Date(transactionDate).toISOString() : new Date().toISOString(),
      raw_payload: payload
    });

    // Kiểm tra số tiền có khớp không (cho phép sai lệch 1000đ)
    if (Math.abs(transferAmount - order.final_amount) <= 1000) {
      // Cập nhật đơn hàng thành đã thanh toán
      await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          order_status: 'confirmed',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      console.log(`✅ SePay Webhook: Đơn ${orderCode} đã thanh toán ${transferAmount.toLocaleString('vi-VN')}đ`);
      return res.json({ status: 'success', message: `Xác nhận thanh toán đơn hàng ${orderCode} thành công!` });
    } else {
      console.log(`⚠️ SePay Webhook: Đơn ${orderCode} - Số tiền không khớp (Yêu cầu: ${order.final_amount}, Nhận: ${transferAmount})`);
      return res.json({ status: 'success', message: 'Đã ghi nhận giao dịch nhưng số tiền chưa khớp.' });
    }
  } catch (err) {
    // Luôn trả về 200 OK cho webhook để tránh SePay gửi lại
    console.error('SePay Webhook Error:', err);
    res.json({ status: 'error', message: err.message });
  }
};

// [GET] /api/payments/vietqr/:order_id - Tạo lại link QR VietQR cho đơn hàng
exports.getVietQR = async (req, res, next) => {
  try {
    const { order_id } = req.params;
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, order_code, final_amount, payment_status, payment_method')
      .eq('id', order_id)
      .single();

    if (error || !order) {
      return res.status(404).json({ status: 'error', message: 'Không tìm thấy đơn hàng.' });
    }
    if (order.payment_status === 'paid') {
      return res.status(400).json({ status: 'error', message: 'Đơn hàng này đã được thanh toán rồi.' });
    }

    const bankCode = process.env.BANK_CODE || 'MB';
    const accountNo = process.env.BANK_ACCOUNT_NO || '0123456789';
    const qrImageUrl = vietqrService.generateVietQRUrl({
      amount: order.final_amount,
      orderCode: order.order_code,
      bankCode,
      accountNo
    });
    const qrLinkUrl = vietqrService.generateSepayQRUrl({
      amount: order.final_amount,
      orderCode: order.order_code,
      bankCode,
      accountNo
    });

    res.json({
      status: 'success',
      order_code: order.order_code,
      amount: order.final_amount,
      bank_code: bankCode,
      account_no: accountNo,
      qr_image_url: qrImageUrl,
      qr_link_url: qrLinkUrl
    });
  } catch (err) {
    next(err);
  }
};

// [GET] /api/admin/payments - Danh sách giao dịch thanh toán (Admin)
exports.getPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { data, error, count } = await supabase
      .from('payments')
      .select(`*, orders(order_code, final_amount, order_status)`, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);
    if (error) throw error;
    res.json({ status: 'success', total: count, payments: data });
  } catch (err) {
    next(err);
  }
};
