<template>
  <div class="ai-widget-wrapper">
    <!-- Floating Trigger Button -->
    <button v-if="!isOpen && !hidden" class="ai-fab-btn" @click="openWidget" title="Hỏi Chuyên Gia Bánh AI">
      <span class="fab-emoji">🧁</span>
      <span class="fab-text">Hỏi AI Công Thức</span>
      <span class="fab-glow"></span>
    </button>

    <!-- Chat Modal Window -->
    <div v-if="isOpen" class="ai-modal card">
      <!-- Modal Header -->
      <div class="ai-header">
        <div class="header-left">
          <div class="ai-avatar">🤖</div>
          <div>
            <h4>Bếp Trưởng AI Tiệm Ốc</h4>
            <span class="status-online">● Đang sẵn sàng hỗ trợ bạn</span>
          </div>
        </div>
        <button class="ai-close-btn" @click="isOpen = false">✕</button>
      </div>

      <!-- Messages Body -->
      <div class="ai-body" ref="bodyRef">
        <div
          v-for="(msg, index) in messages"
          :key="index"
          :class="['chat-bubble', msg.role]"
        >
          <div class="bubble-avatar">
            {{ msg.role === 'assistant' ? '🧁' : '👤' }}
          </div>
          <div class="bubble-content">
            <div class="bubble-text" style="white-space: pre-wrap;">{{ msg.content }}</div>
            <div v-if="msg.products?.length" class="product-suggestions">
              <article v-for="product in msg.products" :key="product.id" class="suggestion-card">
                <img :src="product.image_url || defaultImage" :alt="product.name">
                <div><b>{{ product.name }}</b><small>{{ money(product.price) }} / {{ product.unit || 'gói' }}</small><div class="suggestion-actions"><router-link :to="`/product/${product.slug || product.id}`" @click="isOpen = false">Xem sản phẩm ↗</router-link><button class="add" @click="addProduct(product)">＋ Giỏ hàng</button></div></div>
              </article>
            </div>
            <div v-if="msg.role === 'assistant' && index === 0 && messages.length === 1" class="inline-prompts">
              <span>Bạn có thể hỏi nhanh:</span>
              <button v-for="(p, idx) in quickPrompts" :key="idx" @click="sendQuickPrompt(p)">{{ p }}</button>
            </div>
            <span class="bubble-time">{{ msg.time }}</span>
          </div>
        </div>

        <div v-if="isLoading" class="chat-bubble assistant typing">
          <div class="bubble-avatar">🧁</div>
          <div class="bubble-content">
            <div class="typing-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Bar -->
      <form class="ai-footer" @submit.prevent="sendMessage">
        <input
          v-model="inputMessage"
          type="text"
          class="ai-input"
          placeholder="Hỏi công thức, tỷ lệ bột, nhiệt độ lò..."
          :disabled="isLoading"
        />
        <button type="submit" class="ai-send-btn" :disabled="!inputMessage.trim() || isLoading">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, onBeforeUnmount, onMounted } from 'vue';
import { aiApi } from '../api';
import { useCartStore } from '../stores/cart';

const props = defineProps({ hidden: Boolean });
const isOpen = ref(false);
const emit = defineEmits(['opened', 'closed']);
const inputMessage = ref('');
const isLoading = ref(false);
const bodyRef = ref(null);
const cartStore = useCartStore();
const defaultImage = 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=160&q=80';
const money = value => Number(value || 0).toLocaleString('vi-VN') + 'đ';

const defaultQuickPrompts = [
  'Cách làm Tiramisu không cần lò nướng?',
  'Tại sao bánh bông lan của mình hay bị xẹp?',
  'Tư vấn combo làm bánh mì hoa cúc',
  'Cách bảo quản whipping cream sau khi mở nắp?',
];
const quickPrompts = ref([...defaultQuickPrompts]);
const closeForOtherChat = event => { if (event.detail !== 'ai') isOpen.value = false; };
const openWidget = () => {
  window.dispatchEvent(new CustomEvent('tiemoc-chat-open', { detail: 'ai' }));
  isOpen.value = true;
};
onMounted(() => window.addEventListener('tiemoc-chat-open', closeForOtherChat));
onBeforeUnmount(() => window.removeEventListener('tiemoc-chat-open', closeForOtherChat));

const messages = ref([
  {
    role: 'assistant',
    content: 'Chào bạn! Mình là Trợ lý AI Bếp Bánh của Tiệm Ốc 🧁. Bạn muốn làm món bánh gì hôm nay, hay đang gặp khó khăn về công thức nướng nào cứ nhắn cho mình nhé!',
    time: 'Vừa xong',
  },
]);

const scrollToBottom = async () => {
  await nextTick();
  if (bodyRef.value) {
    bodyRef.value.scrollTop = bodyRef.value.scrollHeight;
  }
};

const sendMessage = async () => {
  const text = inputMessage.value.trim();
  if (!text || isLoading.value) return;

  const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  messages.value.push({ role: 'user', content: text, time: now });
  inputMessage.value = '';
  isLoading.value = true;
  scrollToBottom();

  try {
    // `text` has just been added as the last user message. Do not include it
    // in history as well, otherwise Gemini receives two consecutive user turns.
    const history = messages.value.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const res = await aiApi.chat(text, history);
    const replyTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    // Recipe comes first. Product cards are intentionally a second assistant turn.
    messages.value.push({ role: 'assistant', content: res.reply || 'Tiệm Ốc chúc bạn làm ra những mẻ bánh thật ngon!', time: replyTime });
    if (res.products?.length) messages.value.push({ role: 'assistant', content: res.product_intro || 'Các sản phẩm phù hợp đang có tại Tiệm Ốc:', products: res.products, time: replyTime });
  } catch (err) {
    messages.value.push({
      role: 'assistant',
      content: err.message || 'AI đang phản hồi chậm. Bạn thử lại sau giây lát nhé!',
      time: now,
    });
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
};

const addProduct = (product) => {
  cartStore.addItem(product);
  messages.value.push({ role: 'assistant', content: `Đã thêm “${product.name}” vào giỏ hàng.`, time: 'Vừa xong' });
  scrollToBottom();
};

const sendQuickPrompt = (promptText) => {
  inputMessage.value = promptText;
  sendMessage();
};

watch(isOpen, open => emit(open ? 'opened' : 'closed'));
watch(() => props.hidden, hidden => { if (hidden) isOpen.value = false; });

defineExpose({
  openWidget,
  closeWidget: () => { isOpen.value = false; },
  openForProduct: async (product) => {
    if (!product) { openWidget(); return; }
    const productName = product.name;
    openWidget();
    inputMessage.value = '';
    quickPrompts.value = [
      `Sản phẩm ${productName} dùng để làm món gì?`,
      `Dùng ${productName} như thế nào cho người mới?`,
      `Cách bảo quản ${productName} sau khi mở?`,
      `Có thể thay ${productName} bằng nguyên liệu nào?`,
    ];
    messages.value = [{
      role: 'assistant',
      content: `Bạn đang xem “${productName}” 🧁\nMình có thể tư vấn cách dùng, cách bảo quản hoặc gợi ý món bánh phù hợp. Bạn cần làm món gì với sản phẩm này?`,
      time: 'Vừa xong',
    }];
    await scrollToBottom();
  },
});
</script>

<style scoped>
.ai-widget-wrapper {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 999;
}

/* Floating Action Button */
.ai-fab-btn {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--color-primary);
  color: #FFFFFF;
  padding: 0.75rem 1.4rem;
  border-radius: var(--radius-pill);
  border: 2px solid rgba(255, 255, 255, 0.8);
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(160, 21, 62, 0.35);
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.ai-fab-btn:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 14px 32px rgba(160, 21, 62, 0.45);
}

.fab-emoji {
  font-size: 1.4rem;
}

/* Modal Window */
.ai-modal {
  width: 380px;
  max-width: calc(100vw - 32px);
  height: 540px;
  max-height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  border-radius: var(--radius-xl);
  box-shadow: 0 16px 40px rgba(45, 30, 24, 0.2);
  border: 1px solid var(--border-color);
  animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes popIn {
  from { transform: scale(0.9) translateY(20px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

.ai-header {
  padding: 1rem 1.25rem;
  background: var(--color-primary);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.ai-avatar {
  font-size: 1.5rem;
  background: rgba(255, 255, 255, 0.2);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-header h4 {
  font-size: 0.95rem;
  font-weight: 700;
}

.status-online {
  font-size: 0.72rem;
  color: #86EFAC;
}

.ai-close-btn {
  background: none;
  border: none;
  color: #FFFFFF;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.8;
}

.ai-close-btn:hover {
  opacity: 1;
}

/* Quick Prompts */
.inline-prompts { display: flex; flex-direction: column; gap: 6px; margin: 8px 0 2px; }
.inline-prompts span { font-size: .73rem; color: var(--color-text-muted); font-weight: 700; }
.inline-prompts button { background: #fff; border: 1px solid #e9c9d6; border-radius: 11px; padding: 7px 9px; text-align: left; color: var(--color-primary); font: inherit; font-size: .78rem; cursor: pointer; }
.inline-prompts button:hover { background: var(--bg-accent-light); border-color: var(--color-primary); }

/* Body */
.ai-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  background: var(--bg-main);
}

.chat-bubble {
  display: flex;
  gap: 0.5rem;
  max-width: 85%;
}

.chat-bubble.assistant {
  align-self: flex-start;
}

.chat-bubble.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.bubble-avatar {
  font-size: 1.1rem;
  margin-top: 2px;
}

.bubble-content {
  display: flex;
  flex-direction: column;
}

.chat-bubble.assistant .bubble-text {
  background: #FFFFFF;
  color: var(--color-text-main);
  border: 1px solid var(--border-color);
  border-radius: 14px 14px 14px 2px;
  padding: 0.65rem 0.9rem;
  font-size: 0.88rem;
  line-height: 1.45;
  box-shadow: var(--shadow-sm);
}

.chat-bubble.user .bubble-text {
  background: var(--color-primary);
  color: #FFFFFF;
  border-radius: 14px 14px 2px 14px;
  padding: 0.65rem 0.9rem;
  font-size: 0.88rem;
  line-height: 1.45;
}

.bubble-time {
  font-size: 0.68rem;
  color: var(--color-text-light);
  margin-top: 2px;
  align-self: flex-end;
}

.product-suggestions { display: grid; gap: 8px; margin-top: 9px; }
.suggestion-card { display: flex; gap: 8px; padding: 8px; border: 1px solid #ead9df; border-radius: 10px; background: #fff; }
.suggestion-card img { width: 54px; height: 54px; border-radius: 7px; object-fit: cover; background: var(--bg-surface-soft); }
.suggestion-card > div { min-width: 0; flex: 1; display: grid; gap: 2px; }
.suggestion-card b { font-size: .76rem; line-height: 1.25; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.suggestion-card small { color: var(--color-primary); font-weight: 700; font-size: .72rem; }
.suggestion-actions { display: flex; gap: 6px; margin-top: 3px; }
.suggestion-actions button { border: 1px solid var(--color-primary); border-radius: 6px; background: #fff; color: var(--color-primary); font-size: .69rem; font-weight: 700; padding: 4px 7px; cursor: pointer; }
.suggestion-actions .add { background: var(--color-primary); color: #fff; }

/* Typing indicator */
.typing-dots {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  background: #FFFFFF;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.typing-dots span {
  width: 6px;
  height: 6px;
  background: var(--color-primary);
  border-radius: 50%;
  animation: bounceDot 1.4s infinite ease-in-out both;
}

.typing-dots span:nth-child(1) { animation-delay: -0.32s; }
.typing-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounceDot {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

/* Footer Input */
.ai-footer {
  padding: 0.75rem 1rem;
  background: #FFFFFF;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 0.5rem;
}

.ai-input {
  flex: 1;
  padding: 0.6rem 0.9rem;
  border-radius: var(--radius-pill);
  border: 1.5px solid var(--border-color);
  font-size: 0.88rem;
  outline: none;
}

.ai-input:focus {
  border-color: var(--color-primary);
}

.ai-send-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #FFFFFF;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.ai-send-btn:disabled {
  background: #D5C6B5;
  cursor: not-allowed;
}
</style>
