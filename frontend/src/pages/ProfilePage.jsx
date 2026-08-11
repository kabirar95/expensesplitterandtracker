import React from 'react';
import useAuthStore from '../store/authStore';

export default function ProfilePage() {
  const { user } = useAuthStore();

  return (
    <div>
      <h1>Profile</h1>
      {user && (
        <div style={{ marginTop: '1rem', lineHeight: '1.8' }}>
          <p><strong>Name:</strong> {user.display_name}</p>
          <p><strong>Username:</strong> @{user.username}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Default Currency:</strong> {user.default_currency}</p>
        </div>
      )}
    </div>
  );
}
