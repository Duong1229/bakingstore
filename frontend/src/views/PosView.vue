<template>
  <div class="pos-page">
    <!-- Top POS Bar -->
    <div class="pos-top-bar">
      <div class="pos-brand">
        <span class="pos-title font-serif">TIỆM ỐC • POS THU NGÂN</span>
        <span class="badge badge-pos">Điểm Bán & Soạn Hàng</span>
      </div>

      <div class="pos-tabs">
        <button
          :class="['pos-tab-btn', { active: activeTab === 'cashier' }]"
          @click="activeTab = 'cashier'"
        >
          🛒 Bán Hàng Tại Quầy
        </button>
        <button
          :class="['pos-tab-btn', { active: activeTab === 'picking' }]"
          @click="activeTab = 'picking'; fetchOnlineOrders();"
        >
          📦 Soạn Hàng Kho ({{ onlineOrders.length }})
        </button>
      </div>

      <div class="pos-staff-info">
        <span>Thu ngân: <strong>{{ authStore.user?.full_name || 'Nhân viên POS' }}</strong></span>
        <router-link :to="authStore.isAdmin ? '/admin' : '/admin/revenue'" class="exit-pos-btn">Thoát POS ✕</router-link>
      </div>
    </div>

    <!-- TAB 1: CASHIER POS -->
    <div v-if="activeTab === 'cashier'" class="pos-body-grid">
      <!-- Left: Product Catalog & Barcode Scanner -->
      <div class="pos-catalog">
        <!-- Barcode Search Input -->
        <div class="barcode-search-box">
          <span class="barcode-icon">📟</span>
          <input
            ref="barcodeInput"
            v-model="barcodeQuery"
            type="text"
            class="barcode-input"
            placeholder="Quét mã vạch Barcode hoặc gõ SKU (Enter để thêm ngay)..."
            @keyup.enter="handleBarcodeSubmit"
          />
          <button class="btn btn-primary btn-sm" @click="handleBarcodeSubmit">Quét / Tìm</button>
        </div>

        <!-- Quick Categories -->
        <div class="quick-cat-row">
          <button
            v-for="cat in categories"
            :key="cat.id"
            :class="['cat-chip', { active: selectedCat === cat.id }]"
            @click="selectedCat = cat.id"
          >
            {{ cat.name }}
          </button>
        </div>

        <!-- Products Grid -->
        <div class="pos-products-grid">
          <div
            v-for="p in filteredProducts"
            :key="p.id"
            class="pos-product-item card"
            @click="addToPosCart(p)"
          >
            <div class="item-badge-wrap">
              <span v-if="p.is_combo" class="badge badge-combo" style="font-size: 0.65rem;">Combo</span>
              <span class="item-sku">{{ p.sku }}</span>
            </div>
            <h4 class="item-name">{{ p.name }}</h4>
            <div class="item-price-row">
              <span class="item-price">{{ formatVND(p.price) }}</span>
              <span class="item-unit">/ {{ p.unit || 'gói' }}</span>
            </div>
            <small class="stock-available">Còn {{ p.stock_quantity }} {{ p.unit || 'sản phẩm' }}</small>
          </div>
        </div>
      </div>

      <!-- Right: Current POS Cart / Bill Builder -->
      <div class="pos-cart-panel card">
        <div class="cart-header">
          <h3>Hóa Đơn Hiện Tại</h3>
          <button v-if="posCart.length > 0" class="clear-cart-btn" @click="posCart = []">Làm mới</button>
        </div>

        <div class="pos-customer-box">
          <label>Khách mua tại quầy</label>
          <div class="customer-search"><input v-model.trim="customerQuery" placeholder="Tìm tên hoặc số điện thoại" @input="searchCustomers"><button type="button" @click="showNewCustomer=!showNewCustomer">+ Khách mới</button></div>
          <div v-if="customerMatches.length" class="customer-results"><button v-for="customer in customerMatches" :key="customer.id" type="button" @click="selectCustomer(customer)">{{ customer.full_name }} · {{ customer.phone || 'Chưa có SĐT' }}</button></div>
          <div v-if="showNewCustomer" class="new-customer"><input v-model.trim="newCustomer.full_name" placeholder="Họ tên khách"><input v-model.trim="newCustomer.phone" inputmode="numeric" placeholder="SĐT 10 số"><button type="button" @click="createCustomer">Lưu khách</button></div>
          <small v-if="selectedCustomer">Đang xuất hóa đơn cho: <b>{{ selectedCustomer.full_name }}</b>{{ selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : '' }}</small>
        </div>

        <!-- Cart items list -->
        <div class="pos-cart-items">
          <div v-if="posCart.length === 0" class="pos-empty-cart">
            <span>🛒</span>
            <p>Chưa có món nào. Quét mã vạch hoặc bấm vào sản phẩm bên trái để tính tiền.</p>
          </div>

          <div v-else v-for="item in posCart" :key="item.id" class="pos-cart-row">
            <div class="row-info">
              <div class="row-name">{{ item.name }}</div>
              <div class="row-sub">{{ formatVND(item.price) }} / {{ item.unit }}</div>
            </div>

            <div class="row-qty">
              <button @click="updateQty(item.id, item.quantity - 1)">-</button>
              <span>{{ item.quantity }}</span>
              <button @click="updateQty(item.id, item.quantity + 1)">+</button>
            </div>

            <div class="row-total">
              {{ formatVND(item.price * item.quantity) }}
            </div>

            <button class="del-row-btn" @click="removeFromPosCart(item.id)">✕</button>
          </div>
        </div>

        <!-- POS Checkout Summary -->
        <div class="pos-cart-footer">
          <div class="pos-summary-line">
            <span>Tổng số lượng:</span>
            <strong>{{ totalPosQty }} món</strong>
          </div>
          <div class="pos-summary-line total-line">
            <span>TỔNG TIỀN:</span>
            <span class="pos-total-val">{{ formatVND(totalPosAmount) }}</span>
          </div>

          <!-- Payment Method Options -->
          <div class="payment-selector">
            <button
              type="button"
              :class="['pay-btn', { active: paymentMethod === 'cash' }]"
              @click="selectPaymentMethod('cash')"
            >
              💵 Tiền Mặt
            </button>
            <button
              type="button"
              :class="['pay-btn', { active: paymentMethod === 'vietqr' }]"
              @click="selectPaymentMethod('vietqr')"
            >
              📱 VietQR Quét Mã
            </button>
          </div>
          <div v-if="posQrOrder" class="pos-qr"><b>Quét VietQR để thanh toán</b><img :src="posQrOrder.qr_code_url" alt="Mã VietQR POS"><span>{{ formatVND(posQrOrder.final_amount) }} · Nội dung: {{ posQrOrder.order_code }}</span><small>Đang chờ SePay xác nhận. Hóa đơn sẽ tự mở sau khi nhận tiền.</small></div>

          <!-- Action Buttons -->
          <button
            class="btn btn-primary btn-checkout-pos"
            v-if="!posQrOrder"
            :disabled="posCart.length === 0 || isProcessing"
            @click="handlePosCheckout"
          >
            <span v-if="isProcessing">Đang tạo đơn...</span>
            <span v-else>{{ paymentMethod === 'vietqr' ? `Hiển thị VietQR để thanh toán (${formatVND(totalPosAmount)})` : `Thanh Toán & In Bill K80 (${formatVND(totalPosAmount)})` }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- TAB 2: WAREHOUSE PICKING SLIPS -->
    <div v-else class="picking-body container">
      <div class="picking-header">
        <div>
          <h2 class="font-serif" style="color: var(--color-primary);">Danh Sách Đơn Hàng Cần Soạn Kho</h2>
          <p>Nhân viên bấm "In Phiếu Soạn Hàng" để lấy phiếu nhặt hàng theo vị trí Kệ/Tủ mát và Lô hàng FEFO.</p>
        </div>
        <button class="btn btn-secondary btn-sm" @click="fetchOnlineOrders">Làm mới danh sách 🔄</button>
      </div>

      <div v-if="isPickingLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Đang tải danh sách đơn...</p>
      </div>

      <div v-else-if="onlineOrders.length === 0" class="empty-state">
        <div class="empty-emoji">🎉</div>
        <h3>Tuyệt vời! Không còn đơn hàng nào đang chờ soạn.</h3>
      </div>

      <div v-else class="orders-table-card card">
        <table class="picking-table">
          <thead>
            <tr>
              <th>Mã Đơn</th>
              <th>Khách Hàng</th>
              <th>Tổng Tiền</th>
              <th>Thanh Toán</th>
              <th>Trạng Thái</th>
              <th>Hành Động Soạn Kho</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ord in onlineOrders" :key="ord.id">
              <td><strong>{{ ord.order_code }}</strong></td>
              <td>
                <div>{{ ord.recipient_name || 'Khách hàng' }}</div>
                <small style="color: #666;">{{ ord.recipient_phone }}</small>
              </td>
              <td><strong>{{ formatVND(ord.final_amount) }}</strong></td>
              <td>
                <span v-if="ord.payment_status === 'paid'" class="badge badge-fefo">Đã trả</span>
                <span v-else class="badge badge-warning">Chờ trả (COD/QR)</span>
              </td>
              <td>
                <span class="badge badge-pos">{{ ord.order_status }}</span>
              </td>
              <td>
                <div class="action-btns">
                  <button type="button" class="btn btn-primary btn-sm" @click="openDocument(ord.id, 'picking')">
                    📋 In Phiếu Soạn (FEFO)
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm" @click="openDocument(ord.id, 'receipt')">
                    🖨️ Bill K80
                  </button>
                  <button class="btn btn-outline btn-sm" @click="advanceStatus(ord.id)">
                    Chuyển Giao Hàng →
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { productApi, orderApi } from '../api';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const activeTab = ref('cashier');

const products = ref([]);
const barcodeQuery = ref('');
const barcodeInput = ref(null);
const selectedCat = ref('all');
const posCart = ref([]);
const paymentMethod = ref('cash');
const isProcessing = ref(false);
const customerQuery = ref(''); const customerMatches = ref([]); const selectedCustomer = ref(null); const showNewCustomer = ref(false); const newCustomer = ref({ full_name: '', phone: '' }); const posQrOrder = ref(null);
let posQrPoll = null;

const onlineOrders = ref([]);
const isPickingLoading = ref(false);
const openDocument = async (id, type) => {
  try {
    const blob = type === 'picking' ? await orderApi.downloadPickingSlip(id) : await orderApi.downloadReceipt(id);
    const url = URL.createObjectURL(blob);
    const popup = window.open(url, '_blank', 'noopener');
    if (!popup) window.alert('Trình duyệt đang chặn cửa sổ in. Vui lòng cho phép pop-up rồi thử lại.');
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) { window.alert(error.message || 'Không thể mở phiếu in.'); }
};
let customerSearchTimer;
const searchCustomers = () => { clearTimeout(customerSearchTimer); if (customerQuery.value.length < 2) { customerMatches.value=[]; return; } customerSearchTimer=setTimeout(async()=>{try{customerMatches.value=(await orderApi.searchPosCustomers(customerQuery.value)).customers||[];}catch{customerMatches.value=[];}},250); };
const selectCustomer = customer => { selectedCustomer.value=customer; customerQuery.value=customer.full_name; customerMatches.value=[]; showNewCustomer.value=false; };
const createCustomer = async () => { try { if(!/^0\d{9}$/.test(newCustomer.value.phone)) return window.alert('Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0.'); const result=await orderApi.createPosCustomer(newCustomer.value); selectCustomer(result.customer); newCustomer.value={full_name:'',phone:''}; } catch(error){window.alert(error.message||'Không thể thêm khách hàng.');} };
const startPosQrPolling = () => { if (posQrPoll) clearInterval(posQrPoll); posQrPoll = window.setInterval(async () => { if (!posQrOrder.value) return clearInterval(posQrPoll); try { const result = await orderApi.getOrderDetail(posQrOrder.value.id); if (result.order?.payment_status === 'paid') { const orderId = posQrOrder.value.id; posQrOrder.value = null; clearInterval(posQrPoll); await openDocument(orderId, 'receipt'); window.alert('Đã nhận thanh toán VietQR và mở hóa đơn.'); } } catch {} }, 3000); };
const selectPaymentMethod = method => { if (posQrOrder.value) return window.alert('Đơn VietQR này đang chờ thanh toán. Vui lòng hoàn tất hoặc làm mới hóa đơn trước.'); paymentMethod.value = method; };

const categories = [
  { id: 'all', name: 'Tất cả' },
  { id: 'combo', name: 'Set Combo' },
  { id: 'bot', name: 'Bột mì & Men' },
  { id: 'bo-sua', name: 'Bơ & Kem sữa' },
  { id: 'chocolate', name: 'Chocolate' },
];

const fetchProducts = async () => {
  try {
    const res = await productApi.getProducts({ limit: 60 });
    products.value = res.products || [];
  } catch (err) {
    console.error('Fetch POS products error:', err);
  }
};

const fetchOnlineOrders = async () => {
  try {
    isPickingLoading.value = true;
    const res = await orderApi.getAllOrders({ limit: 30 });
    // Lọc đơn đang chờ soạn hàng hoặc đã xác nhận
    onlineOrders.value = (res.orders || []).filter(o =>
      o.order_type === 'online' && (o.order_status === 'pending' || o.order_status === 'confirmed' || o.order_status === 'picking')
    );
  } catch (err) {
    console.error('Fetch online orders error:', err);
  } finally {
    isPickingLoading.value = false;
  }
};

const filteredProducts = computed(() => {
  let list = [...products.value];
  if (selectedCat.value === 'combo') {
    list = list.filter(p => p.is_combo);
  } else if (selectedCat.value !== 'all') {
    const q = selectedCat.value.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q));
  }
  return list.filter(product => Number(product.stock_quantity || 0) > 0);
});

const totalPosQty = computed(() => posCart.value.reduce((s, i) => s + i.quantity, 0));
const totalPosAmount = computed(() => posCart.value.reduce((s, i) => s + (i.price * i.quantity), 0));

const addToPosCart = (product) => {
  const existing = posCart.value.find(i => i.id === product.id);
  if (existing) {
    if (existing.quantity >= Number(product.stock_quantity || 0)) return window.alert(`Sản phẩm này chỉ còn ${product.stock_quantity} ${product.unit || 'đơn vị'} trong kho.`);
    existing.quantity++;
  } else {
    posCart.value.push({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: Number(product.price),
      unit: product.unit || 'gói',
      quantity: 1,
    });
  }
};

const updateQty = (id, qty) => {
  const item = posCart.value.find(i => i.id === id);
  if (item) {
    if (qty <= 0) {
      removeFromPosCart(id);
    } else if (qty <= Number(products.value.find(p => p.id === id)?.stock_quantity || 0)) {
      item.quantity = qty;
    } else window.alert('Số lượng chọn vượt tồn kho hiện có.');
  }
};

const removeFromPosCart = (id) => {
  posCart.value = posCart.value.filter(i => i.id !== id);
};

const handleBarcodeSubmit = async () => {
  const code = barcodeQuery.value.trim();
  if (!code) return;

  // 1. Thử tìm trong danh sách đã tải
  const found = products.value.find(p => p.sku === code || p.barcode === code);
  if (found) {
    addToPosCart(found);
    barcodeQuery.value = '';
    return;
  }

  // 2. Thử gọi API barcode backend
  try {
    const res = await productApi.getByBarcode(code);
    if (res.product) {
      addToPosCart(res.product);
      barcodeQuery.value = '';
    }
  } catch (err) {
    alert(`Không tìm thấy sản phẩm với mã: ${code}`);
  }
};

const handlePosCheckout = async () => {
  if (posCart.value.length === 0 || isProcessing.value) return;
  try {
    isProcessing.value = true;
    const orderPayload = {
      order_type: 'pos',
      payment_method: paymentMethod.value,
      customer_id: selectedCustomer.value?.id || null,
      shipping_fee: 0,
      recipient_name: selectedCustomer.value?.full_name || 'Khách mua tại quầy POS',
      recipient_phone: selectedCustomer.value?.phone || null,
      items: posCart.value.map(i => ({
        product_id: i.id,
        quantity: i.quantity,
        unit_price: i.price,
      })),
    };

    const res = await orderApi.createOrder(orderPayload);
    const orderId = res.order.id;

    // Mở bill với phiên đăng nhập hiện tại (không dùng đường dẫn trực tiếp thiếu JWT).
    if (paymentMethod.value === 'vietqr') {
      posQrOrder.value = res.order;
      posCart.value = [];
      startPosQrPolling();
      alert(`Đã tạo đơn ${res.order.order_code}. Mời khách quét mã VietQR để thanh toán.`);
      return;
    }
    await openDocument(orderId, 'receipt');

    posCart.value = [];
    alert(`Tạo đơn POS thành công! Mã đơn: ${res.order.order_code}`);
  } catch (err) {
    alert(err.message || 'Lỗi khi tạo đơn POS.');
  } finally {
    isProcessing.value = false;
  }
};

const advanceStatus = async (orderId) => {
  try {
    await orderApi.updateOrderStatus(orderId, 'shipping');
    fetchOnlineOrders();
  } catch (err) {
    alert(err.message || 'Lỗi khi cập nhật trạng thái.');
  }
};

const formatVND = (val) => Number(val || 0).toLocaleString('vi-VN') + 'đ';

onMounted(() => {
  fetchProducts();
  fetchOnlineOrders();
});
onUnmounted(() => { if (posQrPoll) clearInterval(posQrPoll); });
</script>

<style scoped>
.pos-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
  background: var(--bg-surface-soft);
  overflow: hidden;
}

.pos-top-bar {
  background: var(--color-primary);
  color: #FFFFFF;
  padding: 0.65rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pos-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.pos-title {
  font-size: 1.25rem;
  font-weight: 800;
}

.pos-tabs {
  display: flex;
  gap: 0.5rem;
}

.pos-tab-btn {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #FFFFFF;
  padding: 0.4rem 1rem;
  border-radius: var(--radius-pill);
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.2s;
}

.pos-tab-btn.active {
  background: #FFFFFF;
  color: var(--color-primary);
}

.pos-staff-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.85rem;
}

.exit-pos-btn {
  background: rgba(255, 255, 255, 0.2);
  color: #FFFFFF;
  padding: 0.3rem 0.75rem;
  border-radius: var(--radius-pill);
  font-size: 0.8rem;
}

/* POS Body Grid */
.pos-body-grid {
  display: grid;
  grid-template-columns: 1fr 380px;
  flex: 1;
  overflow: hidden;
}

.pos-catalog {
  padding: 1rem 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.barcode-search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #FFFFFF;
  border: 2px solid var(--border-color);
  padding: 0.4rem 0.85rem;
  border-radius: var(--radius-pill);
  margin-bottom: 0.75rem;
  box-shadow: var(--shadow-sm);
}

.barcode-icon {
  font-size: 1.2rem;
}

.barcode-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.92rem;
}

.quick-cat-row {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1rem;
  overflow-x: auto;
}

.cat-chip {
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-color);
  background: #FFFFFF;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.cat-chip.active {
  background: var(--color-primary);
  color: #FFFFFF;
}

.pos-products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.85rem;
}

.pos-product-item {
  padding: 0.75rem;
  background: #FFFFFF;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.pos-product-item:hover {
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

.item-badge-wrap {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.35rem;
}

.item-sku {
  font-size: 0.7rem;
  color: var(--color-text-muted);
}

.item-name {
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-price-row {
  margin-top: auto;
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--color-primary);
}

/* POS Cart Panel */
.pos-cart-panel {
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  border-left: 2px solid var(--border-color);
  border-radius: 0;
}

.cart-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.clear-cart-btn {
  background: none;
  border: none;
  color: var(--danger);
  font-size: 0.8rem;
  cursor: pointer;
}

.pos-cart-items {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pos-empty-cart {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.pos-empty-cart span {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.pos-cart-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: var(--bg-surface-soft);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
}

.row-info {
  flex: 1;
}

.row-name {
  font-weight: 600;
  line-height: 1.2;
}

.row-sub {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}

.row-qty {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-color);
  background: #FFFFFF;
  border-radius: var(--radius-pill);
}

.row-qty button {
  width: 22px;
  height: 22px;
  background: none;
  border: none;
  cursor: pointer;
}

.row-qty span {
  padding: 0 4px;
  font-weight: bold;
}

.row-total {
  font-weight: 700;
  color: var(--color-primary);
  min-width: 65px;
  text-align: right;
}

.del-row-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
}

.pos-cart-footer {
  padding: 1rem;
  border-top: 2px solid var(--border-color);
  background: #FAFAFA;
}

.pos-summary-line {
  display: flex;
  justify-content: space-between;
  font-size: 0.88rem;
  margin-bottom: 0.35rem;
}

.pos-summary-line.total-line {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--color-primary);
  border-top: 1px dashed var(--border-color);
  padding-top: 0.5rem;
  margin-top: 0.5rem;
}

.payment-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin: 0.75rem 0;
}

.pay-btn {
  padding: 0.5rem;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--border-color);
  background: #FFFFFF;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 700;
}

.pay-btn.active {
  border-color: var(--color-primary);
  background: var(--bg-accent-light);
  color: var(--color-primary);
}

.btn-checkout-pos {
  width: 100%;
  padding: 0.85rem;
  font-size: 0.95rem;
}
.pos-qr{display:grid;justify-items:center;gap:.55rem;margin:.75rem 0;padding:1rem;border:2px solid var(--color-primary);border-radius:12px;background:#fff7fa;text-align:center;color:var(--color-primary)}.pos-qr img{width:min(300px,78vw);height:auto;padding:8px;background:#fff;border-radius:8px}.pos-qr span{font-weight:800;color:var(--color-text)}.pos-qr small{color:var(--color-text-muted)}

/* Tab 2: Picking */
.picking-body {
  padding: 2rem 1.25rem;
  flex: 1;
  overflow-y: auto;
}

.picking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.orders-table-card {
  overflow-x: auto;
  background: #FFFFFF;
}

.picking-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.picking-table th, .picking-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  text-align: left;
}

.picking-table th {
  background: var(--bg-surface-soft);
  font-weight: 700;
  color: var(--color-text-main);
}

.action-btns {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.pos-customer-box{padding:.75rem 1rem;border-bottom:1px solid var(--border-color);display:grid;gap:.45rem}.pos-customer-box label{font-size:.82rem;font-weight:800}.customer-search,.new-customer{display:flex;gap:.4rem}.customer-search input,.new-customer input{min-width:0;flex:1;border:1px solid var(--border-color);border-radius:7px;padding:.45rem;font:inherit}.customer-search button,.new-customer button{border:0;border-radius:7px;padding:.45rem .55rem;background:#f4e8ed;color:var(--color-primary);font-weight:700;cursor:pointer}.customer-results{display:grid;border:1px solid var(--border-color);border-radius:7px;overflow:hidden}.customer-results button{border:0;border-bottom:1px solid var(--border-color);padding:.45rem;text-align:left;background:#fff;cursor:pointer}.pos-customer-box small{color:var(--color-text-muted)}.pos-qr{display:grid;justify-items:center;gap:.5rem;padding:.85rem;background:#fff8fb;border:1px dashed var(--color-primary);border-radius:9px;text-align:center}.pos-qr img{width:180px;height:180px;object-fit:contain;background:#fff}.pos-qr span{font-size:.8rem;color:var(--color-text-muted)}.stock-available{display:block;margin-top:.55rem;color:#187247;font-weight:700;font-size:.75rem}
</style>
