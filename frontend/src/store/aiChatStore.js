// ============================================================
// AI CHAT STORE — Persists conversation across page navigation
// ============================================================
import { create } from 'zustand';

const getWelcomeMessage = (userName) => ({
  id: 'welcome-1',
  sender: 'ai',
  text: `Hello **${userName || 'there'}**! 👋 I am **Divvy AI**, your personal financial advisor and expense strategist.\n\nAsk me anything about your monthly spending, budget limits, or how to save more money!`,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
});

const useAIChatStore = create((set, get) => ({
  messages: null, // null = not yet initialized
  
  initMessages: (userName) => {
    // Only initialise once per session — don't reset on navigation
    if (get().messages === null) {
      set({ messages: [getWelcomeMessage(userName)] });
    }
  },

  addMessage: (msg) => set((state) => ({
    messages: [...(state.messages || []), msg],
  })),

  clearMessages: (userName) => set({
    messages: [getWelcomeMessage(userName)],
  }),
}));

export default useAIChatStore;
