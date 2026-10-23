const supabase = require('../config/supabase');

// Một số máy đang chạy schema cũ trước khi migration ảnh/video được áp dụng.
// Không để việc thiếu cột mới làm hỏng toàn bộ phần đánh giá chữ.
const isMissingMediaColumn = (error) => error?.code === '42703' && /media_urls/i.test(error?.message || '');
const isMissingRevisionColumn = (error) => error?.code === '42703' && /revision_count/i.test(error?.message || '');

// Mỗi khách chỉ có một đánh giá đang hiệu lực cho một sản phẩm. Nếu họ sửa
// lần hai, nội dung mới là nguồn duy nhất được hiển thị/tính điểm; không giữ
// lại dòng lịch sử 1 sao cũ trên giao diện.
const keepLatestReviewPerCustomerProduct = (reviews = []) => {
  const latest = new Map();
  for (const review of reviews) {
    const key = `${review.user_id || review.id}:${review.product_id || review.id}`;
    const current = latest.get(key);
    if (!current || new Date(review.created_at) > new Date(current.created_at)) latest.set(key, review);
  }
  return [...latest.values()];
};

// [GET] /api/reviews/:product_id - Lấy đánh giá của một sản phẩm
exports.getReviews = async (req, res, next) => {
  try {
    const { product_id } = req.params;
    let { data, error } = await supabase
      .from('reviews')
      .select('id, user_id, product_id, order_id, rating, comment, media_urls, response_comment, responded_at, created_at, users!reviews_user_id_fkey(full_name, avatar_url)')
      .eq('product_id', product_id)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });
    if (isMissingMediaColumn(error)) {
      ({ data, error } = await supabase
        .from('reviews')
        .select('id, user_id, product_id, order_id, rating, comment, response_comment, responded_at, created_at, users!reviews_user_id_fkey(full_name, avatar_url)')
        .eq('product_id', product_id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false }));
      data = (data || []).map((review) => ({ ...review, media_urls: [] }));
    }
    if (error) throw error;
    res.json({ status: 'success', reviews: keepLatestReviewPerCustomerProduct(data) });
  } catch (err) {
    next(err);
  }
};

// [POST] /api/reviews - Gửi đánh giá sản phẩm (Khách hàng đã đăng nhập)
exports.createReview = async (req, res, next) => {
  try {
    const { product_id, order_id, rating, comment } = req.body;
    if (!product_id || !rating) {
      return res.status(400).json({ status: 'error', message: 'Vui lòng chọn sản phẩm và số sao đánh giá.' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ status: 'error', message: 'Số sao đánh giá phải từ 1 đến 5.' });
    }

    // Only a customer who received this product in a completed order can review it.
    const { data: eligibleOrder, error: orderError } = await supabase.from('orders')
      .select('id, order_items(product_id)').eq('id', order_id).eq('customer_id', req.user.id).eq('order_status', 'completed').single();
    if (orderError || !eligibleOrder?.order_items?.some(item => item.product_id === product_id)) {
      return res.status(403).json({ status: 'error', message: 'Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã hoàn thành.' });
    }

    // Lần hai ghi đè trực tiếp lần đầu, để khách và tiệm chỉ nhìn thấy nội
    // dung mới nhất. revision_count = 1 nghĩa là quyền sửa đã dùng hết.
    let { data: existing, error: existingError } = await supabase
      .from('reviews')
      .select('id, created_at, revision_count')
      .eq('product_id', product_id)
      .eq('user_id', req.user.id)
      .eq('order_id', order_id)
      .order('created_at', { ascending: true });
    let legacyRevisionSchema = false;
    if (isMissingRevisionColumn(existingError)) {
      legacyRevisionSchema = true;
      ({ data: existing, error: existingError } = await supabase
        .from('reviews')
        .select('id, created_at')
        .eq('product_id', product_id)
        .eq('user_id', req.user.id)
        .eq('order_id', order_id)
        .order('created_at', { ascending: true }));
    }
    if (existingError) throw existingError;
    const existingReviews = existing || [];
    const latestReview = existingReviews.at(-1);
    if (latestReview && Number(latestReview.revision_count || 0) >= 1) {
      return res.status(409).json({ status: 'error', message: 'Bạn đã hoàn tất hai lần đánh giá cho sản phẩm này. Nội dung đã được khóa.' });
    }

    const mediaUrls = [];
    const uploadedPaths = [];
    for (const [index, file] of (req.files || []).entries()) {
      const ext = (file.originalname || '').split('.').pop().replace(/[^a-zA-Z0-9]/g, '') || 'bin';
      const path = `${req.user.id}/${order_id}/${Date.now()}-${index}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('review-media')
        .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
      if (uploadError) {
        if (uploadedPaths.length) await supabase.storage.from('review-media').remove(uploadedPaths);
        throw uploadError;
      }
      uploadedPaths.push(path);
      mediaUrls.push(supabase.storage.from('review-media').getPublicUrl(path).data.publicUrl);
    }

    const reviewPayload = { product_id, user_id: req.user.id, order_id, rating, comment, media_urls: mediaUrls, is_approved: true };
    let data;
    let error;
    const isRevision = Boolean(latestReview);
    if (isRevision) {
      // Dọn những bản ghi trùng do phiên bản cũ từng tạo bản ghi mới mỗi lần.
      const duplicateIds = existingReviews.slice(0, -1).map((review) => review.id);
      if (duplicateIds.length) {
        const { error: cleanupError } = await supabase.from('reviews').delete().in('id', duplicateIds);
        if (cleanupError) throw cleanupError;
      }
      const updatePayload = legacyRevisionSchema ? reviewPayload : { ...reviewPayload, revision_count: 1 };
      ({ data, error } = await supabase
        .from('reviews')
        .update(updatePayload)
        .eq('id', latestReview.id)
        .select(`id, rating, comment, media_urls, revision_count, created_at, users!reviews_user_id_fkey(full_name, avatar_url)`)
        .single());
    } else {
      const insertPayload = legacyRevisionSchema ? reviewPayload : { ...reviewPayload, revision_count: 0 };
      ({ data, error } = await supabase
        .from('reviews')
        .insert(insertPayload)
        .select(`id, rating, comment, media_urls, revision_count, created_at, users!reviews_user_id_fkey(full_name, avatar_url)`)
        .single());
    }
    // Với schema cũ, vẫn nhận đánh giá không đính kèm thay vì báo lỗi chung.
    // Nếu khách đã chọn ảnh/video, trả thông báo đúng để tránh tưởng là đã lưu.
    if (isMissingMediaColumn(error)) {
      if (mediaUrls.length) {
        if (uploadedPaths.length) await supabase.storage.from('review-media').remove(uploadedPaths);
        return res.status(503).json({ status: 'error', message: 'Phần ảnh/video đánh giá đang được cập nhật. Vui lòng thử lại sau ít phút.' });
      }
      const fallbackPayload = { product_id, user_id: req.user.id, order_id, rating, comment, is_approved: true };
      ({ data, error } = isRevision
        ? await supabase.from('reviews').update(legacyRevisionSchema ? fallbackPayload : { ...fallbackPayload, revision_count: 1 }).eq('id', latestReview.id).select(`id, rating, comment, created_at, users!reviews_user_id_fkey(full_name, avatar_url)`).single()
        : await supabase.from('reviews').insert(legacyRevisionSchema ? fallbackPayload : { ...fallbackPayload, revision_count: 0 }).select(`id, rating, comment, created_at, users!reviews_user_id_fkey(full_name, avatar_url)`).single());
      if (data) data.media_urls = [];
    }
    if (error) {
      if (uploadedPaths.length) await supabase.storage.from('review-media').remove(uploadedPaths);
      throw error;
    }

    // Cập nhật ngay số sao trung bình và số lượt đánh giá trên sản phẩm.
    // Làm ở đây để vẫn hoạt động ngay cả khi trigger SQL chưa được cài trên database.
    const { data: allReviews, error: statsError } = await supabase
      .from('reviews').select('user_id, product_id, rating, created_at').eq('product_id', product_id).eq('is_approved', true);
    if (statsError) throw statsError;
    const currentReviews = keepLatestReviewPerCustomerProduct(allReviews || []);
    const ratingCount = currentReviews.length;
    const ratingAverage = ratingCount
      ? Math.round((currentReviews.reduce((total, item) => total + Number(item.rating), 0) / ratingCount) * 100) / 100
      : 0;
    const { error: updateError } = await supabase
      .from('products').update({ rating_average: ratingAverage, rating_count: ratingCount }).eq('id', product_id);
    if (updateError) throw updateError;
    const reviewRound = isRevision ? 2 : 1;
    res.status(201).json({ status: 'success', message: isRevision ? 'Đã cập nhật đánh giá lần 2. Nội dung cũ đã được thay thế và đánh giá đã khóa. ⭐' : 'Đã lưu đánh giá. Bạn có thể cập nhật thêm một lần nữa. ⭐', review: { ...data, review_round: reviewRound }, rating_average: ratingAverage, rating_count: ratingCount });
  } catch (err) {
    next(err);
  }
};
