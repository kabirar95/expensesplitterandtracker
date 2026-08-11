import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BiHomeAlt,
  BiGroup,
  BiWallet,
  BiPieChartAlt2,
  BiBot,
  BiUser,
} from 'react-icons/bi';
import './Sidebar.css';

export default function Sidebar() {
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: BiHomeAlt },
    { path: '/groups', label: 'Groups', icon: BiGroup },
    { path: '/personal', label: 'Personal Tracker', icon: BiWallet },
    { path: '/analytics', label: 'Analytics', icon: BiPieChartAlt2 },
    { path: '/ai-assistant', label: 'Divvy AI', icon: BiBot, badge: 'AI' },
    { path: '/profile', label: 'Profile', icon: BiUser },
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
              }
            >
              <Icon className="sidebar-icon" />
              <span className="sidebar-label">{item.label}</span>
              {item.badge && <span className="sidebar-badge">{item.badge}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
