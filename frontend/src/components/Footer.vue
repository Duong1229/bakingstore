<template>
  <footer class="footer-wrapper">
    <div class="container footer-content">
      <!-- Col 1: Brand & Slogan -->
      <div class="footer-col brand-col">
        <div class="footer-logo">
          <span class="logo-sub">SWEET CREATIONS</span>
          <span class="logo-main font-serif">TIỆM ỐC</span>
        </div>
        <p class="brand-desc">
          Cửa hàng chuyên cung cấp nguyên liệu, dụng cụ và Set Combo làm bánh cao cấp tại Việt Nam. Tích hợp trợ lý Gemini AI tư vấn công thức & quản lý kho thông minh FEFO chuẩn date mới nhất.
        </p>
        <div class="social-links">
          <span class="social-tag">✨ Happiness is our secret ingredient!</span>
        </div>
      </div>

      <!-- Col 2: Chính sách giao hàng của Tiệm Ốc -->
      <div class="footer-col">
        <h4 class="col-title">Chính Sách Vận Chuyển</h4>
        <ul class="shipping-policy-list">
          <li>
            <strong>Khu vực Hà Nội:</strong>
            <div>• Đơn dưới 300k: Phí ship 15.000đ</div>
            <div>• Đơn từ 300k - 500k: Phí ship 10.000đ</div>
            <div>• Đơn trên 500k: <span class="free-text">FREESHIP</span></div>
          </li>
          <li style="margin-top: 8px;">
            <strong>Khu vực Tỉnh khác:</strong>
            <div>• Đơn dưới 500k: Phí ship 30.000đ</div>
            <div>• Đơn trên 500k: <span class="free-text">FREESHIP</span></div>
          </li>
        </ul>
      </div>

      <!-- Col 3: Danh mục & Liên kết -->
      <div class="footer-col">
        <h4 class="col-title">Sản Phẩm & Dịch Vụ</h4>
        <ul class="footer-links">
          <li><router-link to="/products?category=bot">Bột Mì & Men Nở</router-link></li>
          <li><router-link to="/products?category=bo-sua">Bơ Động Vật & Kem Sữa</router-link></li>
          <li><router-link to="/products?category=combo">Set Combo Làm Bánh Tiện Lợi</router-link></li>
          <li><router-link to="/products">Dụng Cụ & Khuôn Bánh</router-link></li>
          <li><router-link to="/pos">Giao Diện POS Thu Ngân</router-link></li>
          <li><router-link to="/admin">Quản Lý Kho FEFO & Doanh Thu</router-link></li>
        </ul>
      </div>

      <!-- Col 4: Liên hệ cửa hàng -->
      <div class="footer-col">
        <h4 class="col-title">Liên Hệ Tiệm Ốc</h4>
        <ul class="contact-list">
          <li>📍 <strong>Địa chỉ:</strong> Tiệm Ốc, Đường Nguyễn Trác, Phường Dương Nội, Thành phố Hà Nội</li>
          <li>📞 <strong>Hotline:</strong> 0339667754</li>
          <li>⏰ <strong>Giờ mở cửa:</strong> 08:00 - 21:30 (Cả tuần)</li>
          <li>💳 <strong>Thanh toán:</strong> VietQR / Tiền mặt / SePay</li>
        </ul>
      </div>
    </div>

    <!-- Copyright -->
    <div class="footer-bottom">
      <div class="container bottom-flex">
        <span>© 2026 <strong>Tiệm Ốc - Baking AI Store</strong>. All rights reserved.</span>
        <span class="powered-by">Tích hợp Google Gemini 2.0 Flash AI & VietQR SePay</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer-wrapper {
  background: #FFFFFF;
  border-top: 1px solid var(--border-color);
  margin-top: 4rem;
  padding-top: 3.5rem;
}

.footer-content {
  display: grid;
  grid-template-columns: 1.5fr 1.2fr 1fr 1.2fr;
  gap: 2.5rem;
  padding-bottom: 3rem;
}

.footer-logo {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}

.logo-sub {
  font-size: 0.65rem;
  letter-spacing: 2.5px;
  color: var(--color-text-muted);
  font-weight: 700;
}

.logo-main {
  font-size: 1.8rem;
  color: var(--color-primary);
  font-weight: 800;
}

.brand-desc {
  font-size: 0.88rem;
  color: var(--color-text-muted);
  line-height: 1.6;
  margin-bottom: 1rem;
}

.social-tag {
  font-family: var(--font-handwriting);
  font-size: 1.25rem;
  color: var(--color-primary);
  display: inline-block;
}

.col-title {
  font-family: var(--font-serif);
  font-size: 1.1rem;
  color: var(--color-text-main);
  margin-bottom: 1.2rem;
  position: relative;
}

.col-title::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: 0;
  width: 32px;
  height: 2px;
  background: var(--color-primary);
  border-radius: 2px;
}

.shipping-policy-list, .footer-links, .contact-list {
  list-style: none;
  font-size: 0.88rem;
  color: var(--color-text-muted);
}

.shipping-policy-list li {
  line-height: 1.5;
}

.free-text {
  color: var(--success);
  font-weight: 800;
}

.footer-links li {
  margin-bottom: 0.5rem;
}

.footer-links a:hover {
  color: var(--color-primary);
  padding-left: 4px;
}

.contact-list li {
  margin-bottom: 0.6rem;
  line-height: 1.4;
}

.footer-bottom {
  border-top: 1px solid var(--border-color);
  padding: 1.25rem 0;
  background: var(--bg-surface-soft);
  font-size: 0.82rem;
  color: var(--color-text-muted);
}

.bottom-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 900px) {
  .footer-content {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 600px) {
  .footer-content {
    grid-template-columns: 1fr;
  }
  .bottom-flex {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
}
</style>
