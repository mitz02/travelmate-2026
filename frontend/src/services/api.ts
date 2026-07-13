import axios from 'axios';

// Create an Axios instance
const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:3003') + '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor — only remove token on 401 from auth endpoints
// (not from every 401, which causes a cascade nuking the token on transient errors)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/me') || url.includes('/auth/signin') || url.includes('/auth/login') || url.includes('/auth/signup');
    if (error.response?.status === 401 && isAuthEndpoint) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export default api;
