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

  // Compute accurate metrics for current month & year
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentYearStr = String(now.getFullYear());

  // Personal spend strictly for current month
  const thisMonthExpenses = personalExpenses.filter((e) =>
    String(e.expense_date || '').startsWith(currentMonthStr)
  );
  const thisMonthSpent = thisMonthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  // Personal spend for current year
  const thisYearExpenses = personalExpenses.filter((e) =>
    String(e.expense_date || '').startsWith(currentYearStr)
  );
  const thisYearSpent = thisYearExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  // Monthly target budget & remaining balance
  const totalPersonalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.target_amount || 0), 0);
  const remainingBudget = totalPersonalBudget - thisMonthSpent;

  // Recent personal expenses sorted newest first
  const recentSortedExpenses = [...personalExpenses].sort((a, b) =>
    String(b.expense_date || '').localeCompare(String(a.expense_date || ''))
  );

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
            <span className="stat-number font-mono">₹{thisMonthSpent.toFixed(2)}</span>
            <div className="stat-meta-row">
              <span className="stat-meta-item">
                Yearly: <strong className="font-mono">₹{thisYearSpent.toFixed(2)}</strong>
              </span>
              <Link to="/personal" className="stat-link">
                View Expenses <BiRightArrowAlt />
              </Link>
            </div>
          </div>
        </div>

        <div className="dash-stat-card cyber-card">
          <div className="stat-icon-wrap icon-green">
            <BiPieChartAlt2 />
          </div>
          <div className="stat-details">
            <span className="stat-title">Target Budget Limit</span>
            <span className="stat-number font-mono">₹{totalPersonalBudget.toFixed(2)}</span>
            <div className="stat-meta-row">
              <span className="stat-meta-item">
                Remaining: <strong className={`font-mono ${remainingBudget < 0 ? 'text-danger' : 'text-success'}`}>
                  {remainingBudget < 0 ? `-₹${Math.abs(remainingBudget).toFixed(2)}` : `₹${remainingBudget.toFixed(2)}`}
                </strong>
              </span>
              <Link to="/personal" className="stat-link">
                Set Budgets <BiRightArrowAlt />
              </Link>
            </div>
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
                  {recentSortedExpenses.slice(0, 5).map((e) => (
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
