import React, { useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../utils/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');
    try {
      await axios.post(apiUrl('/api/auth/forgot-password'), { email });
      setMsg('If an account exists for that email, a reset link has been sent.');
    } catch (err) {
      setMsg('Failed to request password reset. Try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Forgot Password</h2>
      {msg && <div className="message-alert">{msg}</div>}
      <form onSubmit={handleSubmit} className="auth-form">
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="form-input"
        />
        <button type="submit" disabled={submitting} className="login-btn">
          {submitting ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
    </div>
  );
};

export default ForgotPassword;