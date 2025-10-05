import React, { useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import ghanaRegions from '../data/ghanaRegions';
import '../css/RegisterPage.css';

const RegisterPage = () => {
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
    region: '',
    district: '',
  });

  const { login } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'region' && { district: '' }) // Reset constituency when region changes
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(apiUrl('/api/auth/register'), form);
      const token = res.data.token;
      login(token);
      navigate('/add-project');
    } catch (err) {
      const backendMsg = err.response?.data?.error || 'Registration failed. Please try again.';
      setError(backendMsg);
    } finally {
      setLoading(false);
    }
  };

  const availableDistricts = form.region
    ? ghanaRegions.find(r => r.name === form.region)?.districts || []
    : [];

  return (
    <div className="register-container">
      <div className="register-header">
        <h1 className="register-title">Create Account</h1>
        <p className="register-subtitle">Join Ghana Project Tracker</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="register-form">
        {/* Full Name */}
        <div className="form-group">
          <label htmlFor="fullName" className="form-label">Full Name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={form.fullName}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>

        {/* Phone */}
        <div className="form-group">
          <label htmlFor="phone" className="form-label">Phone Number</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>

        {/* Username */}
        <div className="form-group">
          <label htmlFor="username" className="form-label">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            value={form.username}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>

        {/* Password */}
        <div className="form-group">
          <label htmlFor="password" className="form-label">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            className="form-input"
            required
            minLength="6"
          />
        </div>

        {/* Confirm Password */}
        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
            className="form-input"
            required
            minLength="6"
          />
        </div>

        {/* Region */}
        <div className="form-group">
          <label htmlFor="region" className="form-label">Select Region</label>
          <select
            id="region"
            name="region"
            value={form.region}
            onChange={handleChange}
            className="form-input"
            required
          >
            <option value="">-- Choose Region --</option>
            {ghanaRegions.map((r) => (
              <option key={r.name} value={r.name}>{r.name}</option>
            ))}
          </select>
        </div>

        {/* Constituency */}
        <div className="form-group">
          <label htmlFor="district" className="form-label">Select Constituency</label>
          <select
            id="district"
            name="district"
            value={form.district}
            onChange={handleChange}
            className="form-input"
            required
            disabled={!form.region}
          >
            <option value="">-- Choose Constituency --</option>
            {availableDistricts.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Submit Button */}
        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Creating Account...' : 'Register Now'}
        </button>
      </form>

      <div className="login-link">
        Already have an account? <Link to="/login">Login here</Link>
      </div>
    </div>
  );
};

export default RegisterPage;
