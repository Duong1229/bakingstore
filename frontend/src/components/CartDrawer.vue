<template>
  <div v-if="isOpen" class="drawer-overlay" @click.self="$emit('close')">
    <div class="drawer-content">
      <!-- Header -->
      <div class="drawer-header">
        <div class="header-title">
          <h3>Giỏ Hàng Của Bạn</h3>
          <span class="count-badge">{{ cartStore.itemCount }} món</span>
        </div>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- Freeship Progress Bar -->
      <div class="freeship-box">
        <div class="freeship-text">
          <span v-if="cartStore.freeshipProgress.achieved">🎉 <strong>Tuyệt vời!</strong> Đơn hàng đã được FREESHIP</span>
          <span v-else>🚚 Mua thêm <strong>{{ formatVND(cartStore.freeshipProgress.remaining) }}</strong> để được <strong>FREESHIP</strong>!</span>
        </div>
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" :style="{ width: cartStore.freeshipProgress.percent + '%' }"></div>
        </div>
      </div>

      <!-- Shipping Destination Selector -->
      <div class="shipping-zone-selector">
        <label class="zone-label">Khu vực giao hàng:</label>
        <div class="zone-options">
          <button
            type="button"
            :class="['zone-btn', { active: isHanoi }]"
            @click="cartStore.setProvince('Hà Nội')"
          >
            🏛️ Hà Nội
            <small v-if="cartStore.subtotal < 300000">(Ship 15k)</small>
            <small v-else-if="cartStore.subtotal <= 500000">(Ship 10k)</small>
            <small v-else class="free-text">(Freeship)</small>
          </button>
          <button
            type="button"
            :class="['zone-btn', { active: !isHanoi }]"
            @click="cartStore.setProvince('Tỉnh thành khác')"
          >
            🚚 Tỉnh khác
            <small v-if="cartStore.subtotal <= 500000">(Ship 30k)</small>
            <small v-else class="free-text">(Freeship)</small>
          </button>
        </div>
      </div>

      <!-- Items List -->
      <div class="drawer-body">
        <div v-if="cartStore.items.length === 0" class="empty-cart">
          <div class="empty-icon">🥐</div>
          <p>Giỏ hàng của bạn đang trống trơn!</p>
          <button class="btn btn-primary btn-sm" @click="$emit('close'); $router.push('/products')">
            Khám phá nguyên liệu ngay
          </button>
        </div>

        <div v-else class="cart-items">
          <div v-for="item in cartStore.items" :key="item.id" class="cart-item">
            <img :src="item.image_url || defaultBakingImg" :alt="item.name" class="item-img" />
            <div class="item-info">
              <span v-if="item.is_combo" class="badge badge-combo" style="font-size: 0.65rem;">Set Combo</span>
              <h4 class="item-name">{{ item.name }}</h4>
              <div class="item-price">{{ formatVND(item.price) }} / {{ item.unit }}</div>

              <!-- Quantity Controls -->
              <div class="qty-row">
                <div class="qty-control">
                  <button @click="cartStore.updateQuantity(item.id, item.quantity - 1)" :disabled="item.quantity <= 1">-</button>
                  <span>{{ item.quantity }}</span>
                  <button @click="cartStore.updateQuantity(item.id, item.quantity + 1)">+</button>
                </div>
                <button class="remove-btn" @click="cartStore.removeItem(item.id)" title="Xóa món">Xóa</button>
              </div>
            </div>
            <div class="item-total">
              {{ formatVND(item.price * item.quantity) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Summary & Checkout -->
      <div v-if="cartStore.items.length > 0" class="drawer-footer">
        <div class="summary-line">
          <span>Tiền hàng:</span>
          <span>{{ formatVND(cartStore.subtotal) }}</span>
        </div>
        <div class="summary-line">
          <span>Phí vận chuyển ({{ cartStore.shippingProvince }}):</span>
          <span v-if="cartStore.shippingFee === 0" class="free-badge">MIỄN PHÍ</span>
          <span v-else>{{ formatVND(cartStore.shippingFee) }}</span>
        </div>
        <div v-if="cartStore.discountAmount > 0" class="summary-line discount">
          <span>Voucher giảm giá:</span>
          <span>-{{ formatVND(cartStore.discountAmount) }}</span>
        </div>
        <div class="summary-line total-line">
          <span>Tổng thanh toán:</span>
          <span class="total-price">{{ formatVND(cartStore.finalAmount) }}</span>
        </div>

        <button class="btn btn-primary btn-checkout" @click="goToCheckout">
          Tiến Hành Đặt Hàng ({{ formatVND(cartStore.finalAmount) }})
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';

defineProps({
  isOpen: Boolean,
});

const emit = defineEmits(['close']);
const router = useRouter();
const cartStore = useCartStore();
const authStore = useAuthStore();

const defaultBakingImg = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80';

const isHanoi = computed(() => {
  return cartStore.shippingProvince && (
    cartStore.shippingProvince.toLowerCase().includes('hà nội') ||
    cartStore.shippingProvince.toLowerCase().includes('hanoi')
  );
});

const formatVND = (amount) => {
  return Number(amount || 0).toLocaleString('vi-VN') + 'đ';
};

const goToCheckout = () => {
  emit('close');
  if (!authStore.isAuthenticated) {
    router.push({ path: '/login', query: { redirect: '/checkout', reason: 'login' } });
    return;
  }
  router.push('/checkout');
};
</script>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(45, 30, 24, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.drawer-content {
  width: 100%;
  max-width: 440px;
  background: #FFFFFF;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 32px rgba(45, 30, 24, 0.15);
  animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideLeft {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.drawer-header {
  padding: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.header-title h3 {
  font-family: var(--font-serif);
  font-size: 1.25rem;
  color: var(--color-primary);
}

.count-badge {
  background: var(--bg-accent-light);
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--color-text-muted);
}

/* Freeship Progress */
.freeship-box {
  background: var(--bg-amber-light);
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid #FDE68A;
}

.freeship-text {
  font-size: 0.82rem;
  margin-bottom: 0.35rem;
  color: var(--color-secondary-dark);
}

.progress-bar-bg {
  height: 6px;
  background: rgba(217, 119, 6, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--color-secondary);
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* Shipping Zone Selector */
.shipping-zone-selector {
  padding: 0.75rem 1.25rem;
  background: var(--bg-surface-soft);
  border-bottom: 1px solid var(--border-color);
}

.zone-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: 0.4rem;
}

.zone-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.zone-btn {
  padding: 0.5rem 0.6rem;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--border-color);
  background: #FFFFFF;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: all 0.2s;
}

.zone-btn.active {
  border-color: var(--color-primary);
  background: var(--bg-accent-light);
  color: var(--color-primary);
}

.zone-btn small {
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.zone-btn .free-text {
  color: var(--success);
  font-weight: 700;
}

/* Body Items */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
}

.empty-cart {
  text-align: center;
  padding: 3rem 1rem;
}

.empty-icon {
  font-size: 3.5rem;
  margin-bottom: 0.5rem;
}

.cart-items {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cart-item {
  display: flex;
  gap: 0.75rem;
  padding-bottom: 1rem;
  border-bottom: 1px dashed var(--border-color);
}

.item-img {
  width: 68px;
  height: 68px;
  object-fit: cover;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.item-info {
  flex: 1;
}

.item-name {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 2px 0;
  line-height: 1.3;
}

.item-price {
  font-size: 0.82rem;
  color: var(--color-text-muted);
  margin-bottom: 0.4rem;
}

.qty-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.qty-control {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  background: var(--bg-surface-soft);
  overflow: hidden;
}

.qty-control button {
  width: 26px;
  height: 26px;
  background: none;
  border: none;
  font-weight: bold;
  cursor: pointer;
}

.qty-control span {
  padding: 0 8px;
  font-size: 0.85rem;
  font-weight: 600;
}

.remove-btn {
  background: none;
  border: none;
  color: var(--color-text-light);
  font-size: 0.78rem;
  cursor: pointer;
  text-decoration: underline;
}

.remove-btn:hover {
  color: var(--danger);
}

.item-total {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--color-primary);
  align-self: center;
}

/* Footer */
.drawer-footer {
  padding: 1.25rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-surface-soft);
}

.summary-line {
  display: flex;
  justify-content: space-between;
  font-size: 0.88rem;
  margin-bottom: 0.4rem;
  color: var(--color-text-muted);
}

.summary-line.discount {
  color: var(--danger);
}

.free-badge {
  color: var(--success);
  font-weight: 800;
}

.total-line {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-text-main);
  border-top: 1px solid var(--border-color);
  padding-top: 0.6rem;
  margin-top: 0.6rem;
}

.total-price {
  color: var(--color-primary);
  font-size: 1.3rem;
}

.btn-checkout {
  width: 100%;
  margin-top: 0.75rem;
  padding: 0.85rem;
  font-size: 1rem;
}
</style>
