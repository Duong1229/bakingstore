import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '../api';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('tiemoc_token') || '');
  const user = ref(JSON.parse(localStorage.getItem('tiemoc_user') || 'null'));

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isStaff = computed(() => user.value?.role === 'staff' || user.value?.role === 'admin');

  const setAuth = (newToken, newUser) => {
    token.value = newToken;
    user.value = newUser;
    localStorage.setItem('tiemoc_token', newToken);
    localStorage.setItem('tiemoc_user', JSON.stringify(newUser));
  };

  const login = async (credentials) => {
    const res = await authApi.login(credentials);
    setAuth(res.token, res.user);
    return res;
  };

  const register = async (data) => {
    const res = await authApi.register(data);
    setAuth(res.token, res.user);
    return res;
  };

  const loginWithGoogle = async (credential) => {
    const res = await authApi.googleLogin(credential);
    setAuth(res.token, res.user);
    return res;
  };

  const logout = () => {
    token.value = '';
    user.value = null;
    localStorage.removeItem('tiemoc_token');
    localStorage.removeItem('tiemoc_user');
  };

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    isStaff,
    login,
    register,
    loginWithGoogle,
    logout,
    setAuth,
  };
});
