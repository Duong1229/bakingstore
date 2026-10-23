<template>
  <div class="order-detail-page container">
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Đang tải thông tin đơn hàng...</p>
    </div>

    <div v-else-if="!order" class="empty-state">
      <h3>Không tìm thấy đơn hàng!</h3>
      <router-link to="/" class="btn btn-primary btn-sm">Về trang chủ</router-link>
    </div>

    <div v-else class="order-wrap">
      <!-- Top Status Banner -->
      <div class="status-banner card">
        <div class="status-left">
          <div class="order-badge-row">
            <span class="order-code">Đơn hàng #{{ order.order_code }}</span>
            <span :class="['badge', getStatusClass(order.order_status)]">
              {{ getStatusLabel(order.order_status) }}
            </span>
            <span v-if="order.order_status !== 'cancelled' && order.payment_status === 'paid'" class="badge badge-fefo">
              ✓ Đã thanh toán
            </span>
            <span v-else-if="order.order_status !== 'cancelled'" class="badge badge-warning">
              ⏳ Chờ thanh toán
            </span>
          </div>
          <div class="order-date">Thời gian đặt: {{ formatDate(order.created_at) }}</div>
        </div>

        <div v-if="authStore.isStaff" class="status-actions">
          <button type="button" class="btn btn-secondary btn-sm" @click="openReceipt">
            🖨️ In Hóa Đơn K80
          </button>
        </div>
        <div v-else-if="canCancel" class="status-actions">
          <button class="btn btn-secondary btn-sm" type="button" @click="requestCancellation">{{ cancelLabel }}</button>
        </div>
      </div>

      <div class="order-grid" :class="{ 'with-vietqr': order.order_status !== 'cancelled' && order.payment_method === 'vietqr' && order.payment_status !== 'paid' }">
      <section v-if="order.order_status !== 'cancelled' && order.payment_method === 'vietqr' && order.payment_status !== 'paid'" class="vietqr-stage card">
        <span class="vietqr-kicker">THANH TOÁN CHUYỂN KHOẢN</span>
        <h2>Quét mã VietQR để thanh toán</h2>
        <p>Mở ứng dụng ngân hàng, quét mã bên dưới và giữ nguyên nội dung chuyển khoản. Đơn sẽ tự xác nhận sau khi nhận tiền.</p>
        <img :src="order.qr_code_url || vietqrBackupUrl" alt="Mã VietQR thanh toán" class="vietqr-large" />
        <div class="vietqr-amount">{{ formatVND(order.final_amount) }}</div>
        <div class="vietqr-code">Nội dung chuyển khoản: <b>{{ order.order_code }}</b></div>
        <div class="payment-countdown"><span>Đơn sẽ tự hủy sau</span><strong>{{ countdownText }}</strong><small v-if="remainingSeconds > 0">Thanh toán trước thời điểm này để Tiệm Ốc giữ hàng cho bạn.</small></div>
        <div class="polling-hint"><div class="pulse-dot"></div><span>Đang chờ xác nhận thanh toán tự động…</span></div>
      </section>

        <div class="order-summary card">
          <h2 class="card-heading font-serif">Chi Tiết Đơn Hàng</h2>

          <div class="order-items-list">
            <div v-for="item in order.order_items" :key="item.id" class="order-item-row">
              <img :src="item.products?.image_url || defaultImg" class="item-thumb" />
              <div class="item-text">
                <div class="item-title">{{ item.products?.name || 'Sản phẩm' }}</div>
                <div class="item-sub">{{ formatVND(item.unit_price) }} x {{ item.quantity }} {{ item.products?.unit || 'gói' }}</div>
              </div>
              <div class="item-subtotal">{{ formatVND(item.subtotal || (item.unit_price * item.quantity)) }}</div>
            </div>
          </div>

          <div class="recipient-box">
            <h4>Thông Tin Nhận Hàng</h4>
            <div><strong>Người nhận:</strong> {{ order.recipient_name }} - {{ order.recipient_phone }}</div>
            <div><strong>Địa chỉ:</strong> {{ order.shipping_address }}</div>
            <div v-if="order.notes"><strong>Ghi chú:</strong> {{ order.notes }}</div>
          </div>

          <div class="order-financials">
            <div class="fin-row">
              <span>Tiền hàng:</span>
              <span>{{ formatVND(order.total_amount) }}</span>
            </div>
            <div class="fin-row">
              <span>Phí vận chuyển:</span>
              <span>{{ Number(order.shipping_fee) === 0 ? 'MIỄN PHÍ' : formatVND(order.shipping_fee) }}</span>
            </div>
            <div v-if="order.discount_amount > 0" class="fin-row discount">
              <span>Giảm giá:</span>
              <span>-{{ formatVND(order.discount_amount) }}</span>
            </div>
            <div class="fin-row total">
              <span>Tổng cộng:</span>
              <span>{{ formatVND(order.final_amount) }}</span>
            </div>
          </div>
          <section v-if="order.order_status !== 'cancelled'" class="payment-summary">
            <h3>Thanh toán</h3>
            <p v-if="order.payment_method === 'vietqr' && order.payment_status === 'paid'" class="payment-confirmed">✓ Đã thanh toán qua VietQR. Đơn hàng đang được Tiệm Ốc xử lý.</p>
            <p v-else-if="order.payment_method === 'vietqr'">Vui lòng hoàn tất thanh toán ở khung VietQR phía trên.</p>
            <p v-else><b>Thanh toán khi nhận hàng (COD).</b> Bạn thanh toán {{ formatVND(order.final_amount) }} cho shipper khi nhận đơn.</p>
          </section>
          <p v-else class="cancelled-notice">Đơn hàng này đã được hủy. Sản phẩm sẽ không được giao và không cần thực hiện thanh toán.</p>
          <div v-if="order.order_status === 'completed'" class="review-box"><h3>Đánh giá sản phẩm đã nhận</h3><p class="review-note">Bạn có thể cập nhật đánh giá một lần. Lần 2 sẽ thay thế hoàn toàn nội dung lần 1, sau đó đánh giá được khóa.</p><div v-for="item in order.order_items" :key="`review-${item.id}`" class="review-item"><b>{{ item.products?.name }}</b><div v-if="reviews[item.products?.id]?.entry" class="review-sent"><p class="review-complete">✓ {{ reviews[item.products?.id]?.entry?.revision_count ? 'Đánh giá đã cập nhật (lần 2)' : 'Đánh giá lần 1' }} <span class="review-stars-static">{{ '★'.repeat(reviews[item.products?.id]?.entry?.rating || 0) }}<i>{{ '★'.repeat(5 - (reviews[item.products?.id]?.entry?.rating || 0)) }}</i></span></p><p v-if="reviews[item.products?.id]?.entry?.comment" class="review-comment">“{{ reviews[item.products?.id]?.entry?.comment }}”</p><div v-if="reviews[item.products?.id]?.entry?.media_urls?.length" class="review-media"><template v-for="url in reviews[item.products?.id]?.entry?.media_urls" :key="url"><video v-if="isVideo(url)" :src="url" controls></video><img v-else :src="url" alt="Ảnh khách đánh giá"></template></div></div><template v-if="!reviews[item.products?.id]?.locked"><div><button v-for="star in 5" :key="star" :class="['star-button',{selected:(reviews[item.products?.id]?.rating||0)>=star}]" @click="setRating(item.products?.id,star)">★</button></div><input v-model.trim="reviews[item.products?.id].comment" placeholder="Chia sẻ cảm nhận của bạn (không bắt buộc)"><label class="review-upload">Thêm ảnh / video<input type="file" accept="image/*,video/*" multiple @change="selectReviewMedia(item.products?.id, $event)"></label><small v-if="reviews[item.products?.id]?.files?.length">Đã chọn {{ reviews[item.products?.id].files.length }} tệp</small><button class="review-submit" @click="submitReview(item.products?.id)">{{ reviews[item.products?.id]?.entry ? 'Cập nhật đánh giá lần 2' : 'Gửi đánh giá' }}</button></template><p v-else class="review-locked">🔒 Đánh giá lần 2 đã được xác nhận, không thể sửa thêm.</p></div></div>
        </div>
      </div>
      <div class="home-action"><router-link to="/" class="btn btn-secondary">← Quay về trang chủ</router-link></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { orderApi, reviewApi } from '../api';
import { useAuthStore } from '../stores/auth';
import confetti from 'canvas-confetti';

const route = useRoute();
const authStore = useAuthStore();
const order = ref(null);
const reviews = ref({});
const isLoading = ref(true);
const remainingSeconds = ref(0);
let pollInterval = null;
let countdownInterval = null;

const defaultImg = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=200&q=80';

const vietqrBackupUrl = computed(() => {
  if (!order.value) return '';
  const bank = 'MB';
  const acc = '0123456789';
  const amt = Math.round(order.value.final_amount);
  const des = encodeURIComponent(order.value.order_code);
  return `https://img.vietqr.io/image/${bank}-${acc}-compact2.png?amount=${amt}&addInfo=${des}&accountName=NGUYEN%20VAN%20A`;
});
const countdownText = computed(() => {
  const total = Math.max(0, remainingSeconds.value);
  return `${String(Math.floor(total / 3600)).padStart(2, '0')}:${String(Math.floor((total % 3600) / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
});
const updateCountdown = () => {
  if (!order.value || order.value.payment_method !== 'vietqr' || order.value.payment_status === 'paid' || order.value.order_status === 'cancelled') { remainingSeconds.value = 0; return; }
  const expiresAt = new Date(order.value.created_at).getTime() + 24 * 60 * 60 * 1000;
  remainingSeconds.value = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
};

const fetchOrder = async (isPolling = false) => {
  try {
    if (!isPolling) isLoading.value = true;
    const res = await orderApi.getOrderDetail(route.params.id);
    const prevStatus = order.value?.payment_status;
    order.value = res.order;
    updateCountdown();
    for (const item of res.order.order_items || []) {
      const productId = item.products?.id;
      if (!productId) continue;
      const submitted = (res.order.my_reviews || []).filter(review => review.product_id === productId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const latestReview = submitted[0] || null;
      // Giữ nguyên phần khách đang nhập. Chỉ thay danh sách đánh giá đã lưu
      // từ máy chủ; nếu không, một lần làm mới nền sẽ làm mất số sao/chữ/tệp.
      const draft = reviews.value[productId] || {};
      reviews.value[productId] = {
        entry: latestReview,
        rating: draft.rating || 0,
        comment: draft.comment || '',
        files: draft.files || [],
        locked: Number(latestReview?.revision_count || 0) >= 1,
      };
    }

    // Nếu vừa đổi từ unpaid sang paid -> Bắn pháo hoa ăn mừng!
    if (prevStatus === 'unpaid' && res.order.payment_status === 'paid') {
      triggerCelebration();
    }
  } catch (err) {
    console.error('Fetch order detail error:', err);
  } finally {
    if (!isPolling) isLoading.value = false;
  }
};

const setRating = (productId, rating) => { if (reviews.value[productId] && !reviews.value[productId].locked) reviews.value[productId].rating = rating; };
const selectReviewMedia = (productId, event) => {
  const files = Array.from(event.target.files || []);
  if (files.length > 4) return window.alert('Mỗi lần đánh giá chỉ được đính kèm tối đa 4 ảnh hoặc video.');
  if (files.some(file => !/^(image|video)\//.test(file.type) || file.size > 30 * 1024 * 1024)) return window.alert('Chỉ nhận ảnh/video tối đa 30 MB mỗi tệp.');
  reviews.value[productId].files = files;
};
const isVideo = (url = '') => /\.(mp4|webm|mov)(\?|$)/i.test(url);
const submitReview = async (productId) => {
  const review = reviews.value[productId];
  if (!review?.rating) return window.alert('Vui lòng chọn số sao.');
  try {
    const form = new FormData();
    form.append('product_id', productId); form.append('order_id', order.value.id);
    form.append('rating', review.rating); form.append('comment', review.comment || '');
    review.files.forEach(file => form.append('media', file));
    await reviewApi.create(form);
    // Xóa bản nháp sau khi gửi thành công rồi nạp lại đánh giá đã lưu.
    review.rating = 0;
    review.comment = '';
    review.files = [];
    await fetchOrder();
  } catch (error) { window.alert(error.message); }
};

const triggerCelebration = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#A0153E', '#D97706', '#10B981', '#F59E0B'],
  });
};

const formatDate = (dateStr) => {
  return dateStr ? new Date(dateStr).toLocaleString('vi-VN') : '';
};

const formatVND = (val) => Number(val || 0).toLocaleString('vi-VN') + 'đ';
const openReceipt = async () => {
  try {
    const blob = await orderApi.downloadReceipt(order.value.id);
    const url = URL.createObjectURL(blob);
    const popup = window.open(url, '_blank', 'noopener');
    if (!popup) window.alert('Trình duyệt đang chặn cửa sổ in. Vui lòng cho phép pop-up rồi thử lại.');
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) { window.alert(error.message || 'Không thể mở hóa đơn.'); }
};

const getStatusLabel = (status) => {
  const map = {
    pending: 'Đang xử lý',
    confirmed: 'Đã xác nhận',
    picking: 'Đang soạn hàng',
    shipping: 'Đang giao hàng',
    completed: 'Đã hoàn tất',
    cancelled: 'Đã hủy',
    cancellation_requested: 'Đang chờ chấp nhận hủy',
  };
  return map[status] || status;
};

const canCancel = computed(() => authStore.user?.role === 'customer' && ['pending', 'confirmed', 'picking'].includes(order.value?.order_status));
const cancelLabel = computed(() => order.value?.order_status === 'picking' ? 'Gửi yêu cầu hủy' : 'Hủy đơn hàng');
const requestCancellation = async () => {
  if (!order.value) return;
  const message = order.value.order_status === 'picking'
    ? 'Đơn đang được đóng gói. Bạn muốn gửi yêu cầu hủy để Tiệm Ốc xét duyệt?'
    : 'Bạn chắc chắn muốn hủy đơn hàng này?';
  if (!window.confirm(message)) return;
  try {
    const result = await orderApi.cancelMyOrder(order.value.id);
    window.alert(result.message);
    await fetchOrder();
  } catch (error) { window.alert(error.message); }
};

const getStatusClass = (status) => {
  const map = {
    pending: 'badge-warning',
    confirmed: 'badge-combo',
    picking: 'badge-pos',
    shipping: 'badge-pos',
    completed: 'badge-fefo',
    cancelled: 'badge-warning',
  };
  return map[status] || '';
};

onMounted(() => {
  fetchOrder();
  countdownInterval = setInterval(updateCountdown, 1000);
  // Chỉ tự kiểm tra các đơn VietQR đang chờ tiền. Đơn COD đã giao có thể
  // vẫn mang trạng thái "unpaid", nhưng tuyệt đối không được làm mới liên
  // tục vì khách đang viết đánh giá.
  pollInterval = setInterval(() => {
    if (order.value && order.value.payment_method === 'vietqr' && order.value.order_status === 'pending' && order.value.payment_status !== 'paid') {
      fetchOrder(true);
    }
  }, 3000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
  if (countdownInterval) clearInterval(countdownInterval);
});
</script>

<style scoped>
.order-detail-page {
  padding: 3rem 1.25rem 5rem;
}

.order-wrap {
  max-width: 1050px;
  margin: 0 auto;
}

.status-banner {
  padding: 1.5rem 2rem;
  background: #FFFFFF;
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.order-badge-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.order-code {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-primary);
}

.order-date {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.order-grid{max-width:780px;margin:0 auto}.order-grid.with-vietqr{max-width:1120px;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(330px,.85fr);gap:20px;align-items:start}.vietqr-stage{order:2;padding:2.25rem;text-align:center;background:linear-gradient(135deg,#fff 0%,#fff6f8 100%);border:2px solid #f1c8d7;position:sticky;top:20px}.vietqr-kicker{font-size:.75rem;font-weight:800;letter-spacing:.12em;color:var(--color-primary)}.vietqr-stage h2{margin:.4rem 0;color:var(--color-primary);font-size:1.55rem}.vietqr-stage>p{max-width:540px;margin:.5rem auto 1.25rem;color:var(--color-text-muted)}.vietqr-large{display:block;width:min(300px,75vw);aspect-ratio:1;object-fit:contain;margin:0 auto 1.2rem;padding:12px;border-radius:16px;background:#fff;box-shadow:0 10px 30px #7b234520}.vietqr-amount{font-size:1.7rem;font-weight:900;color:var(--color-primary)}.vietqr-code{margin:.7rem auto 0;padding:.65rem 1rem;max-width:420px;border-radius:8px;background:#f4e8ed;color:#69223e}.payment-countdown{display:grid;gap:4px;margin:1rem auto 0;padding:.8rem;border-radius:10px;background:#fff1f5;color:#7d153b}.payment-countdown strong{font-size:1.6rem;letter-spacing:.06em;color:#ad174b}.payment-countdown small{color:#785f68;font-size:.76rem}.home-action{text-align:center;margin-top:1.5rem}

.order-payment, .order-summary {
  padding: 2rem;
  background: #FFFFFF;
}

.payment-summary { border-top: 1px solid var(--border-color); margin-top: 1.25rem; padding-top: 1rem; }
.payment-summary h3 { margin: 0 0 .45rem; color: var(--color-primary); font-size: 1rem; }
.payment-summary > p { margin: 0 0 .8rem; color: var(--color-text-muted); font-size: .9rem; }
.payment-confirmed { color: var(--success)!important; font-weight: 700; }
.cancelled-notice { margin: 1.25rem 0 0; padding: .9rem 1rem; border-radius: var(--radius-md); background: #fff1f1; color: #a22727; font-weight: 650; }
.payment-qr-layout { display:flex; gap:1rem; align-items:center; padding:.8rem; border-radius:var(--radius-md); background:var(--bg-surface-soft); }
.payment-qr { width:150px; height:150px; object-fit:contain; background:#fff; border-radius:8px; }
.payment-qr-layout .bank-details { flex:1; padding:0; background:transparent; }

.section-title {
  font-size: 1.45rem;
  color: var(--color-primary);
  text-align: center;
  margin-bottom: 0.35rem;
}

.qr-subtitle {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  text-align: center;
  margin-bottom: 1.25rem;
}

.qr-img-frame {
  position: relative;
  width: 250px;
  height: 250px;
  margin: 0 auto 1.5rem;
  padding: 8px;
  background: #FFFFFF;
  border: 2px solid var(--color-primary-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.qr-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.bank-details {
  background: var(--bg-surface-soft);
  border-radius: var(--radius-md);
  padding: 1rem 1.25rem;
  font-size: 0.88rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
}

.highlight-money {
  color: var(--color-primary);
  font-size: 1.05rem;
}

.highlight-code {
  background: var(--color-primary-light);
  color: var(--color-primary);
  padding: 2px 8px;
  border-radius: 4px;
}

.polling-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.78rem;
  color: var(--color-text-muted);
  margin-top: 1.25rem;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #10B981;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

/* Paid & COD */
.paid-success-box, .cod-box {
  text-align: center;
  padding: 2rem 1rem;
}

.success-icon {
  font-size: 4rem;
  margin-bottom: 0.5rem;
}

.fefo-notice {
  font-size: 0.88rem;
  color: var(--success);
  margin-top: 1rem;
  background: var(--success-bg);
  padding: 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid #A7F3D0;
}

/* Order Summary */
.card-heading {
  font-size: 1.25rem;
  color: var(--color-primary);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.75rem;
  margin-bottom: 1rem;
}

.order-items-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.order-item-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.item-thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}

.item-text {
  flex: 1;
}

.item-title {
  font-size: 0.88rem;
  font-weight: 600;
}

.item-sub {
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

.item-subtotal {
  font-size: 0.9rem;
  font-weight: 700;
}

.recipient-box {
  background: var(--bg-surface-soft);
  padding: 1rem;
  border-radius: var(--radius-md);
  font-size: 0.82rem;
  margin-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recipient-box h4 {
  color: var(--color-primary);
  font-size: 0.88rem;
  margin-bottom: 4px;
}

.order-financials {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.88rem;
}

.fin-row {
  display: flex;
  justify-content: space-between;
}

.fin-row.discount {
  color: var(--danger);
}

.fin-row.total {
  border-top: 1px solid var(--border-color);
  padding-top: 0.6rem;
  margin-top: 0.4rem;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--color-primary);
}
.review-box{border-top:1px solid var(--border-color);margin-top:1.4rem;padding-top:1rem}.review-box h3{color:var(--color-primary);font-size:1rem}.review-note{margin:.2rem 0 .7rem;color:var(--color-text-muted);font-size:.82rem}.review-item{padding:.8rem 0;border-top:1px dashed var(--border-color);display:grid;gap:.4rem}.star-button{border:0;background:none;color:#d6c8b7;font-size:1.25rem;cursor:pointer;padding:0 2px}.star-button.selected{color:#f3a51b}.review-item input{border:1px solid var(--border-color);border-radius:7px;padding:.55rem;font:inherit}.review-upload{justify-self:start;border:1px dashed var(--border-color);padding:.45rem .65rem;font-size:.8rem;color:var(--color-primary);cursor:pointer}.review-upload input{display:none}.review-submit{justify-self:start;border:0;border-radius:7px;background:var(--color-primary);color:#fff;padding:.48rem .8rem;font-weight:700;cursor:pointer}.review-complete{margin:.2rem 0;color:#087a35;font-weight:700}.review-stars-static{margin-left:.4rem;color:#f3a51b}.review-stars-static i{color:#d6c8b7;font-style:normal}.review-comment{margin:0;color:var(--color-text-muted);font-style:italic}.review-media{display:flex;gap:7px;flex-wrap:wrap}.review-media img,.review-media video{width:76px;height:76px;object-fit:cover;border:1px solid var(--border-color)}.review-locked{margin:0;color:#6d6258;font-size:.82rem}

.loading-state, .empty-state {
  text-align: center;
  padding: 5rem 0;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border-color);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  margin: 0 auto 1rem;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 850px) {
  .order-grid {
    grid-template-columns: 1fr;
  }
  .payment-qr-layout { align-items:flex-start; }
}
@media (max-width: 520px) { .payment-qr-layout { flex-direction:column; }.payment-qr { margin:auto; } }
</style>
