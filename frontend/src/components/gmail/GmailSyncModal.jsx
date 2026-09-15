import React, { useState, useEffect } from 'react';
import {
  BiMailSend,
  BiCheck,
  BiRefresh,
  BiErrorCircle,
  BiCheckCircle,
  BiPaste,
  BiFilterAlt,
  BiCheckDouble,
} from 'react-icons/bi';
import { HiSparkles, HiShieldCheck } from 'react-icons/hi';
import { toast } from 'react-hot-toast';

import Modal from '../common/Modal';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import api from '../../services/api';
import './GmailSyncModal.css';

const CATEGORY_MAP = {
  food: { name: 'Food & Dining', icon: '🍔' },
  travel: { name: 'Transit & Fuel', icon: '🚗' },
  rent: { name: 'Rent & Bills', icon: '🏠' },
  shopping: { name: 'Shopping', icon: '🛍️' },
  entertainment: { name: 'Entertainment', icon: '🎬' },
  health: { name: 'Health & Gym', icon: '🩺' },
  other: { name: 'Other', icon: '📦' },
};

export default function GmailSyncModal({ isOpen, onClose, onImportSuccess }) {
  const [activeTab, setActiveTab] = useState('gmail'); // 'gmail' | 'paste'
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);

  // Raw text paste state
  const [pastedText, setPastedText] = useState('');

  // Results state
  const [transactions, setTransactions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setTransactions([]);
      setSelectedIds([]);
      setStatusMessage('');
      setPastedText('');
    }
  }, [isOpen]);

  // 1. Google OAuth Token Client Flow
  const handleConnectGmail = () => {
    const clientId =
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      '288403612917-avbfh7ifhv0dbj3hi8hvnq3in68jatnr.apps.googleusercontent.com';

    if (!window.google?.accounts?.oauth2) {
      toast.error('Google Identity Services is loading. Please try again in 2 seconds.');
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('OAuth error:', tokenResponse);
            toast.error(`Google login error: ${tokenResponse.error_description || tokenResponse.error}`);
            return;
          }

          if (tokenResponse.access_token) {
            await syncWithAccessToken(tokenResponse.access_token);
          }
        },
      });

      client.requestAccessToken();
    } catch (err) {
      console.error('Failed to init Google Token Client:', err);
      toast.error('Failed to open Google Login popup. Check popup blocker.');
    }
  };

  const syncWithAccessToken = async (accessToken) => {
    setScanning(true);
    setStatusMessage('Connecting to Gmail & searching for UPI/Bank alert emails...');
    try {
      const res = await api.post('/api/gmail/sync', {
        access_token: accessToken,
        max_results: 15,
      });

      const items = res.data?.transactions || [];
      setTransactions(items);
      // Auto-select only new, non-duplicate transactions
      const newIds = items.filter((t) => !t.is_duplicate).map((t) => t.id);
      setSelectedIds(newIds);
      setStatusMessage(res.data?.message || `Detected ${items.length} transactions`);

      if (items.length > 0) {
        toast.success(`✨ Found ${items.length} bank transactions via Gemini!`);
      } else {
        toast('No recent bank alert emails found', { icon: 'ℹ️' });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed syncing with Gmail');
    } finally {
      setScanning(false);
    }
  };

  // 2. Parse Pasted Bank Statement / SMS Chain
  const handleParsePastedText = async (e) => {
    e.preventDefault();
    if (!pastedText.trim()) {
      toast.error('Please paste bank transaction text first');
      return;
    }

    setScanning(true);
    setStatusMessage('Gemini is analyzing transaction details, amounts, and UPI references...');
    try {
      const res = await api.post('/api/gmail/parse-text-batch', {
        text: pastedText.trim(),
      });

      const items = res.data?.transactions || [];
      setTransactions(items);
      const newIds = items.filter((t) => !t.is_duplicate).map((t) => t.id);
      setSelectedIds(newIds);
      setStatusMessage(res.data?.message || `Extracted ${items.length} transactions`);

      if (items.length > 0) {
        toast.success(`✨ Gemini extracted ${items.length} transactions!`);
      } else {
        toast('No valid debit transactions found in text', { icon: 'ℹ️' });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed parsing bank text');
    } finally {
      setScanning(false);
    }
  };

  // Toggle selection
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === transactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transactions.map((t) => t.id));
    }
  };

  // 3. Batch Import Selected Transactions
  const handleImportSelected = async () => {
    const toImport = transactions.filter((t) => selectedIds.includes(t.id));
    if (toImport.length === 0) {
      toast.error('Please select at least one transaction to import');
      return;
    }

    setImporting(true);
    try {
      const res = await api.post('/api/gmail/import-transactions', {
        transactions: toImport,
      });

      toast.success(`🎉 ${res.data?.message || 'Imported transactions successfully!'}`);
      if (onImportSuccess) onImportSuccess(toImport);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed importing transactions');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📧 Bank & UPI Transaction Detection" size="lg">
      <div className="gmail-sync-body">
        {/* Subheader info pill */}
        <div className="sync-ai-badge">
          <HiSparkles className="sparkle-icon" />
          <span>Powered by Google Gemini 2.5 Flash • Smart Indian UPI & Debit Parser</span>
        </div>

        {/* Input Mode Tabs */}
        {transactions.length === 0 && !scanning && (
          <div className="sync-tabs">
            <button
              className={`sync-tab-btn ${activeTab === 'gmail' ? 'active' : ''}`}
              onClick={() => setActiveTab('gmail')}
            >
              <BiMailSend /> ⚡ Gmail Direct Sync
            </button>
            <button
              className={`sync-tab-btn ${activeTab === 'paste' ? 'active' : ''}`}
              onClick={() => setActiveTab('paste')}
            >
              <BiPaste /> 📋 Paste Bank Alerts / SMS
            </button>
          </div>
        )}

        {/* Scanning State */}
        {scanning && (
          <div className="sync-loading-container animate-fade-in">
            <Spinner size="lg" />
            <h4>Scanning with Gemini AI...</h4>
            <p className="loading-status-text">{statusMessage}</p>
          </div>
        )}

        {/* Tab 1: Gmail Direct Connect */}
        {!scanning && transactions.length === 0 && activeTab === 'gmail' && (
          <div className="gmail-connect-card animate-fade-in">
            <div className="connect-icon-wrapper">
              <span className="connect-icon">🏦</span>
            </div>
            <h3>Sync Bank Alerts from Gmail</h3>
            <p className="connect-desc">
              Connect your Gmail to detect automated transaction alerts from <strong>HDFC, SBI, ICICI, Axis, Google Pay, PhonePe, Paytm, and Cred</strong>.
            </p>

            <div className="privacy-guarantee">
              <HiShieldCheck className="shield-icon" />
              <span>
                <strong>100% Secure & Private:</strong> Divvy only queries emails matching banking debit alerts. Personal emails are never read, stored, or accessed.
              </span>
            </div>

            <button className="google-connect-btn" onClick={handleConnectGmail}>
              <svg className="google-icon" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Connect & Scan Gmail Inbox</span>
            </button>
          </div>
        )}

        {/* Tab 2: Paste Raw Bank Text / SMS */}
        {!scanning && transactions.length === 0 && activeTab === 'paste' && (
          <form className="paste-form animate-fade-in" onSubmit={handleParsePastedText}>
            <label className="form-label">
              Paste Bank Email Alerts, E-Statement text, or UPI SMS below:
            </label>
            <textarea
              className="paste-textarea"
              rows={6}
              placeholder="e.g.&#10;Dear Customer, INR 450.00 debited from A/c XX8921 on 14-Sep-26 to SWIGGY via UPI Ref: 425619283719.&#10;&#10;Dear SBI User, your A/c has been debited by Rs. 280.00 for Uber Ride on 14/09/2026. Ref: 4259182910."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              required
            />
            <div className="paste-actions">
              <Button type="submit" variant="primary" icon={HiSparkles}>
                Extract Transactions with Gemini
              </Button>
            </div>
          </form>
        )}

        {/* Review & Batch Import Screen */}
        {!scanning && transactions.length > 0 && (
          <div className="review-container animate-fade-in">
            <div className="review-top-bar">
              <div className="review-counts">
                <h4>Detected Transactions ({transactions.length})</h4>
                <span className="review-status-sub">{statusMessage}</span>
              </div>
              <div className="review-select-actions">
                <button className="select-all-btn" onClick={toggleSelectAll}>
                  <BiCheckDouble /> {selectedIds.length === transactions.length ? 'Deselect All' : 'Select All'}
                </button>
                <button className="re-scan-btn" onClick={() => setTransactions([])}>
                  <BiRefresh /> New Scan
                </button>
              </div>
            </div>

            <div className="transactions-review-grid">
              {transactions.map((t) => {
                const isSelected = selectedIds.includes(t.id);
                const catObj = CATEGORY_MAP[t.category] || { name: t.category, icon: '💳' };

                return (
                  <div
                    key={t.id}
                    className={`tx-card ${isSelected ? 'selected' : ''} ${t.is_duplicate ? 'duplicate' : ''}`}
                    onClick={() => toggleSelect(t.id)}
                  >
                    <div className="tx-checkbox-col">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(t.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <div className="tx-info-col">
                      <div className="tx-header-row">
                        <span className="tx-cat-icon">{catObj.icon}</span>
                        <h4 className="tx-merchant">{t.description}</h4>
                        <div className="tx-amount">
                          ₹{Number(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="tx-meta-row">
                        <span className="tx-bank-badge">{t.bank_name}</span>
                        <span className="tx-cat-badge">{catObj.name}</span>
                        <span className="tx-date">{t.expense_date}</span>
                        {t.account_last4 && (
                          <span className="tx-acct">A/C ••{t.account_last4}</span>
                        )}
                      </div>

                      {t.upi_ref_id && (
                        <div className="tx-ref-row">
                          <span className="ref-label">UPI Ref:</span>
                          <span className="ref-val">{t.upi_ref_id}</span>
                        </div>
                      )}

                      {t.is_duplicate && (
                        <div className="tx-dup-badge">
                          <BiErrorCircle /> Already logged in Divvy (Skipped duplicate)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="review-bottom-actions">
              <Button variant="outline" onClick={() => setTransactions([])}>
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={BiCheck}
                onClick={handleImportSelected}
                loading={importing}
                disabled={selectedIds.length === 0}
              >
                Import {selectedIds.length} Selected to Divvy
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
