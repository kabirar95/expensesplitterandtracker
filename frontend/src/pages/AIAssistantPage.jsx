import usePersonalExpenseStore from '../store/personalExpenseStore';
import useGroupStore from '../store/groupStore';
import useAuthStore from '../store/authStore';
import { sendAIChatMessage } from '../services/aiService';
import Button from '../components/common/Button';
import { BiPaperPlane, BiBot, BiUser, BiRefresh } from 'react-icons/bi';
import { HiSparkles } from 'react-icons/hi';
import toast from 'react-hot-toast';
import './AIAssistantPage.css';

export default function AIAssistantPage() {
  const { user } = useAuthStore();
  const { personalExpenses, budgets, selectedMonthYear } = usePersonalExpenseStore();
  const { groups, balances } = useGroupStore();

  const [messages, setMessages] = useState([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: `Hello **${user?.full_name || 'there'}**! 👋 I am **Divvy AI**, your personal financial advisor and expense strategist.\n\nAsk me anything about your monthly spending, budget limits, or how to save more money!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Compute live user financial context
  const currentYearStr = (selectedMonthYear || '2026-08').substring(0, 4);

  const monthlySpent = personalExpenses
    .filter((e) => String(e.expense_date || '').startsWith(selectedMonthYear))
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  const yearlySpent = personalExpenses
    .filter((e) => String(e.expense_date || '').startsWith(currentYearStr))
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  const overallBudgetObj = budgets.find((b) => b.category.toLowerCase() === 'overall');
  const overallBudget = overallBudgetObj ? parseFloat(overallBudgetObj.target_amount) : 0;

  const categoryBudgets = budgets.map((b) => {
    const catSpent = personalExpenses
      .filter((e) => e.category.toLowerCase() === b.category.toLowerCase() && String(e.expense_date || '').startsWith(selectedMonthYear))
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    return {
      category: b.category,
      target_amount: parseFloat(b.target_amount),
      spent_amount: catSpent,
    };
  });

  const suggestedPrompts = [
    '📊 How much did I spend this month?',
    '🎯 Am I over my overall budget?',
    '💡 Give me 3 tips to save money',
    '🛒 Which category am I spending most on?',
  ];

  const handleSendMessage = async (textToSend = null) => {
    const promptText = textToSend || inputMessage.trim();
    if (!promptText || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setLoading(true);

    try {
      const payload = {
        message: promptText,
        selected_month: selectedMonthYear,
        monthly_spent: monthlySpent,
        yearly_spent: yearlySpent,
        overall_budget: overallBudget,
        category_budgets: categoryBudgets,
        recent_personal_expenses: personalExpenses.slice(0, 10),
        group_balances: Array.isArray(balances) ? balances : [],
      };

      const response = await sendAIChatMessage(payload);

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to get AI response');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMarkdown = (text) => {
    // Simple markdown renderer for bold, lists, and linebreaks
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
    return { __html: formatted };
  };

  return (
    <div className="ai-assistant-page">
      {/* Page Header */}
      <div className="ai-header">
        <div className="ai-title-wrap">
          <div className="ai-bot-badge">
            <HiSparkles className="sparkle-icon" />
            <BiBot className="bot-icon" />
          </div>
          <div>
            <h1>Divvy AI Financial Assistant</h1>
            <p>Real-time AI insights, spending analysis & smart money advice</p>
          </div>
        </div>

        <button
          className="clear-chat-btn"
          onClick={() => setMessages([messages[0]])}
          title="Clear Conversation"
        >
          <BiRefresh /> Clear Chat
        </button>
      </div>

      {/* Suggested Quick Prompt Pills */}
      <div className="suggested-prompts-bar">
        {suggestedPrompts.map((prompt, idx) => (
          <button
            key={idx}
            className="prompt-pill"
            onClick={() => handleSendMessage(prompt)}
            disabled={loading}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="chat-window cyber-card">
        <div className="messages-list">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-message-row ${msg.sender}`}>
              <div className="msg-avatar">
                {msg.sender === 'ai' ? <BiBot /> : <BiUser />}
              </div>
              <div className="msg-bubble-container">
                <div className="msg-author-row">
                  <span className="msg-author-name">{msg.sender === 'ai' ? 'Divvy AI' : 'You'}</span>
                  <span className="msg-time">{msg.timestamp}</span>
                </div>
                <div
                  className="msg-text-content"
                  dangerouslySetInnerHTML={formatMarkdown(msg.text)}
                />
              </div>
            </div>
          ))}

          {loading && (
            <div className="chat-message-row ai loading-row">
              <div className="msg-avatar">
                <BiBot />
              </div>
              <div className="msg-bubble-container">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="chat-input-bar">
          <textarea
            className="chat-textarea"
            placeholder="Ask Divvy AI about your expenses, budgets, or savings..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            rows={1}
            disabled={loading}
          />
          <Button
            variant="primary"
            icon={BiPaperPlane}
            onClick={() => handleSendMessage()}
            loading={loading}
            disabled={!inputMessage.trim() || loading}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
