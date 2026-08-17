import React from 'react';
import useAuthStore from '../store/authStore';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import { BiUser, BiEnvelope, BiCreditCard, BiCalendar, BiLogOut } from 'react-icons/bi';
import { HiShieldCheck } from 'react-icons/hi';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();

  const displayName = user?.full_name || user?.display_name || (user?.email ? user.email.split('@')[0] : 'User');
  const userEmail = user?.email || 'N/A';
  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Active Member';

  return (
    <div className="profile-page">
      {/* Profile Header Card */}
      <div className="profile-header-card cyber-card">
        <div className="profile-header-top">
          <Avatar name={displayName} src={user?.avatar_url} size="xl" />
          <div className="profile-identity">
            <h2>{displayName}</h2>
            <p className="profile-email-sub">{userEmail}</p>
            <div className="profile-status-badge">
              <HiShieldCheck /> Divvy Verified Account
            </div>
          </div>
        </div>

        <div className="profile-logout-bar">
          <Button variant="danger" icon={BiLogOut} onClick={logout}>
            Sign Out of Divvy
          </Button>
        </div>
      </div>

      {/* Account Details Section */}
      <div className="profile-grid">
        <div className="profile-card cyber-card">
          <h3>Account Information</h3>
          <div className="profile-info-list">
            <div className="info-item">
              <div className="info-icon-wrap"><BiUser /></div>
              <div>
                <label>Full Name</label>
                <span>{displayName}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon-wrap"><BiEnvelope /></div>
              <div>
                <label>Email Address</label>
                <span>{userEmail}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon-wrap"><BiCreditCard /></div>
              <div>
                <label>Default Currency</label>
                <span>INR (₹)</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon-wrap"><BiCalendar /></div>
              <div>
                <label>Member Since</label>
                <span>{joinedDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Preferences */}
        <div className="profile-card cyber-card">
          <h3>App Preferences & Security</h3>
          <div className="profile-info-list">
            <div className="info-item">
              <div className="info-icon-wrap"><HiShieldCheck /></div>
              <div>
                <label>Session Security</label>
                <span>Encrypted JWT Token (Active)</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon-wrap"><BiCreditCard /></div>
              <div>
                <label>Database Storage</label>
                <span>Supabase PostgreSQL Cloud</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
