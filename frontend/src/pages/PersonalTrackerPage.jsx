import React, { useEffect, useState } from 'react';
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
} from 'react-icons/bi';
import { toast } from 'react-hot-toast';

import usePersonalExpenseStore from '../store/personalExpenseStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Spinner from '../components/common/Spinner';

import './PersonalTrackerPage.css';

const CATEGORY_MAP = {
  food: { name: 'Food & Dining', icon: '🍔', color: '#8b5cf6' },
  rent: { name: 'Rent & Bills', icon: '🏠', color: '#06b6d4' },
  shopping: { name: 'Shopping', icon: '🛍️', color: '#ec4899' },
  travel: { name: 'Travel & Cab', icon: '🚗', color: '#f59e0b' },
  entertainment: { name: 'Entertainment', icon: '🎬', color: '#10b981' },
  health: { name: 'Health & Fitness', icon: '🩺', color: '#3b82f6' },
  other: { name: 'Other / Misc', icon: '📦', color: '#6b7280' },
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

  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'yearly'

  // Modals state
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isSetBudgetModalOpen, setIsSetBudgetModalOpen] = useState(false);

  // Form states
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
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

  useEffect(() => {
    loadPersonalData(selectedMonthYear);
  }, [loadPersonalData, selectedMonthYear]);

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

  // Filtered Expenses for Feed
  const filteredExpenses = personalExpenses.filter((e) => {
    const matchesMonth = String(e.expense_date || '').startsWith(selectedMonthYear);
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
      await addExpense({
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        category: expenseForm.category,
        expense_date: expenseForm.expense_date,
        notes: expenseForm.notes,
      });

      toast.success('Personal expense added!');
      setIsAddExpenseModalOpen(false);
      setExpenseForm({
        description: '',
        amount: '',
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

  return (
    <div className="personal-tracker-container animate-fade-in">
      {/* Header */}
      <div className="tracker-header">
        <div>
          <h1 className="gradient-text">Personal Tracker & Budgets</h1>
          <p>Track your private daily expenses and monitor category budget limits!</p>
        </div>
        <div className="tracker-header-buttons">
          <Button
            variant="outline"
            icon={BiPieChartAlt2}
            onClick={() => setIsSetBudgetModalOpen(true)}
          >
            Set Budget
          </Button>
          <Button
            variant="primary"
            icon={BiPlus}
            onClick={() => setIsAddExpenseModalOpen(true)}
          >
            Add Expense
          </Button>
        </div>
      </div>

      {/* Month & Horizon Navigation Bar */}
      <div className="budget-navigation-bar cyber-card">
        <div className="view-mode-tabs">
          <button
            className={`tab-btn ${viewMode === 'monthly' ? 'active' : ''}`}
            onClick={() => setViewMode('monthly')}
          >
            📅 Monthly View
          </button>
          <button
            className={`tab-btn ${viewMode === 'yearly' ? 'active' : ''}`}
            onClick={() => setViewMode('yearly')}
          >
            📈 Yearly Horizon ({selectedMonthYear.substring(0, 4)})
          </button>
        </div>

        {viewMode === 'monthly' && (
          <div className="month-navigator">
            <button className="nav-arrow-btn" onClick={handlePrevMonth} title="Previous Month">
              ◀
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
            <button className="nav-arrow-btn" onClick={handleNextMonth} title="Next Month">
              ▶
            </button>
          </div>
        )}
      </div>

      {viewMode === 'monthly' ? (
        <>
          {/* OVERALL MAIN MONTHLY BUDGET HERO CARD */}
          <div className="overall-budget-hero cyber-card">
            <div className="overall-budget-header">
              <div className="overall-title-group">
                <span className="hero-emoji">🌟</span>
                <div>
                  <h3>Overall Monthly Budget ({getFormattedMonthLabel(selectedMonthYear)})</h3>
                  <p className="hero-subtext">Main monthly target cap for all personal expenses</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={BiEdit}
                onClick={() => openEditBudgetForCategory('overall')}
              >
                {overallTargetBudget > 0 ? 'Edit Main Budget' : 'Set Main Budget'}
              </Button>
            </div>

            <div className="overall-metrics-row font-mono">
              <div className="metric-box">
                <span className="metric-lbl">Monthly Spent</span>
                <span className="metric-val text-purple">₹{monthlySpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="metric-box">
                <span className="metric-lbl">Yearly Spent ({currentYearStr})</span>
                <span className="metric-val text-cyan">₹{yearlySpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="metric-box">
                <span className="metric-lbl">Overall Target Limit</span>
                <span className="metric-val">
                  {overallTargetBudget > 0
                    ? `₹${overallTargetBudget.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    : 'Not Set'}
                </span>
              </div>

              <div className="metric-box">
                <span className="metric-lbl">{overallTargetBudget > 0 && overallRemaining < 0 ? 'Over Budget By' : 'Remaining Cap'}</span>
                <span className={`metric-val ${overallRemaining >= 0 ? 'text-success' : 'text-danger'}`}>
                  {overallTargetBudget > 0
                    ? overallRemaining < 0
                      ? `+₹${Math.abs(overallRemaining).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      : `₹${overallRemaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    : 'Set budget first'}
                </span>
              </div>
            </div>

            {/* Overall Progress Bar */}
            {overallTargetBudget > 0 && (
              <div className="overall-progress-wrapper">
                <div className="overall-progress-header font-mono">
                  <span>Monthly Budget Usage ({getFormattedMonthLabel(selectedMonthYear)})</span>
                  <span className={overallRawPct > 100 ? 'text-danger' : overallRawPct >= 75 ? 'text-warning' : 'text-success'}>
                    {overallRawPct}% {overallRawPct > 100 ? `(EXCEEDED BY +₹${Math.abs(overallRemaining).toFixed(2)})` : overallRawPct >= 75 ? '(WARNING)' : ''}
                  </span>
                </div>
                <div className="overall-progress-track">
                  <div
                    className="overall-progress-fill"
                    style={{
                      width: `${overallFillPct}%`,
                      backgroundColor:
                        overallRawPct > 100 ? 'var(--color-danger)' : overallRawPct >= 75 ? 'var(--color-warning)' : 'var(--color-success)',
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* CATEGORY BUDGETS PROGRESS SECTION */}
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
                        <span className="cat-emoji">{catMeta.icon}</span>
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
        </>
      ) : (
        /* YEARLY HORIZON VIEW */
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
      )}

      {/* PERSONAL TRANSACTIONS FEED */}
      <div className="transactions-section cyber-card">
        <div className="transactions-header-row">
          <h3>Personal Expense Feed</h3>
          
          <div className="filters-bar">
            {/* Search Bar */}
            <div className="search-input-wrapper">
              <BiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            {/* Category Filter dropdown */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="category-filter-select"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.icon} {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && personalExpenses.length === 0 ? (
          <div className="text-center py-8">
            <Spinner size="md" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="empty-state py-10">
            <BiWallet className="empty-icon" />
            <p>No personal expenses found.</p>
            <Button
              variant="outline"
              size="sm"
              icon={BiPlus}
              onClick={() => setIsAddExpenseModalOpen(true)}
            >
              Add First Expense
            </Button>
          </div>
        ) : (
          <div className="expenses-feed-list">
            {filteredExpenses.map((exp) => {
              const catMeta = CATEGORY_MAP[exp.category?.toLowerCase()] || CATEGORY_MAP.other;
              return (
                <div key={exp.id} className="personal-expense-item">
                  <div className="category-emoji-box" style={{ backgroundColor: `${catMeta.color}20` }}>
                    {catMeta.icon}
                  </div>

                  <div className="expense-details">
                    <span className="expense-title">{exp.description}</span>
                    <span className="expense-submeta">
                      {catMeta.name} • {exp.expense_date}
                    </span>
                    {exp.notes && <span className="expense-notes">{exp.notes}</span>}
                  </div>

                  <div className="expense-amount-actions">
                    <span className="expense-cost font-mono">
                      ₹{parseFloat(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      className="delete-item-btn"
                      onClick={() => handleDeleteExpense(exp.id)}
                      title="Delete expense"
                    >
                      <BiTrash />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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

          <Input
            label="Amount (₹)"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={expenseForm.amount}
            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
            required
          />

          <div className="input-group">
            <label className="input-label">Category</label>
            <select
              className="input-field"
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
            >
              {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.icon} {v.name}
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
              <option value="overall">🌟 Overall Monthly Budget (Main Target)</option>
              <optgroup label="Category Breakdowns">
                {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.icon} {v.name}
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
    </div>
  );
}
