/* ============================================================
   API SERVICE — Axios instance with interceptors
   ============================================================
   Axios is an HTTP client — it's how the frontend talks to
   the backend. This file creates a configured instance that:
   
   1. Automatically adds the JWT token to every request
   2. Automatically handles token refresh when it expires
   3. Has a base URL so we don't repeat it everywhere
   
   Usage in other files:
     import api from './api';
     const response = await api.get('/api/groups');
   ============================================================ */

import axios from 'axios';
import useAuthStore from '../store/authStore';

// Create Axios instance with base config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});


// ── Request Interceptor ──
// Runs BEFORE every request is sent
// Automatically adds the JWT token to the Authorization header
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);


// ── Response Interceptor ──
// Runs AFTER every response is received
// If we get a 401 (unauthorized), try to refresh the token
api.interceptors.response.use(
  // Success — just return the response
  (response) => response,

  // Error — check if it's a token expiration
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't already tried refreshing
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) {
          // No refresh token — user needs to log in
          useAuthStore.getState().logout();
          return Promise.reject(error);
        }

        // Try to get a new access token
        const response = await axios.post(
          `${api.defaults.baseURL}/api/auth/refresh`,
          { refresh_token: refreshToken }
        );

        const newAccessToken = response.data.access_token;
        useAuthStore.getState().setAccessToken(newAccessToken);

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token also expired — log out
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);


export default api;
