import React, { useEffect, useState, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../css/ForumFeed.css';
import { apiUrl } from '../utils/api';

const ForumFeed = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({title: '', description: '', image: null});
  const [submitting, setSubmitting] = useState(false);

  // Caching references
  const hasFetchedRef = useRef(false);
  const cacheTimeRef = useRef(null);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  useEffect(() => {
    const fetchForums = async () => {
      // Check if we have cached data and it's still valid
      const now = Date.now();
      const cacheValid = cacheTimeRef.current && (now - cacheTimeRef.current < CACHE_DURATION);

      // If we have cached data and cache is valid, don't fetch
      if (hasFetchedRef.current && cacheValid && forums.length > 0) {
        console.log('✅ Using cached forums data');
        setLoading(false);
        return;
      }

      // Otherwise, fetch fresh data
      console.log('🔄 Fetching fresh forums data...');
      setLoading(true);
      try {
        const region = encodeURIComponent(user.region);
        const district = encodeURIComponent(user.district);
        const res = await axios.get(apiUrl(`/api/forums?region=${region}&district=${district}`));
        const data = res?.data;
        const list = Array.isArray(data) ? data : (Array.isArray(data?.forums) ? data.forums : []);
        setForums(list);
        
        // Update cache timestamp
        hasFetchedRef.current = true;
        cacheTimeRef.current = Date.now();
        console.log('✅ Forums data cached at:', new Date().toLocaleTimeString());
      } catch (err) {
        console.error('Failed to fetch forums:', err?.message || err);
        setForums([]);
      } finally {
        setLoading(false);
      }
    };

    if (user?.region && user?.district) {
      fetchForums();
    } else {
      setLoading(false);
    }
  }, [user?.region, user?.district, forums.length]);

  // Function to force refresh (useful after creating new forum)
  const refreshForums = async () => {
    console.log('🔄 Manual refresh triggered...');
    setLoading(true);
    try {
      const region = encodeURIComponent(user.region);
      const district = encodeURIComponent(user.district);
      const res = await axios.get(apiUrl(`/api/forums?region=${region}&district=${district}`));
      const data = res?.data;
      const list = Array.isArray(data) ? data : (Array.isArray(data?.forums) ? data.forums : []);
      setForums(list);
      
      // Update cache timestamp
      cacheTimeRef.current = Date.now();
      console.log('✅ Forums refreshed and cached at:', new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to refresh forums:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    setFormData((prev) => ({ ...prev, image: e.target.files[0] }));
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
      submitData.append('createdBy', user?._id || user?.id);
      if (formData.image) submitData.append('image', formData.image);

      const res = await axios.post(apiUrl('/api/forums'), submitData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const created = res?.data && typeof res.data === 'object' ? res.data : null;
      
      // Add new forum to the top of the list
      if (created) {
        setForums((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
        // Update cache timestamp since we have fresh data
        cacheTimeRef.current = Date.now();
      }
      
      handleCloseModal();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to create forum';
      console.error('Failed to create forum:', msg);
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && forums.length === 0) {
    // Only show loading spinner if we have no cached data
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

  // Calculate cache age for display
  const getCacheAge = () => {
    if (!cacheTimeRef.current) return null;
    const ageMs = Date.now() - cacheTimeRef.current;
    const ageMinutes = Math.floor(ageMs / 60000);
    const ageSeconds = Math.floor((ageMs % 60000) / 1000);
    if (ageMinutes > 0) return `${ageMinutes}m ago`;
    return `${ageSeconds}s ago`;
  };

  const isCached = hasFetchedRef.current && cacheTimeRef.current;

  return (
    <div className="forum-feed">
      {/* Header with Create Button */}
      <div className="forum-header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate('/')}>← Back to Homepage</button>
          <h1 className="forum-title">Community Forums</h1>
          <p className="forum-subtitle">
            Discuss local projects and community matters
            {/* {isCached && (
              <span className="cache-indicator" title="Using cached data for faster loading">
                ⚡ Cached {getCacheAge()}
              </span>
            )} */}
          </p>
        </div>
        <div className="header-actions">
          {/* <button className="refresh-btn" onClick={refreshForums} title="Refresh forums">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button> */}
          <button className="create-forum-btn" onClick={handleCreateClick}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Forum
          </button>
        </div>
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
                  <span className="forum-badge">{forum.district}</span>
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