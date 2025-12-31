import React, { useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../utils/api';

const ResetPassword = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');
    try {
      await axios.post(apiUrl('/api/auth/reset-password'), { token, password });
      setMsg('Password reset successful. You can now log in.');
    } catch (err) {
      setMsg(err?.response?.data?.error || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Reset Password</h2>
      {msg && <div className="message-alert">{msg}</div>}
      <form onSubmit={handleSubmit} className="auth-form">
        <label>New Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="form-input"
        />
        <button type="submit" disabled={submitting} className="login-btn">
          {submitting ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;