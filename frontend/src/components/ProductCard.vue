<template>
  <div class="product-card card">
    <div class="card-media">
      <img :src="product.image_url || defaultImg" :alt="product.name" class="product-img" loading="lazy" />
      <div class="tags-container">
        <span v-if="product.is_combo" class="badge badge-combo">Set Combo</span>
        <span v-else-if="isSoldOut" class="badge sold-out-badge">Đã bán hết</span>
        <span v-else class="badge badge-fefo">Hàng mới về</span>
      </div>
      <button class="quick-add-btn" :disabled="isSoldOut" @click.stop="addToCart" :title="isSoldOut ? 'Sản phẩm đã bán hết' : 'Thêm vào giỏ'">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>

    <div class="card-content" @click="$router.push(`/product/${product.slug || product.id}`)">
      <div class="card-meta">
        <span class="product-sku">SKU: {{ product.sku }}</span>
        <div class="rating-box">
          <span class="star">★</span>
          <span>{{ Number(product.rating_average || 0).toFixed(1) }}</span>
        </div>
      </div>

      <h3 class="product-title" :title="product.name">{{ product.name }}</h3>

      <div class="card-bottom">
        <div class="price-wrap">
          <span class="price-val">{{ formatVND(product.price) }}</span>
          <span class="price-unit">/ {{ product.unit || 'gói' }}</span>
        </div>
        <button class="btn-buy-sm" :disabled="isSoldOut" @click.stop="addToCart">
          {{ isSoldOut ? 'Đã bán hết' : 'Chọn mua' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCartStore } from '../stores/cart';

const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['added-to-cart']);
const cartStore = useCartStore();
const isSoldOut = computed(() => Number(props.product.stock_quantity) <= 0);

const defaultImg = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80';

const formatVND = (amount) => {
  return Number(amount || 0).toLocaleString('vi-VN') + 'đ';
};

const addToCart = () => {
  if (isSoldOut.value) return;
  cartStore.addItem(props.product, 1);
  emit('added-to-cart', props.product);
};
</script>

<style scoped>
.product-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  cursor: pointer;
  background: #FFFFFF;
}

.card-media {
  position: relative;
  width: 100%;
  padding-top: 80%; /* 4:3 ratio */
  overflow: hidden;
  background: var(--bg-surface-soft);
}

.product-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.product-card:hover .product-img {
  transform: scale(1.05);
}

.tags-container {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.quick-add-btn {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #FFFFFF;
  border: 1px solid var(--border-color);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s;
  opacity: 0.9;
}

.quick-add-btn:hover {
  background: var(--color-primary);
  color: #FFFFFF;
  transform: scale(1.1);
  opacity: 1;
}
.quick-add-btn:disabled,.btn-buy-sm:disabled{cursor:not-allowed;opacity:.7;background:#f0ece8;color:#827870;border-color:#ddd5ce;transform:none}.sold-out-badge{background:#6f6259;color:#fff}

.card-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.35rem;
}

.rating-box {
  display: flex;
  align-items: center;
  gap: 2px;
  color: var(--color-secondary-dark);
  font-weight: 700;
}

.star {
  color: #F59E0B;
}

.product-title {
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.35;
  color: var(--color-text-main);
  margin-bottom: 0.75rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 2.7rem;
}

.card-bottom {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px dashed var(--border-color);
  padding-top: 0.6rem;
}

.price-wrap {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.price-val {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--color-primary);
}

.price-unit {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.btn-buy-sm {
  background: var(--bg-accent-light);
  color: var(--color-primary);
  border: 1px solid #FBCFE8;
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-pill);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-buy-sm:hover {
  background: var(--color-primary);
  color: #FFFFFF;
}

/* Thẻ sản phẩm phẳng: ảnh và thông tin là trọng tâm, không hiệu ứng nổi. */
.product-card{border-radius:0;box-shadow:none;border-color:#ded8ca}.product-card:hover{transform:none;box-shadow:none;border-color:#aaa18f}.product-img{transition:none}.product-card:hover .product-img{transform:none}.quick-add-btn{border-radius:2px;box-shadow:none}.quick-add-btn:hover{transform:none}.btn-buy-sm{border-radius:2px}.card-bottom{border-top-style:solid}
</style>
