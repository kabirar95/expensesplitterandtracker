/* ============================================================
   EXPENSE SERVICE — Frontend API calls for Group Expenses
   ============================================================ */

import api from './api';

export const fetchGroupExpenses = async (groupId) => {
  const response = await api.get(`/api/groups/${groupId}/expenses`);
  return response.data;
};

export const createExpense = async (groupId, expenseData) => {
  const response = await api.post(`/api/groups/${groupId}/expenses`, expenseData);
  return response.data;
};

export const deleteExpense = async (expenseId) => {
  await api.delete(`/api/expenses/${expenseId}`);
};
