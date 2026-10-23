<template>
  <div class="auth-page container"><section class="auth-card card">
    <div class="tabs"><button :class="{active: !isRegister}" @click="go('login')">Đăng nhập</button><button :class="{active: isRegister}" @click="go('register')">Đăng ký</button></div>
    <div class="intro"><span class="font-handwriting">{{ isRegister ? 'Tạo tài khoản mới' : 'Chào mừng bạn trở lại' }}</span><h1 class="font-serif">{{ isRegister ? 'Đăng ký Tiệm Ốc' : 'Đăng nhập Tiệm Ốc' }}</h1><p>{{ isRegister ? 'Đăng ký để đặt hàng, theo dõi đơn và lưu thông tin mua sắm.' : 'Đăng nhập để tiếp tục mua sắm và quản lý đơn hàng.' }}</p></div>
    <form @submit.prevent="submit">
      <div v-if="isRegister" class="form-group"><label class="form-label">Họ và tên</label><input v-model.trim="form.full_name" class="form-input" required autocomplete="name" placeholder="Nguyễn Văn A"></div>
      <div class="form-group"><label class="form-label">Email</label><input v-model.trim="form.email" type="email" class="form-input" required autocomplete="email" placeholder="email@example.com"></div>
      <div v-if="isRegister" class="form-group"><label class="form-label">Số điện thoại <em>(không bắt buộc)</em></label><input v-model.trim="form.phone" class="form-input" autocomplete="tel" placeholder="09xxxxxxxx"></div>
      <div class="form-group"><label class="form-label">Mật khẩu</label><input v-model="form.password" type="password" class="form-input" required minlength="6" autocomplete="current-password" placeholder="Ít nhất 6 ký tự"></div>
      <div v-if="isRegister" class="form-group"><label class="form-label">Nhập lại mật khẩu</label><input v-model="confirmPassword" type="password" class="form-input" required minlength="6" autocomplete="new-password" placeholder="Nhập lại mật khẩu"></div>
      <p v-if="message" class="message">{{ message }}</p><button class="btn btn-primary submit" :disabled="loading">{{ loading ? 'Đang xử lý...' : isRegister ? 'Tạo tài khoản' : 'Đăng nhập' }}</button>
    </form>
    <div class="divider"><span>hoặc</span></div><div ref="googleButton" class="google-button"></div><button v-if="googleUnavailable" type="button" class="google-retry" @click="loadGoogle"><b>G</b> Đăng nhập với Google</button><p v-if="googleUnavailable" class="google-note">Không tải được nút Google. Nhấn nút trên để thử lại.</p>
    <p class="switch">{{ isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?' }} <button @click="go(isRegister ? 'login' : 'register')">{{ isRegister ? 'Đăng nhập' : 'Đăng ký ngay' }}</button></p>
  </section></div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authApi } from '../api';
import { useAuthStore } from '../stores/auth';
import { useCartStore } from '../stores/cart';
const router=useRouter(), route=useRoute(), authStore=useAuthStore(), cartStore=useCartStore(); const form=ref({full_name:'',email:'',phone:'',password:''}), confirmPassword=ref(''), loading=ref(false), message=ref(''), googleButton=ref(null), googleUnavailable=ref(false);
const isRegister=computed(()=>route.name==='register');
const go=mode=>router.push({name:mode});
const afterAuth=user=>{const redirect=route.query.redirect;if(redirect)return router.push(redirect);return router.push(user.role==='admin'?'/admin':user.role==='staff'?'/pos':'/');};
const submit=async()=>{message.value='';if(isRegister.value&&form.value.password!==confirmPassword.value){message.value='Mật khẩu nhập lại chưa khớp.';return;}try{loading.value=true;const response=isRegister.value?await authStore.register(form.value):await authStore.login({email:form.value.email,password:form.value.password});afterAuth(response.user);}catch(e){message.value=e.message||'Không thể xử lý yêu cầu. Vui lòng thử lại.';}finally{loading.value=false;}};
const credentialResponse=async response=>{try{loading.value=true;message.value='';const result=await authStore.loginWithGoogle(response.credential);afterAuth(result.user);}catch(e){message.value=e.message||'Đăng nhập Google không thành công.';}finally{loading.value=false;}};
const loadGoogle=async()=>{googleUnavailable.value=false;try{const config=await authApi.getGoogleConfig();if(!window.google){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.async=true;script.onload=resolve;script.onerror=reject;document.head.appendChild(script);});}await nextTick();if(!googleButton.value)throw new Error('Không tìm thấy vùng hiển thị Google.');googleButton.value.replaceChildren();window.google.accounts.id.initialize({client_id:config.client_id,callback:credentialResponse});window.google.accounts.id.renderButton(googleButton.value,{theme:'outline',size:'large',text:isRegister.value?'signup_with':'signin_with',width:360});}catch(e){googleUnavailable.value=true;}};
watch(()=>route.name,()=>nextTick(loadGoogle));onMounted(()=>{ if (!authStore.isAuthenticated) cartStore.clearCart(); loadGoogle(); });
</script>

<style scoped>
.auth-page{padding:3.5rem 1.25rem;display:flex;justify-content:center}.auth-card{background:#fff;width:100%;max-width:470px;padding:2rem 2.4rem}.tabs{display:grid;grid-template-columns:1fr 1fr;background:#f8f1eb;padding:4px;border-radius:10px;margin-bottom:1.8rem}.tabs button{border:0;background:transparent;padding:10px;border-radius:7px;font-weight:700;cursor:pointer;color:#76685d}.tabs button.active{background:#fff;color:#a91645;box-shadow:0 1px 4px #0001}.intro{text-align:center;margin-bottom:1.6rem}.intro span{color:#bd7006;font-size:1.2rem}.intro h1{color:#a91645;font-size:1.8rem;margin:.25rem 0 .5rem}.intro p{color:#806f64;font-size:.9rem;line-height:1.5;margin:0}.form-group{margin-bottom:1rem}.form-label{display:block;font-weight:700;margin-bottom:6px;font-size:.9rem}.form-label em{font-style:normal;font-weight:400;color:#8c8078}.message{background:#fff0f0;color:#a32828;padding:10px;border-radius:8px;font-size:.9rem}.submit{width:100%;padding:.85rem;margin-top:.25rem}.divider{display:flex;align-items:center;gap:10px;color:#8d8076;font-size:.85rem;margin:1.4rem 0}.divider:before,.divider:after{content:'';height:1px;background:#eadfd4;flex:1}.google-button{display:flex;justify-content:center;min-height:40px}.google-retry{width:100%;min-height:40px;border:1px solid #dadce0;border-radius:4px;background:#fff;color:#3c4043;font-size:.92rem;font-weight:600;cursor:pointer}.google-retry b{color:#4285f4;font-size:1.1rem;margin-right:.45rem}.google-note{text-align:center;color:#8d8076;font-size:.82rem}.switch{text-align:center;color:#75685f;margin:1.4rem 0 0}.switch button{border:0;background:none;color:#a91645;font-weight:800;cursor:pointer}@media(max-width:500px){.auth-card{padding:1.5rem}.auth-page{padding:2rem 1rem}}
</style>
