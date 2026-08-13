/* ============================================================
   GROUP STORE — Zustand State for Groups & Expenses
   ============================================================ */

import { create } from 'zustand';
import { fetchGroups, createGroup, addGroupMember, deleteGroup } from '../services/groupService';
import { fetchGroupExpenses, createExpense, deleteExpense } from '../services/expenseService';

const useGroupStore = create((set, get) => ({
  groups: [],
  activeGroup: null,
  activeExpenses: [],
  loading: false,
  error: null,

  loadGroups: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchGroups();
      set({ groups: data, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Failed to load groups', loading: false });
    }
  },

  addGroup: async (groupData) => {
    const newGroup = await createGroup(groupData);
    set((state) => ({ groups: [newGroup, ...state.groups] }));
    return newGroup;
  },

  setActiveGroup: async (group) => {
    set({ activeGroup: group, loading: true });
    try {
      const expenses = await fetchGroupExpenses(group.id);
      set({ activeExpenses: expenses, loading: false });
    } catch (err) {
      set({ activeExpenses: [], loading: false });
    }
  },

  addMemberToActiveGroup: async (memberName) => {
    const { activeGroup } = get();
    if (!activeGroup) return;

    const updatedGroup = await addGroupMember(activeGroup.id, memberName);
    set((state) => ({
      activeGroup: updatedGroup,
      groups: state.groups.map((g) => (g.id === updatedGroup.id ? updatedGroup : g)),
    }));
  },

  addExpenseToActiveGroup: async (expenseData) => {
    const { activeGroup } = get();
    if (!activeGroup) return;

    const newExpense = await createExpense(activeGroup.id, expenseData);
    set((state) => ({
      activeExpenses: [newExpense, ...state.activeExpenses],
    }));
    return newExpense;
  },

  removeExpense: async (expenseId) => {
    await deleteExpense(expenseId);
    set((state) => ({
      activeExpenses: state.activeExpenses.filter((e) => e.id !== expenseId),
    }));
  },

  removeGroup: async (groupId) => {
    await deleteGroup(groupId);
    set((state) => {
      const remaining = state.groups.filter((g) => g.id !== groupId);
      const nextActive = state.activeGroup?.id === groupId ? remaining[0] || null : state.activeGroup;
      return {
        groups: remaining,
        activeGroup: nextActive,
        activeExpenses: nextActive ? state.activeExpenses : [],
      };
    });
  },
}));

export default useGroupStore;
