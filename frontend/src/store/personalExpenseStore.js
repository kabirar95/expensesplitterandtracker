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
  selectedMonthYear: new Date().toISOString().substring(0, 7), // "YYYY-MM"
  loading: false,
  error: null,

  setSelectedMonthYear: (monthYear) => {
    set({ selectedMonthYear: monthYear });
    get().loadPersonalData(monthYear);
  },

  loadPersonalData: async (targetMonthYear) => {
    const monthYear = targetMonthYear || get().selectedMonthYear || new Date().toISOString().substring(0, 7);
    set({ loading: true, error: null });
    try {
      const [expenses, budgets] = await Promise.all([
        fetchPersonalExpenses(),
        fetchBudgets(monthYear),
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
    get().loadPersonalData(get().selectedMonthYear);
    return newExpense;
  },

  removeExpense: async (expenseId) => {
    await deletePersonalExpense(expenseId);
    set((state) => ({
      personalExpenses: state.personalExpenses.filter((e) => e.id !== expenseId),
    }));
    get().loadPersonalData(get().selectedMonthYear);
  },

  updateBudget: async (budgetData) => {
    const currentMonth = budgetData.month_year || get().selectedMonthYear;
    const updated = await setBudget({ ...budgetData, month_year: currentMonth });
    get().loadPersonalData(currentMonth);
    return updated;
  },
}));

export default usePersonalExpenseStore;
