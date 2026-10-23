import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  // Không để màn hình treo quá lâu khi máy chủ dữ liệu đang mất kết nối.
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor gắn JWT Token vào header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tiemoc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Interceptor xử lý lỗi 401 hết hạn phiên
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Xóa token nếu không hợp lệ
      localStorage.removeItem('tiemoc_token');
      localStorage.removeItem('tiemoc_user');
    }
    const unavailable = [502, 503, 504].includes(error.response?.status);
    // AI có lỗi riêng; không gán nhầm thành lỗi mất kết nối kho dữ liệu.
    const isAiRequest = error.config?.url?.startsWith('/ai/');
    const message = unavailable && !isAiRequest
      ? 'Dữ liệu cửa hàng đang tạm thời mất kết nối. Vui lòng thử lại sau ít phút.'
      : (error.response?.data?.message || error.message || 'Có lỗi xảy ra, vui lòng thử lại!');
    return Promise.reject(new Error(message));
  }
);

// 1. Auth APIs
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  googleLogin: (credential) => api.post('/auth/google', { credential }),
  getGoogleConfig: () => api.get('/auth/google-config'),
  getMe: () => api.get('/auth/me'),
  updateMe: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.put('/auth/me/password', data),
  deleteMe: () => api.delete('/auth/me'),
};

// 2. Product APIs
export const productApi = {
  getProducts: (params) => api.get('/products', { params }),
  getAdminProducts: (params) => api.get('/products/admin-list', { params }),
  getCategories: () => api.get('/products/categories'),
  validateCart: (items) => api.post('/products/validate-cart', { items }),
  getProductById: (id) => api.get(`/products/${id}`),
  getByBarcode: (code) => api.get(`/products/barcode/${code}`),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  getPriceHistory: (id) => api.get(`/products/${id}/price-history`),
};

// 3. Order APIs
export const orderApi = {
  createOrder: (orderData) => api.post('/orders', orderData),
  validateVoucher: (data) => api.post('/orders/validate-voucher', data),
  searchPosCustomers: (q) => api.get('/orders/pos/customers', { params: { q } }),
  createPosCustomer: (data) => api.post('/orders/pos/customers', data),
  getMyOrders: (params) => api.get('/orders/my', { params }),
  getOrderDetail: (id) => api.get(`/orders/${id}`),
  cancelMyOrder: (id) => api.put(`/orders/${id}/cancel`),
  getAllOrders: (params) => api.get('/orders', { params }),
  updateOrderStatus: (id, status) => api.put(`/orders/${id}/status`, { order_status: status }),
  downloadReceipt: (id) => api.get(`/orders/${id}/receipt`, { responseType: 'blob' }),
  downloadPickingSlip: (id) => api.get(`/orders/${id}/picking-slip`, { responseType: 'blob' }),
};

// 4. Inventory APIs
export const inventoryApi = {
  getBatches: (params) => api.get('/inventory/batches', { params }),
  getStock: () => api.get('/inventory/stock'),
  getLocations: () => api.get('/inventory/locations'),
  addBatch: (data) => api.post('/inventory/batches', data),
  updateBatch: (id, data) => api.put(`/inventory/batches/${id}`, data),
  deleteBatch: (id) => api.delete(`/inventory/batches/${id}`),
  updateBatchStatus: (id, status) => api.put(`/inventory/batches/${id}/status`, { status }),
  disposeExpiredBatch: (id, note = '') => api.post(`/inventory/batches/${id}/dispose`, { note }),
  exportExpiredDisposals: (batchIds, format) => api.post('/inventory/disposals/export', { batch_ids: batchIds, format }, { responseType: 'blob' }),
  importExcel: (formData) => api.post('/inventory/import-excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  downloadTemplate: () => api.get('/inventory/download-template', { responseType: 'blob' }),
};

// 5. Payment APIs
export const paymentApi = {
  getVietQR: (orderId) => api.get(`/payments/vietqr/${orderId}`),
};

export const reviewApi = {
  getByProduct: (productId) => api.get(`/reviews/${productId}`),
  create: (data) => api.post('/reviews', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  }),
};

export const supportChatApi = {
  getMyMessages: () => api.get('/support-chat/my'),
  sendMyMessage: (payload) => api.post('/support-chat/my', typeof payload === 'string' ? { content: payload } : payload),
  getConversations: () => api.get('/support-chat/conversations'),
  replyToCustomer: (customerId, content) => api.post(`/support-chat/conversations/${customerId}`, { content }),
};

export const bannerApi = {
  getPublic: () => api.get('/banners'),
  getAdmin: () => api.get('/banners/admin'),
  create: (data) => api.post('/banners/admin', data),
  update: (id, data) => api.put(`/banners/admin/${id}`, data),
  remove: (id) => api.delete(`/banners/admin/${id}`),
};

// 6. AI APIs
export const aiApi = {
  chat: (message, conversationHistory) => api.post('/ai/chat', {
    message,
    conversation_history: conversationHistory,
  }, { timeout: 35000 }),
  suggestRecipe: (cakeType) => api.post('/ai/suggest-recipe', { cake_type: cakeType }, { timeout: 35000 }),
};

// 7. Admin APIs
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getRevenue: (params = {}) => api.get('/admin/revenue', { params }),
  getUsers: (params) => api.get('/admin/users', { params }),
  getCustomerDirectory: (params) => api.get('/admin/customers', { params }),
  createCustomer: (data) => api.post('/admin/customers', data),
  updateCustomer: (id, data) => api.put(`/admin/customers/${id}`, data),
  getStoreReviews: () => api.get('/admin/reviews'),
  respondToReview: (id, data) => api.put(`/admin/reviews/${id}/response`, data),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  getSuppliers: () => api.get('/admin/suppliers'),
  createCategory: (data) => api.post('/admin/categories', data),
  updateCategory: (id, data) => api.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/admin/categories/${id}`),
  createSupplier: (data) => api.post('/admin/suppliers', data),
  updateSupplier: (id, data) => api.put(`/admin/suppliers/${id}`, data),
  deleteSupplier: (id) => api.delete(`/admin/suppliers/${id}`),
  getVouchers: () => api.get('/admin/vouchers'),
  createVoucher: (data) => api.post('/admin/vouchers', data),
  updateVoucher: (id, data) => api.put(`/admin/vouchers/${id}`, data),
  deleteVoucher: (id) => api.delete(`/admin/vouchers/${id}`),
};

export default api;
