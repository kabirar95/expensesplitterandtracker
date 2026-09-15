import React, { useState, useEffect } from 'react';
import {
  BiRepeat,
  BiPlus,
  BiTrash,
  BiCheck,
  BiPause,
  BiPlay,
  BiCalendar,
  BiMoney,
  BiRefresh,
  BiTimeFive,
} from 'react-icons/bi';
import { toast } from 'react-hot-toast';

import Modal from '../common/Modal';
import Button from '../common/Button';
import Input from '../common/Input';
import Spinner from '../common/Spinner';
import useRecurringStore from '../../store/recurringStore';
import useCurrencyStore from '../../store/currencyStore';
import './RecurringExpensesModal.css';

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'daily', label: 'Daily' },
];

const CATEGORIES = [
  { value: 'rent', label: 'Rent & Utilities', icon: '🏠' },
  { value: 'entertainment', label: 'Entertainment & OTT', icon: '🎬' },
  { value: 'food', label: 'Food & Groceries', icon: '🍔' },
  { value: 'travel', label: 'Transit & Fuel', icon: '🚗' },
  { value: 'health', label: 'Health & Gym', icon: '🩺' },
  { value: 'shopping', label: 'Shopping & Clothes', icon: '🛍️' },
  { value: 'other', label: 'Other Subscriptions', icon: '📦' },
];

export default function RecurringExpensesModal({ isOpen, onClose, onExpensesUpdated }) {
  const { rules, loading, fetchRules, createRule, updateRule, deleteRule, processDue } = useRecurringStore();
  const { currencies, convertToInr, isLive, source, lastUpdated } = useCurrencyStore();

  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'add'
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Rule Form
  const [form, setForm] = useState({
    description: '',
    amount: '',
    currency: 'INR',
    category: 'rent',
    frequency: 'monthly',
    next_run_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchRules();
    }
  }, [isOpen, fetchRules]);

  const handleProcessDue = async () => {
    setProcessing(true);
    try {
      const res = await processDue();
      if (res.processed_count > 0) {
        toast.success(`⚡ Auto-logged ${res.processed_count} due bill(s): ${res.logged_descriptions.join(', ')}`);
        if (onExpensesUpdated) onExpensesUpdated();
      } else {
        toast('All recurring bills are already up to date!', { icon: '✅' });
      }
    } catch (err) {
      toast.error('Failed checking due bills');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleActive = async (rule) => {
    try {
      await updateRule(rule.id, { is_active: !rule.is_active });
      toast.success(rule.is_active ? 'Rule paused' : 'Rule resumed');
    } catch (err) {
      toast.error('Could not update status');
    }
  };

  const handleDeleteRule = async (id, desc) => {
    if (!window.confirm(`Delete recurring rule "${desc}"?`)) return;
    try {
      await deleteRule(id);
      toast.success('Recurring bill removed');
    } catch (err) {
      toast.error('Could not delete rule');
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim() || !form.amount) {
      toast.error('Please enter description and amount');
      return;
    }

    setSubmitting(true);
    try {
      // Calculate INR amount if foreign currency
      const inrAmt = form.currency === 'INR' ? parseFloat(form.amount) : convertToInr(form.amount, form.currency);

      await createRule({
        description: form.description.trim(),
        amount: inrAmt,
        currency: 'INR',
        category: form.category,
        frequency: form.frequency,
        next_run_date: form.next_run_date,
        notes: form.currency !== 'INR' 
          ? `Original: ${form.amount} ${form.currency} | ${form.notes || ''}`.trim()
          : form.notes,
      });

      toast.success(`🎉 Recurring bill "${form.description}" added!`);
      setForm({
        description: '',
        amount: '',
        currency: 'INR',
        category: 'rent',
        frequency: 'monthly',
        next_run_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setActiveTab('list');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create recurring rule');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🔁 Recurring Bills & Subscriptions" size="lg">
      <div className="recurring-modal-body">
        {/* Top Control Bar */}
        <div className="recurring-header-bar">
          <div className="recurring-tabs">
            <button
              className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
              onClick={() => setActiveTab('list')}
            >
              Active Bills ({rules.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`}
              onClick={() => setActiveTab('add')}
            >
              <BiPlus /> Add Bill
            </button>
          </div>

          <button
            className="process-due-btn"
            onClick={handleProcessDue}
            disabled={processing}
            title="Scan and auto-log any bills due today"
          >
            <BiRefresh className={processing ? 'spin' : ''} />
            <span>{processing ? 'Processing...' : 'Run Due Scan'}</span>
          </button>
        </div>

        {/* Tab 1: List of Active Bills */}
        {activeTab === 'list' && (
          <div className="recurring-list-container">
            {loading ? (
              <div className="recurring-loading">
                <Spinner size="md" />
                <p>Loading recurring schedules...</p>
              </div>
            ) : rules.length === 0 ? (
              <div className="recurring-empty-state">
                <div className="empty-icon">📅</div>
                <h4>No Recurring Bills Set Up</h4>
                <p>Add recurring bills like Rent, WiFi, Netflix, or Gym to automate your monthly tracking.</p>
                <Button variant="primary" onClick={() => setActiveTab('add')}>
                  <BiPlus /> Set Up Your First Bill
                </Button>
              </div>
            ) : (
              <div className="recurring-cards-grid">
                {rules.map((rule) => {
                  const catObj = CATEGORIES.find((c) => c.value === rule.category) || {
                    label: rule.category,
                    icon: '💳',
                  };
                  const isDue = new Date(rule.next_run_date) <= new Date();

                  return (
                    <div key={rule.id} className={`recurring-card ${!rule.is_active ? 'paused' : ''} ${isDue ? 'due-now' : ''}`}>
                      <div className="card-top">
                        <div className="card-category-badge">
                          <span className="cat-icon">{catObj.icon}</span>
                          <span className="cat-text">{catObj.label}</span>
                        </div>
                        <span className={`freq-tag tag-${rule.frequency}`}>
                          {rule.frequency.toUpperCase()}
                        </span>
                      </div>

                      <div className="card-main">
                        <h4 className="rule-title">{rule.description}</h4>
                        <div className="rule-amount">
                          ₹{Number(rule.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="card-meta">
                        <div className="meta-row">
                          <BiCalendar className="meta-icon" />
                          <span>Next Due: <strong>{rule.next_run_date}</strong></span>
                          {isDue && rule.is_active && (
                            <span className="due-pill">Due Today</span>
                          )}
                        </div>
                        {rule.notes && <p className="rule-notes">{rule.notes}</p>}
                      </div>

                      <div className="card-actions">
                        <button
                          className={`action-btn-toggle ${rule.is_active ? 'active' : 'inactive'}`}
                          onClick={() => handleToggleActive(rule)}
                          title={rule.is_active ? 'Pause automation' : 'Resume automation'}
                        >
                          {rule.is_active ? (
                            <>
                              <BiPause /> <span>Active</span>
                            </>
                          ) : (
                            <>
                              <BiPlay /> <span>Paused</span>
                            </>
                          )}
                        </button>
                        <button
                          className="action-btn-delete"
                          onClick={() => handleDeleteRule(rule.id, rule.description)}
                          title="Delete rule"
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
        )}

        {/* Tab 2: Add New Rule */}
        {activeTab === 'add' && (
          <form className="recurring-form" onSubmit={handleAddSubmit}>
            <div className="form-group">
              <label className="form-label">Bill / Subscription Name</label>
              <Input
                placeholder="e.g., Flat Rent, Netflix 4K, Jio Fiber, Gym"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Currency</label>
                <select
                  className="cyber-select"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  {Object.values(currencies).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {form.currency !== 'INR' && form.amount && (
              <div className="currency-preview-pill" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: '#94a3b8' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isLive ? '#10b981' : '#f59e0b', display: 'inline-block' }}></span>
                    {isLive ? `Live Market Rate (${source})` : 'Offline Cached Rate'}: 1 {form.currency} = ₹{currencies[form.currency]?.rate_to_inr || 1} INR
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{lastUpdated ? lastUpdated.split(' ')[1] : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '600', fontSize: '0.92rem', color: '#38bdf8' }}>
                  <span>Converted Total:</span>
                  <span>≈ ₹{convertToInr(form.amount, form.currency).toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR</span>
                </div>
              </div>
            )}


            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="cyber-select"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Frequency</label>
                <select
                  className="cyber-select"
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                >
                  {FREQUENCY_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Next Due Date (First Auto-Log)</label>
              <Input
                type="date"
                value={form.next_run_date}
                onChange={(e) => setForm({ ...form, next_run_date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes (Optional)</label>
              <Input
                placeholder="e.g., Shared with Rahul, autopay from HDFC"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="form-actions">
              <Button type="button" variant="outline" onClick={() => setActiveTab('list')}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                <BiCheck /> Save Automation Rule
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
