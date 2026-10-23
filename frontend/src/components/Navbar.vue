<template>
  <header class="navbar-wrapper">
    <!-- Top Announcement Pill Banner -->
    <div class="top-banner">
      <div class="banner-pill">
        <span>🎉 Chào mừng đến với <strong>Tiệm Ốc</strong>: Giảm ngay 10% với mã <code>TIEMOC10</code> | 🚚 FREESHIP đơn từ 500k toàn quốc!</span>
      </div>
    </div>

    <!-- Floating Island Navbar -->
    <nav class="navbar-island">
      <!-- Center Links & Brand Logo -->
      <div class="nav-center">
        <router-link to="/" class="brand-logo">
          <span class="brand-main">TIỆM ỐC</span>
          <span class="brand-leaf">✨</span>
        </router-link>
        <router-link to="/" class="nav-link" active-class="active">Trang chủ</router-link>
        <router-link to="/products" class="nav-link" active-class="active">Nguyên liệu</router-link>
        <router-link to="/products?category=combo" class="nav-link" active-class="active">Set nguyên liệu</router-link>
        <router-link :to="{ path: '/products', query: { category: 'dụng cụ' } }" class="nav-link" active-class="active">Dụng cụ làm bánh</router-link>
        <form v-if="isSearching" class="nav-search" @submit.prevent="submitSearch"><input v-model.trim="searchTerm" autofocus placeholder="Tìm sản phẩm..."><button>⌕</button></form>
        <button v-else class="search-toggle" title="Tìm kiếm sản phẩm" @click="isSearching = true">⌕</button>
        <router-link to="/about" class="nav-link" active-class="active">Về chúng tôi</router-link>
      </div>

      <!-- Right: Staff POS, Admin & Profile -->
      <div class="nav-right">
        <router-link v-if="authStore.isStaff" to="/pos" class="nav-btn-pill pos-btn" title="Điểm bán lẻ tại quầy">
          <span>POS Quầy</span>
        </router-link>

        <router-link v-if="authStore.isAdmin" to="/admin" class="nav-btn-pill admin-btn" title="Khu vực quản trị">
          <span>Quản trị</span>
        </router-link>

        <button class="cart-trigger" @click="$emit('open-cart')" aria-label="Giỏ hàng">
          <div class="cart-icon-box"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg><span v-if="cartStore.itemCount > 0" class="cart-badge">{{ cartStore.itemCount }}</span></div><span class="cart-label">{{ formatVND(cartStore.subtotal) }}</span>
        </button>

        <div v-if="authStore.isAuthenticated" class="user-menu">
          <button class="user-name" title="Tài khoản của tôi" @click="isUserMenuOpen = !isUserMenuOpen"><img v-if="authStore.user?.avatar_url" :src="authStore.user.avatar_url" class="nav-avatar" alt="Ảnh đại diện"> <span v-else>👤</span> {{ authStore.user?.full_name || 'Tài khoản' }} ☰</button>
          <div v-if="isUserMenuOpen" class="account-dropdown">
            <router-link v-if="!authStore.isAdmin" to="/orders" @click="isUserMenuOpen = false">Lịch sử đặt hàng</router-link>
            <router-link to="/account" @click="isUserMenuOpen = false">Thông tin cá nhân</router-link>
            <router-link v-if="authStore.isAdmin" to="/admin" @click="isUserMenuOpen = false">Khu quản trị</router-link>
            <button @click="handleLogout">Đăng xuất</button>
          </div>
          <button class="logout-btn" @click="handleLogout" title="Đăng xuất">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
        <router-link v-else to="/login" class="nav-btn-pill login-btn">
          Đăng nhập
        </router-link>
      </div>
    </nav>
  </header>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';

defineEmits(['open-cart', 'open-ai']);

const cartStore = useCartStore();
const authStore = useAuthStore();
const router = useRouter();
const isSearching = ref(false);
const searchTerm = ref('');
const isUserMenuOpen = ref(false);

const formatVND = (amount) => {
  return Number(amount || 0).toLocaleString('vi-VN') + 'đ';
};

const handleLogout = () => {
  if (!window.confirm('Bạn có chắc muốn đăng xuất không?')) return;
  authStore.logout();
  isUserMenuOpen.value = false;
  router.push('/');
};
const submitSearch = () => {
  if (searchTerm.value) router.push({ path: '/products', query: { search: searchTerm.value } });
  isSearching.value = false;
};
</script>

<style scoped>
.navbar-wrapper {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 0.75rem 1.25rem 0.5rem;
  background: linear-gradient(180deg, var(--bg-main) 70%, rgba(250, 246, 240, 0) 100%);
}

.top-banner {
  display: flex;
  justify-content: center;
  margin-bottom: 0.6rem;
}

.banner-pill {
  display: inline-block;
  background-color: var(--color-primary);
  color: #FFFFFF;
  padding: 0.35rem 1.25rem;
  border-radius: var(--radius-pill);
  font-size: 0.8rem;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(160, 21, 62, 0.2);
  text-align: center;
}

.banner-pill code {
  background: rgba(255, 255, 255, 0.25);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 700;
}

/* Floating Island Navbar */
.navbar-island {
  max-width: var(--max-width);
  margin: 0 auto;
  background: #FFFFFF;
  border: 1px solid rgba(239, 231, 220, 0.9);
  border-radius: var(--radius-pill);
  padding: 0.5rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--shadow-floating);
  backdrop-filter: blur(10px);
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 180px;
}

/* Thứ tự mua sắm: nguyên liệu → set → tìm → giỏ. */
.nav-center { flex: 1; justify-content: flex-start; }
.nav-right { min-width: auto; }
.brand-logo { padding-left: 0; margin-right: 1.25rem; }

.nav-right {
  justify-content: flex-end;
}

.cart-trigger {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--bg-surface-soft);
  border: 1px solid var(--border-color);
  padding: 0.4rem 0.85rem;
  border-radius: var(--radius-pill);
  cursor: pointer;
  color: var(--color-text-main);
  font-weight: 600;
  font-size: 0.88rem;
  transition: all 0.2s;
}

.cart-trigger:hover {
  background: #EADCC8;
  border-color: #D5C6B5;
}

.cart-icon-box {
  position: relative;
  display: flex;
  align-items: center;
}

.cart-badge {
  position: absolute;
  top: -8px;
  right: -10px;
  background: var(--color-primary);
  color: #FFFFFF;
  font-size: 0.7rem;
  font-weight: 800;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #FFFFFF;
}

/* Center Links & Brand */
.nav-center {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.nav-link {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--color-text-main);
  position: relative;
  padding: 0.3rem 0.2rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.nav-link:hover, .nav-link.active {
  color: var(--color-primary);
}

.nav-ai-highlight {
  color: var(--color-primary);
  background: var(--bg-accent-light);
  padding: 0.3rem 0.75rem;
  border-radius: var(--radius-pill);
  border: 1px solid #FBCFE8;
}

.nav-ai-highlight:hover {
  background: #FCE7ED;
}

/* Brand Logo */
.brand-logo { display: flex; align-items: center; gap: .25rem; text-align: left; padding: 0; white-space: nowrap; }

.brand-main {
  font-family: var(--font-serif);
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-primary);
  letter-spacing: 0.5px;
  line-height: 1.1;
}

.nav-btn-pill {
  padding: 0.4rem 0.9rem;
  border-radius: var(--radius-pill);
  font-size: 0.82rem;
  font-weight: 600;
  transition: all 0.2s;
}

.pos-btn {
  background: var(--info-bg);
  color: var(--info);
  border: 1px solid #BAE6FD;
}

.pos-btn:hover {
  background: #E0F2FE;
}

.admin-btn {
  background: var(--warning-bg);
  color: var(--warning);
  border: 1px solid #FDE68A;
}

.admin-btn:hover {
  background: #FEF3C7;
}

.login-btn {
  background: var(--color-primary);
  color: #FFFFFF;
}

.login-btn:hover {
  background: var(--color-primary-hover);
}

.user-menu {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-name {
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-main);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-decoration: none;
}
.nav-avatar { width: 25px; height: 25px; object-fit: cover; border-radius: 50%; vertical-align: middle; border: 1px solid var(--border-color); }

.search-toggle { border: 0; background: transparent; font-size: 1.6rem; cursor: pointer; color: var(--color-text-main); line-height: 1; }
.nav-search { display: flex; border: 1px solid var(--border-color); border-radius: var(--radius-pill); overflow: hidden; background: #fff; }.nav-search input { width: 135px; border: 0; outline: 0; padding: .45rem .7rem; font: inherit; }.nav-search button { border: 0; background: var(--bg-surface-soft); padding: 0 .6rem; cursor: pointer; }
.account-dropdown { position: absolute; z-index: 20; right: 0; top: calc(100% + 10px); width: 205px; padding: .5rem; border: 1px solid var(--border-color); border-radius: 10px; background: #fff; box-shadow: var(--shadow-md); }.account-dropdown a,.account-dropdown button { display: block; width: 100%; border: 0; background: transparent; text-align: left; padding: .65rem .75rem; border-radius: 7px; color: var(--color-text-main); font: inherit; cursor: pointer; }.account-dropdown a:hover,.account-dropdown button:hover { background: var(--bg-surface-soft); color: var(--color-primary); }

.logout-btn {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
}

.logout-btn:hover {
  color: var(--danger);
}

@media (max-width: 960px) {
  .nav-center .nav-link {
    display: none;
  }
}

/* Thanh điều hướng phẳng, rõ ràng và dễ đọc. */
.navbar-wrapper{padding:0;background:#fff;border-bottom:1px solid var(--border-color)}.top-banner{margin:0;background:var(--color-primary);padding:.35rem 1rem}.banner-pill{padding:0;border-radius:0;box-shadow:none}.navbar-island{max-width:none;border:0;border-radius:0;box-shadow:none;padding:.72rem max(1.25rem,calc((100vw - var(--max-width))/2));backdrop-filter:none}.nav-link{padding:.5rem .25rem}.nav-link.active{border-bottom:2px solid var(--color-primary)}.cart-trigger,.nav-btn-pill,.nav-search{border-radius:3px}.account-dropdown{border-radius:3px;box-shadow:none}
</style>
