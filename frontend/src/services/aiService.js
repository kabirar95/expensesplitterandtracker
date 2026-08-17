import api from './api';

export const sendAIChatMessage = async (payload) => {
  const response = await api.post('/api/ai/chat', payload);
  return response.data;
};
