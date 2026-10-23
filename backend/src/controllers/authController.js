const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const supabase = require('../config/supabase');
const offlineCatalog = require('../data/offlineCatalog');
require('dotenv').config();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Tạo JWT Token
const signToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// [POST] /api/auth/register - Đăng ký tài khoản khách hàng mới
exports.register = async (req, res, next) => {
  try {
    const { email, password, full_name, phone } = req.body;
    if (!email || !password || !full_name) {
      return res.status(400).json({ status: 'error', message: 'Vui lòng điền đầy đủ: email, mật khẩu, họ tên.' });
    }
    const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();
    if (existing) {
      return res.status(409).json({ status: 'error', message: 'Email này đã được đăng ký. Vui lòng dùng email khác hoặc đăng nhập.' });
    }
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentlyDeleted, error: deletedLookupError } = await supabase
      .from('users').select('id').eq('deleted_email', email.toLowerCase()).gte('deleted_at', thirtyDaysAgo).maybeSingle();
    if (deletedLookupError) throw deletedLookupError;
    if (recentlyDeleted) {
      return res.status(403).json({ status: 'error', message: 'Email này vừa được xóa tài khoản. Bạn có thể đăng ký lại sau 30 ngày.' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({ email, password_hash, full_name, phone, role: 'customer', auth_provider: 'local' })
      .select('id, email, full_name, phone, role, created_at')
      .single();
    if (error) throw error;
    const token = signToken(newUser);
    res.status(201).json({ status: 'success', message: 'Đăng ký tài khoản thành công!', token, user: newUser });
  } catch (err) {
    next(err);
  }
};

// [POST] /api/auth/login - Đăng nhập bằng Email & Mật khẩu
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Vui lòng nhập email và mật khẩu.' });
    }
    if (offlineCatalog.shouldUseOffline()) {
      const offlineUser = offlineCatalog.users.find(item => item.email.toLowerCase() === String(email).toLowerCase());
      if (!offlineUser || !await bcrypt.compare(password, offlineUser.password_hash)) return res.status(401).json({ status: 'error', message: 'Email hoặc mật khẩu không đúng.' });
      const { password_hash, ...userSafe } = offlineUser;
      return res.json({ status: 'success', message: 'Đăng nhập ở chế độ dữ liệu cục bộ.', token: signToken(userSafe), user: userSafe, offline: true });
    }
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, phone, address, role, password_hash, is_active, avatar_url')
      .eq('email', email)
      .eq('auth_provider', 'local')
      .single();
    // Lỗi kết nối kho dữ liệu phải đi qua nhánh dự phòng ở catch; chỉ báo sai
    // mật khẩu khi truy vấn thực sự hoàn tất nhưng không có tài khoản.
    if (error) throw error;
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Email hoặc mật khẩu không đúng.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ status: 'error', message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.' });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ status: 'error', message: 'Email hoặc mật khẩu không đúng.' });
    }
    const { password_hash, ...userSafe } = user;
    const token = signToken(userSafe);
    res.json({ status: 'success', message: 'Đăng nhập thành công!', token, user: userSafe });
  } catch (err) {
    if (offlineCatalog.isConnectionFailure(err)) {
      const user = offlineCatalog.users.find(item => item.email.toLowerCase() === String(req.body?.email || '').toLowerCase());
      if (!user || !await bcrypt.compare(req.body?.password || '', user.password_hash)) {
        return res.status(401).json({ status: 'error', message: 'Email hoặc mật khẩu không đúng.' });
      }
      const { password_hash, ...userSafe } = user;
      return res.json({ status: 'success', message: 'Đăng nhập ở chế độ dữ liệu cục bộ.', token: signToken(userSafe), user: userSafe, offline: true });
    }
    next(err);
  }
};

// [POST] /api/auth/google - Đăng nhập bằng Google OAuth (xác thực Google ID Token từ frontend)
exports.googleLogin = async (req, res, next) => {
  let verifiedProfile = null;
  try {
    const { credential } = req.body;
    if (!credential || !process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({ status: 'error', message: 'Đăng nhập Google chưa được cấu hình.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified) {
      return res.status(401).json({ status: 'error', message: 'Google không xác thực được địa chỉ email của bạn.' });
    }

    const google_id = payload.sub;
    const email = payload.email.toLowerCase();
    const full_name = payload.name || email.split('@')[0];
    const avatar_url = payload.picture || null;
    verifiedProfile = { id: `google-${google_id}`, email, full_name, avatar_url, role: 'customer', auth_provider: 'google', is_active: true };
    if (offlineCatalog.shouldUseOffline()) {
      return res.json({ status: 'success', message: 'Đăng nhập Google ở chế độ dữ liệu cục bộ.', token: signToken(verifiedProfile), user: verifiedProfile, offline: true });
    }
    let { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active, avatar_url')
      .or(`google_id.eq.${google_id},email.eq.${email}`)
      .maybeSingle();
    if (error) throw error;

    if (!user) {
      // Tự động tạo tài khoản mới nếu lần đầu đăng nhập Google
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({ email, full_name, avatar_url, google_id, role: 'customer', auth_provider: 'google' })
        .select('id, email, full_name, role, avatar_url')
        .single();
      if (error) throw error;
      user = newUser;
    } else if (!user.is_active) {
      return res.status(403).json({ status: 'error', message: 'Tài khoản của bạn đã bị khóa.' });
    } else {
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ google_id, avatar_url: user.avatar_url || avatar_url, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select('id, email, full_name, role, is_active, avatar_url')
        .single();
      if (updateError) throw updateError;
      user = updatedUser;
    }

    const token = signToken(user);
    res.json({ status: 'success', message: 'Đăng nhập Google thành công!', token, user });
  } catch (err) {
    // Chỉ dùng hồ sơ Google đã được thư viện Google xác thực. Chế độ này giúp
    // khách vẫn vào được khi kho dữ liệu tạm mất kết nối, không bỏ qua xác thực.
    if (verifiedProfile && offlineCatalog.isConnectionFailure(err)) {
      offlineCatalog.markDatabaseUnavailable();
      return res.json({ status: 'success', message: 'Đăng nhập Google ở chế độ dữ liệu cục bộ.', token: signToken(verifiedProfile), user: verifiedProfile, offline: true });
    }
    next(err);
  }
};

exports.getGoogleConfig = (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ status: 'error', message: 'Đăng nhập Google chưa được cấu hình.' });
  }
  res.json({ status: 'success', client_id: process.env.GOOGLE_CLIENT_ID });
};

// [GET] /api/auth/me - Lấy thông tin tài khoản đang đăng nhập
exports.getMe = async (req, res, next) => {
  try {
    if (offlineCatalog.shouldUseOffline()) {
      const user = offlineCatalog.users.find(item => item.id === req.user.id);
      return res.json({ status: 'success', user: user ? (({ password_hash, ...safe }) => safe)(user) : req.user, offline: true });
    }
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, phone, address, role, avatar_url, auth_provider, created_at')
      .eq('id', req.user.id)
      .single();
    if (error || !user) {
      return res.status(404).json({ status: 'error', message: 'Không tìm thấy tài khoản.' });
    }
    res.json({ status: 'success', user });
  } catch (err) {
    if (offlineCatalog.isConnectionFailure(err)) {
      offlineCatalog.markDatabaseUnavailable();
      const user = offlineCatalog.users.find(item => item.id === req.user.id);
      return res.json({ status: 'success', user: user ? (({ password_hash, ...safe }) => safe)(user) : req.user, offline: true });
    }
    next(err);
  }
};

// [PUT] /api/auth/me - Cập nhật thông tin cá nhân
exports.updateMe = async (req, res, next) => {
  try {
    const { full_name, phone, address, avatar_url } = req.body;
    if (phone && !/^0\d{9}$/.test(String(phone))) return res.status(400).json({ status: 'error', message: 'Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0.' });
    if (offlineCatalog.shouldUseOffline()) {
      const user = offlineCatalog.users.find(item => item.id === req.user.id);
      const updated = { ...(user || req.user), full_name: full_name ?? user?.full_name ?? req.user.full_name, phone: phone ?? user?.phone ?? null, address: address ?? user?.address ?? null, avatar_url: avatar_url ?? user?.avatar_url ?? null };
      if (user) Object.assign(user, updated);
      return res.json({ status: 'success', message: 'Đã lưu thông tin trên thiết bị hiện tại.', user: updated, offline: true });
    }
    const { data: updated, error } = await supabase
      .from('users')
      .update({ full_name, phone, address, avatar_url, updated_at: new Date().toISOString() })
      .eq('id', req.user.id)
      .select('id, email, full_name, phone, address, role, avatar_url')
      .single();
    if (error) throw error;
    res.json({ status: 'success', message: 'Cập nhật thông tin thành công!', user: updated });
  } catch (err) {
    if (offlineCatalog.isConnectionFailure(err)) {
      offlineCatalog.markDatabaseUnavailable();
      const user = offlineCatalog.users.find(item => item.id === req.user.id);
      const updated = { ...(user || req.user), full_name: req.body.full_name ?? user?.full_name ?? req.user.full_name, phone: req.body.phone ?? user?.phone ?? null, address: req.body.address ?? user?.address ?? null, avatar_url: req.body.avatar_url ?? user?.avatar_url ?? null };
      if (user) Object.assign(user, updated);
      return res.json({ status: 'success', message: 'Đã lưu thông tin trên thiết bị hiện tại.', user: updated, offline: true });
    }
    next(err);
  }
};

// [PUT] /api/auth/me/password - Đổi mật khẩu của chính tài khoản đang đăng nhập
exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ status: 'error', message: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.' });
    if (String(new_password).length < 6) return res.status(400).json({ status: 'error', message: 'Mật khẩu mới cần ít nhất 6 ký tự.' });
    const { data: user, error } = await supabase.from('users').select('password_hash').eq('id', req.user.id).single();
    if (error || !user?.password_hash) return res.status(400).json({ status: 'error', message: 'Tài khoản này không có mật khẩu nội bộ để thay đổi.' });
    if (!await bcrypt.compare(current_password, user.password_hash)) return res.status(400).json({ status: 'error', message: 'Mật khẩu hiện tại chưa đúng.' });
    const password_hash = await bcrypt.hash(new_password, 10);
    const { error: updateError } = await supabase.from('users').update({ password_hash, updated_at: new Date().toISOString() }).eq('id', req.user.id);
    if (updateError) throw updateError;
    res.json({ status: 'success', message: 'Đã thay đổi mật khẩu.' });
  } catch (err) { next(err); }
};

// [DELETE] /api/auth/me - Xóa mềm tài khoản để vẫn giữ được hóa đơn đã mua.
exports.deleteMe = async (req, res, next) => {
  try {
    const suffix = String(req.user.id).slice(0, 8);
    const { error } = await supabase.from('users').update({
      is_active: false,
      deleted_email: req.user.email,
      deleted_at: new Date().toISOString(),
      email: `deleted-${suffix}-${Date.now()}@deleted.tiemoc.local`,
      full_name: 'Tài khoản đã xóa',
      phone: null,
      address: null,
      avatar_url: null,
      password_hash: null,
      updated_at: new Date().toISOString(),
    }).eq('id', req.user.id);
    if (error) throw error;
    res.json({ status: 'success', message: 'Tài khoản đã được xóa.' });
  } catch (err) { next(err); }
};
