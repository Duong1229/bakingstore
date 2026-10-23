<template>
  <div class="product-detail-page container">
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Đang tải thông tin sản phẩm...</p>
    </div>

    <div v-else-if="!product" class="empty-state">
      <h3>Không tìm thấy sản phẩm!</h3>
      <router-link to="/products" class="btn btn-primary btn-sm">Quay lại danh sách</router-link>
    </div>

    <div v-else class="detail-grid">
      <!-- Left: Product Image -->
      <div class="detail-gallery">
        <div class="main-image-card card">
          <img :src="product.image_url || defaultImg" :alt="product.name" class="detail-img" />
          <span v-if="product.is_combo" class="badge badge-combo gallery-badge">Set Combo Trọn Gói</span>
          <span v-else class="badge badge-fefo gallery-badge">Date Mới FEFO</span>
        </div>
      </div>

      <!-- Right: Product Information & Purchase -->
      <div class="detail-info">
        <div class="meta-row">
          <span class="sku-tag">Mã SKU: <strong>{{ product.sku }}</strong></span>
          <button class="rating-box" type="button" @click="toggleReviews">
            <span class="star">★</span>
            <span>{{ Number(product.rating_average || 0).toFixed(1) }} ({{ product.rating_count || 0 }} đánh giá)</span>
          </button>
        </div>

        <h1 class="product-title font-serif">{{ product.name }}</h1>

        <div class="price-box">
          <span class="price-amount">{{ formatVND(product.price) }}</span>
          <span class="price-unit">/ {{ product.unit || 'gói' }}</span>
        </div>

        <p :class="['category-line', { 'sold-out-text': isSoldOut }]">Danh mục: {{ product.categories?.name || 'Nguyên liệu làm bánh' }} · {{ isSoldOut ? 'Đã bán hết' : `Còn ${product.stock_quantity} ${product.unit || 'sản phẩm'} theo kho` }}</p>

        <!-- Tiệm Ốc Shipping Reminder Notice -->
        <div class="shipping-notice-box">
          <div class="notice-title">🚚 Chính sách giao hàng Tiệm Ốc:</div>
          <ul class="notice-list">
            <li><strong>Hà Nội:</strong> Đơn &lt;300k ship 15k, 300k-500k ship 10k, <strong>&gt;500k FREESHIP</strong>.</li>
            <li><strong>Tỉnh khác:</strong> Đơn &le;500k ship 30k, <strong>&gt;500k FREESHIP</strong>.</li>
          </ul>
        </div>

        <!-- Description -->
        <div class="product-desc">
          <h3>Mô tả sản phẩm</h3>
          <p>{{ product.description || 'Nguyên liệu làm bánh thượng hạng được bảo quản theo tiêu chuẩn nhiệt độ nghiêm ngặt, date luôn mới nhất từ Tiệm Ốc.' }}</p>
        </div>

        <section v-if="showReviews" class="reviews-panel">
          <div class="reviews-heading"><h3>Đánh giá từ khách hàng</h3><button type="button" @click="showReviews = false">Đóng</button></div>
          <p v-if="reviewsLoading">Đang tải đánh giá...</p>
          <p v-else-if="!reviews.length" class="no-reviews">Sản phẩm này chưa có đánh giá nào.</p>
          <article v-for="review in reviews" :key="review.id" class="review-card">
            <div><strong>{{ review.users?.full_name || 'Khách hàng' }}</strong><span class="review-stars">{{ '★'.repeat(review.rating) }}<i>{{ '★'.repeat(5 - review.rating) }}</i></span></div>
            <p v-if="review.comment">{{ review.comment }}</p>
            <div v-if="review.media_urls?.length" class="review-media"><button v-for="url in review.media_urls" :key="url" type="button" class="review-media-button" @click="previewMedia = url" :aria-label="`Xem ${isVideo(url) ? 'video' : 'ảnh'} đánh giá`"><video v-if="isVideo(url)" :src="url" muted></video><img v-else :src="url" alt="Ảnh đánh giá của khách"></button></div>
            <div v-if="review.response_comment" class="store-response"><b>Phản hồi từ Tiệm Ốc</b><p>{{ review.response_comment }}</p></div>
            <small>{{ formatDate(review.created_at) }}</small>
          </article>
        </section>

        <!-- Combo Items Breakdown if combo -->
        <div v-if="product.is_combo && product.combo_items?.length > 0" class="combo-breakdown-box">
          <h3>Trọn bộ nguyên liệu trong Set này:</h3>
          <ul class="combo-items-list">
            <li v-for="(ci, idx) in product.combo_items" :key="idx">
              • {{ ci.component_product?.name || ci.name || 'Thành phần' }} ({{ ci.quantity }} {{ ci.component_product?.unit || 'gói' }})
            </li>
          </ul>
        </div>

        <!-- Action Row -->
        <div class="action-row">
          <div class="qty-selector">
            <button @click="quantity = Math.max(1, quantity - 1)" :disabled="quantity <= 1 || isSoldOut">-</button>
            <input v-model.number="quantity" type="number" min="1" :max="product.stock_quantity" :disabled="isSoldOut" aria-label="Số lượng" @change="clampDetailQuantity">
            <button @click="quantity = Math.min(Number(product.stock_quantity || quantity + 1), quantity + 1)" :disabled="isSoldOut || quantity >= Number(product.stock_quantity || 0)">+</button>
          </div>

          <button class="btn btn-primary btn-add" :disabled="isSoldOut" @click="handleAddToCart">
            {{ isSoldOut ? 'Đã bán hết' : `Thêm Vào Giỏ (${formatVND(product.price * quantity)})` }}
          </button>
        </div>
        <button class="btn buy-now" :disabled="isSoldOut" @click="handleBuyNow">{{ isSoldOut ? 'Đã bán hết' : 'Mua ngay' }}</button>

        <div class="ai-consult-banner">
          <span class="ai-icon">🧁</span>
          <div>
            <strong>Bạn chưa rõ cách dùng nguyên liệu này?</strong>
            <p>Bếp Trưởng AI Tiệm Ốc sẵn sàng hướng dẫn bạn nhiệt độ nướng và công thức chi tiết!</p>
          </div>
          <button class="btn btn-outline btn-sm" @click="$emit('open-ai', product)">Hỏi AI Ngay</button>
        </div>
      </div>
    </div>
    <section v-if="similarProducts.length" class="similar-section"><div><span>Sản phẩm gợi ý</span><h2>Có thể bạn cũng thích</h2></div><div class="similar-grid"><article v-for="item in similarProducts" :key="item.id" class="similar-card" @click="router.push(`/product/${item.slug || item.id}`)"><img :src="item.image_url || defaultImg" :alt="item.name"><b>{{ item.name }}</b><small>{{ formatVND(item.price) }} / {{ item.unit }}</small></article></div></section>

    <div v-if="previewMedia" class="media-lightbox" role="dialog" aria-modal="true" aria-label="Xem ảnh đánh giá" @click.self="previewMedia = ''">
      <button type="button" class="media-lightbox-close" aria-label="Đóng" @click="previewMedia = ''">×</button>
      <video v-if="isVideo(previewMedia)" :src="previewMedia" controls autoplay></video>
      <img v-else :src="previewMedia" alt="Ảnh đánh giá của khách">
    </div>

    <!-- Toast Notification -->
    <div v-if="toastMessage" class="toast-notification">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { productApi, reviewApi } from '../api';
import { useCartStore } from '../stores/cart';

defineEmits(['open-ai']);

const route = useRoute();
const router = useRouter();
const cartStore = useCartStore();
const product = ref(null);
const isLoading = ref(true);
const quantity = ref(1);
const toastMessage = ref('');
const similarProducts = ref([]);
const showReviews = ref(false);
const reviews = ref([]);
const reviewsLoading = ref(false);
const previewMedia = ref('');
const isSoldOut = computed(() => Number(product.value?.stock_quantity || 0) <= 0);

const defaultImg = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80';

const fetchProduct = async () => {
  try {
    isLoading.value = true;
    product.value = null;
    similarProducts.value = [];
    const res = await productApi.getProductById(route.params.slug || route.params.id);
    product.value = res.product;
    const related = await productApi.getProducts({ category: res.product.category_id, limit: 8 }).catch(() => ({ products: [] }));
    const sameCategory = (related.products || []).filter(item => item.id !== res.product.id);
    if (sameCategory.length >= 4) {
      similarProducts.value = sameCategory.slice(0, 4);
    } else {
      const allProducts = await productApi.getProducts({ limit: 20 }).catch(() => ({ products: [] }));
      const merged = [...sameCategory, ...(allProducts.products || []).filter(item => item.id !== res.product.id && !sameCategory.some(existing => existing.id === item.id))];
      similarProducts.value = merged.slice(0, 4);
    }
  } catch (err) {
    console.error('Fetch product detail error:', err);
  } finally {
    isLoading.value = false;
  }
};

const clampDetailQuantity = () => {
  const available = Number(product.value?.stock_quantity || 0);
  quantity.value = Math.min(Math.max(1, Math.floor(Number(quantity.value) || 1)), available || 1);
};

const verifyAvailableQuantity = async () => {
  const result = await productApi.validateCart([{ id: product.value.id, quantity: quantity.value }]);
  const check = result.items?.[0];
  if (!check || check.status === 'unavailable' || Number(check.available_quantity) <= 0) {
    product.value.stock_quantity = 0;
    window.alert('Sản phẩm vừa hết hàng. Vui lòng chọn sản phẩm khác.');
    return false;
  }
  product.value.stock_quantity = Number(check.available_quantity);
  if (quantity.value > product.value.stock_quantity) {
    quantity.value = product.value.stock_quantity;
    window.alert(`Kho hiện chỉ còn ${quantity.value} ${product.value.unit || 'sản phẩm'}.`);
    return false;
  }
  return true;
};

const handleBuyNow = async () => {
  if (!product.value || isSoldOut.value) return;
  if (!(await verifyAvailableQuantity())) return;
  cartStore.addItem(product.value, quantity.value);
  router.push('/checkout');
};

const handleAddToCart = async () => {
  if (!product.value || isSoldOut.value) return;
  if (!(await verifyAvailableQuantity())) return;
  cartStore.addItem(product.value, quantity.value);
  toastMessage.value = `Đã thêm ${quantity.value} "${product.value.name}" vào giỏ hàng! 🥐`;
  setTimeout(() => {
    toastMessage.value = '';
  }, 2500);
};

const toggleReviews = async () => {
  showReviews.value = !showReviews.value;
  if (!showReviews.value || reviews.value.length || !product.value) return;
  try {
    reviewsLoading.value = true;
    const result = await reviewApi.getByProduct(product.value.id);
    reviews.value = result.reviews || [];
  } finally { reviewsLoading.value = false; }
};

const formatVND = (val) => Number(val || 0).toLocaleString('vi-VN') + 'đ';
const formatDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '';
const isVideo = (url = '') => /\.(mp4|webm|mov)(\?|$)/i.test(url);

onMounted(() => {
  fetchProduct();
});

watch(() => route.params.slug, fetchProduct);
</script>

<style scoped>
.product-detail-page {
  padding: 3rem 1.25rem 5rem;
}
.sold-out-text{color:#a22727;font-weight:700}.btn:disabled{background:#c8c0b9!important;color:#fff!important;cursor:not-allowed;box-shadow:none!important}

.detail-grid {
  display: grid;
  grid-template-columns: 1.1fr 1.3fr;
  gap: 3.5rem;
}

.main-image-card {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: var(--radius-xl);
}

.detail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery-badge {
  position: absolute;
  top: 16px;
  left: 16px;
  font-size: 0.85rem;
  padding: 6px 14px;
}

.detail-info {
  display: flex;
  flex-direction: column;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.rating-box {
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 3px;
  color: var(--color-secondary-dark);
  font-weight: 700;
}

.reviews-panel { margin: 1rem 0; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; background: #fff; }
.reviews-heading { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.reviews-heading h3 { margin:0; font-size:1rem; color:var(--color-primary); }
.reviews-heading button { border:0; background:none; color:var(--color-primary); font-weight:700; cursor:pointer; }
.no-reviews { color:var(--color-text-muted); font-size:.9rem; }
.review-card { border-top:1px dashed var(--border-color); margin-top:.7rem; padding-top:.7rem; font-size:.88rem; }
.review-card > div { display:flex; justify-content:space-between; gap:8px; }
.review-card p { margin:.35rem 0; }.store-response{margin-top:.55rem;padding:.55rem .7rem;border-radius:7px;background:#fff4f7;color:#5c3d48}.store-response b{color:var(--color-primary);font-size:.8rem}.store-response p{margin:.2rem 0 0}
.review-card small { color:var(--color-text-muted); }
.review-stars { color:#f3a51b; }.review-stars i { color:#ddd; font-style:normal; }
.review-media{display:flex;flex-wrap:wrap;gap:7px;margin-top:.5rem}.review-media-button{padding:0;border:0;background:transparent;cursor:zoom-in}.review-media img,.review-media video{display:block;width:90px;height:90px;object-fit:cover;border:1px solid var(--border-color);border-radius:6px}.media-lightbox{position:fixed;inset:0;z-index:2000;display:grid;place-items:center;padding:28px;background:#1b1114cc}.media-lightbox img,.media-lightbox video{max-width:min(900px,94vw);max-height:86vh;object-fit:contain;border-radius:10px;background:#111}.media-lightbox-close{position:fixed;top:18px;right:22px;width:42px;height:42px;border:0;border-radius:50%;background:#fff;color:#472532;font-size:2rem;line-height:1;cursor:pointer}

.star {
  color: #F59E0B;
}

.product-title {
  font-size: 2.2rem;
  color: var(--color-primary);
  line-height: 1.2;
  margin-bottom: 1rem;
}

.price-box {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 1.5rem;
}

.price-amount {
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-primary);
}

.price-unit {
  font-size: 1rem;
  color: var(--color-text-muted);
}

.category-line { color: var(--color-text-muted); margin: -0.7rem 0 1.3rem; font-size: .9rem; }

/* Shipping Notice Box */
.shipping-notice-box {
  background: var(--bg-amber-light);
  border: 1px solid #FDE68A;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-md);
  margin-bottom: 1.5rem;
}

.notice-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-secondary-dark);
  margin-bottom: 4px;
}

.notice-list {
  list-style: none;
  font-size: 0.82rem;
  color: var(--color-text-main);
  line-height: 1.5;
}

.product-desc {
  margin-bottom: 1.5rem;
}

.product-desc h3 {
  font-size: 1.05rem;
  color: var(--color-text-main);
  margin-bottom: 0.5rem;
}

.product-desc p {
  font-size: 0.92rem;
  color: var(--color-text-muted);
  line-height: 1.6;
}

.combo-breakdown-box {
  background: var(--bg-surface-soft);
  padding: 1rem 1.25rem;
  border-radius: var(--radius-md);
  margin-bottom: 1.5rem;
}

.combo-breakdown-box h3 {
  font-size: 0.95rem;
  color: var(--color-primary);
  margin-bottom: 0.5rem;
}

.combo-items-list {
  list-style: none;
  font-size: 0.88rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

/* Action Row */
.action-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.qty-selector {
  display: inline-flex;
  align-items: center;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-pill);
  background: #FFFFFF;
}

.qty-selector button {
  width: 44px;
  height: 44px;
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  font-weight: bold;
}

.qty-selector input {
  width: 58px;
  padding: 0 4px;
  text-align: center;
  border: 0;
  font-size: 1.1rem;
  font-weight: 700;
  background: transparent;
}

.btn-add {
  flex: 1;
  font-size: 1.05rem;
}

.buy-now { width: 100%; border: 0; border-radius: var(--radius-md); background: #312722; color: #fff; padding: .9rem 1rem; font-weight: 800; font-size: 1rem; cursor: pointer; margin: -1rem 0 1.25rem; }

/* AI Consult Banner */
.ai-consult-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--bg-accent-light);
  border: 1.5px dashed #FBCFE8;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-lg);
}

.ai-icon {
  font-size: 2rem;
}

.ai-consult-banner div {
  flex: 1;
}

.ai-consult-banner strong {
  font-size: 0.9rem;
  color: var(--color-primary);
}

.ai-consult-banner p {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-top: 2px;
}

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

.toast-notification {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-primary);
  color: #FFFFFF;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-pill);
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(160, 21, 62, 0.35);
  z-index: 2000;
}
.similar-section{grid-column:1/-1;margin-top:3.5rem;padding-top:2rem;border-top:1px solid var(--border-color)}.similar-section span{color:var(--color-primary);font-weight:700;font-size:.85rem}.similar-section h2{margin:.35rem 0 1.2rem;color:var(--color-text-main)}.similar-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:15px}.similar-card{display:grid;gap:8px;cursor:pointer;padding:10px;border:1px solid var(--border-color);border-radius:12px;background:#fff}.similar-card img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px}.similar-card b{font-size:.87rem;line-height:1.35}.similar-card small{color:var(--color-primary);font-weight:700}@media(max-width:700px){.similar-grid{grid-template-columns:repeat(2,1fr)}}

@media (max-width: 850px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
