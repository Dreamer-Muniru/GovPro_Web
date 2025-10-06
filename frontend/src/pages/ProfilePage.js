import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../utils/api';
import '../css/profile.css';
import ghanaRegions from '../data/ghanaRegions';

const ProfilePage = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({ projectsCreated: 0, forumsStarted: 0, commentsMade: 0, reactionsGiven: 0 });

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    username: user?.username || '',
    region: user?.region || '',
    district: user?.district || '',
    password: ''
  });

  const handleLogout = () => {
    logout();
    setTimeout(() => navigate('/'), 0);
  };

  const handleEditToggle = () => {
    setEditing(prev => !prev);
    setMessage('');
  };

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?._id) return;
      try {
        const res = await axios.get(apiUrl(`/api/user-stats/${user._id}`));
        const data = res?.data || {};
        setStats({
          projectsCreated: Number(data.projectsCreated) || 0,
          forumsStarted: Number(data.forumsStarted) || 0,
          commentsMade: Number(data.commentsMade) || 0,
          reactionsGiven: Number(data.reactionsGiven) || 0,
        });
      } catch (err) {
        console.error('Failed to fetch user stats:', err?.message || err);
      }
    };
    fetchStats();
  }, [user?._id]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const payload = { ...formData };
      if (!payload.password) delete payload.password;

      await axios.put(`https://govpro-web-backend-gely.onrender.com/api/auth/${user._id}`, payload);
      
      setMessage('Profile updated successfully! Please log out and log back in to see changes reflected across the platform.');
      setEditing(false);
      
    } catch (err) {
      setMessage('Profile update failed. Please try again.');
      console.error('Profile update failed:', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar">
          <div className="avatar-circle">
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
        <h1 className="profile-title">User Profile</h1>
        <p className="profile-subtitle">Manage your account information</p>
      </div>

      {message && (
        <div className={`message-alert ${message.includes('failed') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {/* Stats Section */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-number">{stats.projectsCreated}</span>
          <span className="stat-label">Projects Created</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.forumsStarted}</span>
          <span className="stat-label">Forums Started</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.commentsMade}</span>
          <span className="stat-label">Comments Made</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.reactionsGiven}</span>
          <span className="stat-label">Reactions Given</span>
        </div>
      </div>

      <div className="profile-card">
        {!editing ? (
          <div className="profile-view">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Full Name</span>
                <span className="info-value">{formData.fullName || 'Not set'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Phone</span>
                <span className="info-value">{formData.phone || 'Not set'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Username</span>
                <span className="info-value">@{formData.username}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Region</span>
                <span className="info-value">{formData.region || 'Not set'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">District</span>
                <span className="info-value">{formData.district || 'Not set'}</span>
              </div>
            </div>
            
            <div className="action-buttons">
              <button 
                className="btn-primary" 
                onClick={handleEditToggle}
              >
                <i className="fas fa-edit"></i> Edit Profile
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-edit">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  className="form-input"
                  name="fullName" 
                  value={formData.fullName} 
                  onChange={handleChange} 
                  placeholder="Enter your full name" 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input 
                  className="form-input"
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange} 
                  placeholder="+233 XX XXX XXXX" 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Username</label>
                <input 
                  className="form-input"
                  name="username" 
                  value={formData.username} 
                  onChange={handleChange} 
                  placeholder="Choose a username" 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Region</label>
                <select
                  className="form-select"
                  value={formData.region}
                  onChange={(e) => {
                    setFormData({ ...formData, region: e.target.value, district: '' });
                  }}
                >
                  <option value="">Select Region</option>
                  {ghanaRegions.map((regionObj) => (
                    <option key={regionObj.name} value={regionObj.name}>
                      {regionObj.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">District</label>
                <select
                  className="form-select"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  disabled={!formData.region}
                >
                  <option value="">Select District</option>
                  {(ghanaRegions.find(r => r.name === formData.region)?.districts || []).map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group full-width">
                <label className="form-label">New Password (optional)</label>
                <input 
                  className="form-input"
                  name="password" 
                  type="password" 
                  value={formData.password} 
                  onChange={handleChange} 
                  placeholder="Enter new password" 
                />
                <small className="form-hint">Leave blank to keep current password</small>
              </div>
            </div>
            
            <div className="edit-actions">
              <button 
                className="btn-secondary" 
                onClick={handleEditToggle}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="profile-footer">
        <button 
          className="btn-logout" 
          onClick={handleLogout}
        >
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;