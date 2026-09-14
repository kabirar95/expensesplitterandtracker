import { create } from 'zustand';
import api from '../services/api';

const useRecurringStore = create((set, get) => ({
  rules: [],
  loading: false,
  lastProcessed: null,

  fetchRules: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/api/recurring');
      set({ rules: res.data || [] });
      return res.data;
    } catch (err) {
      console.error('Failed fetching recurring rules:', err);
      return [];
    } finally {
      set({ loading: false });
    }
  },

  createRule: async (ruleData) => {
    const res = await api.post('/api/recurring', ruleData);
    set((state) => ({ rules: [res.data, ...state.rules] }));
    return res.data;
  },

  updateRule: async (id, updateData) => {
    const res = await api.put(`/api/recurring/${id}`, updateData);
    set((state) => ({
      rules: state.rules.map((r) => (r.id === id ? res.data : r)),
    }));
    return res.data;
  },

  deleteRule: async (id) => {
    await api.delete(`/api/recurring/${id}`);
    set((state) => ({
      rules: state.rules.filter((r) => r.id !== id),
    }));
  },

  processDue: async () => {
    try {
      const res = await api.post('/api/recurring/process-due');
      set({ lastProcessed: new Date().toISOString() });
      // Refresh rules to get updated next_run_date
      get().fetchRules();
      return res.data;
    } catch (err) {
      console.error('Failed processing due recurring bills:', err);
      return { processed_count: 0, logged_descriptions: [] };
    }
  },
}));

export default useRecurringStore;
