import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BiLogOut,
  BiSearch,
  BiX,
  BiGroup,
  BiWallet,
  BiPieChartAlt2,
  BiBot,
  BiUser,
  BiReceipt,
  BiHomeAlt,
  BiChevronRight,
} from 'react-icons/bi';
import useAuthStore from '../../store/authStore';
import useGroupStore from '../../store/groupStore';
import usePersonalExpenseStore from '../../store/personalExpenseStore';
import Avatar from '../common/Avatar';
import NotificationBell from './NotificationBell';
import './Navbar.css';

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { groups, loadGroups, setActiveGroup } = useGroupStore();
  const { personalExpenses, loadPersonalData } = usePersonalExpenseStore();

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchWrapperRef = useRef(null);
  const searchInputRef = useRef(null);

  const displayName = user?.full_name || user?.display_name || (user?.email ? user.email.split('@')[0] : 'User');

  // Load user data on mount if user is logged in
  useEffect(() => {
    if (user) {
      if (groups.length === 0) loadGroups();
      if (personalExpenses.length === 0) loadPersonalData();
    }
  }, [user]);

  // Keyboard shortcut: Cmd+K / Ctrl+K to focus search, Escape to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigation pages list
  const pages = [
    { label: 'Dashboard', path: '/dashboard', icon: BiHomeAlt, hint: 'Overview & metrics' },
    { label: 'Groups & Splits', path: '/groups', icon: BiGroup, hint: 'Shared trips, IOUs & settlements' },
    { label: 'Personal Tracker', path: '/personal', icon: BiWallet, hint: 'Budgets & daily spending' },
    { label: 'Analytics & Insights', path: '/analytics', icon: BiPieChartAlt2, hint: 'Category charts & trends' },
    { label: 'Divvy AI Assistant', path: '/ai-assistant', icon: BiBot, hint: 'Natural language expense copilot' },
    { label: 'Profile & Settings', path: '/profile', icon: BiUser, hint: 'UPI ID & account details' },
  ];

  const cleanQuery = query.trim().toLowerCase();

  // Filter items based on user query
  const matchingPages = pages.filter(
    (p) => p.label.toLowerCase().includes(cleanQuery) || p.hint.toLowerCase().includes(cleanQuery)
  );

  const matchingGroups = (groups || []).filter((g) => {
    if (!cleanQuery) return true;
    const nameMatch = (g.name || '').toLowerCase().includes(cleanQuery);
    const catMatch = (g.category || '').toLowerCase().includes(cleanQuery);
    const memberMatch = (g.members || []).some((m) => (m.name || '').toLowerCase().includes(cleanQuery));
    return nameMatch || catMatch || memberMatch;
  });

  const matchingExpenses = (personalExpenses || []).filter((e) => {
    if (!cleanQuery) return true;
    const descMatch = (e.description || '').toLowerCase().includes(cleanQuery);
    const catMatch = (e.category || '').toLowerCase().includes(cleanQuery);
    const notesMatch = (e.notes || '').toLowerCase().includes(cleanQuery);
    return descMatch || catMatch || notesMatch;
  });

  const handleSelectPage = (path) => {
    navigate(path);
    setIsOpen(false);
    setQuery('');
  };

  const handleSelectGroup = async (group) => {
    await setActiveGroup(group);
    navigate('/groups');
    setIsOpen(false);
    setQuery('');
  };

  const handleSelectExpense = () => {
    navigate('/personal');
    setIsOpen(false);
    setQuery('');
  };

  const hasResults =
    matchingPages.length > 0 || matchingGroups.length > 0 || (cleanQuery && matchingExpenses.length > 0);

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="navbar-brand" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <div className="navbar-logo-badge">D</div>
          <span className="navbar-logo-text">Divvy</span>
        </div>

        {/* Global Command / Search Input */}
        <div className="navbar-search-wrapper" ref={searchWrapperRef}>
          <BiSearch className="navbar-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search expenses, groups, settlements..."
            className="navbar-search-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />
          {query ? (
            <button
              type="button"
              className="navbar-search-clear"
              onClick={() => {
                setQuery('');
                searchInputRef.current?.focus();
              }}
              title="Clear search"
            >
              <BiX />
            </button>
          ) : (
            <kbd className="navbar-search-kbd">⌘K</kbd>
          )}

          {/* Interactive Search & Command Palette Dropdown */}
          {isOpen && (
            <div className="navbar-search-dropdown cyber-card">
              {!cleanQuery ? (
                // Default View when query is empty
                <div className="search-dropdown-section">
                  <div className="search-section-header">QUICK NAVIGATION</div>
                  <div className="search-results-list">
                    {pages.slice(0, 4).map((p) => {
                      const Icon = p.icon;
                      return (
                        <div
                          key={p.path}
                          className="search-result-item"
                          onClick={() => handleSelectPage(p.path)}
                        >
                          <div className="search-item-icon-box">
                            <Icon />
                          </div>
                          <div className="search-item-details">
                            <span className="search-item-title">{p.label}</span>
                            <span className="search-item-sub">{p.hint}</span>
                          </div>
                          <BiChevronRight className="search-item-arrow" />
                        </div>
                      );
                    })}
                  </div>

                  {groups.length > 0 && (
                    <>
                      <div className="search-section-header mt-3">YOUR GROUPS</div>
                      <div className="search-results-list">
                        {groups.slice(0, 3).map((g) => (
                          <div
                            key={g.id}
                            className="search-result-item"
                            onClick={() => handleSelectGroup(g)}
                          >
                            <div className="search-item-icon-box group-icon-box">
                              <BiGroup />
                            </div>
                            <div className="search-item-details">
                              <span className="search-item-title">{g.name}</span>
                              <span className="search-item-sub">
                                {g.members?.length || 0} members · {g.category || 'general'}
                              </span>
                            </div>
                            <span className="search-badge">Open</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : hasResults ? (
                // Filtered Results View
                <div className="search-dropdown-section">
                  {/* Matching Pages */}
                  {matchingPages.length > 0 && (
                    <>
                      <div className="search-section-header">PAGES ({matchingPages.length})</div>
                      <div className="search-results-list">
                        {matchingPages.map((p) => {
                          const Icon = p.icon;
                          return (
                            <div
                              key={p.path}
                              className="search-result-item"
                              onClick={() => handleSelectPage(p.path)}
                            >
                              <div className="search-item-icon-box">
                                <Icon />
                              </div>
                              <div className="search-item-details">
                                <span className="search-item-title">{p.label}</span>
                                <span className="search-item-sub">{p.hint}</span>
                              </div>
                              <BiChevronRight className="search-item-arrow" />
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Matching Groups */}
                  {matchingGroups.length > 0 && (
                    <>
                      <div className="search-section-header mt-3">
                        GROUPS ({matchingGroups.length})
                      </div>
                      <div className="search-results-list">
                        {matchingGroups.map((g) => (
                          <div
                            key={g.id}
                            className="search-result-item"
                            onClick={() => handleSelectGroup(g)}
                          >
                            <div className="search-item-icon-box group-icon-box">
                              <BiGroup />
                            </div>
                            <div className="search-item-details">
                              <span className="search-item-title">{g.name}</span>
                              <span className="search-item-sub">
                                {g.members?.length || 0} members · Category: {g.category || 'general'}
                              </span>
                            </div>
                            <span className="search-badge">View Group</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Matching Expenses */}
                  {matchingExpenses.length > 0 && (
                    <>
                      <div className="search-section-header mt-3">
                        EXPENSES ({matchingExpenses.length})
                      </div>
                      <div className="search-results-list">
                        {matchingExpenses.slice(0, 5).map((e) => (
                          <div
                            key={e.id}
                            className="search-result-item"
                            onClick={handleSelectExpense}
                          >
                            <div className="search-item-icon-box expense-icon-box">
                              <BiReceipt />
                            </div>
                            <div className="search-item-details">
                              <span className="search-item-title">{e.description}</span>
                              <span className="search-item-sub">
                                {e.expense_date || 'Recent'} · {e.category || 'General'}
                              </span>
                            </div>
                            <span className="search-amount font-mono">
                              ₹{parseFloat(e.amount || 0).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="search-no-results">
                  <p>No matches found for "<strong>{query}</strong>"</p>
                  <span>Try searching for group names, categories, or pages like "Trip", "Food", "Analytics".</span>
                </div>
              )}

              <div className="search-dropdown-footer">
                <span>Press <kbd>ESC</kbd> to close</span>
                <span>Select to navigate</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="navbar-actions">
        {/* Real-time Activity & Notifications */}
        {user && <NotificationBell />}

        {user && (
          <div className="navbar-user-profile">
            <Avatar name={displayName} src={user?.avatar_url} size="sm" />
            <span className="navbar-username">{displayName}</span>
            <button className="logout-btn" onClick={logout} title="Log out">
              <BiLogOut />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
