import React, { useState } from 'react';
import useAuthStore from '../store/authStore';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  BiUser,
  BiEnvelope,
  BiCreditCard,
  BiCalendar,
  BiLogOut,
  BiEdit,
  BiQrScan,
  BiCheck,
} from 'react-icons/bi';
import { HiShieldCheck, HiSparkles } from 'react-icons/hi';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, logout, setUser } = useAuthStore();
  const [upiIdInput, setUpiIdInput] = useState(user?.upi_id || '');
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [savingUpi, setSavingUpi] = useState(false);

  const handleSaveUpi = async (e) => {
    e.preventDefault();
    if (upiIdInput.trim() && !upiIdInput.includes('@')) {
      toast.error('Please enter a valid UPI ID (e.g. name@okhdfcbank or 9876543210@paytm)');
      return;
    }
    setSavingUpi(true);
    try {
      const res = await api.put('/api/auth/me', {
        upi_id: upiIdInput.trim() || null,
      });
      setUser(res.data);
      setIsEditingUpi(false);
      toast.success(upiIdInput.trim() ? 'UPI ID saved successfully!' : 'UPI ID removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update UPI ID');
    } finally {
      setSavingUpi(false);
    }
  };

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

        {/* UPI & Instant Settlement Card */}
        <div className="profile-card cyber-card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <span>⚡ UPI Payment Settings</span>
                <span className="badge-chip" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>P2P 0% FEES</span>
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
                Friends in your groups use this UPI ID to settle their debts to you in 1 tap via Google Pay, PhonePe, or Paytm.
              </p>
            </div>
            {!isEditingUpi && (
              <Button
                variant="outline"
                size="sm"
                icon={BiEdit}
                onClick={() => setIsEditingUpi(true)}
              >
                {user?.upi_id ? 'Edit UPI ID' : 'Add UPI ID'}
              </Button>
            )}
          </div>

          {isEditingUpi ? (
            <form onSubmit={handleSaveUpi} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
              <input
                type="text"
                value={upiIdInput}
                onChange={(e) => setUpiIdInput(e.target.value)}
                placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                className="input-field"
                style={{ flex: '1', minWidth: '260px' }}
                autoFocus
              />
              <Button type="submit" variant="primary" size="sm" loading={savingUpi} icon={BiCheck}>
                Save UPI ID
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditingUpi(false)}>
                Cancel
              </Button>
            </form>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>
                  Active Payee VPA
                </span>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: user?.upi_id ? '#34d399' : 'var(--text-muted, #94a3b8)', marginTop: '2px', fontFamily: 'monospace' }}>
                  {user?.upi_id || 'Not configured yet (Click Add UPI ID)'}
                </div>
              </div>

              {user?.upi_id && (
                <div style={{ padding: '6px', background: '#fff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QRCodeSVG
                    value={`upi://pay?pa=${encodeURIComponent(user.upi_id)}&pn=${encodeURIComponent(displayName)}&cu=INR`}
                    size={64}
                    level="M"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
