/* ============================================================
   GROUP SERVICE — Frontend API calls for Group Management
   ============================================================ */

import api from './api';

export const fetchGroups = async () => {
  const response = await api.get('/api/groups');
  return response.data;
};

export const fetchGroupById = async (groupId) => {
  const response = await api.get(`/api/groups/${groupId}`);
  return response.data;
};

export const createGroup = async (groupData) => {
  const response = await api.post('/api/groups', groupData);
  return response.data;
};

export const addGroupMember = async (groupId, memberName) => {
  const response = await api.post(`/api/groups/${groupId}/members`, { name: memberName });
  return response.data;
};

export const deleteGroup = async (groupId) => {
  await api.delete(`/api/groups/${groupId}`);
};
