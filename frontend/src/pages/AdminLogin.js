import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { AuthContext } from '../context/AuthContext';
import '../css/AdminLogin.css'; 

const AdminLogin = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.isAdmin) {
      navigate('/admin');
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await axios.post('https://govpro-web-backend.onrender.com/api/admin-auth/login', form);
      const decoded = jwtDecode(res.data.token);
      login(decoded, res.data.token);
      navigate('/admin');
    } catch (err) {
      setError('Login failed. Invalid credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-login-container">
      <form className="admin-login-form" onSubmit={handleSubmit}>
        <h2>Admin Login</h2>
        {error && <div className="error-message">{error}</div>}
        
        <div className="input-group">
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="Username"
            required
          />
        </div>
        
        <div className="input-group">
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Password"
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="login-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default AdminLogin;