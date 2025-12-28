// ===========================================
// CREDITHOPPER - API SERVICE
// ===========================================
// Frontend API client for communicating with backend

const API = {
  // Base URL - auto-detect production vs local
  baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? '/api'  // Local development (served from same origin)
    : 'https://credithopper-production.up.railway.app/api',  // Production API
  
  // Auth token storage
  token: localStorage.getItem('ch_token'),
  user: JSON.parse(localStorage.getItem('ch_user') || 'null'),
  
  // ===========================================
  // HTTP METHODS
  // ===========================================
  
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('ch_token', token);
    } else {
      localStorage.removeItem('ch_token');
    }
  },
  
  setUser(user) {
    this.user = user;
    if (user) {
      localStorage.setItem('ch_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('ch_user');
    }
  },
  
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  },
  
  async request(method, endpoint, data = null) {
    const options = {
      method,
      headers: this.getHeaders(),
    };
    
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      const json = await response.json();
      
      // Handle 401 - redirect to login
      if (response.status === 401) {
        this.setToken(null);
        this.setUser(null);
        if (!window.location.pathname.includes('login')) {
          window.location.href = '/login.html';
        }
      }
      
      return {
        ok: response.ok,
        status: response.status,
        data: json,
      };
    } catch (error) {
      console.error('API Error:', error);
      return {
        ok: false,
        status: 0,
        data: { success: false, error: 'Network error. Please try again.' },
      };
    }
  },
  
  get(endpoint) {
    return this.request('GET', endpoint);
  },
  
  post(endpoint, data) {
    return this.request('POST', endpoint, data);
  },
  
  patch(endpoint, data) {
    return this.request('PATCH', endpoint, data);
  },
  
  delete(endpoint) {
    return this.request('DELETE', endpoint);
  },
  
  // File upload
  async upload(endpoint, file, additionalData = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    for (const [key, value] of Object.entries(additionalData)) {
      formData.append(key, value);
    }
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
        body: formData,
      });
      
      const json = await response.json();
      return {
        ok: response.ok,
        status: response.status,
        data: json,
      };
    } catch (error) {
      console.error('Upload failed:', error);
      return {
        ok: false,
        status: 0,
        data: { success: false, error: 'Upload failed. Please try again.' },
      };
    }
  },
  
  // ===========================================
  // AUTH ENDPOINTS
  // ===========================================
  
  auth: {
    async register(data) {
      const response = await API.post('/auth/register', {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        personalUseOnly: data.personalUseOnly || true,
        acceptedTerms: data.acceptedTerms || true,
      });
      
      if (response.ok && response.data.data) {
        API.setToken(response.data.data.token);
        API.setUser(response.data.data.user);
      }
      
      return response;
    },
    
    async login(email, password, remember = false) {
      const response = await API.post('/auth/login', {
        email,
        password,
        remember,
      });
      
      if (response.ok && response.data.data) {
        API.setToken(response.data.data.token);
        API.setUser(response.data.data.user);
      }
      
      return response;
    },
    
    async logout() {
      API.setToken(null);
      API.setUser(null);
      window.location.href = '/login.html';
    },
    
    async me() {
      return API.get('/auth/me');
    },
    
    async updateProfile(data) {
      const response = await API.patch('/auth/profile', data);
      if (response.ok && response.data.data) {
        API.setUser(response.data.data.user);
      }
      return response;
    },
    
    async changePassword(currentPassword, newPassword) {
      return API.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
    },
    
    async requestPasswordReset(email) {
      return API.post('/auth/forgot-password', { email });
    },
    
    isLoggedIn() {
      return !!API.token;
    },
    
    getUser() {
      return API.user;
    },
  },
  
  // ===========================================
  // REPORTS ENDPOINTS
  // ===========================================
  
  reports: {
    async upload(file, bureau = null) {
      const additionalData = {};
      if (bureau) additionalData.bureau = bureau;
      return API.upload('/reports/upload', file, additionalData);
    },
    
    async list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return API.get(`/reports${query ? '?' + query : ''}`);
    },
    
    async get(id) {
      return API.get(`/reports/${id}`);
    },
    
    async parse(id) {
      return API.post(`/reports/${id}/parse`, {});
    },
    
    async delete(id) {
      return API.delete(`/reports/${id}`);
    },
    
    async getItems(id) {
      return API.get(`/reports/${id}/items`);
    },
  },
  
  // ===========================================
  // ITEMS ENDPOINTS
  // ===========================================
  
  items: {
    async list(params = {}) {
      const query = new URLSearchParams();
      if (params.page) query.append('page', params.page);
      if (params.limit) query.append('limit', params.limit);
      if (params.status) query.append('status', params.status);
      if (params.accountType) query.append('accountType', params.accountType);
      if (params.bureau) query.append('bureau', params.bureau);
      if (params.sortBy) query.append('sortBy', params.sortBy);
      if (params.sortOrder) query.append('sortOrder', params.sortOrder);
      if (params.search) query.append('search', params.search);
      
      const queryStr = query.toString();
      return API.get(`/items${queryStr ? '?' + queryStr : ''}`);
    },
    
    async get(id) {
      return API.get(`/items/${id}`);
    },
    
    async create(data) {
      return API.post('/items', data);
    },
    
    async update(id, data) {
      return API.patch(`/items/${id}`, data);
    },
    
    async delete(id) {
      return API.delete(`/items/${id}`);
    },
    
    async analyze(id, state = null) {
      const query = state ? `?state=${state}` : '';
      return API.get(`/items/${id}/analyze${query}`);
    },
    
    async markDeleted(id, bureaus = [], debtEliminated = null) {
      return API.post(`/items/${id}/mark-deleted`, {
        bureaus,
        debtEliminated,
      });
    },
    
    async bulkUpdate(itemIds, updates) {
      return API.post('/items/bulk-update', {
        itemIds,
        updates,
      });
    },
    
    async getStats() {
      return API.get('/items/stats');
    },
    
    async getTypes() {
      return API.get('/items/types');
    },
  },
  
  // ===========================================
  // DISPUTES ENDPOINTS
  // ===========================================
  
  disputes: {
    async create(data) {
      return API.post('/disputes', data);
    },
    
    async list(params = {}) {
      const query = new URLSearchParams();
      if (params.page) query.append('page', params.page);
      if (params.limit) query.append('limit', params.limit);
      if (params.status) query.append('status', params.status);
      if (params.target) query.append('target', params.target);
      if (params.negativeItemId) query.append('negativeItemId', params.negativeItemId);
      if (params.sortBy) query.append('sortBy', params.sortBy);
      if (params.sortOrder) query.append('sortOrder', params.sortOrder);
      
      const queryStr = query.toString();
      return API.get(`/disputes${queryStr ? '?' + queryStr : ''}`);
    },
    
    async get(id) {
      return API.get(`/disputes/${id}`);
    },
    
    async update(id, data) {
      return API.patch(`/disputes/${id}`, data);
    },
    
    async delete(id) {
      return API.delete(`/disputes/${id}`);
    },
    
    async generateLetter(id, customInstructions = null) {
      return API.post(`/disputes/${id}/generate-letter`, { customInstructions });
    },
    
    async markAsMailed(id, data = {}) {
      return API.post(`/disputes/${id}/mail`, data);
    },
    
    async logResponse(id, responseData) {
      return API.post(`/disputes/${id}/response`, responseData);
    },
    
    async advance(id) {
      return API.post(`/disputes/${id}/advance`, {});
    },
    
    async complete(id, outcome = null) {
      return API.post(`/disputes/${id}/complete`, { outcome });
    },
    
    async getAttention() {
      return API.get('/disputes/attention');
    },
    
    async getStats() {
      return API.get('/disputes/stats');
    },
    
    async getTimeline(itemId) {
      return API.get(`/disputes/item/${itemId}/timeline`);
    },
    
    async getResponseTypes() {
      return API.get('/disputes/response-types');
    },
  },
  
  // ===========================================
  // LETTERS ENDPOINTS
  // ===========================================
  
  letters: {
    async generate(params) {
      return API.post('/letters/generate', {
        negativeItemId: params.negativeItemId,
        letterType: params.letterType,
        target: params.target,
        bureau: params.bureau,
        customNotes: params.customNotes,
        includeUserInfo: params.includeUserInfo,
        includeRecipient: params.includeRecipient,
      });
    },
    
    async regenerate(params) {
      return API.post('/letters/regenerate', {
        negativeItemId: params.negativeItemId,
        letterType: params.letterType,
        target: params.target,
        bureau: params.bureau,
        customNotes: params.customNotes,
      });
    },
    
    async getTemplates(params = {}) {
      const query = new URLSearchParams();
      if (params.category) query.append('category', params.category);
      if (params.targetType) query.append('targetType', params.targetType);
      if (params.round) query.append('round', params.round);
      if (params.accountType) query.append('accountType', params.accountType);
      
      const queryStr = query.toString();
      return API.get(`/letters/templates${queryStr ? '?' + queryStr : ''}`);
    },
    
    async getTemplate(id) {
      return API.get(`/letters/templates/${id}`);
    },
    
    async fillTemplate(templateId, negativeItemId, customData = {}) {
      return API.post('/letters/fill-template', {
        templateId,
        negativeItemId,
        ...customData,
      });
    },
    
    async recommend(negativeItemId, target = 'BUREAU') {
      return API.get(`/letters/recommend?negativeItemId=${negativeItemId}&target=${target}`);
    },
    
    async getTypes() {
      return API.get('/letters/types');
    },
    
    async getBureaus() {
      return API.get('/letters/bureaus');
    },
  },
  
  // ===========================================
  // PARSER ENDPOINTS
  // ===========================================
  
  parser: {
    async getSupportedFormats() {
      return API.get('/parser/supported-formats');
    },
    
    async extractText(reportId) {
      return API.post('/parser/extract-text', { reportId });
    },
    
    async detectBureau(reportId = null, text = null) {
      return API.post('/parser/detect-bureau', { reportId, text });
    },
    
    async parseText(text, bureau = null) {
      return API.post('/parser/parse-text', { text, bureau });
    },
    
    async parseAccount(text) {
      return API.post('/parser/parse-account', { text });
    },
    
    async reparse(reportId, deleteExistingItems = false) {
      return API.post('/parser/reparse', { reportId, deleteExistingItems });
    },
  },
  
  // ===========================================
  // DASHBOARD ENDPOINTS
  // ===========================================
  
  dashboard: {
    async get() {
      return API.get('/dashboard');
    },
    
    async getAccess() {
      return API.get('/dashboard/access');
    },
    
    async getItemsStats() {
      return API.get('/dashboard/items');
    },
    
    async getDisputeStats() {
      return API.get('/dashboard/disputes');
    },
    
    async getWinsStats() {
      return API.get('/dashboard/wins-stats');
    },
    
    async getAttention() {
      return API.get('/dashboard/attention');
    },
    
    async getProgress() {
      return API.get('/dashboard/progress');
    },
    
    async getActivity(limit = 20) {
      return API.get(`/dashboard/activity?limit=${limit}`);
    },
    
    async getOnboarding() {
      return API.get('/dashboard/onboarding');
    },
    
    async getQuickActions() {
      return API.get('/dashboard/quick-actions');
    },
    
    async getWinTypes() {
      return API.get('/dashboard/win-types');
    },
    
    async createWin(data) {
      return API.post('/dashboard/wins', data);
    },
    
    async listWins(page = 1, limit = 50) {
      return API.get(`/dashboard/wins?page=${page}&limit=${limit}`);
    },
    
    async getWin(id) {
      return API.get(`/dashboard/wins/${id}`);
    },
    
    async deleteWin(id) {
      return API.delete(`/dashboard/wins/${id}`);
    },
  },
};

// Make API available globally
window.API = API;

console.log('CreditHopper API Service loaded');
