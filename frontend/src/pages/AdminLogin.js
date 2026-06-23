import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../css/AdminLogin.css';
import { apiUrl } from '../utils/api';

const AdminLogin = () => {
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form, setForm]           = useState({ username: '', password: '' });
  const [error, setError]         = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Already logged in as admin → go to portal
    if (user?.isAdmin) navigate('/ministry-portal');
  }, [user, navigate]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const res = await axios.post(apiUrl('/api/admin-auth/login'), form, { withCredentials: true });
      login(res.data.token);
      navigate('/ministry-portal');
    } catch {
      setError('Login failed. Invalid credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-login-container">
      <form className="admin-login-form" onSubmit={handleSubmit}>
        <h2>Ministry Portal</h2>
        <p style={{fontSize:12,color:'#94a3b8',textAlign:'center',marginBottom:24,marginTop:-8}}>
          Restricted access — authorised personnel only
        </p>
        {error && <div className="error-message">{error}</div>}
        <div className="input-group">
          <input name="username" value={form.username} onChange={handleChange} placeholder="Username" required />
        </div>
        <div className="input-group">
          <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Password" required />
        </div>
        <button type="submit" className="login-button" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;