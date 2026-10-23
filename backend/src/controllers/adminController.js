const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');
const path = require('path');
const offlineCatalog = require('../data/offlineCatalog');

const keepLatestReviewPerCustomerProduct = (reviews = []) => {
  const latest = new Map();
  for (const review of reviews) {
    const key = `${review.user_id || review.id}:${review.product_id || review.id}`;
    const previous = latest.get(key);
    if (!previous || new Date(review.created_at) > new Date(previous.created_at)) latest.set(key, review);
  }
  return [...latest.values()];
};

// [GET] /api/admin/reviews - Cả quản trị viên và nhân viên cùng theo dõi, phản hồi đánh giá.
exports.getStoreReviews = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('id, product_id, user_id, rating, comment, response_comment, response_by, responded_at, created_at, products(name, sku)')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const currentReviews = keepLatestReviewPerCustomerProduct(data || []);
    const reviewerIds = [...new Set(currentReviews.map(review => review.user_id).filter(Boolean))];
    const responderIds = [...new Set(currentReviews.map(review => review.response_by).filter(Boolean))];
    const userIds = [...new Set([...reviewerIds, ...responderIds])];
    let usersById = {};
    if (userIds.length) {
      const { data: users, error: usersError } = await supabase
        .from('users').select('id, full_name').in('id', userIds);
      if (usersError) throw usersError;
      usersById = Object.fromEntries((users || []).map(user => [user.id, user.full_name]));
    }

    res.json({
      status: 'success',
      reviews: currentReviews.map(review => ({
        ...review,
        customer_name: usersById[review.user_id] || 'Khách hàng',
        responder_name: usersById[review.response_by] || null,
      })),
    });
  } catch (err) { next(err); }
};

// [PUT] /api/admin/reviews/:id/response - Ghi hoặc chỉnh sửa phản hồi của cửa hàng.
exports.respondToReview = async (req, res, next) => {
  try {
    const responseComment = String(req.body.response_comment || '').trim();
    if (!responseComment) return res.status(400).json({ status: 'error', message: 'Vui lòng nhập nội dung phản hồi.' });
    if (responseComment.length > 2000) return res.status(400).json({ status: 'error', message: 'Phản hồi tối đa 2.000 ký tự.' });

    const { data, error } = await supabase.from('reviews')
      .update({ response_comment: responseComment, response_by: req.user.id, responded_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('id, response_comment, response_by, responded_at')
      .single();
    if (error) throw error;
    res.json({ status: 'success', message: 'Đã lưu phản hồi cho khách hàng.', review: data });
  } catch (err) { next(err); }
};

// [GET] /api/admin/dashboard - Thống kê tổng quan Dashboard (Admin)
exports.getDashboard = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const expiringDate = new Date();
    expiringDate.setDate(expiringDate.getDate() + 30);

    // Song song lấy các số liệu thống kê
    const [
      revenueResult,
      ordersTodayResult,
      productsResult,
      expiringBatchesResult,
      topProductsResult,
      recentOrdersResult,
    ] = await Promise.all([
      // Hiển thị ngay doanh thu dự kiến của mọi đơn chưa hủy.
      supabase.from('orders')
        .select('final_amount')
        .neq('order_status', 'cancelled')
        .gte('created_at', firstDayOfMonth),

      // Đơn hàng hôm nay
      supabase.from('orders')
        .select('id, order_status, final_amount, payment_status')
        .gte('created_at', `${today}T00:00:00`),

      // Tổng sản phẩm đang bán
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),

      // Lô hàng sắp hết hạn trong 30 ngày
      supabase.from('inventory_batches')
        .select('batch_code, expiry_date, current_quantity, products(name, sku)')
        .eq('status', 'active')
        .gte('expiry_date', today)
        .lte('expiry_date', expiringDate.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true })
        .limit(10),

      // Top 5 sản phẩm bán chạy tháng này
      supabase.from('order_items')
        .select('product_id, quantity, products(name, sku, image_url)')
        .gte('created_at', firstDayOfMonth),

      // 10 đơn hàng mới nhất
      supabase.from('orders')
        .select('id, order_code, order_type, order_status, payment_status, final_amount, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const results = [revenueResult, ordersTodayResult, productsResult, expiringBatchesResult, topProductsResult, recentOrdersResult];
    const failedResult = results.find((result) => result.error);
    if (failedResult) throw failedResult.error;

    const revenueData = revenueResult.data || [];
    const ordersToday = ordersTodayResult.data || [];
    const totalProducts = productsResult.count || 0;
    const expiringBatches = expiringBatchesResult.data || [];
    const topProducts = topProductsResult.data || [];
    const recentOrders = recentOrdersResult.data || [];

    const monthRevenue = revenueData.reduce((sum, o) => sum + Number(o.final_amount || 0), 0);
    const todayRevenue = ordersToday.filter(o => o.order_status !== 'cancelled').reduce((sum, o) => sum + Number(o.final_amount || 0), 0);
    const pendingOrders = ordersToday.filter(o => o.order_status === 'pending').length;

    // Tính top sản phẩm bán chạy
    const productSales = {};
    for (const item of topProducts) {
      const pid = item.product_id;
      if (!item.products) continue;
      if (!productSales[pid]) productSales[pid] = { ...item.products, total_sold: 0 };
      productSales[pid].total_sold += Number(item.quantity || 0);
    }
    const top5 = Object.values(productSales).sort((a, b) => b.total_sold - a.total_sold).slice(0, 5);

    res.json({
      status: 'success',
      dashboard: {
        revenue: { today: todayRevenue, this_month: monthRevenue },
        orders: {
          today_total: ordersToday.length,
          today_pending: pendingOrders,
          recent: recentOrders || []
        },
        inventory: {
          total_products: totalProducts || 0,
          expiring_soon: expiringBatches
        },
        top_products: top5
      }
    });
  } catch (err) {
    next(err);
  }
};

// [GET] /api/admin/revenue - Báo cáo doanh thu theo ngày/tháng (Admin)
exports.getRevenue = async (req, res, next) => {
  try {
    const { period = 'month', year = new Date().getFullYear(), month = new Date().getMonth() + 1, start_date, end_date, payment_method } = req.query;
    let startDate, endDate;

    if (start_date && end_date) {
      startDate = new Date(`${start_date}T00:00:00`).toISOString();
      endDate = new Date(`${end_date}T23:59:59`).toISOString();
    } else if (period === 'week') {
      const now = new Date(); const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
      startDate = monday.toISOString(); endDate = sunday.toISOString();
    } else if (period === 'day') {
      startDate = new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z'; endDate = new Date().toISOString().slice(0, 10) + 'T23:59:59.999Z';
    } else if (period === 'month') {
      startDate = new Date(year, month - 1, 1).toISOString();
      endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
    } else {
      startDate = new Date(year, 0, 1).toISOString();
      endDate = new Date(year, 11, 31, 23, 59, 59).toISOString();
    }

    let query = supabase
      .from('orders')
      .select('id, order_code, order_type, payment_method, final_amount, discount_amount, shipping_fee, paid_at, created_at, order_status')
      .neq('order_status', 'cancelled')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });
    if (payment_method && payment_method !== 'all') query = query.eq('payment_method', payment_method);
    const { data: orders, error } = await query;

    if (error) throw error;

    const totalRevenue = orders.reduce((sum, o) => sum + o.final_amount, 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const onlineRevenue = orders.filter(o => o.order_type === 'online').reduce((sum, o) => sum + o.final_amount, 0);
    const posRevenue = orders.filter(o => o.order_type === 'pos').reduce((sum, o) => sum + o.final_amount, 0);
    const revenueByDate = orders.reduce((result, order) => {
      const date = String(order.paid_at || order.created_at).slice(0, 10);
      result[date] = (result[date] || 0) + Number(order.final_amount || 0);
      return result;
    }, {});
    const series = Object.entries(revenueByDate).map(([date, amount]) => ({
      label: new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      amount
    }));
    const byPayment = ['cash', 'vietqr'].map(method => ({ method, amount: orders.filter(order => order.payment_method === method).reduce((sum, order) => sum + Number(order.final_amount || 0), 0) }));
    // Chỉ thống kê mặt hàng thuộc chính các đơn đang được lọc ở trên (kể cả phương thức thanh toán).
    const orderIds = orders.map(order => order.id);
    const { data: orderItems } = orderIds.length
      ? await supabase.from('order_items').select('quantity, subtotal, products(name, sku)').in('order_id', orderIds)
      : { data: [] };
    const productMap = {};
    for (const item of orderItems || []) { const key = item.products?.sku || item.products?.name || 'Không xác định'; productMap[key] = productMap[key] || { name: item.products?.name || key, sku: item.products?.sku || '-', quantity: 0, revenue: 0 }; productMap[key].quantity += Number(item.quantity || 0); productMap[key].revenue += Number(item.subtotal || 0); }
    const product_stats = Object.values(productMap).sort((a, b) => b.quantity - a.quantity);

    res.json({
      status: 'success',
      period: { type: period, year, month: period === 'month' ? month : null },
      summary: { total_revenue: totalRevenue, total_orders: totalOrders, avg_order_value: Math.round(avgOrderValue), online_revenue: onlineRevenue, pos_revenue: posRevenue },
      orders, series, by_payment: byPayment, product_stats
    });
  } catch (err) {
    next(err);
  }
};

// [GET] /api/admin/users - Danh sách tài khoản người dùng (Admin)
exports.getUsers = async (req, res, next) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = supabase
      .from('users')
      .select('id, email, full_name, phone, role, is_active, auth_provider, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);
    if (role) query = query.eq('role', role);
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ status: 'success', total: count, users: data });
  } catch (err) {
    next(err);
  }
};

// [PUT] /api/admin/users/:id - Cập nhật trạng thái/vai trò tài khoản (Admin)
exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, is_active, full_name, phone } = req.body;
    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    updateData.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('users').update(updateData).eq('id', id).select('id, email, full_name, phone, role, is_active').single();
    if (error) throw error;
    res.json({ status: 'success', message: 'Đã cập nhật tài khoản!', user: data });
  } catch (err) {
    next(err);
  }
};

// Nhân viên chỉ được quản lý các tài khoản khách hàng, không đụng tới nhân sự/quản trị viên.
exports.updateCustomerForStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: customer, error: lookupError } = await supabase.from('users').select('id, role').eq('id', id).single();
    if (lookupError || !customer || customer.role !== 'customer') return res.status(404).json({ status: 'error', message: 'Không tìm thấy khách hàng.' });
    const { full_name, phone, is_active } = req.body;
    if (phone && !/^0\d{9}$/.test(String(phone))) return res.status(400).json({ status: 'error', message: 'Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0.' });
    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);
    const { data, error } = await supabase.from('users').update(updateData).eq('id', id).select('id, email, full_name, phone, role, is_active').single();
    if (error) throw error;
    res.json({ status: 'success', message: 'Đã cập nhật khách hàng.', user: data });
  } catch (err) { next(err); }
};

// [POST] /api/admin/users - Tạo tài khoản khách hàng/nhân viên (Admin)
exports.createUser = async (req, res, next) => {
  try {
    const { email, password, full_name, phone, role = 'customer' } = req.body;
    if (!email || !password || !full_name) return res.status(400).json({ status: 'error', message: 'Cần có họ tên, email và mật khẩu.' });
    if (!['customer', 'staff', 'admin'].includes(role)) return res.status(400).json({ status: 'error', message: 'Vai trò không hợp lệ.' });
    const password_hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('users').insert({ email: email.toLowerCase(), password_hash, full_name, phone, role, auth_provider: 'local', is_active: true }).select('id, email, full_name, phone, role, is_active').single();
    if (error) throw error;
    res.status(201).json({ status: 'success', user: data });
  } catch (err) { next(err); }
};

// [GET] /api/admin/suppliers - Danh sách nhà cung cấp (Admin)
exports.getSuppliers = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, code, name, contact_person, phone, email, address, is_active, created_at')
      .order('name');
    if (error) throw error;
    res.json({ status: 'success', suppliers: data || [] });
  } catch (err) {
    next(err);
  }
};

const crud = (table, fields = '*') => ({
  create: async (req, res, next) => { try { const { data, error } = await supabase.from(table).insert(req.body).select(fields).single(); if (error) throw error; res.status(201).json({ status: 'success', data }); } catch (err) { next(err); } },
  update: async (req, res, next) => { try { const { data, error } = await supabase.from(table).update(req.body).eq('id', req.params.id).select(fields).single(); if (error) throw error; res.json({ status: 'success', data }); } catch (err) { next(err); } },
  remove: async (req, res, next) => { try { const { error } = await supabase.from(table).delete().eq('id', req.params.id); if (error) throw error; res.json({ status: 'success' }); } catch (err) { next(err); } },
});

exports.categoryCrud = crud('categories');
exports.supplierCrud = crud('suppliers');
exports.voucherCrud = crud('vouchers');

// [GET] /api/admin/vouchers - Danh sách voucher (Admin)
exports.getVouchers = async (req, res, next) => {
  try {
    if (offlineCatalog.shouldUseOffline()) return res.json({ status: 'success', vouchers: offlineCatalog.vouchers, offline: true });
    const { data, error } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ status: 'success', vouchers: data });
  } catch (err) {
    if (offlineCatalog.isConnectionFailure(err)) {
      offlineCatalog.markDatabaseUnavailable();
      return res.json({ status: 'success', vouchers: offlineCatalog.vouchers, offline: true });
    }
    next(err);
  }
};

// [POST] /api/admin/vouchers - Tạo voucher mới (Admin)
const voucherPayload = (body = {}) => {
  const allowed = ['code', 'discount_type', 'discount_value', 'min_order_amount', 'max_discount_amount', 'usage_limit', 'start_date', 'end_date', 'is_active'];
  return Object.fromEntries(allowed.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
};

exports.createVoucher = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('vouchers').insert(voucherPayload(req.body)).select().single();
    if (error) throw error;
    res.status(201).json({ status: 'success', message: 'Đã tạo mã giảm giá mới!', voucher: data });
  } catch (err) {
    next(err);
  }
};

// [PUT] /api/admin/vouchers/:id - Cập nhật voucher (Admin)
exports.updateVoucher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('vouchers').update(voucherPayload(req.body)).eq('id', id).select().single();
    if (error) throw error;
    res.json({ status: 'success', message: 'Đã cập nhật voucher!', voucher: data });
  } catch (err) {
    next(err);
  }
};
