/* ============================================================
   PERSONAL EXPENSE SERVICE — Frontend API Calls
   ============================================================ */

import api from './api';

export const fetchPersonalExpenses = async () => {
  const response = await api.get('/api/personal-expenses');
  return response.data;
};

export const createPersonalExpense = async (expenseData) => {
  const response = await api.post('/api/personal-expenses', expenseData);
  return response.data;
};

export const deletePersonalExpense = async (expenseId) => {
  await api.delete(`/api/personal-expenses/${expenseId}`);
};
