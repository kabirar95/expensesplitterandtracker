import React, { useEffect, useState } from 'react';
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
} from 'react-icons/bi';
import { toast } from 'react-hot-toast';

import useGroupStore from '../store/groupStore';
import useAuthStore from '../store/authStore';

import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Spinner from '../components/common/Spinner';

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
  } = useGroupStore();

  // Modals & UI state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [newMemberInput, setNewMemberInput] = useState('');
  const [expandedExpenseId, setExpandedExpenseId] = useState(null);

  // Form states
  const [newGroupData, setNewGroupData] = useState({ name: '', description: '', category: 'trip', membersInput: '' });
  const [newExpenseData, setNewExpenseData] = useState({
    description: '',
    amount: '',
    category: 'food',
    paid_by: '',
    split_type: 'equal',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

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
      await addExpenseToActiveGroup({
        description: newExpenseData.description,
        amount: parseFloat(newExpenseData.amount),
        category: newExpenseData.category,
        paid_by: newExpenseData.paid_by,
        split_type: newExpenseData.split_type,
        notes: newExpenseData.notes,
      });

      toast.success('Expense added & split among members!');
      setIsAddExpenseModalOpen(false);
      setNewExpenseData({
        description: '',
        amount: '',
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

  const toggleExpandExpense = (id) => {
    setExpandedExpenseId(expandedExpenseId === id ? null : id);
  };

  return (
    <div className="groups-container animate-fade-in">
      {/* Header */}
      <div className="groups-header">
        <div>
          <h1 className="gradient-text">Expense Groups</h1>
          <p>Split trip, roommate, and party expenses effortlessly with simplified settlements!</p>
        </div>
        <Button variant="primary" icon={BiPlus} onClick={() => setIsCreateModalOpen(true)}>
          Create Group
        </Button>
      </div>

      {/* Main Layout */}
      <div className="groups-layout">
        {/* Groups List Sidebar */}
        <div className="groups-list-card cyber-card">
          <div className="card-section-header">
            <h3>Your Groups</h3>
            <span className="group-count-badge">{groups.length}</span>
          </div>

          {loading && groups.length === 0 ? (
            <div className="text-center py-6">
              <Spinner size="md" />
            </div>
          ) : groups.length === 0 ? (
            <div className="empty-state">
              <BiGroup className="empty-icon" />
              <p>No groups yet. Create one to start splitting!</p>
            </div>
          ) : (
            <div className="groups-items">
              {groups.map((group) => {
                const isActive = activeGroup?.id === group.id;
                return (
                  <div
                    key={group.id}
                    className={`group-item-card ${isActive ? 'group-item-active' : ''}`}
                    onClick={() => setActiveGroup(group)}
                  >
                    <div className="group-item-header">
                      <span className="group-name">{group.name}</span>
                      <span className="group-category-pill">{group.category}</span>
                    </div>
                    <div className="group-item-footer">
                      <span className="member-count-tag">
                        <BiGroup /> {group.members?.length || 0} members
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Group Details */}
        <div className="group-detail-view">
          {activeGroup ? (
            <>
              {/* Group Header Card */}
              <div className="active-group-header cyber-card">
                <div className="active-group-title-row">
                  <div>
                    <span className="active-group-category">{activeGroup.category}</span>
                    <h2>{activeGroup.name}</h2>
                    {activeGroup.description && <p>{activeGroup.description}</p>}
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    icon={BiReceipt}
                    onClick={() => setIsAddExpenseModalOpen(true)}
                  >
                    Add Expense
                  </Button>
                </div>

                {/* Members Row */}
                <div className="group-members-section">
                  <span className="section-label">Members:</span>
                  <div className="members-pills-list">
                    {activeGroup.members?.map((m, idx) => (
                      <span key={idx} className="member-pill">
                        {m.name}
                      </span>
                    ))}
                  </div>

                  {/* Add Member Form */}
                  <form onSubmit={handleAddMember} className="quick-add-member-form">
                    <input
                      type="text"
                      placeholder="Add member name..."
                      value={newMemberInput}
                      onChange={(e) => setNewMemberInput(e.target.value)}
                      className="quick-member-input"
                    />
                    <button type="submit" className="quick-member-btn" title="Add member">
                      <BiUserPlus />
                    </button>
                  </form>
                </div>

                {/* LIVE NET BALANCES WIDGET */}
                <div className="group-balances-widget">
                  <h4 className="balances-title">
                    <BiTrendingUp /> Net Balances
                  </h4>
                  <div className="balances-grid">
                    {Object.entries(memberBalances).map(([memberName, bal]) => {
                      const isPositive = bal > 0.01;
                      const isNegative = bal < -0.01;
                      return (
                        <div
                          key={memberName}
                          className={`balance-card ${
                            isPositive ? 'balance-positive' : isNegative ? 'balance-negative' : 'balance-zero'
                          }`}
                        >
                          <span className="balance-name">{memberName}</span>
                          <span className="balance-val font-mono">
                            {isPositive ? `+₹${bal.toFixed(2)}` : isNegative ? `-₹${Math.abs(bal).toFixed(2)}` : '₹0.00'}
                          </span>
                          <span className="balance-status font-mono">
                            {isPositive ? 'gets back' : isNegative ? 'owes' : 'settled up'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SIMPLIFIED SETTLEMENTS (WHO PAYS WHOM) */}
                <div className="settlements-widget">
                  <h4 className="settlements-title">
                    🤝 Simplified Settlements (Who Pays Whom)
                  </h4>
                  {settlements.length === 0 ? (
                    <div className="all-settled-badge">
                      <BiCheckDouble /> All members are completely settled up!
                    </div>
                  ) : (
                    <div className="settlements-list">
                      {settlements.map((s, idx) => (
                        <div key={idx} className="settlement-card">
                          <span className="settlement-from">{s.from}</span>
                          <span className="settlement-action">
                            pays <BiRightArrowAlt />
                          </span>
                          <span className="settlement-to">{s.to}</span>
                          <span className="settlement-amount font-mono">
                            ₹{s.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Expense History Section */}
              <div className="expenses-section cyber-card">
                <div className="card-section-header">
                  <h3>Group Expenses</h3>
                  <span className="expenses-count">{activeExpenses.length} transactions</span>
                </div>

                {activeExpenses.length === 0 ? (
                  <div className="empty-state py-8">
                    <BiReceipt className="empty-icon" />
                    <p>No expenses logged in this group yet.</p>
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
                  <div className="expenses-list">
                    {activeExpenses.map((exp) => {
                      const isExpanded = expandedExpenseId === exp.id;
                      const splitCount = exp.splits?.length || activeGroup.members?.length || 1;
                      const sharePerPerson = exp.amount / splitCount;

                      return (
                        <div key={exp.id} className="expense-item-wrapper">
                          <div
                            className="expense-item-card"
                            onClick={() => toggleExpandExpense(exp.id)}
                          >
                            <div className="expense-icon-badge">
                              <BiMoney />
                            </div>
                            <div className="expense-main-info">
                              <span className="expense-description">{exp.description}</span>
                              <span className="expense-meta">
                                Paid by <strong>{exp.paid_by}</strong> • Split {exp.split_type} (₹
                                {sharePerPerson.toFixed(2)}/person)
                              </span>
                            </div>
                            <div className="expense-amount-col">
                              <span className="expense-amount font-mono">
                                ₹{exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              <button className="expand-toggle-btn">
                                {isExpanded ? <BiChevronUp /> : <BiChevronDown />}
                              </button>
                              <button
                                className="expense-delete-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteExpense(exp.id);
                                }}
                                title="Delete expense"
                              >
                                <BiTrash />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Split Breakdown Drawer */}
                          {isExpanded && (
                            <div className="expense-splits-drawer animate-fade-in">
                              <span className="drawer-title">Split Breakdown per member:</span>
                              <div className="splits-pills-grid">
                                {exp.splits && exp.splits.length > 0 ? (
                                  exp.splits.map((s, idx) => (
                                    <div key={idx} className="split-member-card">
                                      <span className="split-member-name">
                                        {s.user_name || s.member_name}
                                      </span>
                                      <span className="split-member-amount font-mono">
                                        ₹{parseFloat(s.amount).toFixed(2)}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  activeGroup.members?.map((m, idx) => (
                                    <div key={idx} className="split-member-card">
                                      <span className="split-member-name">{m.name}</span>
                                      <span className="split-member-amount font-mono">
                                        ₹{sharePerPerson.toFixed(2)}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="cyber-card empty-active-view">
              <BiGroup className="huge-icon" />
              <h3>Select or create a group to start</h3>
            </div>
          )}
        </div>
      </div>

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
              <option value="trip">✈️ Trip / Vacation</option>
              <option value="home">🏠 Home / Roommates</option>
              <option value="couple">❤️ Couple</option>
              <option value="other">🎉 Event / Party / Other</option>
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

          <Input
            label="Amount (₹)"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={newExpenseData.amount}
            onChange={(e) => setNewExpenseData({ ...newExpenseData, amount: e.target.value })}
            required
          />

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
    </div>
  );
}
