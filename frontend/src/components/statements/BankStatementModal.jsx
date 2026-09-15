import React, { useState, useMemo } from 'react';
import {
  BiFile,
  BiUpload,
  BiLockAlt,
  BiCheck,
  BiX,
  BiCheckDouble,
  BiErrorCircle,
  BiFilterAlt,
  BiSpreadsheet,
  BiBrain,
} from 'react-icons/bi';
import { toast } from 'react-hot-toast';
import api from '../../services/api';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import './BankStatementModal.css';

const CATEGORY_OPTIONS = [
  { value: 'food', label: '🍔 Food & Dining' },
  { value: 'travel', label: '🚗 Travel & Cab' },
  { value: 'shopping', label: '🛍️ Shopping' },
  { value: 'rent', label: '🏠 Rent & Utilities' },
  { value: 'entertainment', label: '🎬 Entertainment' },
  { value: 'health', label: '🩺 Health & Fitness' },
  { value: 'other', label: '📦 Other / Misc' },
];

export default function BankStatementModal({ isOpen, onClose, onImportSuccess }) {
  if (!isOpen) return null;

  const [step, setStep] = useState('upload'); // 'upload' | 'parsing' | 'review'
  const [selectedFile, setSelectedFile] = useState(null);
  const [pdfPassword, setPdfPassword] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'debit' | 'credit' | 'duplicates'
  const [isImporting, setIsImporting] = useState(false);

  // File select
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
  };

  // Upload and Parse Statement
  const handleStartParse = async () => {
    if (!selectedFile) {
      toast.error('Please select a bank statement PDF or CSV file.');
      return;
    }

    setStep('parsing');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (pdfPassword.trim()) {
        formData.append('password', pdfPassword.trim());
      }

      const response = await api.post('/api/statements/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const resData = response.data;
      const rawTxns = resData.transactions || [];

      if (rawTxns.length === 0) {
        toast.error('No transactions found in this statement.');
        setStep('upload');
        return;
      }

      // Add selection state (default selected if not a duplicate)
      const mapped = rawTxns.map((t, idx) => ({
        id: `txn-${idx + 1}`,
        date: t.date || new Date().toISOString().split('T')[0],
        description: t.description || 'Transaction',
        raw_narration: t.raw_narration || '',
        amount: parseFloat(t.amount) || 0,
        type: t.type || 'debit',
        category: t.category || 'other',
        reference_no: t.reference_no || null,
        is_duplicate: Boolean(t.is_duplicate),
        selected: !t.is_duplicate, // Deselect duplicates by default for safety
      }));

      setTransactions(mapped);
      setStep('review');
      toast.success(`Extracted ${mapped.length} transactions from statement!`);
    } catch (err) {
      console.error('Parse Statement Error:', err);
      toast.error(err.response?.data?.detail || 'Failed to read statement. Check password or file format.');
      setStep('upload');
    }
  };

  // Toggle selection
  const toggleSelectTxn = (id) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  // Update category
  const handleCategoryChange = (id, newCat) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, category: newCat } : t))
    );
  };

  // Quick selection helpers
  const handleSelectAll = () => {
    setTransactions((prev) => prev.map((t) => ({ ...t, selected: true })));
  };

  const handleDeselectDuplicates = () => {
    setTransactions((prev) =>
      prev.map((t) => ({ ...t, selected: t.is_duplicate ? false : t.selected }))
    );
  };

  const handleDeselectAll = () => {
    setTransactions((prev) => prev.map((t) => ({ ...t, selected: false })));
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType === 'debit') return t.type === 'debit';
      if (filterType === 'credit') return t.type === 'credit';
      if (filterType === 'duplicates') return t.is_duplicate;
      return true;
    });
  }, [transactions, filterType]);

  // Summary counts
  const summary = useMemo(() => {
    const selected = transactions.filter((t) => t.selected);
    const debits = selected.filter((t) => t.type === 'debit');
    const credits = selected.filter((t) => t.type === 'credit');

    const totalDebitAmt = debits.reduce((acc, t) => acc + t.amount, 0);
    const totalCreditAmt = credits.reduce((acc, t) => acc + t.amount, 0);
    const dupCount = transactions.filter((t) => t.is_duplicate).length;

    return {
      selectedCount: selected.length,
      totalDebitAmt,
      totalCreditAmt,
      dupCount,
    };
  }, [transactions]);

  // Execute Batch Import
  const handleImportSelected = async () => {
    const selectedTxns = transactions.filter((t) => t.selected);

    if (selectedTxns.length === 0) {
      toast.error('Please select at least one transaction to import.');
      return;
    }

    setIsImporting(true);

    try {
      const payload = {
        transactions: selectedTxns.map((t) => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          category: t.category,
          notes: `Imported via Statement. Ref: ${t.reference_no || t.raw_narration.slice(0, 50)}`,
        })),
      };

      const response = await api.post('/api/statements/import', payload);

      toast.success(`Successfully imported ${response.data.imported_count} expenses!`);
      if (onImportSuccess) onImportSuccess(selectedTxns);
      onClose();
    } catch (err) {
      console.error('Import Error:', err);
      toast.error(err.response?.data?.detail || 'Failed to import transactions.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="statement-modal-backdrop" onClick={onClose}>
      <div className="statement-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="statement-modal-header">
          <div className="header-badge-row">
            <span className="cyber-glow-badge">
              <BiSpreadsheet /> BANK STATEMENT IMPORTER
            </span>
            <button className="close-btn" onClick={onClose}>
              <BiX />
            </button>
          </div>
          <h2>Import Bank Statement (PDF & CSV)</h2>
          <p className="subtitle">
            Upload your monthly bank e-statement (HDFC, ICICI, SBI, Axis, etc.). Divvy AI extracts
            all transactions, categorizes expenses, and flags potential duplicates.
          </p>
        </div>

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="statement-step-upload">
            <div className="upload-dropzone">
              <input
                type="file"
                id="statement-file-input"
                accept=".pdf,.csv,application/pdf,text/csv"
                onChange={handleFileChange}
                className="file-hidden-input"
              />
              <label htmlFor="statement-file-input" className="dropzone-label">
                <div className="dropzone-empty">
                  <div className="dropzone-icon">
                    <BiFile />
                  </div>
                  <span className="dropzone-title">
                    {selectedFile ? selectedFile.name : 'Click to Browse or Drag & Drop Statement'}
                  </span>
                  <span className="dropzone-hint">
                    Supports official PDF e-statements and CSV exports (up to 15 MB)
                  </span>
                </div>
              </label>
            </div>

            {/* Password input for encrypted PDFs */}
            <div className="password-input-card">
              <label className="password-label">
                <BiLockAlt /> PDF Statement Password (Optional)
              </label>
              <input
                type="password"
                placeholder="Enter password if your bank PDF is locked (e.g. DOB/PAN)"
                value={pdfPassword}
                onChange={(e) => setPdfPassword(e.target.value)}
                className="cyber-input"
              />
              <span className="password-hint">
                🔒 Your password is processed strictly in-memory to unlock your local file and never stored.
              </span>
            </div>

            <div className="modal-actions-footer">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                icon={BiBrain}
                onClick={handleStartParse}
                disabled={!selectedFile}
              >
                Extract Statement Transactions
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PARSING LOADER */}
        {step === 'parsing' && (
          <div className="statement-step-parsing">
            <div className="radar-spinner-box">
              <Spinner size="lg" />
            </div>
            <h3>Deciphering Bank Statement...</h3>
            <p>
              Decrypting and parsing transactions, verifying dates, running Divvy AI smart
              categorization, and scanning for duplicates.
            </p>
          </div>
        )}

        {/* STEP 3: REVIEW & BATCH IMPORT */}
        {step === 'review' && (
          <div className="statement-step-review">
            {/* Stat Summary Bar */}
            <div className="statement-summary-bar">
              <div className="stat-pill debit-stat">
                <span className="stat-label">Selected Expenses:</span>
                <span className="stat-value">
                  ₹{summary.totalDebitAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="stat-pill total-stat">
                <span className="stat-label">Selected Items:</span>
                <span className="stat-value">{summary.selectedCount} / {transactions.length}</span>
              </div>
              {summary.dupCount > 0 && (
                <div className="stat-pill warn-stat">
                  <span className="stat-label">⚠️ Potential Duplicates:</span>
                  <span className="stat-value">{summary.dupCount}</span>
                </div>
              )}
            </div>

            {/* Toolbar Filters */}
            <div className="statement-toolbar">
              <div className="filter-buttons-group">
                <button
                  type="button"
                  className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  All ({transactions.length})
                </button>
                <button
                  type="button"
                  className={`filter-btn ${filterType === 'debit' ? 'active' : ''}`}
                  onClick={() => setFilterType('debit')}
                >
                  Expenses Only
                </button>
                <button
                  type="button"
                  className={`filter-btn ${filterType === 'credit' ? 'active' : ''}`}
                  onClick={() => setFilterType('credit')}
                >
                  Credits / Income
                </button>
                {summary.dupCount > 0 && (
                  <button
                    type="button"
                    className={`filter-btn warn-filter ${filterType === 'duplicates' ? 'active' : ''}`}
                    onClick={() => setFilterType('duplicates')}
                  >
                    Duplicates ({summary.dupCount})
                  </button>
                )}
              </div>

              <div className="selection-actions-group">
                <button type="button" className="text-action-btn" onClick={handleSelectAll}>
                  Select All
                </button>
                {summary.dupCount > 0 && (
                  <button
                    type="button"
                    className="text-action-btn warn-text"
                    onClick={handleDeselectDuplicates}
                  >
                    Deselect Duplicates
                  </button>
                )}
                <button type="button" className="text-action-btn" onClick={handleDeselectAll}>
                  Clear All
                </button>
              </div>
            </div>

            {/* Transactions Grid */}
            <div className="statement-grid-container">
              <table className="statement-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th style={{ width: '100px' }}>Date</th>
                    <th>Description & Narration</th>
                    <th style={{ width: '160px' }}>Category</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((t) => (
                    <tr
                      key={t.id}
                      className={`table-row ${t.selected ? 'row-selected' : ''} ${t.is_duplicate ? 'row-duplicate' : ''}`}
                      onClick={() => toggleSelectTxn(t.id)}
                    >
                      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={t.selected}
                          onChange={() => toggleSelectTxn(t.id)}
                          className="txn-checkbox"
                        />
                      </td>
                      <td className="font-mono text-sm">{t.date}</td>
                      <td>
                        <div className="txn-desc-cell">
                          <span className="clean-desc">{t.description}</span>
                          {t.is_duplicate && (
                            <span className="dup-badge">⚠️ Existing Expense Match</span>
                          )}
                          {t.raw_narration && t.raw_narration !== t.description && (
                            <span className="raw-narration">{t.raw_narration.slice(0, 90)}</span>
                          )}
                        </div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <select
                          value={t.category}
                          onChange={(e) => handleCategoryChange(t.id, e.target.value)}
                          className="table-cat-select"
                        >
                          {CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span
                          className={`amount-tag font-mono ${t.type === 'credit' ? 'amount-credit' : 'amount-debit'}`}
                        >
                          {t.type === 'credit' ? '+' : '-'}₹
                          {t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="modal-actions-footer">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Upload Another File
              </Button>
              <Button
                variant="primary"
                icon={BiCheckDouble}
                onClick={handleImportSelected}
                loading={isImporting}
                disabled={summary.selectedCount === 0}
              >
                Import {summary.selectedCount} Expenses (₹
                {summary.totalDebitAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
