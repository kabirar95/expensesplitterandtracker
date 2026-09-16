import React, { useEffect, useState, useRef } from 'react';
import {
  BiPlus,
  BiMoney,
  BiWallet,
  BiPieChartAlt2,
  BiTrash,
  BiSearch,
  BiFilterAlt,
  BiEdit,
  BiTrendingUp,
  BiErrorCircle,
  BiCheckCircle,
  BiBrain,
  BiDownload,
  BiRepeat,
  BiMailSend,
  BiSpreadsheet,
  BiChevronLeft,
  BiChevronRight,
  BiChevronDown,
  BiSliderAlt,
  BiRestaurant,
  BiHomeAlt,
  BiShoppingBag,
  BiCar,
  BiFilm,
  BiPulse,
  BiPackage,
} from 'react-icons/bi';
import { HiSparkles } from 'react-icons/hi';
import { toast } from 'react-hot-toast';

import usePersonalExpenseStore from '../store/personalExpenseStore';
import useRecurringStore from '../store/recurringStore';
import useCurrencyStore from '../store/currencyStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Spinner from '../components/common/Spinner';
import SmartExpenseModal from '../components/common/SmartExpenseModal';
import RecurringExpensesModal from '../components/recurring/RecurringExpensesModal';
import GmailSyncModal from '../components/gmail/GmailSyncModal';
import BankStatementModal from '../components/statements/BankStatementModal';
import api from '../services/api';

import './PersonalTrackerPage.css';

const CATEGORY_MAP = {
  food: { name: 'Food & Dining', Icon: BiRestaurant, color: '#e11d48' },
  rent: { name: 'Rent & Bills', Icon: BiHomeAlt, color: '#ff4d6d' },
  shopping: { name: 'Shopping', Icon: BiShoppingBag, color: '#f43f5e' },
  travel: { name: 'Travel & Cab', Icon: BiCar, color: '#f59e0b' },
  entertainment: { name: 'Entertainment', Icon: BiFilm, color: '#10b981' },
  health: { name: 'Health & Fitness', Icon: BiPulse, color: '#38bdf8' },
  other: { name: 'Other / Misc', Icon: BiPackage, color: '#71717a' },
};

export default function PersonalTrackerPage() {
  const {
    personalExpenses,
    budgets,
    selectedMonthYear,
    setSelectedMonthYear,
    loading,
    loadPersonalData,
    addExpense,
    removeExpense,
    updateBudget,
  } = usePersonalExpenseStore();

  const { processDue } = useRecurringStore();
  const { currencies, convertToInr, fetchRates, isLive, source, lastUpdated } = useCurrencyStore();

  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'yearly'

  // Modals state
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isSetBudgetModalOpen, setIsSetBudgetModalOpen] = useState(false);
  const [isSmartAddModalOpen, setIsSmartAddModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isGmailModalOpen, setIsGmailModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [detectingCategory, setDetectingCategory] = useState(false);

  // Form states
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    currency: 'INR',
    category: 'food',
    expense_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [budgetForm, setBudgetForm] = useState({
    category: 'overall',
    target_amount: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [feedTimeFilter, setFeedTimeFilter] = useState('month'); // 'month' or 'all'
  const [activeContentTab, setActiveContentTab] = useState('ledger'); // 'ledger' or 'budgets'
  const [isAutomationsOpen, setIsAutomationsOpen] = useState(false);
  const automationsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (automationsRef.current && !automationsRef.current.contains(e.target)) {
        setIsAutomationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGmailImportSuccess = (toImport = []) => {
    loadPersonalData(selectedMonthYear);
    if (toImport && toImport.length > 0) {
      // Find latest date among imported transactions
      const sorted = [...toImport].sort((a, b) => (b.expense_date || '').localeCompare(a.expense_date || ''));
      const newestDate = sorted[0]?.expense_date;
      if (newestDate) {
        const importMonth = newestDate.substring(0, 7);
        if (importMonth && importMonth !== selectedMonthYear) {
          setSelectedMonthYear(importMonth);
          toast.success(
            `📅 Switched view to ${getFormattedMonthLabel(importMonth)} to display your imported transactions!`,
            { duration: 4500 }
          );
        }
      }
    }
  };

  const handleStatementImportSuccess = (toImport = []) => {
    loadPersonalData(selectedMonthYear);
    if (toImport && toImport.length > 0) {
      const sorted = [...toImport].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const newestDate = sorted[0]?.date;
      if (newestDate) {
        const importMonth = newestDate.substring(0, 7);
        if (importMonth && importMonth !== selectedMonthYear) {
          setSelectedMonthYear(importMonth);
          toast.success(
            `📅 Switched view to ${getFormattedMonthLabel(importMonth)} to show imported statement expenses!`,
            { duration: 4500 }
          );
        }
      }
    }
  };

  const handleAutoDetectCategory = async () => {
    if (!expenseForm.description.trim()) {
      toast.error('Please enter a description first');
      return;
    }
    setDetectingCategory(true);
    try {
      const res = await api.post('/api/ai/categorize', {
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount || 0),
      });
      if (res.data?.category && CATEGORY_MAP[res.data.category]) {
        setExpenseForm((prev) => ({ ...prev, category: res.data.category }));
        toast.success(`Category set to ${CATEGORY_MAP[res.data.category].name}!`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not auto-detect category');
    } finally {
      setDetectingCategory(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const res = await api.get(`/api/personal-expenses/export/csv?month_year=${selectedMonthYear}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `divvy_personal_expenses_${selectedMonthYear}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    loadPersonalData(selectedMonthYear);
    fetchRates();
    // Auto-check and process any due recurring bills
    processDue().then((res) => {
      if (res?.processed_count > 0) {
        toast.success(`⚡ Auto-logged ${res.processed_count} due bill(s): ${res.logged_descriptions.join(', ')}`);
        loadPersonalData(selectedMonthYear);
      }
    });
  }, [loadPersonalData, selectedMonthYear, fetchRates, processDue]);

  // Month navigation helpers (Timezone-safe arithmetic)
  const handlePrevMonth = () => {
    let [year, month] = selectedMonthYear.split('-').map(Number);
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    const monthStr = String(month).padStart(2, '0');
    setSelectedMonthYear(`${year}-${monthStr}`);
  };

  const handleNextMonth = () => {
    let [year, month] = selectedMonthYear.split('-').map(Number);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    const monthStr = String(month).padStart(2, '0');
    setSelectedMonthYear(`${year}-${monthStr}`);
  };

  // Format month label e.g. "August 2026"
  const getFormattedMonthLabel = (ymStr) => {
    try {
      const [y, m] = ymStr.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return ymStr;
    }
  };

  // Compute Monthly Spent, Yearly Spent & Budget Metrics
  const currentYearStr = selectedMonthYear.substring(0, 4);

  // Monthly Spent (Filtered by selectedMonthYear e.g. "2026-09")
  const currentMonthExpenses = personalExpenses.filter((e) =>
    String(e.expense_date || '').startsWith(selectedMonthYear)
  );
  const monthlySpent = currentMonthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  // Yearly Spent (Filtered by currentYearStr e.g. "2026")
  const currentYearExpenses = personalExpenses.filter((e) =>
    String(e.expense_date || '').startsWith(currentYearStr)
  );
  const yearlySpent = currentYearExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  // Overall Monthly Budget Calculations
  const overallBudgetObj = budgets.find((b) => b.category.toLowerCase() === 'overall');
  const overallTargetBudget = overallBudgetObj ? parseFloat(overallBudgetObj.target_amount) : 0;
  const overallRemaining = overallTargetBudget > 0 ? overallTargetBudget - monthlySpent : 0;
  const overallRawPct = overallTargetBudget > 0 ? Math.round((monthlySpent / overallTargetBudget) * 100) : 0;
  const overallFillPct = overallTargetBudget > 0 ? Math.min(overallRawPct, 100) : 0;

  // Daily Average Burn Rate
  const selectedYear = parseInt(selectedMonthYear.split('-')[0]) || new Date().getFullYear();
  const selectedMonth = parseInt(selectedMonthYear.split('-')[1]) || (new Date().getMonth() + 1);
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const isCurrentMonth = selectedMonthYear === new Date().toISOString().substring(0, 7);
  const activeDays = isCurrentMonth ? Math.max(new Date().getDate(), 1) : daysInMonth;
  const dailyAverage = monthlySpent / activeDays;

  // Filtered Expenses for Feed
  const filteredExpenses = personalExpenses.filter((e) => {
    const matchesMonth =
      feedTimeFilter === 'all' || String(e.expense_date || '').startsWith(selectedMonthYear);
    const matchesSearch = e.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategoryFilter === 'all' || e.category.toLowerCase() === selectedCategoryFilter;
    return matchesMonth && matchesSearch && matchesCategory;
  });

  // Handlers
  const handleAddExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseForm.description.trim()) return toast.error('Description required');
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0)
      return toast.error('Valid amount required');

    setSubmitting(true);
    try {
      const isForeign = expenseForm.currency && expenseForm.currency !== 'INR';
      const inrAmount = isForeign
        ? convertToInr(expenseForm.amount, expenseForm.currency)
        : parseFloat(expenseForm.amount);

      const rateInfo = currencies[expenseForm.currency];
      const currencyNote = isForeign
        ? `[${rateInfo?.symbol || ''}${expenseForm.amount} ${expenseForm.currency} @ ₹${rateInfo?.rate_to_inr || 1}/unit] ${expenseForm.notes || ''}`.trim()
        : expenseForm.notes;

      await addExpense({
        description: expenseForm.description,
        amount: inrAmount,
        category: expenseForm.category,
        expense_date: expenseForm.expense_date,
        notes: currencyNote,
      });

      toast.success(
        isForeign
          ? `Added! Converted ${expenseForm.amount} ${expenseForm.currency} to ₹${inrAmount.toFixed(2)} INR`
          : 'Personal expense added!'
      );
      setIsAddExpenseModalOpen(false);
      setExpenseForm({
        description: '',
        amount: '',
        currency: 'INR',
        category: 'food',
        expense_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    } catch (err) {
      toast.error('Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetBudgetSubmit = async (e) => {
    e.preventDefault();
    if (!budgetForm.target_amount || parseFloat(budgetForm.target_amount) <= 0)
      return toast.error('Valid budget target amount required');

    setSubmitting(true);
    try {
      await updateBudget({
        category: budgetForm.category,
        target_amount: parseFloat(budgetForm.target_amount),
      });

      toast.success(`Budget updated for ${CATEGORY_MAP[budgetForm.category]?.name || budgetForm.category}!`);
      setIsSetBudgetModalOpen(false);
      setBudgetForm({ category: 'food', target_amount: '' });
    } catch (err) {
      toast.error('Failed to set budget');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await removeExpense(id);
      toast.success('Expense deleted');
    } catch (err) {
      toast.error('Failed to delete expense');
    }
  };

  const openEditBudgetForCategory = (catKey) => {
    const existing = budgets.find((b) => b.category.toLowerCase() === catKey.toLowerCase());
    setBudgetForm({
      category: catKey,
      target_amount: existing ? existing.target_amount : '',
    });
    setIsSetBudgetModalOpen(true);
  };

  const renderLedgerCard = () => (
    <div className="personal-ledger-card cyber-card">
      <div className="ledger-toolbar">
        <div className="ledger-header-info">
          <h3>Personal Ledger</h3>
          <span className="expenses-count-pill">{filteredExpenses.length} entries</span>
        </div>

        <div className="ledger-toolbar-right">
          {/* Search Bar */}
          <div className="ledger-search-box">
            <BiSearch className="ledger-search-icon" />
            <input
              type="text"
              placeholder="Search description, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ledger-search-input"
            />
          </div>

          {/* Time Period Filter */}
          <select
            value={feedTimeFilter}
            onChange={(e) => setFeedTimeFilter(e.target.value)}
            className="ledger-time-select"
          >
            <option value="month">{getFormattedMonthLabel(selectedMonthYear)}</option>
            <option value="all">All Months ({personalExpenses.length} Total)</option>
          </select>
        </div>
      </div>

      {/* Quick Category Filter Pills */}
      <div className="category-filter-pills-row">
        <button
          type="button"
          className={`cat-pill-btn ${selectedCategoryFilter === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategoryFilter('all')}
        >
          All Categories
        </button>
        {Object.entries(CATEGORY_MAP).map(([key, meta]) => {
          const Icon = meta.Icon;
          return (
            <button
              key={key}
              type="button"
              className={`cat-pill-btn ${selectedCategoryFilter === key ? 'active' : ''}`}
              onClick={() => setSelectedCategoryFilter(key)}
            >
              {Icon && <Icon className="cat-pill-icon" />}
              <span>{meta.name}</span>
            </button>
          );
        })}
      </div>

      {loading && personalExpenses.length === 0 ? (
        <div className="text-center py-8">
          <Spinner size="md" />
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="empty-state py-10 text-center">
          <BiWallet className="empty-icon text-tertiary mb-2" />
          <p className="text-secondary">
            {feedTimeFilter === 'month' && personalExpenses.length > 0
              ? `No expenses found in ${getFormattedMonthLabel(selectedMonthYear)} (${personalExpenses.length} found in other months).`
              : 'No personal expenses found.'}
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
            {feedTimeFilter === 'month' && personalExpenses.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setFeedTimeFilter('all')}
              >
                View All Months ({personalExpenses.length})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              icon={BiPlus}
              onClick={() => setIsAddExpenseModalOpen(true)}
            >
              Add Expense
            </Button>
          </div>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Expense / Merchant</th>
                <th>Category</th>
                <th>Date</th>
                <th>Notes</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((exp) => {
                const catMeta = CATEGORY_MAP[exp.category?.toLowerCase()] || CATEGORY_MAP.other;
                const Icon = catMeta.Icon;
                return (
                  <tr key={exp.id} className="ledger-row">
                    <td>
                      <div className="ledger-desc-cell">
                        <div
                          className="ledger-icon-badge"
                          style={{
                            backgroundColor: `${catMeta.color}15`,
                            color: catMeta.color,
                            borderColor: `${catMeta.color}35`,
                          }}
                        >
                          {Icon ? <Icon /> : <BiWallet />}
                        </div>
                        <span className="ledger-desc-title">{exp.description}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className="ledger-category-badge"
                        style={{
                          borderColor: `${catMeta.color}30`,
                          color: catMeta.color,
                          backgroundColor: `${catMeta.color}10`,
                        }}
                      >
                        {catMeta.name}
                      </span>
                    </td>
                    <td className="text-secondary font-mono" style={{ fontSize: '0.78rem' }}>
                      {exp.expense_date}
                    </td>
                    <td>
                      <span className="ledger-notes-text">
                        {exp.notes || '—'}
                      </span>
                    </td>
                    <td className="text-right font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                      ₹{parseFloat(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="ledger-btn-icon text-danger"
                        onClick={() => handleDeleteExpense(exp.id)}
                        title="Delete expense"
                      >
                        <BiTrash />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="personal-tracker-container animate-fade-in">
      {/* ── Unified Executive Header ── */}
      <div className="personal-executive-header">
        <div className="header-left-group">
          <div>
            <h1 className="gradient-text">Personal Finances</h1>
            <p className="header-subtext">Private daily expense ledger & category budget targets</p>
          </div>

          {/* Inline Month Navigator */}
          {viewMode === 'monthly' && (
            <div className="executive-month-nav">
              <button type="button" className="nav-arrow-btn" onClick={handlePrevMonth} title="Previous Month">
                <BiChevronLeft />
              </button>
              <div className="current-month-display">
                <span className="month-text">{getFormattedMonthLabel(selectedMonthYear)}</span>
                <input
                  type="month"
                  value={selectedMonthYear}
                  onChange={(e) => e.target.value && setSelectedMonthYear(e.target.value)}
                  className="month-picker-input"
                />
              </div>
              <button type="button" className="nav-arrow-btn" onClick={handleNextMonth} title="Next Month">
                <BiChevronRight />
              </button>
            </div>
          )}
        </div>

        {/* Header Right Actions Toolbar */}
        <div className="header-right-group">
          {/* Horizon Mode Toggle */}
          <div className="view-mode-tabs">
            <button
              type="button"
              className={`tab-btn ${viewMode === 'monthly' ? 'active' : ''}`}
              onClick={() => setViewMode('monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`tab-btn ${viewMode === 'yearly' ? 'active' : ''}`}
              onClick={() => setViewMode('yearly')}
            >
              Annual Horizon
            </button>
          </div>

          {/* Consolidated Automations Dropdown */}
          <div className="automations-dropdown-wrap" ref={automationsRef}>
            <button
              type="button"
              className={`btn-automations-trigger ${isAutomationsOpen ? 'active' : ''}`}
              onClick={() => setIsAutomationsOpen(!isAutomationsOpen)}
            >
              <BiSliderAlt className="btn-auto-icon text-primary" />
              <span>Automations</span>
              <BiChevronDown className={`chevron-arrow ${isAutomationsOpen ? 'rotate-180' : ''}`} />
            </button>

            {isAutomationsOpen && (
              <div className="automations-menu animate-fade-in">
                <div className="auto-menu-header">IMPORT & SMART ACTIONS</div>
                <button
                  type="button"
                  className="auto-menu-item"
                  onClick={() => {
                    setIsAutomationsOpen(false);
                    setIsStatementModalOpen(true);
                  }}
                >
                  <BiSpreadsheet className="auto-item-icon" />
                  <div className="auto-item-text">
                    <span className="auto-item-title">Bank Statement (PDF/CSV)</span>
                    <span className="auto-item-desc">Batch-import banking transactions</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="auto-menu-item"
                  onClick={() => {
                    setIsAutomationsOpen(false);
                    setIsGmailModalOpen(true);
                  }}
                >
                  <BiMailSend className="auto-item-icon" />
                  <div className="auto-item-text">
                    <span className="auto-item-title">Bank & UPI Sync (Gmail)</span>
                    <span className="auto-item-desc">Auto-sync alerts & bank statements</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="auto-menu-item"
                  onClick={() => {
                    setIsAutomationsOpen(false);
                    setIsRecurringModalOpen(true);
                  }}
                >
                  <BiRepeat className="auto-item-icon" />
                  <div className="auto-item-text">
                    <span className="auto-item-title">Recurring Bills</span>
                    <span className="auto-item-desc">Automated subscriptions & due dates</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="auto-menu-item"
                  onClick={() => {
                    setIsAutomationsOpen(false);
                    setIsSmartAddModalOpen(true);
                  }}
                >
                  <BiBrain className="auto-item-icon text-primary" />
                  <div className="auto-item-text">
                    <span className="auto-item-title">Smart Add (Divvy AI)</span>
                    <span className="auto-item-desc">Paste SMS alerts or casual text</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="auto-menu-item"
                  onClick={() => {
                    setIsAutomationsOpen(false);
                    handleExportCSV();
                  }}
                >
                  <BiDownload className="auto-item-icon" />
                  <div className="auto-item-text">
                    <span className="auto-item-title">Export Ledger (CSV)</span>
                    <span className="auto-item-desc">Download spreadsheet backup</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          <Button
            variant="primary"
            icon={BiPlus}
            onClick={() => setIsAddExpenseModalOpen(true)}
          >
            Add Expense
          </Button>
        </div>
      </div>

      {viewMode === 'monthly' ? (
        <>
          {/* ── 3 Executive KPI Metric Cards ── */}
          <div className="personal-kpi-grid">
            {/* KPI 1: Monthly Spend & Budget Progress */}
            <div className="personal-kpi-card cyber-card">
              <div className="kpi-top">
                <span className="kpi-label">MONTHLY SPEND ({getFormattedMonthLabel(selectedMonthYear)})</span>
                <button
                  type="button"
                  className="kpi-edit-action"
                  onClick={() => openEditBudgetForCategory('overall')}
                  title="Edit monthly budget target"
                >
                  <BiEdit /> {overallTargetBudget > 0 ? 'Edit' : 'Set'}
                </button>
              </div>
              <div className="kpi-amount font-mono">
                ₹{monthlySpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              
              {/* Razor-thin budget progress track */}
              <div className="kpi-progress-block">
                <div className="kpi-progress-info font-mono">
                  <span>{overallRawPct}% of {overallTargetBudget > 0 ? `₹${overallTargetBudget.toLocaleString('en-IN')}` : 'cap'}</span>
                  {overallRawPct > 100 && <span className="text-danger">EXCEEDED</span>}
                </div>
                <div className="kpi-hairline-track">
                  <div
                    className="kpi-hairline-fill"
                    style={{
                      width: `${overallFillPct}%`,
                      backgroundColor:
                        overallRawPct > 100
                          ? 'var(--color-danger)'
                          : overallRawPct >= 75
                          ? 'var(--color-warning)'
                          : 'var(--color-primary)',
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* KPI 2: Daily Average Burn */}
            <div className="personal-kpi-card cyber-card">
              <div className="kpi-top">
                <span className="kpi-label">DAILY AVERAGE</span>
                <div className="kpi-icon-badge">
                  <BiTrendingUp />
                </div>
              </div>
              <div className="kpi-amount font-mono">
                ₹{dailyAverage.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="kpi-subtext text-secondary">
                Burn rate per day across {activeDays} recorded days
              </div>
            </div>

            {/* KPI 3: Buffer / Savings */}
            <div className={`personal-kpi-card cyber-card ${overallTargetBudget > 0 && overallRemaining < 0 ? 'kpi-card-debt' : ''}`}>
              <div className="kpi-top">
                <span className="kpi-label">REMAINING BUFFER</span>
                <div className={`kpi-icon-badge ${overallRemaining < 0 ? 'badge-danger' : 'badge-success'}`}>
                  <BiWallet />
                </div>
              </div>
              <div className={`kpi-amount font-mono ${overallRemaining >= 0 ? 'text-success' : 'text-danger'}`}>
                {overallTargetBudget > 0
                  ? overallRemaining < 0
                    ? `-₹${Math.abs(overallRemaining).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    : `₹${overallRemaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                  : '₹0.00'}
              </div>
              <div className="kpi-subtext text-secondary">
                {overallTargetBudget > 0
                  ? overallRemaining >= 0
                    ? 'Surplus within monthly target'
                    : `Exceeded target by ₹${Math.abs(overallRemaining).toFixed(2)}`
                  : 'Set monthly budget to monitor buffer'}
              </div>
            </div>
          </div>

          {/* ── Content Navigation Tabs ── */}
          <div className="personal-content-tabs">
            <button
              type="button"
              className={`content-tab-btn ${activeContentTab === 'ledger' ? 'active' : ''}`}
              onClick={() => setActiveContentTab('ledger')}
            >
              <BiSpreadsheet className="tab-icon" /> Transactions Ledger ({filteredExpenses.length})
            </button>
            <button
              type="button"
              className={`content-tab-btn ${activeContentTab === 'budgets' ? 'active' : ''}`}
              onClick={() => setActiveContentTab('budgets')}
            >
              <BiPieChartAlt2 className="tab-icon" /> Category Budgets ({Object.keys(CATEGORY_MAP).length})
            </button>
          </div>

          {activeContentTab === 'ledger' && renderLedgerCard()}

          {activeContentTab === 'budgets' && (
            <div className="budgets-section cyber-card">
              <div className="card-section-header">
                <h3>Category Breakdown Budgets ({getFormattedMonthLabel(selectedMonthYear)})</h3>
                <Button variant="outline" size="sm" icon={BiPlus} onClick={() => setIsSetBudgetModalOpen(true)}>
                  Set Category Budget
                </Button>
              </div>

              <div className="budgets-grid">
                {Object.entries(CATEGORY_MAP).map(([catKey, catMeta]) => {
                  const budgetObj = budgets.find((b) => b.category.toLowerCase() === catKey.toLowerCase());
                  const targetAmt = budgetObj ? parseFloat(budgetObj.target_amount) : 0;
                  const spentAmt = personalExpenses
                    .filter((e) => e.category.toLowerCase() === catKey.toLowerCase() && String(e.expense_date || '').startsWith(selectedMonthYear))
                    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

                  const pct = targetAmt > 0 ? Math.min(Math.round((spentAmt / targetAmt) * 100), 100) : 0;
                  const rawPct = targetAmt > 0 ? Math.round((spentAmt / targetAmt) * 100) : 0;
                  const catOverAmt = targetAmt > 0 && spentAmt > targetAmt ? spentAmt - targetAmt : 0;

                  let statusClass = 'budget-safe';
                  let statusBadge = <span className="status-badge badge-safe"><BiCheckCircle /> Safe ({rawPct}%)</span>;

                  if (targetAmt > 0) {
                    if (rawPct > 100) {
                      statusClass = 'budget-alert';
                      statusBadge = (
                        <span className="status-badge badge-alert">
                          <BiErrorCircle /> Over Budget (+₹{catOverAmt.toFixed(2)})
                        </span>
                      );
                    } else if (rawPct >= 75) {
                      statusClass = 'budget-warning';
                      statusBadge = <span className="status-badge badge-warning"><BiErrorCircle /> Near Limit ({rawPct}%)</span>;
                    }
                  } else {
                    statusBadge = <span className="status-badge badge-none">No budget set</span>;
                  }

                  return (
                    <div key={catKey} className={`category-budget-card ${statusClass}`}>
                      <div className="budget-card-header">
                        <div className="category-title-icon">
                          <span className="cat-emoji">{catMeta.Icon ? <catMeta.Icon /> : null}</span>
                          <span className="cat-title">{catMeta.name}</span>
                        </div>
                        <button
                          className="edit-budget-btn"
                          onClick={() => openEditBudgetForCategory(catKey)}
                          title="Set Budget Limit"
                        >
                          <BiEdit />
                        </button>
                      </div>

                      <div className="budget-amounts-row font-mono">
                        <span className="spent-val">₹{spentAmt.toFixed(2)}</span>
                        <span className="target-val">/ {targetAmt > 0 ? `₹${targetAmt.toFixed(2)}` : 'No Limit'}</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="budget-progress-track">
                        <div
                          className="budget-progress-fill"
                          style={{ width: `${pct}%`, backgroundColor: catMeta.color }}
                        ></div>
                      </div>

                      <div className="budget-card-footer">{statusBadge}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* YEARLY HORIZON VIEW */}
          <div className="yearly-horizon-section cyber-card">
            <div className="card-section-header">
              <div>
                <h3>Annual Budget & Horizon ({selectedMonthYear.substring(0, 4)})</h3>
                <p className="hero-subtext">Estimated annual financial forecast & 12-month projection</p>
              </div>
            </div>

            <div className="overall-metrics-row font-mono mt-4">
              <div className="metric-box">
                <span className="metric-lbl">Total Annual Target</span>
                <span className="metric-val">
                  ₹{(overallTargetBudget * 12).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="metric-box">
                <span className="metric-lbl">Total Spent ({currentYearStr})</span>
                <span className="metric-val text-purple">₹{yearlySpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="metric-box">
                <span className="metric-lbl">Est. Annual Savings</span>
                <span className="metric-val text-success">
                  ₹{Math.max((overallTargetBudget * 12) - yearlySpent, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* 12 Month Grid Projection */}
            <div className="yearly-months-grid mt-6">
              {Array.from({ length: 12 }, (_, i) => {
                const monthNum = (i + 1).toString().padStart(2, '0');
                const yrStr = selectedMonthYear.substring(0, 4);
                const mKey = `${yrStr}-${monthNum}`;
                const d = new Date(parseInt(yrStr), i, 1);
                const mName = d.toLocaleDateString('en-US', { month: 'short' });
                const isSelected = mKey === selectedMonthYear;

                const mSpent = personalExpenses
                  .filter((e) => String(e.expense_date || '').startsWith(mKey))
                  .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

                return (
                  <div
                    key={mKey}
                    className={`month-card-item ${isSelected ? 'active-month-card' : ''}`}
                    onClick={() => {
                      setSelectedMonthYear(mKey);
                      setViewMode('monthly');
                    }}
                  >
                    <span className="m-card-name">{mName} {yrStr}</span>
                    <span className="m-card-sub font-mono">
                      {mSpent > 0 ? `₹${mSpent.toFixed(0)}` : 'View Month'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          {renderLedgerCard()}
        </>
      )}

      {/* Modal: Add Personal Expense */}
      <Modal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        title="Add Personal Expense"
      >
        <form onSubmit={handleAddExpenseSubmit}>
          <Input
            label="Description"
            placeholder="e.g. Weekly Groceries, Petrol, Netflix Subscription"
            value={expenseForm.description}
            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
            required
          />

          <div className="amount-currency-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <Input
              label={`Amount (${currencies[expenseForm.currency]?.symbol || '₹'})`}
              type="number"
              step="0.01"
              placeholder="0.00"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              required
            />
            <div className="input-group">
              <label className="input-label">Currency</label>
              <select
                className="input-field"
                value={expenseForm.currency}
                onChange={(e) => setExpenseForm({ ...expenseForm, currency: e.target.value })}
              >
                {Object.values(currencies).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {expenseForm.currency !== 'INR' && expenseForm.amount > 0 && (
            <div style={{
              padding: '10px 14px',
              marginBottom: '14px',
              background: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '10px',
              color: '#22d3ee',
              fontSize: '0.84rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#94a3b8' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isLive ? '#10b981' : '#f59e0b', display: 'inline-block' }}></span>
                  {isLive ? `Live Market Rate (${source})` : 'Offline Cached Rate'}: 1 {expenseForm.currency} = ₹{currencies[expenseForm.currency]?.rate_to_inr || 1} INR
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{lastUpdated ? lastUpdated.split(' ')[1] : ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '600', fontSize: '0.92rem', color: '#38bdf8' }}>
                <span>Converted Total:</span>
                <span>≈ ₹{convertToInr(expenseForm.amount, expenseForm.currency).toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR</span>
              </div>
            </div>
          )}


          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="input-label" style={{ margin: 0 }}>Category</label>
              <button
                type="button"
                onClick={handleAutoDetectCategory}
                disabled={!expenseForm.description.trim() || detectingCategory}
                style={{
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  color: '#c084fc',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: expenseForm.description.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                }}
              >
                <HiSparkles /> {detectingCategory ? 'Detecting...' : 'Auto-Detect'}
              </button>
            </div>
            <select
              className="input-field"
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
            >
              {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Date"
            type="date"
            value={expenseForm.expense_date}
            onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
          />

          <Input
            label="Notes (Optional)"
            placeholder="Additional details..."
            value={expenseForm.notes}
            onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
          />

          <Button type="submit" variant="primary" fullWidth loading={submitting}>
            Save Personal Expense
          </Button>
        </form>
      </Modal>

      {/* Modal: Set Category Budget */}
      <Modal
        isOpen={isSetBudgetModalOpen}
        onClose={() => setIsSetBudgetModalOpen(false)}
        title="Set Category Monthly Budget"
      >
        <form onSubmit={handleSetBudgetSubmit}>
          <div className="input-group">
            <label className="input-label">Category</label>
            <select
              className="input-field"
              value={budgetForm.category}
              onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
            >
              <option value="overall">Overall Monthly Budget (Main Target)</option>
              <optgroup label="Category Breakdowns">
                {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <Input
            label="Target Monthly Budget Limit (₹)"
            type="number"
            step="100"
            placeholder="e.g. 5000"
            value={budgetForm.target_amount}
            onChange={(e) => setBudgetForm({ ...budgetForm, target_amount: e.target.value })}
            required
            helperText="You will receive alerts when your spending exceeds 75% and 90% of this limit."
          />

          <Button type="submit" variant="primary" fullWidth loading={submitting}>
            Save Budget Limit
          </Button>
        </form>
      </Modal>

      {/* Modal: Smart Add with AI & SMS */}
      <SmartExpenseModal
        isOpen={isSmartAddModalOpen}
        onClose={() => setIsSmartAddModalOpen(false)}
      />

      {/* Modal: Automated Recurring Bills & Subscriptions */}
      <RecurringExpensesModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        onExpensesUpdated={() => loadPersonalData(selectedMonthYear)}
      />

      {/* Modal: Gmail & UPI Bank Transaction Detection */}
      <GmailSyncModal
        isOpen={isGmailModalOpen}
        onClose={() => setIsGmailModalOpen(false)}
        onImportSuccess={handleGmailImportSuccess}
      />

      {/* Modal: Bank Statement (PDF & CSV) Bulk Importer */}
      <BankStatementModal
        isOpen={isStatementModalOpen}
        onClose={() => setIsStatementModalOpen(false)}
        onImportSuccess={handleStatementImportSuccess}
      />
    </div>
  );
}



