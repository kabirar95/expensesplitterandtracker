import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BiUser, BiEnvelope, BiLockAlt, BiAt } from 'react-icons/bi';
import { toast } from 'react-hot-toast';
import { signupUser } from '../services/authService';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import './AuthPages.css';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    display_name: '',
    username: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validate = () => {
    const errs = {};
    if (!formData.display_name.trim()) errs.display_name = 'Full name is required';
    if (!formData.username.trim()) errs.username = 'Username is required';
    else if (formData.username.length < 3) errs.username = 'At least 3 characters';
    if (!formData.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Invalid email';
    if (!formData.password) errs.password = 'Password is required';
    else if (formData.password.length < 6) errs.password = 'At least 6 characters';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await signupUser(formData);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to create account';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page animate-fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">💸 Divvy</div>
          <h1 className="auth-title">Create an account</h1>
          <p className="auth-subtitle">Start tracking and splitting expenses effortlessly</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <Input
            label="Full Name"
            name="display_name"
            placeholder="Kabir Ramteke"
            icon={BiUser}
            value={formData.display_name}
            onChange={handleChange}
            error={errors.display_name}
            required
          />

          <Input
            label="Username"
            name="username"
            placeholder="kabir_r"
            icon={BiAt}
            value={formData.username}
            onChange={handleChange}
            error={errors.username}
            required
          />

          <Input
            label="Email Address"
            name="email"
            type="email"
            placeholder="kabir@example.com"
            icon={BiEnvelope}
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            required
          />

          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="At least 6 characters"
            icon={BiLockAlt}
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            required
          />

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            Create Account
          </Button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
