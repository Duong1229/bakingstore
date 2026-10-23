<template>
  <div class="products-page container">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-left">
        <span class="sub-title font-handwriting">Chợ Nguyên Liệu Tiệm Ốc</span>
        <h1 class="main-title font-serif">Nguyên Liệu & Combo Làm Bánh</h1>
      </div>
      <!-- Search Input -->
      <div class="search-box">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Tìm bột mì, bơ, kem tươi, mã SKU..."
          class="search-input"
        />
        <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''">✕</button>
      </div>
    </div>

    <!-- Category menu: luôn có đầy đủ danh mục do quản trị viên tạo -->
    <div class="category-filter">
      <label for="category-menu">Lọc theo danh mục</label>
      <select id="category-menu" v-model="selectedCategory" class="category-select">
        <option value="all">Tất cả sản phẩm</option>
        <option value="combo">Set / Combo làm bánh</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
      </select>
      <span class="category-hint">{{ categories.length }} danh mục đang có</span>
    </div>

    <!-- Filter Meta & Sort -->
    <div class="filter-meta">
      <span class="results-count">Hiển thị <strong>{{ filteredProducts.length }}</strong> sản phẩm</span>
      <select v-model="sortBy" class="sort-select">
        <option value="default">Sắp xếp: Mặc định</option>
        <option value="price-asc">Giá: Thấp đến cao</option>
        <option value="price-desc">Giá: Cao đến thấp</option>
        <option value="rating">Đánh giá cao nhất</option>
      </select>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Đang tải danh sách nguyên liệu...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredProducts.length === 0" class="empty-state">
      <div class="empty-emoji">🥣</div>
      <h3>Không tìm thấy sản phẩm nào!</h3>
      <p>Thử tìm với từ khóa khác hoặc chuyển danh mục nhé.</p>
      <button class="btn btn-secondary btn-sm" @click="resetFilters">Xóa bộ lọc</button>
    </div>

    <!-- Products Grid -->
    <div v-else class="products-grid">
      <ProductCard
        v-for="p in filteredProducts"
        :key="p.id"
        :product="p"
        @added-to-cart="showAddToast"
      />
    </div>

    <!-- Toast Notification -->
    <div v-if="toastMessage" class="toast-notification">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { productApi } from '../api';
import ProductCard from '../components/ProductCard.vue';

const route = useRoute();
const products = ref([]);
const isLoading = ref(true);
const searchQuery = ref('');
const selectedCategory = ref('all');
const sortBy = ref('default');
const toastMessage = ref('');

const categories = ref([]);

// Banner không tìm theo đúng một chữ cứng. Mỗi món dẫn tới danh sách nguyên
// liệu liên quan, kể cả khi tên sản phẩm trong kho dùng cách gọi khác.
const collectionKeywords = {
  'all-baking': ['bột', 'kem', 'bơ', 'sữa', 'chocolate', 'cacao', 'vani', 'khuôn', 'giấy', 'men'],
  whipping: ['whipping', 'kem', 'sữa', 'trái cây', 'vani'],
  tiramisu: ['mascarpone', 'cacao', 'cà phê', 'coffee', 'whipping', 'vani'],
  cookies: ['bơ', 'chocolate', 'chip', 'cacao', 'bột', 'giấy nến'],
};

const activeCollection = computed(() => route.query.collection || '');
const normalizedProductText = (product) => [product.name, product.sku, product.description, product.category?.name, product.categories?.name]
  .filter(Boolean)
  .join(' ')
  .toLocaleLowerCase('vi-VN');

const fetchProducts = async () => {
  try {
    isLoading.value = true;
    const [res, categoryResult] = await Promise.all([
      productApi.getProducts({ limit: 100 }),
      productApi.getCategories(),
    ]);
    products.value = res.products || [];
    categories.value = categoryResult.categories || [];
    applyRouteCategory(route.query.category);
  } catch (err) {
    console.error('Fetch products error:', err);
  } finally {
    isLoading.value = false;
  }
};

const filteredProducts = computed(() => {
  let list = [...products.value];

  if (activeCollection.value && collectionKeywords[activeCollection.value]) {
    const terms = collectionKeywords[activeCollection.value];
    list = list.filter(product => {
      const text = normalizedProductText(product);
      return terms.some(term => text.includes(term));
    });
  }

  // Lọc theo Category
  if (selectedCategory.value === 'combo') {
    list = list.filter(p => p.is_combo);
  } else if (selectedCategory.value !== 'all') {
    list = list.filter(p =>
      p.category_id === selectedCategory.value ||
      p.category?.id === selectedCategory.value ||
      p.categories?.id === selectedCategory.value
    );
  }

  // Lọc theo tìm kiếm
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLocaleLowerCase('vi-VN').trim();
    list = list.filter(p =>
      normalizedProductText(p).includes(q)
    );
  }

  // Sắp xếp
  if (sortBy.value === 'price-asc') {
    list.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sortBy.value === 'price-desc') {
    list.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (sortBy.value === 'rating') {
    list.sort((a, b) => Number(b.rating || 5) - Number(a.rating || 5));
  }

  return list;
});

const resetFilters = () => {
  searchQuery.value = '';
  selectedCategory.value = 'all';
  sortBy.value = 'default';
};

const applyRouteCategory = (value) => {
  if (!value) return;
  if (value === 'all' || value === 'combo') {
    selectedCategory.value = value;
    return;
  }
  const category = categories.value.find(item =>
    item.id === value ||
    item.slug === value ||
    item.name.toLocaleLowerCase('vi-VN').includes(String(value).toLocaleLowerCase('vi-VN'))
  );
  selectedCategory.value = category?.id || 'all';
};

const showAddToast = (prod) => {
  toastMessage.value = `Đã thêm "${prod.name}" vào giỏ hàng! 🥐`;
  setTimeout(() => {
    toastMessage.value = '';
  }, 2500);
};

onMounted(() => fetchProducts());

watch(() => route.query.search, (value) => { searchQuery.value = value || ''; }, { immediate: true });

watch(() => route.query.collection, () => {
  searchQuery.value = '';
  selectedCategory.value = 'all';
  sortBy.value = 'default';
}, { immediate: true });

watch(() => route.query.category, (newCat) => {
  applyRouteCategory(newCat);
});
</script>

<style scoped>
.products-page {
  padding: 2.5rem 1.25rem 4rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.sub-title {
  font-size: 1.35rem;
  color: var(--color-secondary-dark);
}

.main-title {
  font-size: 2.2rem;
  color: var(--color-primary);
  line-height: 1.2;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #FFFFFF;
  border: 1.5px solid var(--border-color);
  padding: 0.5rem 1rem;
  border-radius: var(--radius-pill);
  min-width: 300px;
  box-shadow: var(--shadow-sm);
}

.search-icon {
  color: var(--color-text-muted);
}

.search-input {
  border: none;
  outline: none;
  flex: 1;
  font-size: 0.9rem;
}

.clear-search {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted);
}

/* Category menu */
.category-filter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: .7rem;
  margin-bottom: 1.5rem;
  padding: .85rem 1rem;
  border: 1px solid var(--border-color);
  background: #fff;
}
.category-filter label { font-weight: 700; color: var(--color-text-main); }
.category-select {
  min-width: min(100%, 330px);
  padding: .6rem 2.3rem .6rem .8rem;
  border: 1px solid var(--border-color);
  background: #fff;
  color: var(--color-text-main);
  font: inherit;
  cursor: pointer;
}
.category-select:focus { outline: 2px solid color-mix(in srgb, var(--color-primary) 35%, transparent); border-color: var(--color-primary); }
.category-hint { color: var(--color-text-muted); font-size: .85rem; }

/* Filter Meta */
.filter-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  font-size: 0.88rem;
  color: var(--color-text-muted);
}

.sort-select {
  padding: 0.4rem 0.8rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: #FFFFFF;
  font-size: 0.85rem;
  outline: none;
}

/* Products Grid */
.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.75rem;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--color-text-muted);
}

.empty-emoji {
  font-size: 3.5rem;
  margin-bottom: 0.5rem;
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
</style>
