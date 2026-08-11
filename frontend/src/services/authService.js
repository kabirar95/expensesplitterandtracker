/* ============================================================
   AUTH SERVICE — Frontend authentication API calls
   ============================================================ */

import api from './api';
import useAuthStore from '../store/authStore';

export const loginUser = async (email, password) => {
  const response = await api.post('/api/auth/login', { email, password });
  useAuthStore.getState().login(response.data);
  return response.data;
};

export const signupUser = async (userData) => {
  const response = await api.post('/api/auth/signup', userData);
  useAuthStore.getState().login(response.data);
  return response.data;
};

export const fetchCurrentUser = async () => {
  const response = await api.get('/api/auth/me');
  useAuthStore.getState().setUser(response.data);
  return response.data;
};

export const logoutUser = () => {
  useAuthStore.getState().logout();
};
