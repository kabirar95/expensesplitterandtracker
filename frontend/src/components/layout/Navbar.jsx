import React from 'react';
import { BiSun, BiMoon, BiLogOut, BiUser } from 'react-icons/bi';
import useThemeStore from '../../store/themeStore';
import useAuthStore from '../../store/authStore';
import Avatar from '../common/Avatar';
import './Navbar.css';

export default function Navbar() {
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();

  const displayName = user?.full_name || user?.display_name || (user?.email ? user.email.split('@')[0] : 'User');

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo-icon">💸</span>
        <span className="navbar-logo-text">Divvy</span>
      </div>

      <div className="navbar-actions">
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
