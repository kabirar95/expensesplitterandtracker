/* ============================================================
   AUTH STORE — User authentication state management
   ============================================================
   Manages the logged-in user's state across the entire app.
   
   State:
   - user: the logged-in user's info (or null)
   - accessToken: JWT access token (sent with every API request)
   - refreshToken: JWT refresh token (used to get new access tokens)
   - isAuthenticated: true if user is logged in
   - isLoading: true while checking auth on app startup
   
   Actions:
   - login(tokens, user): save tokens and user after login
   - logout(): clear everything
   - setUser(user): update user info
   - refreshAccessToken(): get a new access token
   ============================================================ */

import { create } from 'zustand';

const useAuthStore = create((set, get) => ({
  // ── State ──
  user: null,
  accessToken: localStorage.getItem('accessToken') || null,
  refreshToken: localStorage.getItem('refreshToken') || null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: true,

  // ── Actions ──

  /**
   * Called after successful login or signup.
   * Saves tokens to localStorage and updates state.
   */
  login: (tokenData) => {
    localStorage.setItem('accessToken', tokenData.access_token);
    localStorage.setItem('refreshToken', tokenData.refresh_token);
    set({
      user: tokenData.user,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  /**
   * Log out — clear everything.
   */
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  /**
   * Update user info (after profile edit, for example).
   */
  setUser: (user) => set({ user }),

  /**
   * Set loading state (used during initial auth check).
   */
  setLoading: (isLoading) => set({ isLoading }),

  /**
   * Update the access token (after refresh).
   */
  setAccessToken: (token) => {
    localStorage.setItem('accessToken', token);
    set({ accessToken: token });
  },
}));

export default useAuthStore;
