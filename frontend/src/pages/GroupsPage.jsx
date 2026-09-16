import React, { useEffect, useState, useRef } from 'react';
import {
  BiPlus,
  BiGroup,
  BiReceipt,
  BiTrash,
  BiUserPlus,
  BiMoney,
  BiTrendingUp,
  BiChevronDown,
  BiChevronUp,
  BiRightArrowAlt,
  BiCheckDouble,
  BiDownload,
  BiCamera,
  BiQrScan,
  BiCheck,
  BiSearch,
  BiCreditCard,
  BiCheckCircle,
} from 'react-icons/bi';
import { toast } from 'react-hot-toast';

import useGroupStore from '../store/groupStore';
import useAuthStore from '../store/authStore';
import useCurrencyStore from '../store/currencyStore';
import api from '../services/api';

import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Spinner from '../components/common/Spinner';
import UpiPaymentModal from '../components/groups/UpiPaymentModal';
import ReceiptSplitModal from '../components/receipts/ReceiptSplitModal';

import './GroupsPage.css';

// ── Min-Cash-Flow Settlement Debt Simplification Algorithm ──
function calculateSimplifiedSettlements(balances) {
  const debtors = [];
  const creditors = [];

  for (const [name, amount] of Object.entries(balances)) {
    if (amount < -0.01) {
      debtors.push({ name, amount: Math.abs(amount) });
    } else if (amount > 0.01) {
      creditors.push({ name, amount });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let dIndex = 0;
  let cIndex = 0;

  while (dIndex < debtors.length && cIndex < creditors.length) {
    const debtor = debtors[dIndex];
    const creditor = creditors[cIndex];

    const transferAmount = Math.min(debtor.amount, creditor.amount);

    if (transferAmount > 0.01) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: transferAmount,
      });
    }

    debtor.amount -= transferAmount;
    creditor.amount -= transferAmount;

    if (debtor.amount <= 0.01) dIndex++;
    if (creditor.amount <= 0.01) cIndex++;
  }

  return settlements;
}

export default function GroupsPage() {
  const { user } = useAuthStore();
  const {
    groups,
    activeGroup,
    activeExpenses,
    loading,
    loadGroups,
    addGroup,
    setActiveGroup,
    addMemberToActiveGroup,
    addExpenseToActiveGroup,
    removeExpense,
    removeGroup,
  } = useGroupStore();

  const { currencies, convertToInr, isLive, source, lastUpdated } = useCurrencyStore();

  // Modals & UI state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isDeleteGroupModalOpen, setIsDeleteGroupModalOpen] = useState(false);
  const [newMemberInput, setNewMemberInput] = useState('');
  const [expandedExpenseId, setExpandedExpenseId] = useState(null);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');
  const groupDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(e.target)) {
        setIsGroupDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Form states
  const [newGroupData, setNewGroupData] = useState({ name: '', description: '', category: 'trip', membersInput: '' });
  const [newExpenseData, setNewExpenseData] = useState({
    description: '',
    amount: '',
    currency: 'INR',
    category: 'food',
    paid_by: '',
    split_type: 'equal',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);

  // ── UPI Payment Settlement Modal State ──
  const [upiModalData, setUpiModalData] = useState({
    isOpen: false,
    debtorName: '',
    creditorName: '',
    amount: 0,
    creditorUpiId: '',
  });

  const handleOpenUpiModal = (settlement) => {
    const creditorMember = activeGroup?.members?.find((m) => m.name === settlement.to);
    setUpiModalData({
      isOpen: true,
      debtorName: settlement.from,
      creditorName: settlement.to,
      amount: settlement.amount,
      creditorUpiId: creditorMember?.upi_id || '',
    });
  };

  const handleRecordSettlement = async ({ debtorName, creditorName, amount, upiId, syncToPersonal = true }) => {
    const amt = parseFloat(amount);
    await addExpenseToActiveGroup({
      description: `🤝 Settlement: ${debtorName} paid ${creditorName}`,
      amount: amt,
      currency: 'INR',
      category: 'other',
      paid_by: debtorName,
      split_type: 'exact',
      splits: [{ user_name: creditorName, amount: amt }],
      notes: upiId ? `Paid via UPI (${upiId})` : 'Settled via Divvy UPI',
    });

    // Automatically synchronize into debtor's Personal Expense Tracker if debtor is current user
    const isDebtorCurrentUser =
      debtorName && user && (
        debtorName.toLowerCase() === (user.display_name || '').toLowerCase() ||
        debtorName.toLowerCase() === (user.username || '').toLowerCase() ||
        debtorName.toLowerCase() === (user.full_name || '').toLowerCase() ||
        debtorName.toLowerCase() === 'you'
      );

    if (syncToPersonal && isDebtorCurrentUser) {
      try {
        const groupCat = (activeGroup?.category || '').toLowerCase();
        let personalCat = 'other';
        if (['trip', 'travel'].includes(groupCat)) personalCat = 'travel';
        else if (['food', 'dining'].includes(groupCat)) personalCat = 'food';
        else if (['home', 'flat', 'apartment'].includes(groupCat)) personalCat = 'rent';

        await api.post('/api/personal-expenses', {
          description: `Settled debt to ${creditorName} (${activeGroup?.name || 'Group'})`,
          amount: amt,
          category: personalCat,
          expense_date: new Date().toISOString().split('T')[0],
          notes: upiId
            ? `Group Settlement via UPI to ${creditorName} (${upiId})`
            : `Group Settlement to ${creditorName} for ${activeGroup?.name || 'Group'}`,
        });

        toast.success(`🤝 Settlement recorded & logged ₹${amt.toFixed(2)} to your Personal Expenses!`, {
          duration: 5000,
        });
        return;
      } catch (err) {
        console.warn('Auto-sync to personal expenses failed:', err);
      }
    }

    toast.success(`Settlement recorded! Balances updated.`);
  };

  const handleExportGroupCSV = async () => {
    if (!activeGroup) return;
    try {
      setExportingCSV(true);
      const res = await api.get(`/api/groups/${activeGroup.id}/expenses/export/csv`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `divvy_group_${activeGroup.name.replace(/\\s+/g, '_')}_expenses.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Group CSV exported successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export group CSV');
    } finally {
      setExportingCSV(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (groups.length > 0 && !activeGroup) {
      setActiveGroup(groups[0]);
    }
  }, [groups, activeGroup, setActiveGroup]);

  useEffect(() => {
    if (activeGroup && activeGroup.members?.length > 0) {
      setNewExpenseData((prev) => ({
        ...prev,
        paid_by: prev.paid_by || activeGroup.members[0].name,
      }));
    }
  }, [activeGroup]);

  // Compute Net Balances for each member
  const memberBalances = {};
  if (activeGroup && activeGroup.members) {
    activeGroup.members.forEach((m) => {
      memberBalances[m.name] = 0;
    });

    activeExpenses.forEach((exp) => {
      const payer = exp.paid_by;
      const totalAmount = parseFloat(exp.amount || 0);
      const splits = exp.splits || [];

      if (splits.length > 0) {
        splits.forEach((s) => {
          const member = s.user_name || s.member_name;
          const share = parseFloat(s.amount || 0);
          if (member in memberBalances) {
            if (member === payer) {
              memberBalances[member] += totalAmount - share;
            } else {
              memberBalances[member] -= share;
            }
          }
        });
      } else {
        const count = activeGroup.members.length || 1;
        const equalShare = totalAmount / count;
        activeGroup.members.forEach((m) => {
          if (m.name === payer) {
            memberBalances[m.name] += totalAmount - equalShare;
          } else {
            memberBalances[m.name] -= equalShare;
          }
        });
      }
    });
  }

  // Calculate Simplified Debt Settlements (Who Pays Whom)
  const settlements = calculateSimplifiedSettlements(memberBalances);

  // ── Executive KPI Figures ──
  const totalGroupSpend = activeExpenses.reduce(
    (sum, exp) => sum + parseFloat(exp.amount || 0),
    0
  );

  const currentUserName =
    user?.full_name || user?.display_name || (user?.email ? user.email.split('@')[0] : '');

  let userBalance = 0;
  if (currentUserName && memberBalances) {
    if (currentUserName in memberBalances) {
      userBalance = memberBalances[currentUserName];
    } else {
      const match = Object.entries(memberBalances).find(
        ([name]) => name.toLowerCase() === currentUserName.toLowerCase()
      );
      if (match) userBalance = match[1];
    }
  }

  const userIsOwed = userBalance > 0.01 ? userBalance : 0;
  const userOwes = userBalance < -0.01 ? Math.abs(userBalance) : 0;

  // Pending settlement that current user owes
  const mySettlementToPay = settlements.find(
    (s) => s.from.toLowerCase() === currentUserName.toLowerCase()
  );

  // Filtered expense ledger
  const filteredExpenses = activeExpenses.filter((exp) => {
    if (!expenseSearchQuery.trim()) return true;
    const q = expenseSearchQuery.toLowerCase();
    return (
      (exp.description || '').toLowerCase().includes(q) ||
      (exp.paid_by || '').toLowerCase().includes(q) ||
      (exp.category || '').toLowerCase().includes(q)
    );
  });

  // Handlers
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupData.name.trim()) return toast.error('Group name is required');

    setSubmitting(true);
    try {
      const extraMembers = newGroupData.membersInput
        .split(',')
        .map((m) => m.trim())
        .filter((m) => m.length > 0);

      const created = await addGroup({
        name: newGroupData.name,
        description: newGroupData.description,
        category: newGroupData.category,
        members: extraMembers,
      });

      toast.success('Group created!');
      setIsCreateModalOpen(false);
      setNewGroupData({ name: '', description: '', category: 'trip', membersInput: '' });
      setActiveGroup(created);
    } catch (err) {
      toast.error('Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberInput.trim()) return;

    try {
      await addMemberToActiveGroup(newMemberInput.trim());
      toast.success(`Added ${newMemberInput.trim()}`);
      setNewMemberInput('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add member');
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!newExpenseData.description.trim()) return toast.error('Description required');
    if (!newExpenseData.amount || parseFloat(newExpenseData.amount) <= 0)
      return toast.error('Valid amount required');
    if (!newExpenseData.paid_by) return toast.error('Payer selection required');

    setSubmitting(true);
    try {
      const isForeign = newExpenseData.currency && newExpenseData.currency !== 'INR';
      const inrAmount = isForeign
        ? convertToInr(newExpenseData.amount, newExpenseData.currency)
        : parseFloat(newExpenseData.amount);

      const rateInfo = currencies[newExpenseData.currency];
      const currencyNote = isForeign
        ? `[${rateInfo?.symbol || ''}${newExpenseData.amount} ${newExpenseData.currency} @ ₹${rateInfo?.rate_to_inr || 1}/unit] ${newExpenseData.notes || ''}`.trim()
        : newExpenseData.notes;

      await addExpenseToActiveGroup({
        description: newExpenseData.description,
        amount: inrAmount,
        currency: 'INR',
        category: newExpenseData.category,
        paid_by: newExpenseData.paid_by,
        split_type: newExpenseData.split_type,
        notes: currencyNote,
      });

      toast.success(
        isForeign
          ? `Expense added! Converted ${newExpenseData.amount} ${newExpenseData.currency} to ₹${inrAmount.toFixed(2)} INR`
          : 'Expense added & split among members!'
      );
      setIsAddExpenseModalOpen(false);
      setNewExpenseData({
        description: '',
        amount: '',
        currency: 'INR',
        category: 'food',
        paid_by: activeGroup?.members?.[0]?.name || '',
        split_type: 'equal',
        notes: '',
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }

  };

  const handleDeleteExpense = async (expenseId) => {
    try {
      await removeExpense(expenseId);
      toast.success('Expense deleted');
    } catch (err) {
      toast.error('Failed to delete expense');
    }
  };

  const handleDeleteGroup = async () => {
    if (!activeGroup) return;
    setSubmitting(true);
    try {
      await removeGroup(activeGroup.id);
      toast.success(`Group '${activeGroup.name}' deleted`);
      setIsDeleteGroupModalOpen(false);
    } catch (err) {
      toast.error('Failed to delete group');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpandExpense = (id) => {
    setExpandedExpenseId(expandedExpenseId === id ? null : id);
  };

  return (
    <div className="groups-container animate-fade-in">
      {/* ── Executive Top Header & Group Switcher ── */}
      <div className="groups-executive-header">
        <div className="group-switcher-wrapper" ref={groupDropdownRef}>
          {groups.length === 0 ? (
            <div className="group-empty-trigger">
              <h2>Expense Groups</h2>
            </div>
          ) : (
            <div className="group-dropdown-rel">
              <button
                type="button"
                className="group-dropdown-btn"
                onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
              >
                <div className="group-badge-icon">
                  <BiGroup />
                </div>
                <div className="group-dropdown-meta">
                  <div className="group-dropdown-title-row">
                    <span className="group-title-text">{activeGroup?.name || 'Select Group'}</span>
                    <span className="group-cat-pill">{activeGroup?.category || 'Group'}</span>
                    <BiChevronDown className={`group-chevron ${isGroupDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <span className="group-subtitle-text">
                    {activeGroup?.members?.length || 0} members • {activeExpenses.length} expenses
                  </span>
                </div>
              </button>

              {isGroupDropdownOpen && (
                <div className="group-dropdown-menu animate-fade-in">
                  <div className="group-dropdown-header">
                    <span>SWITCH GROUP ({groups.length})</span>
                  </div>
                  <div className="group-dropdown-list">
                    {groups.map((g) => {
                      const isSelected = activeGroup?.id === g.id;
                      return (
                        <div
                          key={g.id}
                          className={`group-dropdown-item ${isSelected ? 'active' : ''}`}
                          onClick={() => {
                            setActiveGroup(g);
                            setIsGroupDropdownOpen(false);
                          }}
                        >
                          <div className="group-item-info">
                            <span className="group-item-name">{g.name}</span>
                            <span className="group-item-meta">{g.members?.length || 0} members • {g.category}</span>
                          </div>
                          {isSelected && <BiCheck className="text-primary font-bold" />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="group-dropdown-footer">
                    <button
                      type="button"
                      className="group-add-new-btn"
                      onClick={() => {
                        setIsGroupDropdownOpen(false);
                        setIsCreateModalOpen(true);
                      }}
                    >
                      <BiPlus /> Create New Group
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Primary Action Buttons */}
        <div className="groups-action-toolbar">
          <Button
            variant="outline"
            size="md"
            icon={BiCamera}
            onClick={() => setIsReceiptModalOpen(true)}
            title="Scan dining bill photo with Divvy AI and itemize splits"
            disabled={!activeGroup}
          >
            Scan Bill & Itemize
          </Button>
          <Button
            variant="outline"
            size="md"
            icon={BiDownload}
            onClick={handleExportGroupCSV}
            loading={exportingCSV}
            title="Download CSV breakdown of group expenses"
            disabled={!activeGroup}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={BiPlus}
            onClick={() => {
              if (!activeGroup) {
                setIsCreateModalOpen(true);
              } else {
                setIsAddExpenseModalOpen(true);
              }
            }}
          >
            {activeGroup ? 'Add Expense' : 'Create Group'}
          </Button>
          {activeGroup && (
            <Button
              variant="danger"
              size="md"
              icon={BiTrash}
              onClick={() => setIsDeleteGroupModalOpen(true)}
              title="Delete group"
            />
          )}
        </div>
      </div>

      {/* Main Group Content */}
      {loading && groups.length === 0 ? (
        <div className="text-center py-12">
          <Spinner size="lg" />
          <p className="text-secondary mt-3">Loading your financial groups...</p>
        </div>
      ) : !activeGroup ? (
        <div className="empty-group-state cyber-card py-12 text-center">
          <BiGroup className="huge-icon text-tertiary mb-3" />
          <h3>No Active Group Selected</h3>
          <p className="text-secondary max-w-md mx-auto mb-4">
            Create an expense group to easily itemize bills, track shared expenses, and settle balances with 1-Tap UPI.
          </p>
          <Button variant="primary" icon={BiPlus} onClick={() => setIsCreateModalOpen(true)}>
            Create First Group
          </Button>
        </div>
      ) : (
        <>
          {/* Members Bar & Quick Add Member */}
          <div className="group-members-strip cyber-card">
            <div className="members-strip-left">
              <span className="members-strip-label">Group Members ({activeGroup.members?.length || 0}):</span>
              <div className="members-avatar-stack">
                {activeGroup.members?.map((m, idx) => (
                  <span key={idx} className="member-avatar-chip" title={m.name}>
                    <span className="member-avatar-circle">{m.name.charAt(0).toUpperCase()}</span>
                    <span className="member-avatar-name">{m.name}</span>
                  </span>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddMember} className="members-quick-add-form">
              <input
                type="text"
                placeholder="Add member name..."
                value={newMemberInput}
                onChange={(e) => setNewMemberInput(e.target.value)}
                className="members-quick-input"
              />
              <button type="submit" className="members-quick-submit" title="Add member to group">
                <BiUserPlus /> Add
              </button>
            </form>
          </div>

          {/* ── 3 Executive Balance KPI Cards ── */}
          <div className="group-kpi-grid">
            {/* KPI 1: Total Spend */}
            <div className="group-kpi-card cyber-card">
              <div className="kpi-top">
                <span className="kpi-label">TOTAL GROUP SPEND</span>
                <div className="kpi-icon-badge">
                  <BiReceipt />
                </div>
              </div>
              <div className="kpi-amount font-mono">
                ₹{totalGroupSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="kpi-subtext text-secondary">
                {activeExpenses.length} transactions across {activeGroup.members?.length || 0} members
              </div>
            </div>

            {/* KPI 2: You are Owed */}
            <div className="group-kpi-card cyber-card">
              <div className="kpi-top">
                <span className="kpi-label">YOU ARE OWED</span>
                <div className="kpi-icon-badge badge-success">
                  <BiTrendingUp />
                </div>
              </div>
              <div className={`kpi-amount font-mono ${userIsOwed > 0 ? 'text-success' : 'text-secondary'}`}>
                {userIsOwed > 0 ? `+₹${userIsOwed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00'}
              </div>
              <div className="kpi-subtext text-secondary">
                {userIsOwed > 0 ? 'Group members owe you this balance' : 'You have no outstanding credit'}
              </div>
            </div>

            {/* KPI 3: You Owe (With direct Settle Up action) */}
            <div className={`group-kpi-card cyber-card ${userOwes > 0 ? 'kpi-card-debt' : ''}`}>
              <div className="kpi-top">
                <span className="kpi-label">YOU OWE</span>
                <div className={`kpi-icon-badge ${userOwes > 0 ? 'badge-danger' : ''}`}>
                  <BiCreditCard />
                </div>
              </div>
              <div className={`kpi-amount font-mono ${userOwes > 0 ? 'text-danger' : 'text-secondary'}`}>
                {userOwes > 0 ? `-₹${userOwes.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹0.00'}
              </div>
              <div className="kpi-footer-action">
                <span className="kpi-subtext text-secondary">
                  {userOwes > 0 ? 'Outstanding debt to group' : 'You are all settled up!'}
                </span>
                {userOwes > 0 && (
                  <button
                    type="button"
                    className="kpi-settle-btn"
                    onClick={() => handleOpenUpiModal(mySettlementToPay || settlements[0])}
                  >
                    <BiQrScan /> Settle Up
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Settlements & Net Balances Strip ── */}
          <div className="group-settlements-panel cyber-card">
            <div className="settlements-panel-header">
              <div className="panel-title-group">
                <h4>Simplified Settlements & Net Balances</h4>
                <span className="panel-hint">Calculated via minimum-cash-flow algorithm</span>
              </div>
              <div className="member-net-chips">
                {Object.entries(memberBalances).map(([memberName, bal]) => {
                  const isPositive = bal > 0.01;
                  const isNegative = bal < -0.01;
                  return (
                    <span
                      key={memberName}
                      className={`member-net-pill ${isPositive ? 'net-positive' : isNegative ? 'net-negative' : 'net-zero'}`}
                    >
                      <strong>{memberName}:</strong>{' '}
                      <span className="font-mono">
                        {isPositive ? `+₹${bal.toFixed(2)}` : isNegative ? `-₹${Math.abs(bal).toFixed(2)}` : '₹0.00'}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>

            {settlements.length === 0 ? (
              <div className="all-settled-notice">
                <BiCheckCircle className="settled-icon text-success" />
                <span>All members are completely settled up — zero outstanding balances!</span>
              </div>
            ) : (
              <div className="settlements-row-grid">
                {settlements.map((s, idx) => (
                  <div key={idx} className="settlement-ticket">
                    <div className="ticket-flow">
                      <span className="ticket-debtor">{s.from}</span>
                      <span className="ticket-arrow">pays <BiRightArrowAlt /></span>
                      <span className="ticket-creditor">{s.to}</span>
                    </div>
                    <div className="ticket-right">
                      <span className="ticket-amount font-mono">₹{s.amount.toFixed(2)}</span>
                      <button
                        type="button"
                        className="btn-ticket-upi"
                        onClick={() => handleOpenUpiModal(s)}
                        title="Pay via UPI Deep Link / QR Code"
                      >
                        <BiQrScan /> Pay via UPI
                      </button>
                      <button
                        type="button"
                        className="btn-ticket-offline"
                        onClick={() => handleRecordSettlement({ debtorName: s.from, creditorName: s.to, amount: s.amount })}
                        title="Record payment without UPI"
                      >
                        <BiCheck /> Settle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Structured Financial Ledger Table ── */}
          <div className="expenses-ledger-card cyber-card">
            <div className="ledger-toolbar">
              <div className="ledger-header-info">
                <h3>Financial Activity</h3>
                <span className="expenses-count-pill">{filteredExpenses.length} transactions</span>
              </div>
              <div className="ledger-search-box">
                <BiSearch className="ledger-search-icon" />
                <input
                  type="text"
                  placeholder="Filter by description, payer, category..."
                  value={expenseSearchQuery}
                  onChange={(e) => setExpenseSearchQuery(e.target.value)}
                  className="ledger-search-input"
                />
              </div>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="empty-state py-8 text-center">
                <BiReceipt className="empty-icon text-tertiary mb-2" />
                <p className="text-secondary">
                  {activeExpenses.length === 0 ? 'No expenses logged in this group yet.' : 'No transactions match your search query.'}
                </p>
                {activeExpenses.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={BiPlus}
                    onClick={() => setIsAddExpenseModalOpen(true)}
                    className="mt-3"
                  >
                    Add First Expense
                  </Button>
                )}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Expense & Date</th>
                      <th>Category</th>
                      <th>Paid By</th>
                      <th className="text-right">Total Amount</th>
                      <th className="text-right">Your Share</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((exp) => {
                      const isExpanded = expandedExpenseId === exp.id;
                      const splitCount = exp.splits?.length || activeGroup.members?.length || 1;

                      // Calculate current user's specific share
                      let myShare = 0;
                      if (exp.splits && exp.splits.length > 0) {
                        const mySplit = exp.splits.find(
                          (s) => (s.user_name || s.member_name || '').toLowerCase() === currentUserName.toLowerCase()
                        );
                        myShare = mySplit ? parseFloat(mySplit.amount) : 0;
                      } else {
                        myShare = exp.amount / splitCount;
                      }

                      const isPayer = (exp.paid_by || '').toLowerCase() === currentUserName.toLowerCase();

                      return (
                        <React.Fragment key={exp.id}>
                          <tr
                            className={`ledger-row ${isExpanded ? 'ledger-row-expanded' : ''}`}
                            onClick={() => toggleExpandExpense(exp.id)}
                          >
                            <td>
                              <div className="ledger-desc-cell">
                                <div className="ledger-icon-badge">
                                  <BiReceipt />
                                </div>
                                <div className="ledger-desc-text">
                                  <span className="ledger-desc-title">{exp.description}</span>
                                  <span className="ledger-desc-date">
                                    {exp.created_at
                                      ? new Date(exp.created_at).toLocaleDateString('en-IN', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric',
                                        })
                                      : 'Recent'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="ledger-category-badge">
                                {exp.category || 'General'}
                              </span>
                            </td>
                            <td>
                              <div className="ledger-payer-cell">
                                <span className="ledger-payer-avatar">
                                  {(exp.paid_by || '?').charAt(0).toUpperCase()}
                                </span>
                                <span className="ledger-payer-name">{exp.paid_by}</span>
                              </div>
                            </td>
                            <td className="text-right font-mono font-semibold">
                              ₹{exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="text-right font-mono">
                              <span className={isPayer ? 'text-success' : 'text-secondary'}>
                                ₹{myShare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td>
                              <span className={`status-pill ${isPayer ? 'status-paid' : 'status-split'}`}>
                                {isPayer ? 'You Paid' : `Split ${exp.split_type || 'Equal'}`}
                              </span>
                            </td>
                            <td className="text-right">
                              <div className="ledger-actions-group" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className="ledger-btn-icon"
                                  onClick={() => toggleExpandExpense(exp.id)}
                                  title="View split breakdown"
                                >
                                  {isExpanded ? <BiChevronUp /> : <BiChevronDown />}
                                </button>
                                <button
                                  type="button"
                                  className="ledger-btn-icon text-danger"
                                  onClick={() => handleDeleteExpense(exp.id)}
                                  title="Delete expense"
                                >
                                  <BiTrash />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Split Breakdown Drawer Row */}
                          {isExpanded && (
                            <tr className="ledger-drawer-row">
                              <td colSpan="7">
                                <div className="ledger-drawer-content animate-fade-in">
                                  <div className="drawer-header">
                                    <span className="drawer-title">Split Breakdown per member:</span>
                                    <span className="drawer-split-type">Split Type: {exp.split_type || 'Equal'}</span>
                                  </div>
                                  <div className="drawer-splits-grid">
                                    {exp.splits && exp.splits.length > 0 ? (
                                      exp.splits.map((s, idx) => (
                                        <div key={idx} className="drawer-member-card">
                                          <div className="drawer-member-left">
                                            <span className="drawer-member-avatar">
                                              {(s.user_name || s.member_name || '?').charAt(0).toUpperCase()}
                                            </span>
                                            <span className="drawer-member-name">
                                              {s.user_name || s.member_name}
                                            </span>
                                          </div>
                                          <span className="drawer-member-amount font-mono">
                                            ₹{parseFloat(s.amount).toFixed(2)}
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      activeGroup.members?.map((m, idx) => (
                                        <div key={idx} className="drawer-member-card">
                                          <div className="drawer-member-left">
                                            <span className="drawer-member-avatar">
                                              {m.name.charAt(0).toUpperCase()}
                                            </span>
                                            <span className="drawer-member-name">{m.name}</span>
                                          </div>
                                          <span className="drawer-member-amount font-mono">
                                            ₹{(exp.amount / splitCount).toFixed(2)}
                                          </span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Create Group Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Expense Group"
      >
        <form onSubmit={handleCreateGroup}>
          <Input
            label="Group Name"
            placeholder="e.g. Goa Vacation, Flat 304, Friday Party"
            value={newGroupData.name}
            onChange={(e) => setNewGroupData({ ...newGroupData, name: e.target.value })}
            required
          />

          <Input
            label="Description (Optional)"
            placeholder="What is this group for?"
            value={newGroupData.description}
            onChange={(e) => setNewGroupData({ ...newGroupData, description: e.target.value })}
          />

          <div className="input-group">
            <label className="input-label">Category</label>
            <select
              className="input-field"
              value={newGroupData.category}
              onChange={(e) => setNewGroupData({ ...newGroupData, category: e.target.value })}
            >
              <option value="trip">Trip / Vacation</option>
              <option value="home">Home / Flatmates</option>
              <option value="couple">Couple</option>
              <option value="other">Event / Other</option>
            </select>
          </div>

          <Input
            label="Additional Member Names (Comma separated)"
            placeholder="e.g. Rahul, Priya, Amit"
            value={newGroupData.membersInput}
            onChange={(e) => setNewGroupData({ ...newGroupData, membersInput: e.target.value })}
            helperText="You can also add member names later inside the group."
          />

          <Button type="submit" variant="primary" fullWidth loading={submitting}>
            Create Group
          </Button>
        </form>
      </Modal>

      {/* Add Expense Modal */}
      <Modal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        title={`Add Expense to ${activeGroup?.name || 'Group'}`}
      >
        <form onSubmit={handleAddExpense}>
          <Input
            label="Description"
            placeholder="e.g. Seafood Dinner, Uber to Airport, Groceries"
            value={newExpenseData.description}
            onChange={(e) => setNewExpenseData({ ...newExpenseData, description: e.target.value })}
            required
          />

          <div className="amount-currency-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <Input
              label={`Amount (${currencies[newExpenseData.currency]?.symbol || '₹'})`}
              type="number"
              step="0.01"
              placeholder="0.00"
              value={newExpenseData.amount}
              onChange={(e) => setNewExpenseData({ ...newExpenseData, amount: e.target.value })}
              required
            />
            <div className="input-group">
              <label className="input-label">Currency</label>
              <select
                className="input-field"
                value={newExpenseData.currency}
                onChange={(e) => setNewExpenseData({ ...newExpenseData, currency: e.target.value })}
              >
                {Object.values(currencies).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {newExpenseData.currency !== 'INR' && newExpenseData.amount > 0 && (
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
                  {isLive ? `Live Market Rate (${source})` : 'Offline Cached Rate'}: 1 {newExpenseData.currency} = ₹{currencies[newExpenseData.currency]?.rate_to_inr || 1} INR
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{lastUpdated ? lastUpdated.split(' ')[1] : ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '600', fontSize: '0.92rem', color: '#38bdf8' }}>
                <span>Converted Total:</span>
                <span>≈ ₹{convertToInr(newExpenseData.amount, newExpenseData.currency).toLocaleString('en-IN', { minimumFractionDigits: 2 })} INR</span>
              </div>
            </div>
          )}


          <div className="input-group">
            <label className="input-label">Paid By</label>
            <select
              className="input-field"
              value={newExpenseData.paid_by}
              onChange={(e) => setNewExpenseData({ ...newExpenseData, paid_by: e.target.value })}
              required
            >
              {activeGroup?.members?.map((m, idx) => (
                <option key={idx} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Split Method</label>
            <select
              className="input-field"
              value={newExpenseData.split_type}
              onChange={(e) => setNewExpenseData({ ...newExpenseData, split_type: e.target.value })}
            >
              <option value="equal">⚖️ Split Equally among all members</option>
            </select>
          </div>

          <Button type="submit" variant="primary" fullWidth loading={submitting}>
            Save Expense
          </Button>
        </form>
      </Modal>

      {/* Delete Group Confirmation Modal */}
      <Modal
        isOpen={isDeleteGroupModalOpen}
        onClose={() => setIsDeleteGroupModalOpen(false)}
        title="Delete Expense Group"
      >
        <div className="delete-group-confirmation">
          <p>
            Are you sure you want to delete <strong>'{activeGroup?.name}'</strong>?
          </p>
          <p className="text-warning">
            ⚠️ This will permanently delete this group and all its expenses. You won't be able to view or access this group again.
          </p>
          <div className="modal-actions-row mt-4">
            <Button variant="outline" onClick={() => setIsDeleteGroupModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={submitting} onClick={handleDeleteGroup}>
              Yes, Delete Group
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: 1-Tap UPI Settlement & Dynamic QR Code */}
      <UpiPaymentModal
        isOpen={upiModalData.isOpen}
        onClose={() => setUpiModalData((prev) => ({ ...prev, isOpen: false }))}
        debtorName={upiModalData.debtorName}
        creditorName={upiModalData.creditorName}
        amount={upiModalData.amount}
        groupName={activeGroup?.name || 'Group'}
        creditorUpiId={upiModalData.creditorUpiId}
        onRecordSettlement={handleRecordSettlement}
      />

      {/* Modal: Smart Receipt OCR & Itemized Dining Splitter */}
      <ReceiptSplitModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        group={activeGroup}
        currentUser={user}
        onExpenseCreated={async () => {
          if (activeGroup) {
            await setActiveGroup(activeGroup);
          }
        }}
      />
    </div>
  );
}
