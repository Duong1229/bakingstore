<template>
  <div class="checkout-page container">
    <router-link to="/products" class="back-link">← Quay lại mua sắm</router-link>
    <div class="page-title-wrap">
      <span class="sub-title font-handwriting">Thanh toán an tâm</span>
      <h1 class="main-title font-serif">Đặt Hàng Tiệm Ốc</h1>
    </div>

    <div v-if="cartStore.items.length === 0" class="empty-cart-card card">
      <div class="empty-icon">🥐</div>
      <h2>Giỏ hàng của bạn đang trống!</h2>
      <p>Hãy thêm các nguyên liệu thơm ngon vào giỏ trước khi tiến hành đặt hàng nhé.</p>
      <router-link to="/products" class="btn btn-primary" style="margin-top: 1rem;">
        Khám phá nguyên liệu ngay
      </router-link>
    </div>

    <form v-else class="checkout-grid" @submit.prevent="handlePlaceOrder">
      <!-- Left: Delivery Form -->
      <div class="checkout-left">
        <div class="card checkout-card">
          <h2 class="card-heading font-serif">1. Thông Tin Nhận Hàng</h2>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Họ và tên người nhận (*)</label>
              <input v-model="form.recipient_name" type="text" class="form-input" placeholder="Nguyễn Thị Mai" required />
            </div>
            <div class="form-group">
              <label class="form-label">Số điện thoại liên hệ (*)</label>
              <input v-model.trim="form.recipient_phone" type="tel" inputmode="numeric" class="form-input" placeholder="09xxxxxxxx" pattern="0[0-9]{9}" title="Số điện thoại gồm đúng 10 chữ số và bắt đầu bằng số 0" required />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group"><label class="form-label">Tỉnh / Thành phố (*)</label><select v-model="form.shipping_province" class="form-input" @change="cartStore.setProvince(form.shipping_province)" required><option value="Hà Nội">Hà Nội</option><option value="Tỉnh thành khác">Tỉnh / thành phố khác</option></select></div>
            <div class="form-group"><label class="form-label">Phường / Xã (*)</label><input v-model.trim="form.shipping_ward" class="form-input" placeholder="Ví dụ: Phường Dương Nội" required></div>
          </div>

          <div class="form-group">
            <label class="form-label">Địa chỉ cụ thể (*)</label>
            <input v-model.trim="form.shipping_address" type="text" class="form-input" placeholder="Số nhà, tên đường, tòa nhà..." required />
          </div>

          <div class="form-group">
            <label class="form-label">Ghi chú cho shipper hoặc tiệm</label>
            <textarea v-model="form.notes" class="form-textarea" rows="2" placeholder="Giao giờ hành chính, gọi trước khi đến..."></textarea>
          </div>
        </div>

        <!-- Phương thức thanh toán -->
        <div class="card checkout-card" style="margin-top: 1.5rem;">
          <h2 class="card-heading font-serif">2. Phương Thức Thanh Toán</h2>
          <div class="payment-methods">
            <label :class="['payment-card', { active: form.payment_method === 'vietqr' }]">
              <input type="radio" name="payment_method" value="vietqr" v-model="form.payment_method" />
              <div class="payment-card-body">
                <div class="method-header">
                  <strong>💳 Quét Mã VietQR (Khuyên dùng)</strong>
                  <span class="badge badge-combo" style="font-size: 0.7rem;">Tự Động 24/7</span>
                </div>
                <p>Quét mã qua app ngân hàng bất kỳ, SePay tự động xác nhận đơn trong 3 giây.</p>
              </div>
            </label>

            <label :class="['payment-card', { active: form.payment_method === 'cash' }]">
              <input type="radio" name="payment_method" value="cash" v-model="form.payment_method" />
              <div class="payment-card-body">
                <div class="method-header">
                  <strong>💵 Tiền Mặt Khi Nhận Hàng (COD)</strong>
                </div>
                <p>Thanh toán trực tiếp cho nhân viên giao hàng khi nhận kiện nguyên liệu.</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- Right: Order Summary & Voucher -->
      <div class="checkout-right">
        <div class="card summary-card">
          <h2 class="card-heading font-serif">Đơn Hàng Của Bạn</h2>
          <p v-if="stockMessage" class="stock-message">{{ stockMessage }}</p>

          <!-- Items list -->
          <div class="checkout-items">
            <div v-for="item in cartStore.items" :key="item.id" class="item-row">
              <div class="item-name-qty">
                <strong>{{ item.name }}</strong>
                <div class="checkout-quantity">
                  <button type="button" @click="cartStore.updateQuantity(item.id, item.quantity - 1)" :disabled="item.quantity <= 1" aria-label="Giảm số lượng">−</button>
                  <input :value="item.quantity" type="number" min="1" :max="item.stock_quantity ?? undefined" :aria-label="`Số lượng ${item.name}`" @change="updateCartQuantity(item, $event)">
                  <small>{{ item.unit }}<span v-if="item.stock_quantity !== null && item.stock_quantity !== undefined"> · còn {{ item.stock_quantity }}</span></small>
                  <button type="button" @click="cartStore.updateQuantity(item.id, item.quantity + 1)" :disabled="item.stock_quantity !== null && item.stock_quantity !== undefined && item.quantity >= item.stock_quantity" aria-label="Tăng số lượng">+</button>
                  <button type="button" class="remove-item" @click="cartStore.removeItem(item.id)">Xóa</button>
                </div>
              </div>
              <div class="item-price">{{ formatVND(item.price * item.quantity) }}</div>
            </div>
          </div>

          <!-- Voucher Input -->
          <div class="voucher-box">
            <div class="voucher-input-wrap">
              <input v-model="voucherCode" type="text" placeholder="Mã giảm giá" class="voucher-input" @input="clearVoucherWhenEdited" />
              <button type="button" class="btn btn-secondary btn-sm" @click="handleApplyVoucher">Áp dụng</button>
            </div>
            <button v-if="cartStore.voucher" type="button" class="clear-voucher" @click="clearVoucher">Bỏ mã {{ cartStore.voucher.code }}</button>
            <div v-if="voucherMsg" :class="['voucher-msg', voucherMsgType]">
              {{ voucherMsg }}
            </div>
          </div>

          <!-- Total Calculation -->
          <div class="calculation-box">
            <div class="calc-row">
              <span>Tạm tính tiền hàng:</span>
              <span>{{ formatVND(cartStore.subtotal) }}</span>
            </div>
            <div class="calc-row">
              <span>Phí vận chuyển ({{ form.shipping_province }}):</span>
              <span v-if="cartStore.shippingFee === 0" class="free-text">MIỄN PHÍ</span>
              <span v-else>{{ formatVND(cartStore.shippingFee) }}</span>
            </div>
            <div v-if="cartStore.discountAmount > 0" class="calc-row discount-row">
              <span>Giảm giá (Voucher):</span>
              <span>-{{ formatVND(cartStore.discountAmount) }}</span>
            </div>
            <div class="calc-row final-row">
              <span>Tổng thanh toán:</span>
              <span class="final-amount">{{ formatVND(cartStore.finalAmount) }}</span>
            </div>
          </div>

          <!-- Submit Button -->
          <button type="submit" class="btn btn-primary btn-submit-order" :disabled="isSubmitting">
            <span v-if="isSubmitting">Đang xử lý đơn...</span>
            <span v-else>Xác Nhận Đặt Hàng ({{ formatVND(cartStore.finalAmount) }})</span>
          </button>

          <p class="terms-notice">
            Bằng cách đặt hàng, bạn đồng ý với chính sách chất lượng và cam kết date mới từ Tiệm Ốc.
          </p>
        </div>
      </div>
    </form>

    <div v-if="showLoginPrompt" class="login-backdrop" @click.self="showLoginPrompt=false">
      <section class="login-prompt card" role="dialog" aria-modal="true">
        <span class="login-icon">🔐</span>
        <h2>Bạn cần đăng nhập để đặt hàng</h2>
        <p>Đăng nhập giúp Tiệm Ốc lưu đơn hàng, tự điền thông tin nhận hàng và theo dõi giao hàng cho bạn.</p>
        <div class="login-actions"><router-link class="btn btn-primary" :to="{ path: '/login', query: { redirect: '/checkout' } }">Đăng nhập để đặt hàng</router-link><button type="button" class="btn btn-secondary" @click="showLoginPrompt=false">Tiếp tục xem giỏ hàng</button></div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { orderApi } from '../api';

const router = useRouter();
const cartStore = useCartStore();
const authStore = useAuthStore();

const form = reactive({
  recipient_name: authStore.user?.full_name || '',
  recipient_phone: authStore.user?.phone || '',
  shipping_address: authStore.user?.address || '',
  shipping_province: cartStore.shippingProvince || 'Hà Nội',
  shipping_ward: '',
  payment_method: 'vietqr',
  notes: '',
});

const voucherCode = ref('');
const voucherMsg = ref('');
const voucherMsgType = ref('');
const isSubmitting = ref(false);
const stockMessage = ref('');
const showLoginPrompt = ref(false);

const isHanoi = computed(() => {
  return form.shipping_province && (
    form.shipping_province.toLowerCase().includes('hà nội') ||
    form.shipping_province.toLowerCase().includes('hanoi')
  );
});

const formatVND = (val) => Number(val || 0).toLocaleString('vi-VN') + 'đ';

const updateCartQuantity = async (item, event) => {
  const requested = Math.max(1, Math.floor(Number(event.target.value) || 1));
  await cartStore.updateQuantity(item.id, requested);
  const updated = cartStore.items.find(entry => entry.id === item.id);
  if (!updated) {
    stockMessage.value = `${item.name} đã hết hàng và được bỏ khỏi giỏ.`;
  } else if (updated.quantity < requested) {
    stockMessage.value = `${item.name} chỉ còn ${updated.quantity} ${item.unit}. Số lượng đã được cập nhật.`;
  }
};

const handleApplyVoucher = () => {
  const code = voucherCode.value.trim().toUpperCase();
  if (!code) return clearVoucher();
  orderApi.validateVoucher({ code, subtotal: cartStore.subtotal }).then(result => {
    cartStore.applyVoucher(result.voucher);
    voucherCode.value = result.voucher.code;
    voucherMsg.value = `Đã áp dụng mã ${result.voucher.code}: giảm ${formatVND(result.discount_amount)}.`;
    voucherMsgType.value = 'success';
  }).catch(error => {
    cartStore.removeVoucher();
    voucherMsg.value = error.message || 'Mã giảm giá không hợp lệ hoặc đã hết hạn.';
    voucherMsgType.value = 'error';
  });
};
const clearVoucher = () => { cartStore.removeVoucher(); voucherCode.value = ''; voucherMsg.value = ''; voucherMsgType.value = ''; };
const clearVoucherWhenEdited = () => { if (cartStore.voucher && voucherCode.value.trim().toUpperCase() !== cartStore.voucher.code) { cartStore.removeVoucher(); voucherMsg.value = ''; voucherMsgType.value = ''; } };

const handlePlaceOrder = async () => {
  if (cartStore.items.length === 0 || isSubmitting.value) return;
  if (!authStore.isAuthenticated) { showLoginPrompt.value = true; return; }
  if (!/^0\d{9}$/.test(form.recipient_phone)) { window.alert('Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0.'); return; }

  try {
    isSubmitting.value = true;
    const stockChanges = await cartStore.syncStock();
    if (stockChanges.length) {
      stockMessage.value = stockChanges.join(' ');
      return;
    }
    const orderPayload = {
      order_type: 'online',
      items: cartStore.items.map(i => ({
        product_id: i.id,
        quantity: i.quantity,
        unit_price: i.price,
      })),
      recipient_name: form.recipient_name,
      recipient_phone: form.recipient_phone,
      shipping_address: `${form.shipping_address}, ${form.shipping_ward}, ${form.shipping_province}`,
      shipping_province: form.shipping_province,
      shipping_fee: cartStore.shippingFee,
      voucher_code: cartStore.voucher?.code || null,
      payment_method: form.payment_method,
      notes: form.notes,
    };

    const res = await orderApi.createOrder(orderPayload);
    cartStore.clearCart();
    // Chuyển sang trang chi tiết đơn hàng
    router.push(`/order/${res.order.id}`);
  } catch (err) {
    alert(err.message || 'Đặt hàng không thành công, vui lòng thử lại.');
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(async () => {
  try {
    const stockChanges = await cartStore.syncStock();
    if (stockChanges.length) stockMessage.value = stockChanges.join(' ');
  } catch {
    // Không chặn khách xem giỏ khi mạng tạm thời lỗi; backend vẫn kiểm tra lại trước khi tạo đơn.
  }
});
</script>

<style scoped>
.checkout-page {
  padding: 2.5rem 1.25rem 5rem;
}
.back-link{display:inline-block;margin-bottom:1rem;color:var(--color-primary);font-weight:700;text-decoration:none}

.page-title-wrap {
  margin-bottom: 2rem;
}

.sub-title {
  font-size: 1.3rem;
  color: var(--color-secondary-dark);
}

.main-title {
  font-size: 2.2rem;
  color: var(--color-primary);
}

.empty-cart-card {
  text-align: center;
  padding: 4rem 2rem;
  max-width: 500px;
  margin: 0 auto;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.checkout-grid {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 2rem;
  align-items: flex-start;
}

.checkout-card, .summary-card {
  padding: 1.75rem;
  background: #FFFFFF;
}

.card-heading {
  font-size: 1.25rem;
  color: var(--color-primary);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.75rem;
  margin-bottom: 1.25rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

/* Province Selector */
.province-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.radio-card {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  border: 1.5px solid var(--border-color);
  padding: 0.85rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  background: var(--bg-surface-soft);
  transition: all 0.2s;
}

.radio-card.active {
  border-color: var(--color-primary);
  background: var(--bg-accent-light);
}

.radio-card strong {
  display: block;
  font-size: 0.88rem;
  color: var(--color-text-main);
}

.fee-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.free-text {
  color: var(--success);
  font-weight: 800;
}

/* Payment Methods */
.payment-methods {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.payment-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  background: #FFFFFF;
  transition: all 0.2s;
}

.payment-card.active {
  border-color: var(--color-primary);
  background: var(--bg-accent-light);
}

.payment-card-body {
  flex: 1;
}

.method-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.payment-card p {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

/* Summary Card */
.checkout-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 250px;
  overflow-y: auto;
  border-bottom: 1px dashed var(--border-color);
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.item-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.88rem;
}

.item-name-qty small {
  display: block;
  color: var(--color-text-muted);
}

.checkout-quantity { display: flex; align-items: center; gap: 8px; margin-top: 7px; flex-wrap:wrap; }
.checkout-quantity button { width: 25px; height: 25px; border: 1px solid var(--border-color); border-radius: 6px; background: #fff; cursor: pointer; font-weight: 700; }
.checkout-quantity button:disabled { opacity: .4; cursor: not-allowed; }
.checkout-quantity input { width: 52px; height: 27px; padding: 2px 5px; border: 1px solid var(--border-color); border-radius: 6px; text-align:center; font:inherit; }
.checkout-quantity small { display:inline; }
.checkout-quantity .remove-item { width: auto; padding: 0 7px; color: #a22727; background: #fff1f1; border-color: #ffd6d6; }
.stock-message { margin: -4px 0 12px; padding: 9px 10px; border-radius: 8px; background: #fff5e8; color: #944d08; font-size: .84rem; line-height: 1.45; }

.voucher-box {
  margin-bottom: 1.25rem;
}

.voucher-input-wrap {
  display: flex;
  gap: 0.5rem;
}

.voucher-input {
  flex: 1;
  padding: 0.5rem 0.8rem;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-md);
  outline: none;
  font-size: 0.85rem;
  text-transform: uppercase;
}

.voucher-msg {
  font-size: 0.78rem;
  margin-top: 4px;
}
.voucher-msg.success { color: var(--success); }
.voucher-msg.error { color: var(--danger); }
.clear-voucher{margin-top:.45rem;border:0;background:transparent;color:var(--color-primary);font:inherit;font-size:.78rem;font-weight:700;cursor:pointer;padding:0}

.calculation-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.88rem;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1rem;
  margin-bottom: 1.25rem;
}

.calc-row {
  display: flex;
  justify-content: space-between;
}

.discount-row {
  color: var(--danger);
}

.final-row {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-text-main);
  border-top: 1px dashed var(--border-color);
  padding-top: 0.75rem;
  margin-top: 0.25rem;
}

.final-amount {
  color: var(--color-primary);
  font-size: 1.35rem;
}

.btn-submit-order {
  width: 100%;
  padding: 0.95rem;
  font-size: 1.05rem;
}

.terms-notice {
  font-size: 0.75rem;
  color: var(--color-text-light);
  text-align: center;
  margin-top: 0.75rem;
  line-height: 1.4;
}
.login-backdrop{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;padding:20px;background:#24181488}.login-prompt{width:min(460px,100%);padding:28px;text-align:center;background:#fff}.login-icon{font-size:2.3rem}.login-prompt h2{margin:.5rem 0;color:var(--color-primary);font-size:1.3rem}.login-prompt p{margin:0;color:var(--color-text-muted);line-height:1.5}.login-actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:22px}.login-actions .btn{text-decoration:none}

@media (max-width: 850px) {
  .checkout-grid {
    grid-template-columns: 1fr;
  }
  .form-row, .province-selector {
    grid-template-columns: 1fr;
  }
}
</style>
