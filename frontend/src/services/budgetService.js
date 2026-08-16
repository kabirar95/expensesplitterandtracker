/* ============================================================
   BUDGET SERVICE — Frontend API Calls
   ============================================================ */

import api from './api';

export const fetchBudgets = async (monthYear) => {
  const url = monthYear ? `/api/budgets?month_year=${monthYear}` : '/api/budgets';
  const response = await api.get(url);
  return response.data;
};

export const setBudget = async (budgetData) => {
  const response = await api.post('/api/budgets', budgetData);
  return response.data;
};
