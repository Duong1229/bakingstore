<template>
  <button v-if="!isOpen && !hidden" class="support-fab" type="button" @click="openChat">💬 <span>Nhắn Tiệm Ốc</span></button>
  <section v-else class="support-widget" aria-label="Chat với Tiệm Ốc">
    <header><div><b>💬 Tiệm Ốc hỗ trợ</b><small>Quản trị viên sẽ phản hồi sớm nhất</small></div><button type="button" aria-label="Thu nhỏ khung chat" @click="closeChat">×</button></header>
    <div v-if="!authStore.isAuthenticated" class="support-login"><p>Đăng nhập để nhắn tin và theo dõi phản hồi từ Tiệm Ốc.</p><router-link to="/login">Đăng nhập để chat</router-link></div>
    <template v-else-if="authStore.user?.role === 'customer'">
      <div ref="messageList" class="support-messages"><p v-if="!messages.length" class="empty-chat">Chào bạn! Bạn cần Tiệm Ốc hỗ trợ điều gì?</p><div v-for="message in messages" :key="message.id" :class="['support-bubble', message.sender_id === authStore.user?.id ? 'mine' : 'store']"><span v-if="message.content">{{ message.content }}</span><router-link v-if="message.product" :to="`/product/${message.product.slug || message.product.id}`" class="shared-product" @click="closeChat"><img :src="message.product.image_url || defaultImage" :alt="message.product.name"><span><b>{{ message.product.name }}</b><small>{{ money(message.product.price) }} / {{ message.product.unit || 'gói' }}</small></span></router-link><small>{{ formatTime(message.created_at) }}</small></div></div>
      <form @submit.prevent="send"><input v-model.trim="draft" maxlength="2000" placeholder="Nhập tin nhắn..." :disabled="sending"><button :disabled="sending || !draft">Gửi</button></form>
      <div class="share-product"><select v-model="selectedProductId" :disabled="sending || productsLoading"><option value="">Gửi một sản phẩm cho Tiệm Ốc…</option><option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }}</option></select><button type="button" :disabled="sending || !selectedProductId" @click="sendProduct">Gửi sản phẩm</button></div>
    </template>
    <div v-else class="support-login"><p>Kênh chat này dành cho khách hàng. Bạn có thể xem tin nhắn trong khu vực quản trị.</p></div>
  </section>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { productApi, supportChatApi } from '../api';
import { useAuthStore } from '../stores/auth';

const props = defineProps({ hidden: Boolean });
const emit = defineEmits(['opened', 'closed']);
const authStore = useAuthStore();
const router = useRouter();
const isOpen = ref(false), messages = ref([]), draft = ref(''), sending = ref(false), messageList = ref(null), products = ref([]), selectedProductId = ref(''), productsLoading = ref(false);
const defaultImage = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=160&q=80';
const money = value => Number(value || 0).toLocaleString('vi-VN') + 'đ';
let refreshTimer = null;
const formatTime = value => value ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
const scrollBottom = async () => { await nextTick(); if (messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight; };
const load = async () => { if (!authStore.isAuthenticated || authStore.user?.role !== 'customer') return; try { const result = await supportChatApi.getMyMessages(); messages.value = result.messages || []; await scrollBottom(); } catch (_) {} };
const closeChat = () => { isOpen.value = false; clearInterval(refreshTimer); refreshTimer = null; };
const loadProducts = async () => { if (products.value.length || productsLoading.value) return; productsLoading.value = true; try { const result = await productApi.getProducts({ limit: 100 }); products.value = result.products || []; } finally { productsLoading.value = false; } };
const openChat = async () => { window.dispatchEvent(new CustomEvent('tiemoc-chat-open', { detail: 'support' })); isOpen.value = true; emit('opened'); await Promise.all([load(), loadProducts()]); clearInterval(refreshTimer); refreshTimer = setInterval(load, 12000); };
const send = async () => { if (!draft.value || sending.value) return; sending.value = true; try { const result = await supportChatApi.sendMyMessage({ content: draft.value }); messages.value.push(result.chat_message); draft.value = ''; await scrollBottom(); } finally { sending.value = false; } };
const sendProduct = async () => { if (!selectedProductId.value || sending.value) return; sending.value = true; try { const result = await supportChatApi.sendMyMessage({ product_id: selectedProductId.value }); messages.value.push(result.chat_message); selectedProductId.value = ''; await scrollBottom(); } finally { sending.value = false; } };
onBeforeUnmount(() => clearInterval(refreshTimer));
const closeForOtherChat = event => { if (event.detail !== 'support') closeChat(); };
window.addEventListener('tiemoc-chat-open', closeForOtherChat);
onBeforeUnmount(() => window.removeEventListener('tiemoc-chat-open', closeForOtherChat));
watch(isOpen, open => { if (!open) emit('closed'); });
watch(() => props.hidden, hidden => { if (hidden) closeChat(); });
defineExpose({ closeWidget: closeChat, openWidget: openChat });
</script>

<style scoped>
.support-fab{position:fixed;right:28px;bottom:104px;z-index:1000;border:0;border-radius:999px;background:#6e2a90;color:#fff;padding:13px 18px;font:inherit;font-weight:800;box-shadow:0 10px 25px #3a164455;cursor:pointer}.support-widget{position:fixed;right:24px;bottom:24px;z-index:1001;width:min(370px,calc(100vw - 28px));overflow:hidden;border:1px solid #eadfd4;border-radius:18px;background:#fff;box-shadow:0 18px 45px #2b182f33}.support-widget header{display:flex;justify-content:space-between;align-items:center;padding:15px 17px;background:#6e2a90;color:#fff}.support-widget header div{display:grid;gap:3px}.support-widget header small{opacity:.85;font-size:12px}.support-widget header button{border:0;background:transparent;color:#fff;font-size:28px;cursor:pointer}.support-messages{height:280px;overflow:auto;padding:14px;background:#fbf7f9;display:flex;flex-direction:column;gap:8px}.support-bubble{max-width:78%;padding:9px 11px;border-radius:12px;line-height:1.4;font-size:14px}.support-bubble small{display:block;margin-top:4px;font-size:10px;opacity:.65}.support-bubble.mine{align-self:flex-end;background:#a9164e;color:#fff;border-bottom-right-radius:3px}.support-bubble.store{align-self:flex-start;background:#fff;color:#3c302b;border:1px solid #eadfd4;border-bottom-left-radius:3px}.shared-product{display:flex;gap:8px;align-items:center;min-width:210px;margin-top:7px;padding:7px;border:1px solid #efd9e1;border-radius:8px;background:#fff;color:#3c302b;text-decoration:none}.shared-product img{width:42px;height:42px;object-fit:cover;border-radius:6px}.shared-product span{display:grid;gap:2px}.shared-product b{font-size:12px}.shared-product small{margin:0;color:#a9164e;opacity:1}.empty-chat{margin:auto;color:#776a64;text-align:center;font-size:14px}.support-widget form{display:flex;gap:8px;padding:11px;border-top:1px solid #eadfd4}.support-widget input{flex:1;min-width:0;border:1px solid #ded4ca;border-radius:8px;padding:9px;font:inherit}.support-widget form button,.support-login a,.share-product button{border:0;border-radius:8px;background:#a9164e;color:#fff;padding:9px 12px;font:inherit;font-weight:700;text-decoration:none;cursor:pointer}.share-product{display:flex;gap:7px;padding:0 11px 11px}.share-product select{min-width:0;flex:1;border:1px solid #ded4ca;border-radius:8px;padding:8px;font:inherit}.share-product button{font-size:12px;padding:8px}.support-widget button:disabled{opacity:.55}.support-login{padding:26px 18px;display:grid;gap:14px;text-align:center;color:#665a53}.support-login p{margin:0;line-height:1.45}.support-login a{justify-self:center}@media(max-width:600px){.support-fab{right:14px;bottom:92px}.support-widget{right:14px;bottom:14px}}
</style>
