import React, { useEffect, useState, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../css/ForumFeed.css';
import { apiUrl } from '../utils/api';

const CACHE_DURATION = 5 * 60 * 1000;

const getCachedMessages = (key) => {
  try {
    const cached = JSON.parse(localStorage.getItem(key));
    if (!cached) return null;
    if (Date.now() - cached.time > CACHE_DURATION) {
      localStorage.removeItem(key);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
};

const setCachedMessages = (key, data) => {
  localStorage.setItem(
    key,
    JSON.stringify({ data, time: Date.now() })
  );
};

const ForumFeed = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: null,
    recipientType: 'all', // 'all' or 'specific'
    recipientDistrict: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [userRole, setUserRole] = useState('');

  // Determine user role
  useEffect(() => {
    if (user) {
      // Check if user is ministry admin
      if (user.role === 'admin' || user.role === 'ministry' || user.isMinistry) {
        setUserRole('ministry');
      } else {
        setUserRole('mmdce');
      }
    }
  }, [user]);

  useEffect(() => {
    const region = user?.region;
    const district = user?.district;
    const role = userRole;

    const cacheKey = `messages-${role}-${region}-${district}`;
    const cachedData = getCachedMessages(cacheKey);

    if (cachedData) {
      console.log('🟢 Loaded messages from localStorage');
      setMessages(cachedData);
      setLoading(false);
      return;
    }

    const fetchMessages = async () => {
      try {
        console.log('🔵 Fetching messages from API');
        setLoading(true);

        let url;
        if (role === 'ministry') {
          // Ministry sees all messages
          url = apiUrl('/api/forums?type=ministry');
        } else {
          // MMDCE sees messages for their district
          url = apiUrl(`/api/forums?type=mmdce&district=${encodeURIComponent(district)}`);
        }

        const res = await axios.get(url);
        const list = res?.data?.forums || res?.data || [];
        setMessages(list);
        setCachedMessages(cacheKey, list);
      } catch (e) {
        console.error('Error fetching messages:', e);
      } finally {
        setLoading(false);
      }
    };

    if (userRole) {
      fetchMessages();
    }
  }, [user?.region, user?.district, userRole]);

  const refreshMessages = async () => {
    setLoading(true);
    try {
      const region = user?.region;
      const district = user?.district;
      const role = userRole;

      let url;
      if (role === 'ministry') {
        url = apiUrl('/api/forums?type=ministry');
      } else {
        url = apiUrl(`/api/forums?type=mmdce&district=${encodeURIComponent(district)}`);
      }

      const res = await axios.get(url);
      const data = res?.data;
      const list = Array.isArray(data) ? data : (Array.isArray(data?.forums) ? data.forums : []);
      setMessages(list);
    } catch (err) {
      console.error('Failed to refresh messages:', err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (messageId) => {
    navigate(`/forums/${messageId}`);
  };

  const handleCreateClick = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ title: '', description: '', image: null, recipientType: 'all', recipientDistrict: '' });
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
      submitData.append('type', 'ministry_message');
      submitData.append('senderRole', userRole);
      
      // For ministry messages, specify recipient type
      if (userRole === 'ministry') {
        submitData.append('recipientType', formData.recipientType);
        if (formData.recipientType === 'specific') {
          submitData.append('recipientDistrict', formData.recipientDistrict);
        }
      }

      if (formData.image) submitData.append('image', formData.image);

      const res = await axios.post(apiUrl('/api/forums'), submitData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const created = res?.data && typeof res.data === 'object' ? res.data : null;

      if (created) {
        setMessages((prev) => [created, ...(Array.isArray(prev) ? prev : [])]);
        // Clear cache for this user
        const cacheKey = `messages-${userRole}-${user?.region}-${user?.district}`;
        localStorage.removeItem(cacheKey);
      }

      handleCloseModal();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to send message';
      console.error('Failed to send message:', msg);
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getMessageIcon = (message) => {
    if (message.senderRole === 'ministry') {
      return '🏛️';
    } else if (message.senderRole === 'mmdce') {
      return '👤';
    }
    return '💬';
  };

  const getMessageType = (message) => {
    if (message.senderRole === 'ministry') {
      return 'Ministry';
    } else {
      return 'MMDCE';
    }
  };

  if (loading) {
    return (
      <div className="forum-feed">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading messages...</p>
        </div>
      </div>
    );
  }

  const messageList = Array.isArray(messages) ? messages : [];

  return (
    <div className="forum-feed">
      {/* Header */}
      <div className="forum-header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate('/')}>
            ← Back to Dashboard
          </button>
          <h1 className="forum-title">
            {userRole === 'ministry' ? '🏛️ Ministry Communications' : '📬 District Communications'}
          </h1>
          <p className="forum-subtitle">
            {userRole === 'ministry' 
              ? 'Communication Channel with Ministry of Local Government -'
              : 'Communication with the Ministry of Local Government'}
          </p>
        </div>
        <div className="header-actions">
          <button className="refresh-btn" onClick={refreshMessages} title="Refresh messages">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button className="create-forum-btn" onClick={handleCreateClick}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Message
          </button>
        </div>
      </div>

      {/* Messages Grid */}
      {messageList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📬</div>
          <h3 className="empty-title">No Messages</h3>
          <p className="empty-description">
            {userRole === 'ministry' 
              ? 'Start a conversation with your District Chiefs'
              : 'Your district has no messages from the Ministry yet'}
          </p>
          <button className="create-forum-btn" onClick={handleCreateClick}>
            {userRole === 'ministry' ? 'Send First Message' : 'Contact Ministry'}
          </button>
        </div>
      ) : (
        <div className="forum-grid">
          {messageList.map((message) => (
            <div
              key={message._id}
              className="forum-card"
              onClick={() => handleCardClick(message._id)}
            >
              {message.imageUrl && (
                <img
                  src={apiUrl(message.imageUrl)}
                  alt={message.title}
                  className="forum-image"
                />
              )}
              <div className="forum-content">
                <div className="message-badge">
                  <span className={`badge ${message.senderRole === 'ministry' ? 'badge-ministry' : 'badge-mmdce'}`}>
                    {getMessageIcon(message)} {getMessageType(message)}
                  </span>
                  {message.recipientDistrict && (
                    <span className="badge badge-district">
                      📍 {message.recipientDistrict}
                    </span>
                  )}
                  {!message.isRead && (
                    <span className="badge badge-unread">🔴 New</span>
                  )}
                </div>
                <h3>{message.title}</h3>
                <p className="forum-description">{message.description}</p>
                <p className="forum-creator">
                  From: {message.createdBy?.username || 'Unknown'}
                </p>
                <div className="forum-meta">
                  <span className="forum-date">
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                  <span className="forum-badge">
                    {message.district || 'All Districts'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Message Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {userRole === 'ministry' ? '🏛️ Send Message to District' : '📤 Contact Ministry'}
              </h2>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="forum-form">
              {userRole === 'ministry' && (
                <div className="form-group">
                  <label className="form-label">Recipient</label>
                  <select
                    name="recipientType"
                    value={formData.recipientType}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                  >
                    <option value="all">All Districts</option>
                    <option value="specific">Specific District</option>
                  </select>
                </div>
              )}

              {userRole === 'ministry' && formData.recipientType === 'specific' && (
                <div className="form-group">
                  <label className="form-label">Select District</label>
                  <input
                    type="text"
                    name="recipientDistrict"
                    value={formData.recipientDistrict}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="Enter district name"
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Subject</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Enter message subject"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="form-textarea"
                  placeholder="Type your message here..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Attachment (Optional)</label>
                <input
                  type="file"
                  id="image"
                  name="image"
                  onChange={handleImageChange}
                  className="form-input"
                  accept="image/*,.pdf,.doc,.docx"
                />
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={submitting}
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForumFeed;