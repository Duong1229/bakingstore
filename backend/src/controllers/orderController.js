const supabase = require('../config/supabase');
const fefoService = require('../services/fefoService');
const vietqrService = require('../services/vietqrService');
const billService = require('../services/billService');

// Tạo mã đơn hàng ngẫu nhiên dạng BAKE + 4 chữ số ngẫu nhiên (dùng làm nội dung chuyển khoản SePay)
const generateOrderCode = () => `BAKE${Math.floor(1000 + Math.random() * 9000)}`;

// VietQR is a reservation, not a completed sale. Release its inventory after 24h.
const expireUnpaidVietQrOrders = async (customerId = null) => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  let query = supabase.from('orders').select('id').eq('payment_method', 'vietqr').eq('payment_status', 'unpaid').eq('order_status', 'pending').lt('created_at', cutoff);
  if (customerId) query = query.eq('customer_id', customerId);
  const { data: expired, error } = await query;
  if (error) throw error;
  for (const order of expired || []) {
    const { data: items } = await supabase.from('order_items').select('order_batch_allocations(batch_id, allocated_quantity)').eq('order_id', order.id);
    // Hoàn lại đúng số lượng đã giữ ở từng lô. Tên hàm dịch vụ là restoreStock.
    const allocations = (items || []).flatMap(item => item.order_batch_allocations || [])
      .map(allocation => ({ ...allocation, allocated_qty: allocation.allocated_quantity }));
    await fefoService.restoreStock(allocations);
    await supabase.from('orders').update({ order_status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', order.id);
  }
};
exports.expireUnpaidVietQrOrders = expireUnpaidVietQrOrders;

// Tính phí vận chuyển theo chính sách Tiệm Ốc:
// - Khách tại Hà Nội:
//   + Đơn < 300.000đ: 15.000đ
//   + Đơn 300.000đ - 500.000đ: 10.000đ
//   + Đơn > 500.000đ: Miễn phí vận chuyển (0đ)
// - Khách Tỉnh khác:
//   + Đơn <= 500.000đ: 30.000đ
//   + Đơn > 500.000đ: Miễn phí vận chuyển (0đ)
// - Đơn mua tại quầy POS: 0đ
const calculateShippingFee = (subtotal, province = 'Hà Nội', order_type = 'online') => {
  if (order_type === 'pos') return 0;
  const isHanoi = !province || province.toLowerCase().includes('hà nội') || province.toLowerCase().includes('hanoi');
  if (isHanoi) {
    if (subtotal < 300000) return 15000;
    if (subtotal <= 500000) return 10000;
    return 0;
  } else {
    if (subtotal <= 500000) return 30000;
    return 0;
  }
};

const restoreOrderInventory = async (orderId) => {
  const { data: items, error } = await supabase.from('order_items')
    .select('order_batch_allocations(batch_id, allocated_quantity)').eq('order_id', orderId);
  if (error) throw error;
  const allocations = (items || []).flatMap(item => item.order_batch_allocations || [])
    .map(allocation => ({ ...allocation, allocated_qty: allocation.allocated_quantity }));
  await fefoService.restoreStock(allocations);
};

const getUsableVoucher = async (code, subtotal) => {
  const now = new Date().toISOString();
  const { data: voucher, error } = await supabase
    .from('vouchers')
    .select('*')
    .eq('code', String(code || '').trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  if (!voucher || !voucher.is_active || new Date(voucher.start_date) > new Date(now) || new Date(voucher.end_date) < new Date(now)) {
    return { error: 'Mã giảm giá không hợp lệ hoặc đã hết hạn.' };
  }
  if (Number(voucher.used_count || 0) >= Number(voucher.usage_limit || 0)) return { error: 'Mã giảm giá đã hết lượt sử dụng.' };
  if (Number(subtotal || 0) < Number(voucher.min_order_amount || 0)) {
    return { error: `Đơn hàng tối thiểu ${Number(voucher.min_order_amount || 0).toLocaleString('vi-VN')}đ để dùng mã này.` };
  }
  let discountAmount = voucher.discount_type === 'percentage'
    ? Number(subtotal) * Number(voucher.discount_value) / 100
    : Number(voucher.discount_value || 0);
  if (voucher.max_discount_amount) discountAmount = Math.min(discountAmount, Number(voucher.max_discount_amount));
  return { voucher, discountAmount: Math.max(0, discountAmount) };
};

// [POST] /api/orders/validate-voucher - kiểm tra mã ngay khi khách bấm áp dụng
exports.validateVoucher = async (req, res, next) => {
  try {
    const result = await getUsableVoucher(req.body?.code, Number(req.body?.subtotal || 0));
    if (result.error) return res.status(400).json({ status: 'error', message: result.error });
    const { voucher, discountAmount } = result;
    res.json({ status: 'success', voucher: { code: voucher.code, discount_type: voucher.discount_type, discount_value: voucher.discount_value, max_discount_amount: voucher.max_discount_amount }, discount_amount: discountAmount });
  } catch (err) { next(err); }
};

// POS tra cứu nhanh khách để gắn thông tin lên hóa đơn.
exports.searchPosCustomers = async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query) return res.json({ status: 'success', customers: [] });
    const { data, error } = await supabase.from('users').select('id, full_name, phone, email')
      .eq('role', 'customer').or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`).limit(8);
    if (error) throw error;
    res.json({ status: 'success', customers: data || [] });
  } catch (err) { next(err); }
};

exports.createPosCustomer = async (req, res, next) => {
  try {
    const full_name = String(req.body.full_name || '').trim();
    const phone = String(req.body.phone || '').trim();
    if (!full_name || !/^0\d{9}$/.test(phone)) return res.status(400).json({ status: 'error', message: 'Cần họ tên và số điện thoại gồm 10 chữ số, bắt đầu bằng 0.' });
    const { data: existing } = await supabase.from('users').select('id, full_name, phone, email').eq('phone', phone).eq('role', 'customer').maybeSingle();
    if (existing) return res.json({ status: 'success', customer: existing });
    const email = `pos-${phone}-${Date.now()}@guest.tiemoc.local`;
    const { data, error } = await supabase.from('users').insert({ full_name, phone, email, role: 'customer', auth_provider: 'pos', is_active: true }).select('id, full_name, phone, email').single();
    if (error) throw error;
    res.status(201).json({ status: 'success', customer: data });
  } catch (err) { next(err); }
};

// [POST] /api/orders - Tạo đơn hàng mới (Online / POS)
exports.createOrder = async (req, res, next) => {
  try {
    let {
      order_type = 'online',
      items, // [{ product_id, quantity, unit_price }]
      voucher_code,
      recipient_name,
      recipient_phone,
      shipping_address,
      shipping_province = 'Hà Nội',
      shipping_fee,
      payment_method = 'vietqr',
      notes,
      staff_id
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Đơn hàng phải có ít nhất 1 sản phẩm.' });
    }
    if (order_type === 'online' && !/^0\d{9}$/.test(String(recipient_phone || ''))) {
      return res.status(400).json({ status: 'error', message: 'Số điện thoại người nhận phải gồm đúng 10 chữ số và bắt đầu bằng số 0.' });
    }

    // Kiểm tra toàn bộ kho trước khi tạo đơn, để không tạo đơn dở dang rồi mới báo hết hàng.
    const productIds = [...new Set(items.map(item => item.product_id).filter(Boolean))];
    const { data: orderProducts, error: productError } = await supabase
      .from('products').select('id, name, price, is_active').in('id', productIds);
    if (productError) throw productError;
    const productMap = new Map((orderProducts || []).map(product => [product.id, product]));
    const stockIssues = [];
    const normalizedItems = [];
    for (const item of items) {
      const quantity = Number(item.quantity);
      const product = productMap.get(item.product_id);
      if (!product || !product.is_active || !Number.isInteger(quantity) || quantity <= 0) {
        stockIssues.push(item.product_id);
        continue;
      }
      const available = await fefoService.getAvailableStock(item.product_id);
      if (available < quantity) stockIssues.push(`${product.name} (còn ${available})`);
      normalizedItems.push({ product_id: product.id, quantity, unit_price: Number(product.price) });
    }
    if (stockIssues.length) return res.status(409).json({ status: 'error', message: `Tồn kho không đủ hoặc sản phẩm không còn bán: ${stockIssues.join(', ')}. Giỏ hàng đã được cập nhật, vui lòng kiểm tra lại.` });
    items = normalizedItems;

    // Tính tổng tiền hàng
    let total_amount = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    let discount_amount = 0;
    let voucher_id = null;

    // Áp dụng voucher nếu có
    if (voucher_code) {
      const voucherResult = await getUsableVoucher(voucher_code, total_amount);
      if (voucherResult.error) return res.status(400).json({ status: 'error', message: voucherResult.error });
      discount_amount = voucherResult.discountAmount;
      voucher_id = voucherResult.voucher.id;
    }

    // Xác định phí vận chuyển: nếu client không truyền hoặc truyền null thì tự động tính theo quy định Tiệm Ốc
    const finalShippingFee = (shipping_fee !== undefined && shipping_fee !== null)
      ? Number(shipping_fee)
      : calculateShippingFee(total_amount, shipping_province, order_type);

    const final_amount = total_amount - discount_amount + finalShippingFee;
    const order_code = generateOrderCode();
    const customer_id = req.user?.role === 'customer' ? req.user.id : (order_type === 'pos' ? req.body.customer_id || null : null);

    // Tạo đơn hàng
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_code,
        customer_id,
        staff_id: staff_id || (req.user?.role === 'staff' || req.user?.role === 'admin' ? req.user.id : null),
        order_type,
        recipient_name,
        recipient_phone,
        shipping_address,
        shipping_fee: finalShippingFee,
        total_amount,
        discount_amount,
        final_amount,
        voucher_id,
        payment_method,
        notes,
        payment_status: order_type === 'pos' && payment_method === 'cash' ? 'paid' : 'unpaid',
        order_status: 'pending'
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Tạo order_items và phân bổ FEFO
    for (const item of items) {
      const subtotal = item.unit_price * item.quantity;
      const { data: orderItem, error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // Phân bổ tồn kho theo thuật toán FEFO từ fefoService
      const allocations = await fefoService.allocateFEFO(item.product_id, item.quantity);
      for (const alloc of allocations) {
        await supabase.from('order_batch_allocations').insert({
          order_item_id: orderItem.id,
          batch_id: alloc.batch_id,
          allocated_quantity: alloc.allocated_qty
        });
      }
    }

    // Tăng used_count của voucher nếu có dùng
    if (voucher_id) {
      await supabase.from('vouchers').update({ used_count: supabase.raw('used_count + 1') }).eq('id', voucher_id);
    }

    // Tạo mã QR VietQR nếu thanh toán chuyển khoản bằng vietqrService
    let qr_code_url = null;
    if (payment_method === 'vietqr') {
      qr_code_url = vietqrService.generateVietQRUrl({
        amount: final_amount,
        orderCode: order_code
      });
    }

    res.status(201).json({
      status: 'success',
      message: 'Đặt hàng thành công!',
      order: { ...order, qr_code_url }
    });
  } catch (err) {
    next(err);
  }
};

// [GET] /api/orders/my - Lấy danh sách đơn hàng của khách hàng đang đăng nhập
exports.getMyOrders = async (req, res, next) => {
  try {
    await expireUnpaidVietQrOrders(req.user.id);
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { data, error, count } = await supabase
      .from('orders')
      .select(`
        id, order_code, order_type, order_status, payment_status, payment_method,
        total_amount, discount_amount, final_amount, shipping_fee, created_at,
        order_items(quantity, unit_price, products(name, image_url, sku))
      `, { count: 'exact' })
      .eq('customer_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;
    res.json({ status: 'success', total: count, page: parseInt(page), orders: data });
  } catch (err) {
    next(err);
  }
};

// [GET] /api/orders/:id - Chi tiết đơn hàng
exports.getOrderDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    await expireUnpaidVietQrOrders(req.user.role === 'customer' ? req.user.id : null);
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          id, quantity, unit_price, subtotal,
          products(id, name, sku, image_url, unit),
          order_batch_allocations(allocated_quantity, inventory_batches(batch_code, expiry_date))
        )
      `)
      .eq('id', id)
      .single();

    // PGRST116 là lỗi "không có bản ghi". Những lỗi quan hệ/schema khác phải
    // được trả đúng lỗi thay vì che thành "Không tìm thấy đơn hàng".
    if (error?.code === 'PGRST116' || !order) {
      return res.status(404).json({ status: 'error', message: 'Không tìm thấy đơn hàng.' });
    }
    if (error) throw error;

    if (req.user.role === 'customer' && order.customer_id !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Bạn không có quyền xem đơn hàng này.' });
    }

    // Trả lại các đánh giá của chính khách trong đơn này để giao diện có thể
    // hiển thị trạng thái "đã đánh giá" ngay cả khi khách tải lại trang.
    let myReviews = [];
    if (req.user.role === 'customer') {
      let { data, error: reviewsError } = await supabase
        .from('reviews')
        .select('id, product_id, rating, comment, media_urls, revision_count, created_at')
        .eq('order_id', order.id)
        .eq('user_id', req.user.id);
      // Máy chủ chưa áp dụng migration mới vẫn cho xem đơn cũ; chỉ chưa thể
      // khóa chính xác quyền cập nhật lần hai cho tới khi migration được chạy.
      if (reviewsError?.code === '42703' && /revision_count/i.test(reviewsError.message || '')) {
        ({ data, error: reviewsError } = await supabase
          .from('reviews')
          .select('id, product_id, rating, comment, media_urls, created_at')
          .eq('order_id', order.id)
          .eq('user_id', req.user.id));
      }
      if (reviewsError) throw reviewsError;
      // Chỉ trả về đánh giá mới nhất của mỗi sản phẩm trong đơn. Điều này cũng
      // che an toàn các bản ghi trùng còn sót từ phiên bản cũ.
      myReviews = Object.values((data || []).reduce((latest, review) => {
        const previous = latest[review.product_id];
        if (!previous || new Date(review.created_at) > new Date(previous.created_at)) latest[review.product_id] = review;
        return latest;
      }, {}));
    }

    // Nếu là thanh toán VietQR và chưa trả tiền, gắn kèm link QR
    let qr_code_url = null;
    if (order.payment_method === 'vietqr' && order.payment_status !== 'paid') {
      qr_code_url = vietqrService.generateVietQRUrl({
        amount: order.final_amount,
        orderCode: order.order_code
      });
    }

    res.json({ status: 'success', order: { ...order, qr_code_url, my_reviews: myReviews } });
  } catch (err) {
    next(err);
  }
};

// Khách tự hủy trước đóng gói; khi đang đóng gói chỉ gửi yêu cầu để tiệm chấp nhận.
exports.cancelMyOrder = async (req, res, next) => {
  try {
    const { data: order, error } = await supabase.from('orders').select('id, order_status')
      .eq('id', req.params.id).eq('customer_id', req.user.id).single();
    if (error?.code === 'PGRST116' || !order) return res.status(404).json({ status: 'error', message: 'Không tìm thấy đơn hàng.' });
    if (error) throw error;
    if (['shipping', 'completed', 'cancelled', 'cancellation_requested'].includes(order.order_status)) {
      return res.status(409).json({ status: 'error', message: 'Đơn hàng ở trạng thái hiện tại không thể hủy.' });
    }
    if (order.order_status === 'picking') {
      const { data, error: updateError } = await supabase.from('orders')
        .update({ order_status: 'cancellation_requested', updated_at: new Date().toISOString() }).eq('id', order.id).select().single();
      if (updateError) throw updateError;
      return res.json({ status: 'success', message: 'Yêu cầu hủy đơn đã được gửi. Tiệm sẽ xác nhận sớm nhất có thể.', order: data });
    }
    await restoreOrderInventory(order.id);
    const { data, error: updateError } = await supabase.from('orders')
      .update({ order_status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', order.id).select().single();
    if (updateError) throw updateError;
    res.json({ status: 'success', message: 'Đơn hàng đã được hủy và số lượng đã hoàn về kho.', order: data });
  } catch (err) { next(err); }
};

// [GET] /api/orders/:id/receipt - In hóa đơn nhiệt K80 (POS / Online)
exports.getReceipt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          quantity, unit_price, subtotal,
          products(name, unit, sku)
        ),
        staff:users!staff_id(full_name)
      `)
      .eq('id', id)
      .single();

    if (error || !order) {
      return res.status(404).json({ status: 'error', message: 'Không tìm thấy đơn hàng để in bill.' });
    }

    const html = billService.generateK80ReceiptHtml(order);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    next(err);
  }
};

// [GET] /api/orders/:id/picking-slip - In phiếu nhặt hàng kho FEFO (Nhân viên kho)
exports.getPickingSlip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          quantity,
          products(name, sku, unit),
          order_batch_allocations(
            allocated_quantity,
            inventory_batches(batch_code, expiry_date)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !order) {
      return res.status(404).json({ status: 'error', message: 'Không tìm thấy đơn hàng.' });
    }

    const html = billService.generatePickingSlipHtml(order);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    next(err);
  }
};

// [GET] /api/admin/orders - Admin/Staff xem tất cả đơn hàng
exports.getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, order_type, payment_status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = supabase
      .from('orders')
      .select(`
        id, order_code, order_type, order_status, payment_status, payment_method,
        total_amount, final_amount, recipient_name, recipient_phone, created_at,
        users!customer_id(full_name, email, phone)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (status) query = query.eq('order_status', status);
    if (order_type) query = query.eq('order_type', order_type);
    if (payment_status) query = query.eq('payment_status', payment_status);

    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ status: 'success', total: count, page: parseInt(page), orders: data });
  } catch (err) {
    next(err);
  }
};

// [PUT] /api/admin/orders/:id/status - Cập nhật trạng thái đơn hàng (Admin/Staff)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { order_status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'picking', 'shipping', 'completed', 'cancelled', 'cancellation_requested'];
    if (!validStatuses.includes(order_status)) {
      return res.status(400).json({ status: 'error', message: 'Trạng thái không hợp lệ.' });
    }

    const { data: existingOrder, error: existingError } = await supabase.from('orders').select('order_status').eq('id', id).single();
    if (existingError) throw existingError;
    if (order_status === 'cancelled' && existingOrder.order_status !== 'cancelled') await restoreOrderInventory(id);

    const { data, error } = await supabase
      .from('orders')
      .update({ order_status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ status: 'success', message: 'Đã cập nhật trạng thái đơn hàng!', order: data });
  } catch (err) {
    next(err);
  }
};
