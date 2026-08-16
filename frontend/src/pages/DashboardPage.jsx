import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BiGroup,
  BiWallet,
  BiPieChartAlt2,
  BiPlusCircle,
  BiRightArrowAlt,
  BiTrendingUp,
  BiShieldQuarter,
} from 'react-icons/bi';

import useAuthStore from '../store/authStore';
import useGroupStore from '../store/groupStore';
import usePersonalExpenseStore from '../store/personalExpenseStore';
import Button from '../components/common/Button';

import './DashboardPage.css';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { groups, loadGroups } = useGroupStore();
  const { personalExpenses, budgets, loadPersonalData } = usePersonalExpenseStore();

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
          <span className="badge-chip">✨ DIVVY CYBER-SYSTEM v1.0</span>
          <h2>Welcome back, <span className="gradient-text">{user?.display_name || user?.username || 'User'}</span>!</h2>
          <p>Manage your group splits, track personal budgets, and monitor your overall financial health.</p>
        </div>
        <div className="welcome-quick-actions">
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

      {/* Two Column Layout: Quick Access Cards */}
      <div className="dash-two-col">
        {/* Left Column: Recent Groups */}
        <div className="dash-card cyber-card">
          <div className="dash-card-header">
            <h3><BiGroup /> Your Expense Groups</h3>
            <Link to="/groups" className="see-all-link">See All</Link>
          </div>

          {groups.length === 0 ? (
            <div className="empty-dash-box">
              <p>No expense groups created yet.</p>
              <Link to="/groups">
                <Button variant="outline" size="sm">Create First Group</Button>
              </Link>
            </div>
          ) : (
            <div className="groups-dash-list">
              {groups.slice(0, 4).map((g) => (
                <Link key={g.id} to="/groups" className="dash-group-item">
                  <div className="group-item-info">
                    <span className="dash-group-name">{g.name}</span>
                    <span className="dash-group-meta">{g.members?.length || 0} Members • {g.category}</span>
                  </div>
                  <BiRightArrowAlt className="arrow-icon" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Recent Personal Transactions */}
        <div className="dash-card cyber-card">
          <div className="dash-card-header">
            <h3><BiWallet /> Recent Personal Expenses</h3>
            <Link to="/personal" className="see-all-link">See All</Link>
          </div>

          {personalExpenses.length === 0 ? (
            <div className="empty-dash-box">
              <p>No personal expenses logged this month.</p>
              <Link to="/personal">
                <Button variant="outline" size="sm">Log Personal Expense</Button>
              </Link>
            </div>
          ) : (
            <div className="personal-dash-list">
              {personalExpenses.slice(0, 4).map((e) => (
                <div key={e.id} className="dash-personal-item">
                  <div className="personal-item-info">
                    <span className="dash-expense-title">{e.description}</span>
                    <span className="dash-expense-meta">{e.category} • {e.expense_date}</span>
                  </div>
                  <span className="dash-expense-cost font-mono">₹{parseFloat(e.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
