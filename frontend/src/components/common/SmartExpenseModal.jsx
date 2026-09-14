import React, { useState } from 'react';
import {
  BiBrain,
  BiPaste,
  BiCheckCircle,
  BiCalendar,
  BiMoney,
  BiTag,
  BiNote,
  BiCreditCard,
} from 'react-icons/bi';
import { HiSparkles } from 'react-icons/hi';
import { toast } from 'react-hot-toast';

import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import Spinner from './Spinner';
import api from '../../services/api';
import usePersonalExpenseStore from '../../store/personalExpenseStore';

import './SmartExpenseModal.css';

const PRESET_EXAMPLES = [
  'A/c *4521 debited by Rs. 840.50 on 14-Sep-26 to ZOMATO UPI Ref 928371',
  'Paid 350 for metro cab ride via UPI',
  'Amazon shopping electronics 1499 yesterday',
];

const CATEGORIES = [
  { id: 'food', label: 'Food & Dining', icon: '🍔' },
  { id: 'rent', label: 'Rent & Bills', icon: '🏠' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️' },
  { id: 'travel', label: 'Travel & Cab', icon: '🚗' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { id: 'health', label: 'Health & Fitness', icon: '🩺' },
  { id: 'other', label: 'Other / Misc', icon: '📦' },
];

export default function SmartExpenseModal({ isOpen, onClose }) {
  const { addExpense } = usePersonalExpenseStore();

  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsedResult, setParsedResult] = useState(null);

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawText(text);
        toast.success('Pasted from clipboard!');
      } else {
        toast.error('Clipboard is empty');
      }
    } catch (err) {
      toast.error('Clipboard access not granted or not supported');
    }
  };

  const handleParse = async (textToParse = rawText) => {
    const query = textToParse.trim();
    if (!query) {
      toast.error('Please paste a bank SMS or type an expense note');
      return;
    }

    setParsing(true);
    setParsedResult(null);

    try {
      const res = await api.post('/api/ai/parse-expense', { text: query });
      if (res.data) {
        setParsedResult({
          description: res.data.description || 'Expense',
          amount: res.data.amount || 0,
          category: res.data.category || 'other',
          expense_date: res.data.expense_date || new Date().toISOString().split('T')[0],
          payment_method: res.data.payment_method || 'UPI',
          notes: res.data.notes || '',
        });
        toast.success('✨ Details extracted with Gemini AI!');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to parse text with AI');
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!parsedResult) return;

    if (!parsedResult.description.trim()) {
      toast.error('Please enter an expense description');
      return;
    }
    if (!parsedResult.amount || parseFloat(parsedResult.amount) <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }

    setSaving(true);
    try {
      await addExpense({
        description: parsedResult.description.trim(),
        amount: parseFloat(parsedResult.amount),
        category: parsedResult.category,
        expense_date: parsedResult.expense_date,
        notes: parsedResult.notes
          ? `${parsedResult.notes} (via ${parsedResult.payment_method || 'UPI'})`
          : `via ${parsedResult.payment_method || 'UPI'}`,
      });
      toast.success('Expense saved to personal tracker!');
      handleReset();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setRawText('');
    setParsedResult(null);
    setParsing(false);
    setSaving(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="⚡ Smart Add Expense (AI & SMS)"
      size="md"
    >
      <div className="smart-modal-content">
        <p className="smart-modal-desc">
          Paste your <strong>Bank Debit SMS</strong> or casual note (e.g. <em>"Swiggy dinner 450"</em>).
          Gemini AI will automatically extract amount, merchant, and category!
        </p>

        {/* Input & Paste Action */}
        <div className="smart-input-box">
          <textarea
            className="smart-textarea"
            rows="3"
            placeholder="e.g. A/c *1234 debited by Rs. 450.00 on 14-Sep-26 to SWIGGY UPI Ref 42910..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <div className="smart-input-toolbar">
            <button
              type="button"
              className="smart-action-chip"
              onClick={handlePasteClipboard}
            >
              <BiPaste /> Paste from Clipboard
            </button>
            <Button
              variant="primary"
              size="sm"
              icon={BiBrain}
              loading={parsing}
              onClick={() => handleParse()}
              disabled={!rawText.trim() || parsing}
            >
              {parsing ? 'Extracting...' : 'Extract with Gemini'}
            </Button>
          </div>
        </div>

        {/* Preset quick test chips */}
        <div className="smart-preset-chips">
          <span className="smart-presets-label">Try an example:</span>
          {PRESET_EXAMPLES.map((ex, idx) => (
            <button
              key={idx}
              type="button"
              className="smart-example-pill"
              onClick={() => {
                setRawText(ex);
                handleParse(ex);
              }}
            >
              <HiSparkles /> {ex.slice(0, 32)}...
            </button>
          ))}
        </div>

        {/* Parsed Result Form */}
        {parsedResult && (
          <form onSubmit={handleSave} className="smart-result-card animate-fade-in">
            <div className="smart-result-header">
              <span className="smart-badge-success">
                <BiCheckCircle /> AI Extracted Details
              </span>
              <span className="smart-method-badge">
                <BiCreditCard /> {parsedResult.payment_method}
              </span>
            </div>

            <div className="smart-grid-2">
              <Input
                label="Merchant / Description"
                type="text"
                value={parsedResult.description}
                onChange={(e) =>
                  setParsedResult({ ...parsedResult, description: e.target.value })
                }
                required
              />

              <Input
                label="Amount (₹)"
                type="number"
                step="0.01"
                min="0.01"
                icon={BiMoney}
                value={parsedResult.amount}
                onChange={(e) =>
                  setParsedResult({ ...parsedResult, amount: e.target.value })
                }
                required
              />
            </div>

            <div className="smart-grid-2">
              <div className="smart-field-group">
                <label className="input-label">
                  <BiTag /> Category
                </label>
                <select
                  className="smart-select"
                  value={parsedResult.category}
                  onChange={(e) =>
                    setParsedResult({ ...parsedResult, category: e.target.value })
                  }
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Date"
                type="date"
                icon={BiCalendar}
                value={parsedResult.expense_date}
                onChange={(e) =>
                  setParsedResult({ ...parsedResult, expense_date: e.target.value })
                }
                required
              />
            </div>

            <Input
              label="Reference / Notes"
              type="text"
              icon={BiNote}
              placeholder="UTR reference or note"
              value={parsedResult.notes}
              onChange={(e) =>
                setParsedResult({ ...parsedResult, notes: e.target.value })
              }
            />

            <div className="smart-modal-actions">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={saving}
              >
                Clear
              </Button>
              <Button
                type="submit"
                variant="primary"
                icon={BiCheckCircle}
                loading={saving}
              >
                Save Expense (₹{parseFloat(parsedResult.amount || 0).toFixed(2)})
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
