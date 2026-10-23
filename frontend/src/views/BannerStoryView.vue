<template>
  <main class="banner-story-page">
    <div v-if="loading" class="container status">Đang mở chủ đề bánh...</div>
    <div v-else-if="error" class="container status error">{{ error }} <router-link to="/">Quay lại trang chủ</router-link></div>
    <template v-else-if="banner">
      <section class="story-hero">
        <img :src="banner.image_url" :alt="banner.title">
      </section>
      <section class="container story-intro">
        <p class="story-season">{{ banner.season || 'GỢI Ý TỪ TIỆM ỐC' }}</p>
        <h1>{{ banner.story_title || banner.title }}</h1>
        <p>{{ banner.story_content || 'Khám phá những nguyên liệu được Tiệm Ốc gợi ý cho chủ đề này.' }}</p>
      </section>
      <section class="container story-products">
        <div class="section-heading">
          <div><p>{{ categoryName ? `Danh mục: ${categoryName}` : 'Nguyên liệu được gợi ý' }}</p><h2>Chuẩn bị cho chủ đề này</h2></div>
          <router-link to="/products">Xem tất cả sản phẩm →</router-link>
        </div>
        <div v-if="featuredProducts.length" class="products-grid"><ProductCard v-for="product in featuredProducts" :key="product.id" :product="product" /></div>
        <p v-else class="empty">Admin chưa gắn sản phẩm cho danh mục của banner này.</p>
      </section>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { bannerApi, productApi } from '../api';
import ProductCard from '../components/ProductCard.vue';

const route = useRoute();
const banner = ref(null);
const products = ref([]);
const categories = ref([]);
const loading = ref(true);
const error = ref('');
const categoryName = computed(() => categories.value.find(item => item.id === banner.value?.category_id)?.name || '');
const featuredProducts = computed(() => {
  if (!banner.value) return [];
  return banner.value.category_id ? products.value.filter(product => product.categories?.id === banner.value.category_id) : [];
});
const loadStory = async () => {
  loading.value = true; error.value = '';
  try {
    const [bannerResult, productResult, categoryResult] = await Promise.all([bannerApi.getPublic(), productApi.getProducts({ limit: 100 }), productApi.getCategories()]);
    banner.value = (bannerResult.banners || []).find(item => item.id === route.params.id) || null;
    if (!banner.value) throw new Error('Không tìm thấy chủ đề banner này.');
    products.value = productResult.products || [];
    categories.value = categoryResult.categories || [];
  } catch (err) { error.value = err.message || 'Không thể tải chủ đề banner.'; }
  finally { loading.value = false; }
};
watch(() => route.params.id, loadStory);
onMounted(loadStory);
</script>

<style scoped>
.banner-story-page{padding-bottom:4rem;background:#fffdf9}.status{padding:5rem 1.25rem;text-align:center;color:#6b625b}.status.error{color:#b42318}.status a{margin-left:.5rem;color:#b45309;font-weight:700}.story-hero{width:100%;background:#edf8f1}.story-hero img{display:block;width:100%;aspect-ratio:3/1;object-fit:cover}.story-intro{max-width:880px;padding-top:3.5rem;padding-bottom:2.7rem;text-align:center}.story-season{margin:0 0 .55rem;color:#ca6b20;font-size:.78rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.story-intro h1{margin:0;color:#185b37;font-size:clamp(2rem,4vw,3.35rem);line-height:1.1}.story-intro>p:last-child{max-width:720px;margin:1.1rem auto 0;color:#5f635f;font-size:1.08rem;line-height:1.8}.story-products{padding-top:1.5rem}.section-heading{display:flex;justify-content:space-between;align-items:end;gap:1.5rem;padding-bottom:1rem;border-bottom:1px solid #dce4d9}.section-heading p{margin:0 0 .3rem;color:#6a8b50;font-size:.82rem;font-weight:700}.section-heading h2{margin:0;color:#24412f;font-size:1.7rem}.section-heading a{color:#bd641e;font-weight:700;text-decoration:none}.products-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:1rem;margin-top:1.5rem}.empty{margin:1.5rem 0;color:#766d64}@media(max-width:640px){.story-hero img{aspect-ratio:1.7/1}.story-intro{padding-top:2.4rem}.section-heading{align-items:flex-start;flex-direction:column;gap:.5rem}}
</style>
