import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { useAuthStore } from './auth';
import { productApi } from '../api';

export const useCartStore = defineStore('cart', () => {
  const authStore = useAuthStore();
  const items = ref([]);
  const voucher = ref(null);
  const shippingProvince = ref('Hà Nội'); // Mặc định là Hà Nội

  const cartKey = () => `tiemoc_cart_${authStore.user?.id || 'guest'}`;

  const loadCart = () => {
    try {
      items.value = JSON.parse(localStorage.getItem(cartKey()) || '[]');
    } catch {
      items.value = [];
    }
    voucher.value = null;
  };

  const saveCart = () => {
    localStorage.setItem(cartKey(), JSON.stringify(items.value));
  };

  // Mỗi tài khoản có giỏ riêng; đổi tài khoản hoặc đăng xuất sẽ nạp đúng giỏ tương ứng.
  watch(() => authStore.user?.id, loadCart, { immediate: true });

  // Tổng số lượng món
  const itemCount = computed(() => {
    return items.value.reduce((sum, item) => sum + item.quantity, 0);
  });

  // Tổng tiền hàng chưa giảm
  const subtotal = computed(() => {
    return items.value.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  });

  // Tiền giảm giá từ voucher
  const discountAmount = computed(() => {
    if (!voucher.value) return 0;
    if (voucher.value.discount_type === 'percentage') {
      const disc = (subtotal.value * voucher.value.discount_value) / 100;
      return voucher.value.max_discount_amount ? Math.min(disc, voucher.value.max_discount_amount) : disc;
    }
    return voucher.value.discount_value || 0;
  });

  // Phí vận chuyển theo chính sách Tiệm Ốc:
  // - Khách tại Hà Nội:
  //   + Đơn < 300.000đ: 15.000đ
  //   + Đơn 300.000đ - 500.000đ: 10.000đ
  //   + Đơn > 500.000đ: 0đ (Freeship)
  // - Khách Tỉnh khác:
  //   + Đơn <= 500.000đ: 30.000đ
  //   + Đơn > 500.000đ: 0đ (Freeship)
  const shippingFee = computed(() => {
    if (items.value.length === 0) return 0;
    const isHanoi = shippingProvince.value && (
      shippingProvince.value.toLowerCase().includes('hà nội') ||
      shippingProvince.value.toLowerCase().includes('hanoi')
    );

    if (isHanoi) {
      if (subtotal.value < 300000) return 15000;
      if (subtotal.value <= 500000) return 10000;
      return 0; // Trên 500k freeship
    } else {
      // Tỉnh khác
      if (subtotal.value <= 500000) return 30000;
      return 0; // Trên 500k freeship
    }
  });

  // Thông báo tiến độ freeship để kích thích khách mua thêm
  const freeshipProgress = computed(() => {
    const target = 500000;
    if (subtotal.value >= target) {
      return { achieved: true, text: 'Chúc mừng! Đơn hàng của bạn đã được MIỄN PHÍ VẬN CHUYỂN 🎉', remaining: 0, percent: 100 };
    }
    const remaining = target - subtotal.value;
    const percent = Math.min(100, Math.round((subtotal.value / target) * 100));
    return {
      achieved: false,
      text: `Mua thêm ${remaining.toLocaleString('vi-VN')}đ để được FREESHIP toàn quốc!`,
      remaining,
      percent,
    };
  });

  // Tổng thanh toán cuối cùng
  const finalAmount = computed(() => {
    return Math.max(0, subtotal.value - discountAmount.value + shippingFee.value);
  });

  // Thao tác giỏ hàng
  const normaliseQuantity = (quantity) => Math.max(1, Math.floor(Number(quantity) || 1));
  const availableFor = (item) => {
    const available = Number(item?.stock_quantity);
    return Number.isFinite(available) && available >= 0 ? available : null;
  };

  const addItem = (product, quantity = 1) => {
    const requested = normaliseQuantity(quantity);
    const available = availableFor(product);
    if (available !== null && available <= 0) return { added: 0, limited: true };
    const existing = items.value.find(i => i.id === product.id);
    if (existing) {
      // Luôn giữ lại số tồn vừa nhận từ API sản phẩm để các lần bấm thêm sau
      // không thể vượt quá số còn trong kho.
      if (available !== null) existing.stock_quantity = available;
      const maximum = availableFor(existing);
      const nextQuantity = existing.quantity + requested;
      existing.quantity = maximum === null ? nextQuantity : Math.min(nextQuantity, maximum);
    } else {
      const acceptedQuantity = available === null ? requested : Math.min(requested, available);
      items.value.push({
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: Number(product.price),
        image_url: product.image_url,
        unit: product.unit || 'cái',
        is_combo: product.is_combo || false,
        stock_quantity: available,
        quantity: acceptedQuantity,
      });
    }
    saveCart();
    const item = items.value.find(i => i.id === product.id);
    return { added: item?.quantity || 0, limited: available !== null && requested > available };
  };

  const removeItem = (productId) => {
    items.value = items.value.filter(i => i.id !== productId);
    saveCart();
  };

  const updateQuantity = async (productId, quantity) => {
    const item = items.value.find(i => i.id === productId);
    if (!item) return;

    const requested = normaliseQuantity(quantity);
    const knownAvailable = availableFor(item);
    item.quantity = knownAvailable === null ? requested : Math.min(requested, knownAvailable);
    saveCart();

    // Tồn kho thực tế chỉ được quyết định bởi backend. Kiểm tra lại ngay khi
    // khách nhập số lượng, không chờ tới lúc bấm đặt đơn.
    try {
      const result = await productApi.validateCart([{ id: productId, quantity: requested }]);
      const check = result.items?.[0];
      if (!check) return;
      if (check.status === 'unavailable') {
        items.value = items.value.filter(entry => entry.id !== productId);
      } else {
        item.stock_quantity = Number(check.available_quantity);
        item.quantity = Math.min(requested, item.stock_quantity);
      }
      saveCart();
    } catch {
      // Khi mạng chập chờn, vẫn giữ giới hạn tồn đã biết; backend sẽ kiểm tra
      // bắt buộc thêm một lần khi tạo đơn.
    }
  };

  // Đồng bộ với kho trước khi mở/đặt đơn: tự bỏ hàng hết, hạ số lượng vượt tồn.
  const syncStock = async () => {
    if (!items.value.length) return [];
    const result = await productApi.validateCart(items.value.map(item => ({ id: item.id, quantity: item.quantity })));
    const changes = [];
    for (const check of result.items || []) {
      const item = items.value.find(entry => entry.id === check.product_id);
      if (!item) continue;
      if (check.status === 'unavailable') {
        items.value = items.value.filter(entry => entry.id !== check.product_id);
        changes.push(`${item.name} đã hết hàng và được bỏ khỏi giỏ.`);
      } else if (check.status === 'limited' && item.quantity > check.available_quantity) {
        item.stock_quantity = Number(check.available_quantity);
        item.quantity = check.available_quantity;
        changes.push(`${item.name} chỉ còn ${check.available_quantity} ${item.unit}. Số lượng đã được cập nhật.`);
      } else {
        item.stock_quantity = Number(check.available_quantity);
      }
    }
    saveCart();
    return changes;
  };

  const clearCart = () => {
    items.value = [];
    voucher.value = null;
    saveCart();
  };

  const applyVoucher = (voucherData) => {
    voucher.value = voucherData;
  };

  const removeVoucher = () => {
    voucher.value = null;
  };

  const setProvince = (province) => {
    shippingProvince.value = province;
  };

  return {
    items,
    voucher,
    shippingProvince,
    itemCount,
    subtotal,
    discountAmount,
    shippingFee,
    finalAmount,
    freeshipProgress,
    addItem,
    removeItem,
    updateQuantity,
    syncStock,
    clearCart,
    applyVoucher,
    removeVoucher,
    setProvince,
  };
});
