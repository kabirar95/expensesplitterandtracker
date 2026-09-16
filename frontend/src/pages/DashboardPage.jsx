import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BiGroup,
  BiWallet,
  BiPieChartAlt2,
  BiPlusCircle,
  BiRightArrowAlt,
  BiTrendingUp,
  BiShieldQuarter,
  BiBrain,
} from 'react-icons/bi';

import useAuthStore from '../store/authStore';
import useGroupStore from '../store/groupStore';
import usePersonalExpenseStore from '../store/personalExpenseStore';
import Button from '../components/common/Button';
import SmartExpenseModal from '../components/common/SmartExpenseModal';

import './DashboardPage.css';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { groups, loadGroups } = useGroupStore();
  const { personalExpenses, budgets, loadPersonalData } = usePersonalExpenseStore();
  const [isSmartAddOpen, setIsSmartAddOpen] = useState(false);

  useEffect(() => {
    loadGroups();
    loadPersonalData();
  }, [loadGroups, loadPersonalData]);

  // Compute metrics
  const totalPersonalSpent = personalExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalPersonalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.target_amount || 0), 0);
  const remainingBudget = totalPersonalBudget - totalPersonalSpent;

  return (
    <div className="dashboard-container animate-fade-in">
      {/* Welcome Banner */}
      <div className="welcome-banner cyber-card">
        <div className="welcome-text">
          <span className="badge-chip">DIVVY EXECUTIVE PLATFORM</span>
          <h2>Welcome back, <span className="gradient-text">{user?.display_name || user?.username || 'User'}</span>!</h2>
          <p>Manage group splits, track monthly expenses, and monitor financial health.</p>
        </div>
        <div className="welcome-quick-actions">
          <Button
            variant="secondary"
            icon={BiBrain}
            onClick={() => setIsSmartAddOpen(true)}
            title="Paste bank SMS or casual note to auto-extract with Divvy AI"
          >
            Smart Add (Divvy AI)
          </Button>
          <Link to="/groups">
            <Button variant="primary" icon={BiPlusCircle}>
              Split Expense
            </Button>
          </Link>
          <Link to="/personal">
            <Button variant="outline" icon={BiWallet}>
              Personal Tracker
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Quick Overview Grid */}
      <div className="dash-stats-grid">
        <div className="dash-stat-card cyber-card">
          <div className="stat-icon-wrap icon-purple">
            <BiGroup />
          </div>
          <div className="stat-details">
            <span className="stat-title">Active Groups</span>
            <span className="stat-number font-mono">{groups.length}</span>
            <Link to="/groups" className="stat-link">
              View Groups <BiRightArrowAlt />
            </Link>
          </div>
        </div>

        <div className="dash-stat-card cyber-card">
          <div className="stat-icon-wrap icon-cyan">
            <BiWallet />
          </div>
          <div className="stat-details">
            <span className="stat-title">Personal Spent (This Month)</span>
            <span className="stat-number font-mono">₹{totalPersonalSpent.toFixed(2)}</span>
            <Link to="/personal" className="stat-link">
              View Expenses <BiRightArrowAlt />
            </Link>
          </div>
        </div>

        <div className="dash-stat-card cyber-card">
          <div className="stat-icon-wrap icon-green">
            <BiPieChartAlt2 />
          </div>
          <div className="stat-details">
            <span className="stat-title">Target Budget Limit</span>
            <span className="stat-number font-mono">₹{totalPersonalBudget.toFixed(2)}</span>
            <Link to="/personal" className="stat-link">
              Set Budgets <BiRightArrowAlt />
            </Link>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Structured Ledger Previews */}
      <div className="dash-two-col">
        {/* Left Column: Recent Groups */}
        <div className="dash-card cyber-card">
          <div className="dash-card-header">
            <div className="dash-header-title">
              <BiGroup className="text-primary" />
              <h3>Expense Groups</h3>
            </div>
            <Link to="/groups" className="see-all-link">View All ({groups.length})</Link>
          </div>

          {groups.length === 0 ? (
            <div className="empty-dash-box">
              <p>No expense groups created yet.</p>
              <Link to="/groups">
                <Button variant="outline" size="sm">Create First Group</Button>
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="dash-mini-table">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Category</th>
                    <th>Members</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.slice(0, 5).map((g) => (
                    <tr key={g.id} className="dash-table-row">
                      <td>
                        <span className="dash-item-title font-semibold">{g.name}</span>
                      </td>
                      <td>
                        <span className="ledger-category-badge">{g.category}</span>
                      </td>
                      <td className="text-secondary" style={{ fontSize: '0.78rem' }}>
                        {g.members?.length || 0} members
                      </td>
                      <td className="text-right">
                        <Link to="/groups" className="dash-row-link">
                          Open <BiRightArrowAlt />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Recent Personal Transactions */}
        <div className="dash-card cyber-card">
          <div className="dash-card-header">
            <div className="dash-header-title">
              <BiWallet className="text-primary" />
              <h3>Recent Personal Expenses</h3>
            </div>
            <Link to="/personal" className="see-all-link">View Ledger ({personalExpenses.length})</Link>
          </div>

          {personalExpenses.length === 0 ? (
            <div className="empty-dash-box">
              <p>No personal expenses logged this month.</p>
              <Link to="/personal">
                <Button variant="outline" size="sm">Log Personal Expense</Button>
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="dash-mini-table">
                <thead>
                  <tr>
                    <th>Expense</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {personalExpenses.slice(0, 5).map((e) => (
                    <tr key={e.id} className="dash-table-row">
                      <td>
                        <span className="dash-item-title">{e.description}</span>
                      </td>
                      <td>
                        <span className="ledger-category-badge">{e.category}</span>
                      </td>
                      <td className="text-secondary font-mono" style={{ fontSize: '0.76rem' }}>
                        {e.expense_date}
                      </td>
                      <td className="text-right font-mono font-semibold">
                        ₹{parseFloat(e.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Smart Add Modal */}
      <SmartExpenseModal
        isOpen={isSmartAddOpen}
        onClose={() => {
          setIsSmartAddOpen(false);
          loadPersonalData();
        }}
      />
    </div>
  );
}
