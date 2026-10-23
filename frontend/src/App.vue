<template>
  <div class="app-layout">
    <!-- Navbar (Hide on POS view for cashier focus) -->
    <Navbar
      v-if="$route.path !== '/pos' && !isAdminRoute"
      @open-cart="isCartOpen = true"
      @open-ai="openAiWidget"
    />

    <!-- Main View Router -->
    <main class="main-content">
      <router-view
        @open-cart="isCartOpen = true"
        @open-ai="openAiWidget"
      />
    </main>

    <!-- Footer (Hide on POS view) -->
    <Footer v-if="$route.path !== '/pos' && !isAdminRoute" />

    <!-- Slide-over Cart Drawer -->
    <CartDrawer
      v-if="!isAdminRoute"
      :isOpen="isCartOpen"
      @close="isCartOpen = false"
    />

    <!-- Floating Gemini AI Chatbot Widget -->
    <AiChatWidget v-if="!isAdminRoute && $route.path !== '/pos' && activeChat !== 'support'" ref="aiWidgetRef" @opened="openAiChat" @closed="closeAiChat" />
    <SupportChatWidget v-if="!isAdminRoute && $route.path !== '/pos' && activeChat !== 'ai'" ref="supportWidgetRef" @opened="openSupportChat" @closed="closeSupportChat" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from './components/Navbar.vue';
import Footer from './components/Footer.vue';
import CartDrawer from './components/CartDrawer.vue';
import AiChatWidget from './components/AiChatWidget.vue';
import SupportChatWidget from './components/SupportChatWidget.vue';

const isCartOpen = ref(false);
const activeChat = ref('');
const aiWidgetRef = ref(null);
const supportWidgetRef = ref(null);
const route = useRoute();
const isAdminRoute = computed(() => route.path.startsWith('/admin'));

const openAiWidget = (product = null) => {
  if (product && aiWidgetRef.value?.openForProduct) {
    aiWidgetRef.value.openForProduct(product);
  } else if (aiWidgetRef.value?.openWidget) {
    aiWidgetRef.value.openWidget();
  }
};
const openAiChat = () => { activeChat.value = 'ai'; supportWidgetRef.value?.closeWidget(); };
const closeAiChat = () => { if (activeChat.value === 'ai') activeChat.value = ''; };
const openSupportChat = () => { activeChat.value = 'support'; aiWidgetRef.value?.closeWidget(); };
const closeSupportChat = () => { if (activeChat.value === 'support') activeChat.value = ''; };
</script>

<style>
@import './assets/main.css';

.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
}
</style>
