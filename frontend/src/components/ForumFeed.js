import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { apiUrl } from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../css/ForumFeed.css';

const ForumFeed = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: null
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchForums = async () => {
      try {
        const res = await axios.get(apiUrl(`/api/forums?region=${encodeURIComponent(user.region)}&district=${encodeURIComponent(user.district)}`));
        const data = res.data;
        const list = Array.isArray(data) ? data : (Array.isArray(data?.forums) ? data.forums : []);
        setForums(list);
      } catch (err) {
        console.error('Failed to fetch forums:', err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user?.region && user?.district) {
      fetchForums();
    }
  }, [user?.region, user?.district]);

  const handleCardClick = (forumId) => {
    navigate(`/forums/${forumId}`);
  };

  const handleCreateClick = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ title: '', description: '', image: null });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    setFormData(prev => ({ ...prev, image: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitting(true);

  try {
    const submitData = new FormData();
    submitData.append('title', formData.title);
    submitData.append('description', formData.description);
    submitData.append('region', user.region);
    submitData.append('district', user.district);
    submitData.append('createdBy', user?._id || user?.id); // ✅ Include creator (supports both _id and id)
    if (formData.image) {
      submitData.append('image', formData.image);
    }

    const res = await axios.post(apiUrl('/api/forums'), submitData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    const created = res.data && typeof res.data === 'object' ? res.data : null;
    setForums(prev => created ? [created, ...(Array.isArray(prev) ? prev : [])] : (Array.isArray(prev) ? prev : []));
    handleCloseModal();
  } catch (err) {
    const msg = err?.response?.data?.error || err.message || 'Failed to create forum';
    console.error('Failed to create forum:', msg);
    alert(msg);
  } finally {
    setSubmitting(false);
  }
};


  if (loading) {
    return (
      <div className="forum-feed">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading forums...</p>
        </div>
      </div>
    );
  }

  const forumList = Array.isArray(forums) ? forums : [];

  return (
    <div className="forum-feed">
      {/* Header with Create Button */}
      <div className="forum-header">
        <div className="header-content">
        <button className="back-button" onClick={() => navigate('/')}>← Back to Homepage</button>
          <h1 className="forum-title">Community Forums</h1>
          <p className="forum-subtitle">Discuss local projects and community matters</p>
        </div>
        <button className="create-forum-btn" onClick={handleCreateClick}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create Forum
        </button>
      </div>

      {/* Forums Grid */}
      {forumList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <h3 className="empty-title">No Forums Yet</h3>
          <p className="empty-description">
            Be the first to start a discussion in your community
          </p>
          <button className="create-forum-btn" onClick={handleCreateClick}>
            Create First Forum
          </button>
        </div>
      ) : (
        <div className="forum-grid">
          {forumList.map((forum) => (
            <div 
              key={forum._id} 
              className="forum-card"
              onClick={() => handleCardClick(forum._id)}
            >
              {forum.imageUrl && (
                <img
                  src={apiUrl(forum.imageUrl)}
                  alt={forum.title}
                  className="forum-image"
                />
              )}
              <div className="forum-content">
                <h3>{forum.title}</h3>
                <p className="forum-description">{forum.description}</p>
                <p className="forum-creator">
                  Created by: {forum.createdBy?.username || 'Unknown'}
                </p>

                <div className="forum-meta">
                  <span className="forum-date">
                    Posted on {new Date(forum.createdAt).toLocaleString()}
                  </span>
                  <span className="forum-badge">
                    {forum.district}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Forum Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Create New Forum</h2>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="forum-form">
              <div className="form-group">
                <label htmlFor="title" className="form-label">Forum Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter forum title"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description" className="form-label">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="form-textarea"
                  placeholder="Describe what this forum is about"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="image" className="form-label">Forum Image (Optional)</label>
                <input
                  type="file"
                  id="image"
                  name="image"
                  onChange={handleImageChange}
                  className="form-input"
                  accept="image/*"
                />
              </div>

              <button 
                type="submit" 
                className="submit-btn"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Forum'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForumFeed;