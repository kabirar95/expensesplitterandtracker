/* ============================================================
   PERSONAL EXPENSE STORE — Zustand State Management
   ============================================================ */

import { create } from 'zustand';
import {
  fetchPersonalExpenses,
  createPersonalExpense,
  deletePersonalExpense,
} from '../services/personalExpenseService';
import { fetchBudgets, setBudget } from '../services/budgetService';

const usePersonalExpenseStore = create((set, get) => ({
  personalExpenses: [],
  budgets: [],
  loading: false,
  error: null,

  loadPersonalData: async () => {
    set({ loading: true, error: null });
    try {
      const [expenses, budgets] = await Promise.all([
        fetchPersonalExpenses(),
        fetchBudgets(),
      ]);
      set({ personalExpenses: expenses, budgets: budgets, loading: false });
    } catch (err) {
      set({
        error: err.response?.data?.detail || 'Failed to load personal finance data',
        loading: false,
      });
    }
  },

  addExpense: async (expenseData) => {
    const newExpense = await createPersonalExpense(expenseData);
    set((state) => ({
      personalExpenses: [newExpense, ...state.personalExpenses],
    }));
    // Refresh budgets to update spent amounts
    get().loadPersonalData();
    return newExpense;
  },

  removeExpense: async (expenseId) => {
    await deletePersonalExpense(expenseId);
    set((state) => ({
      personalExpenses: state.personalExpenses.filter((e) => e.id !== expenseId),
    }));
    // Refresh budgets
    get().loadPersonalData();
  },

  updateBudget: async (budgetData) => {
    const updated = await setBudget(budgetData);
    get().loadPersonalData();
    return updated;
  },
}));

export default usePersonalExpenseStore;
