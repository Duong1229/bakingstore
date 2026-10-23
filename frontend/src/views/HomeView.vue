<template>
  <div class="home-page">
    <section class="cake-banner-section">
      <div class="container explorer-heading"><div><span>TIỆM ỐC · NGUYÊN LIỆU & DỤNG CỤ LÀM BÁNH</span></div></div>
      <div class="container banner-stage">
        <router-link v-if="activeBanner" :key="activeBanner.id" :to="activeBanner.target_url || `/products?collection=${activeBanner.id}`" class="cake-banner"><img :src="activeBanner.image_url || activeBanner.image" :alt="`${activeBanner.title || activeBanner.name} — xem nguyên liệu`"><span class="sr-only">{{ activeBanner.title || activeBanner.name }} — xem nguyên liệu</span></router-link>
        <button v-if="cakeCollections.length > 1" type="button" class="banner-nav previous" @click="changeBanner(-1)" aria-label="Banner trước">‹</button>
        <button v-if="cakeCollections.length > 1" type="button" class="banner-nav next" @click="changeBanner(1)" aria-label="Banner tiếp theo">›</button>
      </div>
    </section>

    <section class="container supply-path-section"><router-link :to="supplyCategoryRoute(['may', 'dung cu'])" class="supply-path-card"><span>01</span><div><b>Máy móc làm bánh</b><small>Máy đánh trứng, lò nướng, máy trộn bột</small></div><em>Khám phá →</em></router-link><router-link :to="supplyCategoryRoute(['dung cu', 'khuon'])" class="supply-path-card"><span>02</span><div><b>Dụng cụ & khuôn bánh</b><small>Khuôn, phới, giấy nến và đồ trang trí</small></div><em>Khám phá →</em></router-link><router-link to="/products" class="supply-path-card"><span>03</span><div><b>Toàn bộ nguyên liệu</b><small>Bột, bơ sữa, chocolate, màu và hương liệu</small></div><em>Khám phá →</em></router-link></section>

    <!-- AI RECIPE FINDER BANNER -->
    <section class="container recipe-finder-section">
      <div class="recipe-finder-box">
        <div class="finder-left">
          <span class="badge badge-combo" style="margin-bottom: 8px;">Trợ lý bánh</span>
          <h2 class="finder-title font-serif">Hôm nay bạn muốn nướng món bánh gì?</h2>
          <p class="finder-desc">Nhập tên món bánh bất kỳ, Bếp Trưởng AI Tiệm Ốc sẽ phân tích công thức chuẩn xác và tự động gợi ý trọn bộ nguyên liệu có sẵn tại kho!</p>
        </div>
        <div class="finder-right">
          <div class="finder-input-wrap">
            <input
              v-model="cakeInput"
              type="text"
              class="finder-input"
              placeholder="VD: Bánh Tiramisu, Bánh mì hoa cúc, Tart trứng..."
              @keyup.enter="handleSuggestRecipe"
            />
            <button class="btn btn-primary btn-finder" @click="handleSuggestRecipe" :disabled="isSearchingRecipe">
              <span v-if="isSearchingRecipe">Đang phân tích...</span>
              <span v-else>Xem Công Thức</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- RECIPE SUGGESTION RESULT MODAL/CARD IF ACTIVE -->
    <section v-if="recipeResult" class="container recipe-result-section">
      <div class="recipe-card card">
        <div class="recipe-header">
          <h3>Công thức làm: <span style="color: var(--color-primary);">{{ recipeResult.cake_type }}</span></h3>
          <button class="close-recipe-btn" @click="recipeResult = null">✕</button>
        </div>
        <div class="recipe-body" style="white-space: pre-wrap;">
          {{ recipeResult.recipe }}
        </div>
        <div v-if="recipeResult.suggested_combos?.length > 0" class="recipe-combos">
          <h4>Set Combo Làm Bánh Phù Hợp Tại Tiệm Ốc:</h4>
          <div class="combos-grid">
            <div v-for="c in recipeResult.suggested_combos" :key="c.id" class="suggested-combo-item">
              <span>{{ c.name }} - <strong>{{ formatVND(c.price) }}</strong></span>
              <button class="btn btn-primary btn-sm" @click="cartStore.addItem(c, 1)">Thêm vào giỏ</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="container section-spacing category-section">
      <div class="section-header">
        <div><span class="section-badge font-handwriting">Mua sắm theo nhu cầu</span><h2 class="section-title font-serif">Danh Mục Nguyên Liệu</h2></div>
        <router-link to="/products" class="see-all-link">Xem toàn bộ →</router-link>
      </div>
      <div class="categories-grid">
        <router-link v-for="category in categories" :key="category.id" :to="`/products?category=${category.id}`" class="category-card">
          <span class="category-icon">{{ categoryIcon(category.name) }}</span><strong>{{ category.name }}</strong><small>{{ category.description || 'Khám phá sản phẩm' }}</small>
        </router-link>
      </div>
    </section>

    <!-- FEATURED COMBOS SECTION -->
    <section class="container section-spacing">
      <div class="section-header">
        <div>
          <span class="section-badge font-handwriting">Tiện Lợi & Đầy Đủ</span>
          <h2 class="section-title font-serif">Set Combo Làm Bánh Trọn Gói</h2>
        </div>
        <router-link to="/products?category=combo" class="see-all-link">
          Xem tất cả combo →
        </router-link>
      </div>

      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Đang tải danh sách nguyên liệu...</p>
      </div>

      <div v-else class="products-grid">
        <ProductCard
          v-for="p in featuredCombos"
          :key="p.id"
          :product="p"
          @added-to-cart="showAddToast"
        />
      </div>
    </section>

    <!-- ALL POPULAR INGREDIENTS -->
    <section class="container section-spacing">
      <div class="section-header">
        <div>
          <span class="section-badge font-handwriting">Được khách hàng yêu thích</span>
          <h2 class="section-title font-serif">Sản Phẩm Nổi Bật</h2>
        </div>
        <router-link to="/products" class="see-all-link">
          Xem toàn bộ cửa hàng →
        </router-link>
      </div>

      <div class="products-grid">
        <ProductCard
          v-for="p in popularIngredients"
          :key="p.id"
          :product="p"
          @added-to-cart="showAddToast"
        />
      </div>
    </section>

    <!-- Toast Notification -->
    <div v-if="toastMessage" class="toast-notification">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { productApi, aiApi, bannerApi } from '../api';
import { useCartStore } from '../stores/cart';
import ProductCard from '../components/ProductCard.vue';

defineEmits(['open-ai']);

const cartStore = useCartStore();
const products = ref([]);
const categories = ref([]);
const isLoading = ref(true);
const cakeInput = ref('');
const isSearchingRecipe = ref(false);
const recipeResult = ref(null);
const toastMessage = ref('');
const defaultBanners = [
  { id:'banner-cake-20-10', title:'Quà bánh 20/10', image_url:'/banners/banh-20-10.png', target_url:'/banner/banner-cake-20-10' },
  { id:'banner-ingredients', title:'Nguyên liệu làm bánh', image_url:'/banners/nguyen-lieu-troi-xanh.png', target_url:'/banner/banner-ingredients' },
  { id:'banner-cookie', title:'Cookie bơ giòn', image_url:'/banners/cookie-nang-vang.png', target_url:'/banner/banner-cookie' },
];
const cakeCollections = ref(defaultBanners);
const activeBannerIndex = ref(0);
const activeBanner = computed(() => cakeCollections.value[activeBannerIndex.value] || cakeCollections.value[0]);
const changeBanner = direction => {
  const total = cakeCollections.value.length;
  if (!total) return;
  activeBannerIndex.value = (activeBannerIndex.value + direction + total) % total;
};
const fetchBanners = async () => {
  try {
    const result = await bannerApi.getPublic();
    if (result.banners?.length) cakeCollections.value = result.banners;
  } catch {
    cakeCollections.value = defaultBanners;
  } finally {
    activeBannerIndex.value = 0;
  }
};

const fetchProducts = async () => {
  try {
    isLoading.value = true;
    const [productRes, categoryRes] = await Promise.all([productApi.getProducts({ limit: 20 }), productApi.getCategories()]);
    products.value = productRes.products || [];
    categories.value = categoryRes.categories || [];
  } catch (err) {
    console.error('Fetch products error:', err);
  } finally {
    isLoading.value = false;
  }
};

const featuredCombos = computed(() => {
  return products.value.filter(p => p.is_combo).slice(0, 4);
});

const popularIngredients = computed(() => {
  return products.value.filter(p => !p.is_combo).slice(0, 8);
});

const handleSuggestRecipe = async () => {
  if (!cakeInput.value.trim() || isSearchingRecipe.value) return;
  try {
    isSearchingRecipe.value = true;
    const res = await aiApi.suggestRecipe(cakeInput.value.trim());
    recipeResult.value = res;
  } catch (err) {
    alert(err.message || 'Chưa lấy được công thức, vui lòng thử lại.');
  } finally {
    isSearchingRecipe.value = false;
  }
};

const showAddToast = (prod) => {
  toastMessage.value = `Đã thêm "${prod.name}" vào giỏ hàng! 🥐`;
  setTimeout(() => {
    toastMessage.value = '';
  }, 2500);
};

const formatVND = (val) => Number(val || 0).toLocaleString('vi-VN') + 'đ';
const normalizeCategory = (value = '') => value.toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const supplyCategoryRoute = (keywords) => {
  const match = keywords
    .map(keyword => categories.value.find(category => normalizeCategory(`${category.name} ${category.slug || ''}`).includes(keyword)))
    .find(Boolean);
  // Nếu quản trị viên chưa tạo nhóm “Máy móc”, ô này sẽ dùng nhóm dụng cụ
  // hiện có; khi nhóm mới được tạo, liên kết tự nhận đúng nhóm đó.
  return match
    ? { path: '/products', query: { category: match.id } }
    : { path: '/products', query: { category: 'dụng cụ' } };
};
const categoryIcon = (name = '') => {
  const value = name.toLowerCase();
  if (value.includes('bột') || value.includes('men')) return '🌾';
  if (value.includes('bơ') || value.includes('sữa')) return '🧈';
  if (value.includes('dụng cụ') || value.includes('khuôn')) return '🥣';
  if (value.includes('combo')) return '🎁';
  return '🧁';
};

onMounted(() => {
  fetchProducts();
  fetchBanners();
});
</script>

<style scoped>
.home-page {
  overflow-x: hidden;
}

/* Hero Section */
.hero-section {
  padding: 3rem 0 4rem;
  position: relative;
}

.hero-container {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 3.5rem;
  align-items: center;
}

/* Left Hero */
.hero-content {
  display: flex;
  flex-direction: column;
}

.speech-bubble {
  display: inline-flex;
  align-items: center;
  background: #FFFFFF;
  border: 1.5px solid var(--border-color);
  padding: 0.35rem 1rem;
  border-radius: var(--radius-pill);
  font-family: var(--font-handwriting);
  font-size: 1.15rem;
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
  width: fit-content;
  margin-bottom: 1.2rem;
  position: relative;
}

.hero-headline {
  font-family: var(--font-body);
  font-size: clamp(2.6rem, 5vw, 4.2rem);
  font-weight: 800;
  color: var(--color-primary);
  line-height: 1.05;
  letter-spacing: -1px;
  text-transform: uppercase;
  margin-bottom: 0.8rem;
}

.headline-tag {
  font-size: 0.45em;
  color: var(--color-text-main);
  text-transform: lowercase;
  vertical-align: middle;
  margin-left: 6px;
  letter-spacing: normal;
}

.quote-mark {
  color: var(--color-primary);
}

.hero-subline {
  font-size: 1.6rem;
  color: var(--color-primary);
  margin-bottom: 2rem;
  line-height: 1.2;
}

.hero-badges {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2.2rem;
  padding: 1rem 0;
  border-top: 1px dashed var(--border-color);
  border-bottom: 1px dashed var(--border-color);
}

.trust-badge-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-main);
  line-height: 1.25;
}

.trust-icon {
  font-size: 1.6rem;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

/* Right Hero Visual */
.hero-visual {
  position: relative;
}

.flatlay-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
}

.hero-seal {
  position: absolute;
  top: 15%;
  right: 15%;
  z-index: 10;
}

.wheat-note {
  position: absolute;
  top: 5%;
  left: 20%;
  font-size: 1.4rem;
  color: var(--color-text-main);
  transform: rotate(-10deg);
}

.fresh-note {
  position: absolute;
  bottom: 8%;
  right: 5%;
  font-size: 1.3rem;
  color: var(--color-secondary-dark);
  transform: rotate(6deg);
}

.flatlay-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 1.2rem;
  width: 100%;
  height: 100%;
}

.flatlay-card {
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  border: 4px solid #FFFFFF;
  background: #FFFFFF;
}

.bread-card {
  grid-row: span 2;
}

.flatlay-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Recipe Finder Banner */
.recipe-finder-section {
  margin: 1rem auto 4rem;
}

.recipe-finder-box {
  background: linear-gradient(135deg, #FFF9F3 0%, #FDF2F4 100%);
  border: 1.5px solid #FBCFE8;
  border-radius: var(--radius-xl);
  padding: 2.5rem;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 2rem;
  align-items: center;
  box-shadow: var(--shadow-sm);
}

.finder-title {
  font-size: 1.6rem;
  color: var(--color-primary);
  margin-bottom: 0.5rem;
}

.finder-desc {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.finder-input-wrap {
  display: flex;
  gap: 0.5rem;
  background: #FFFFFF;
  padding: 6px;
  border-radius: var(--radius-pill);
  border: 1.5px solid var(--border-color);
  box-shadow: var(--shadow-sm);
}

.finder-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 0 1rem;
  font-size: 0.92rem;
}

.btn-finder {
  padding: 0.65rem 1.25rem;
}

/* Recipe Result Modal/Card */
.recipe-result-section {
  margin-bottom: 3rem;
}

.recipe-card {
  padding: 2rem;
  background: #FFFFFF;
  border: 2px solid var(--color-primary-light);
}

.recipe-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.close-recipe-btn {
  background: none;
  border: none;
  font-size: 1.4rem;
  cursor: pointer;
  color: var(--color-text-muted);
}

.recipe-body {
  font-size: 0.95rem;
  line-height: 1.65;
  color: var(--color-text-main);
  max-height: 350px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.recipe-combos {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px dashed var(--border-color);
}

.combos-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.suggested-combo-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-surface-soft);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
}

/* Section Header */
.section-spacing {
  margin-bottom: 4.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 1.75rem;
}

.section-badge {
  font-size: 1.3rem;
  color: var(--color-secondary-dark);
}

.section-title {
  font-size: 1.85rem;
  color: var(--color-primary);
}

.see-all-link {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--color-primary);
}

.see-all-link:hover {
  text-decoration: underline;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

.categories-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
.category-card { min-height: 150px; padding: 1.25rem; display: flex; flex-direction: column; gap: .45rem; border: 1px solid var(--border-color); border-radius: var(--radius-lg); background: #fff; color: var(--color-text-main); box-shadow: var(--shadow-sm); transition: transform .2s, border-color .2s; }
.category-card:hover { transform: translateY(-4px); border-color: var(--color-primary-light); color: var(--color-primary); }
.category-icon { font-size: 2rem; }.category-card strong { font-size: .95rem; }.category-card small { color: var(--color-text-muted); font-size: .75rem; line-height: 1.4; }

.loading-state {
  text-align: center;
  padding: 3rem 0;
  color: var(--color-text-muted);
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
  animation: fadeUp 0.3s ease;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translate(-50%, 15px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

@media (max-width: 960px) {
  .hero-container {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .hero-content {
    align-items: center;
  }
  .hero-badges {
    justify-content: center;
  }
  .hero-actions {
    justify-content: center;
  }
  .recipe-finder-box {
    grid-template-columns: 1fr;
  }
}

/* Bố cục phẳng, ưu tiên nội dung và ảnh sản phẩm thay vì hiệu ứng nổi. */
.recipe-finder-box{border-radius:0;box-shadow:none;background:linear-gradient(110deg,#effaff,#f5ffeb);border-color:#cbe7d1}.finder-input-wrap{border-radius:0;box-shadow:none}.categories-grid{gap:0}.category-card{min-height:130px;border-radius:0;box-shadow:none;border-right:0}.category-card:last-child{border-right:1px solid var(--border-color)}.category-card:hover{transform:none;background:#fff9ed}.cake-banner-section{margin:1.25rem 0 3.5rem}.explorer-heading{display:flex;justify-content:space-between;align-items:end;gap:2rem;margin-bottom:1.25rem;border-left:5px solid var(--color-secondary);padding-left:14px}.explorer-heading span{font-size:.75rem;letter-spacing:1.4px;font-weight:800;color:var(--color-secondary-dark)}.explorer-heading h2{margin:3px 0 0;color:#166534;font-size:clamp(1.35rem,2.5vw,1.9rem)}.banner-stage{position:relative;overflow:hidden}.cake-banner{width:100%;overflow:hidden;display:block;border:1px solid #cce4d2;background:#eef8ef}.cake-banner img{display:block;width:100%;aspect-ratio:3/1;object-fit:cover}.cake-banner:hover{outline:2px solid var(--color-secondary);outline-offset:-2px}.banner-nav{position:absolute;z-index:2;top:50%;width:48px;height:82px;transform:translateY(-50%);border:0;background:transparent;color:#fff;font:300 82px/62px Georgia,serif;text-shadow:0 2px 8px #17332788;cursor:pointer}.banner-nav:hover{background:#17332738}.banner-nav.previous{left:10px}.banner-nav.next{right:10px}.sr-only{position:absolute;width:1px;height:1px;clip:rect(0 0 0 0);overflow:hidden;white-space:nowrap}.supply-path-section{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #dcd4c3;border-left:1px solid #dcd4c3;margin-bottom:4rem}.supply-path-card{display:grid;grid-template-columns:auto 1fr;gap:11px;padding:20px;border-right:1px solid #dcd4c3;border-bottom:1px solid #dcd4c3;background:#f7f2e8}.supply-path-card:hover{background:#fff}.supply-path-card span{color:var(--color-secondary);font-size:1.45rem;font-weight:800}.supply-path-card b,.supply-path-card small,.supply-path-card em{display:block}.supply-path-card small{font-size:.8rem;color:var(--color-text-muted);line-height:1.35}.supply-path-card em{grid-column:2;font-size:.8rem;font-style:normal;font-weight:700;color:var(--color-primary);margin-top:5px}@media(max-width:800px){.supply-path-section{grid-template-columns:1fr}.explorer-heading{align-items:start;flex-direction:column;gap:.5rem}.banner-nav{width:36px;height:58px;font-size:58px;line-height:42px}.banner-nav.previous{left:2px}.banner-nav.next{right:2px}}
</style>
