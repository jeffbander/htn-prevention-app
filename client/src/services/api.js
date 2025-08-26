import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Members API
export const membersAPI = {
  getAll: () => api.get('/members'),
  getById: (id) => api.get(`/members/${id}`),
  create: (data) => api.post('/members', data),
  update: (id, data) => api.put(`/members/${id}`, data),
  delete: (id) => api.delete(`/members/${id}`),
};

// Blood Pressure API
export const bloodPressureAPI = {
  getAll: () => api.get('/blood-pressure-readings'),
  getByMember: (memberId) => api.get(`/blood-pressure-readings/member/${memberId}`),
  create: (data) => api.post('/blood-pressure-readings', data),
  update: (id, data) => api.put(`/blood-pressure-readings/${id}`, data),
  delete: (id) => api.delete(`/blood-pressure-readings/${id}`),
};

// Encounters API
export const encountersAPI = {
  getAll: () => api.get('/encounters'),
  getByMember: (memberId) => api.get(`/encounters/member/${memberId}`),
  create: (data) => api.post('/encounters', data),
  update: (id, data) => api.put(`/encounters/${id}`, data),
  delete: (id) => api.delete(`/encounters/${id}`),
};

// Medical History API
export const medicalHistoryAPI = {
  getByMember: (memberId) => api.get(`/medical-history/member/${memberId}`),
  create: (data) => api.post('/medical-history', data),
};

// Analytics API
export const analyticsAPI = {
  getOverview: () => api.get('/analytics'),
  getMembers: () => api.get('/analytics/members'),
  getClinical: () => api.get('/analytics/clinical'),
  getEngagement: () => api.get('/analytics/engagement'),
  getEquity: () => api.get('/analytics/equity'),
  getImpact: () => api.get('/analytics/impact'),
};

export default api;

