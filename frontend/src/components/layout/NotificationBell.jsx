import React, { useState, useEffect, useRef } from 'react';
import {
  BiBell,
  BiCheckDouble,
  BiErrorCircle,
  BiTimeFive,
  BiRepeat,
  BiMoney,
  BiMobile,
  BiTrash,
} from 'react-icons/bi';
import { useNavigate } from 'react-router-dom';

import usePersonalExpenseStore from '../../store/personalExpenseStore';
import useRecurringStore from '../../store/recurringStore';
import './NotificationBell.css';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const { personalExpenses, budgets } = usePersonalExpenseStore();
  const { rules } = useRecurringStore();

  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('divvy_read_notifications') || '[]');
    } catch {
      return [];
    }
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Compute dynamic system notifications based on real state
  const notifications = [];

  // 1. Budget Alerts
  if (budgets && budgets.length > 0 && personalExpenses) {
    const totalSpent = personalExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const overallBudget = budgets.find((b) => b.category === 'overall')?.target_amount || 0;

    if (overallBudget > 0) {
      const pct = Math.round((totalSpent / overallBudget) * 100);
      if (pct >= 100) {
        notifications.push({
          id: `budget-over-100-${Math.round(totalSpent)}`,
          type: 'danger',
          icon: <BiErrorCircle className="text-danger" />,
          title: 'Monthly Budget Exceeded!',
          message: `You have spent ₹${Math.round(totalSpent).toLocaleString('en-IN')} (${pct}% of ₹${Math.round(overallBudget).toLocaleString('en-IN')} budget).`,
          time: 'Active Alert',
          actionUrl: '/personal',
        });
      } else if (pct >= 80) {
        notifications.push({
          id: `budget-warn-80-${Math.round(totalSpent)}`,
          type: 'warning',
          icon: <BiErrorCircle className="text-warning" />,
          title: 'Approaching Budget Limit',
          message: `You have used ${pct}% of your monthly spending budget.`,
          time: 'Active Alert',
          actionUrl: '/personal',
        });
      }
    }
  }

  // 2. Upcoming / Due Recurring Bills
  if (rules && rules.length > 0) {
    const today = new Date();
    rules.forEach((rule) => {
      if (!rule.is_active) return;
      const dueDate = new Date(rule.next_run_date);
      const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        notifications.push({
          id: `recurring-due-${rule.id}-${rule.next_run_date}`,
          type: 'info',
          icon: <BiRepeat className="text-cyan" />,
          title: `Bill Due: ${rule.description}`,
          message: `₹${rule.amount} due on ${rule.next_run_date}. Ready to auto-log!`,
          time: 'Today',
          actionUrl: '/personal',
        });
      } else if (diffDays <= 3) {
        notifications.push({
          id: `recurring-upcoming-${rule.id}-${rule.next_run_date}`,
          type: 'info',
          icon: <BiTimeFive className="text-purple" />,
          title: `Upcoming: ${rule.description}`,
          message: `₹${rule.amount} scheduled in ${diffDays} day(s).`,
          time: `${diffDays}d left`,
          actionUrl: '/personal',
        });
      }
    });
  }

  // 3. PWA Ready
  notifications.push({
    id: 'pwa-offline-notice',
    type: 'success',
    icon: <BiMobile className="text-success" />,
    title: 'Offline & PWA Enabled',
    message: 'Divvy can now be installed and used offline on any mobile or desktop.',
    time: 'System',
    actionUrl: null,
  });

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const handleMarkAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    localStorage.setItem('divvy_read_notifications', JSON.stringify(allIds));
  };

  const handleItemClick = (n) => {
    if (!readIds.includes(n.id)) {
      const updated = [...readIds, n.id];
      setReadIds(updated);
      localStorage.setItem('divvy_read_notifications', JSON.stringify(updated));
    }
    if (n.actionUrl) {
      navigate(n.actionUrl);
      setIsOpen(false);
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Activity & Notifications"
        aria-label="Notifications"
      >
        <BiBell />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown animate-scale-in">
          <div className="notification-dropdown-header">
            <div className="dropdown-title-row">
              <h4>Activity & Alerts</h4>
              {unreadCount > 0 && (
                <span className="unread-pill">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button className="mark-all-read-btn" onClick={handleMarkAllRead}>
                <BiCheckDouble /> Mark read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <p>No new notifications</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isRead = readIds.includes(n.id);
                return (
                  <div
                    key={n.id}
                    className={`notification-item ${isRead ? 'read' : 'unread'} type-${n.type}`}
                    onClick={() => handleItemClick(n)}
                  >
                    <div className="notification-icon-col">{n.icon}</div>
                    <div className="notification-content-col">
                      <div className="notification-item-title">
                        <span>{n.title}</span>
                        {!isRead && <span className="unread-dot"></span>}
                      </div>
                      <p className="notification-item-desc">{n.message}</p>
                      <span className="notification-item-time">{n.time}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
