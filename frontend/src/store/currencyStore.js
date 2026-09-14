import { create } from 'zustand';
import api from '../services/api';

const DEFAULT_CURRENCIES = {
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', rate_to_inr: 1.0 },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', rate_to_inr: 84.10 },
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', rate_to_inr: 91.50 },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', rate_to_inr: 107.20 },
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', rate_to_inr: 22.90 },
  THB: { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭', rate_to_inr: 2.45 },
  SGD: { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', rate_to_inr: 63.50 },
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', rate_to_inr: 0.58 },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', rate_to_inr: 61.80 },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', rate_to_inr: 55.40 },
};

const useCurrencyStore = create((set, get) => ({
  currencies: DEFAULT_CURRENCIES,
  loading: false,

  fetchRates: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/api/currencies/rates');
      if (res.data?.currencies) {
        set({ currencies: res.data.currencies });
      }
    } catch (err) {
      console.warn('Using default offline currency rates:', err);
    } finally {
      set({ loading: false });
    }
  },

  convertToInr: (amount, fromCurrency = 'INR') => {
    const num = parseFloat(amount) || 0;
    const curr = (fromCurrency || 'INR').toUpperCase();
    const { currencies } = get();
    const rate = currencies[curr]?.rate_to_inr || DEFAULT_CURRENCIES[curr]?.rate_to_inr || 1.0;
    return Math.round(num * rate * 100) / 100;
  },

  formatInr: (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  },
}));

export default useCurrencyStore;
