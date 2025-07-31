import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import '../css/RegisterPage.css';

const RegisterPage = () => {
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');

  // Basic client-side password match check
  if (form.password !== form.confirmPassword) {
    setError('Passwords do not match');
    return;
  }

  setLoading(true);
  try {
    const res = await axios.post('http://localhost:5000/api/auth/register', form);
    const token = res.data.token;
    const decoded = jwtDecode(token);
    login(decoded, token);
    navigate('/add-project');
  } catch (err) {
    const backendMsg = err.response?.data?.error || 'Registration failed. Please try again.';
    setError(backendMsg);
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="register-container">
      <div className="register-header">
        
        <h1 className="register-title">Create Account</h1>
        <p className="register-subtitle">Join Ghana Project Tracker</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="register-form">
        <div className="form-group">
          <label htmlFor="fullName" className="form-label">Full Name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="Enter your full name"
            value={form.fullName}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="phone" className="form-label">Phone Number</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="233XXXXXXXXX"
            value={form.phone}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="username" className="form-label">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Type a username"
            value={form.username}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>
        {/* Password section */}
        <div className="form-group">
          <label htmlFor="password" className="form-label">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Create a password"
            value={form.password}
            onChange={handleChange}
            className="form-input"
            required
            minLength="6"
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Re-enter password"
            value={form.confirmPassword}
            onChange={handleChange}
            className="form-input"
            required
            minLength="6"
          />
        </div>


        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Account...
            </>
          ) : 'Register Now'}
        </button>
      </form>

      <div className="login-link">
        Already have an account? <Link to="/login">Login here</Link>
      </div>
    </div>
  );
};

export default RegisterPage;