import React, { useEffect, useRef } from 'react';
import { BiSun, BiMoon, BiLogOut, BiSearch, BiCommand } from 'react-icons/bi';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import Avatar from '../common/Avatar';
import NotificationBell from './NotificationBell';
import './Navbar.css';

export default function Navbar() {
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const searchInputRef = useRef(null);

  const displayName = user?.full_name || user?.display_name || (user?.email ? user.email.split('@')[0] : 'User');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div className="navbar-brand">
          <div className="navbar-logo-badge">D</div>
          <span className="navbar-logo-text">Divvy</span>
        </div>

        {/* Global Command / Search Input */}
        <div className="navbar-search-wrapper">
          <BiSearch className="navbar-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search expenses, groups, settlements..."
            className="navbar-search-input"
          />
          <kbd className="navbar-search-kbd">⌘K</kbd>
        </div>
      </div>

      <div className="navbar-actions">
        {/* Real-time Activity & Notifications */}
        {user && <NotificationBell />}

        {/* Dark/Light Theme Toggle */}
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <BiMoon /> : <BiSun className="text-warning" />}
        </button>

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

