import React, { useEffect, useState, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../css/ForumFeed.css';
import { apiUrl } from '../utils/api';

// ── constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Infrastructure', 'Budget & Finance', 'Personnel', 'Security',
  'Health Services', 'Education', 'Water & Sanitation',
  'Roads & Transport', 'Agriculture', 'Environment', 'Other',
];

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

const PRIORITY_CLASS = {
  Urgent: 'urgent', High: 'high', Medium: 'medium', Low: 'low',
};

const STATUS_CLASS = {
  'Open':         'open',
  'Under Review': 'review',
  'Replied':      'replied',
  'Resolved':     'resolved',
};

const TAB_FILTERS = ['All', 'My Issues', 'Open', 'Replied', 'Resolved'];

// ── helpers ───────────────────────────────────────────────────────────────────

const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
};

// derive status from forum fields
// priority/category stored in description prefix or as separate fields
// Since the backend Forum model only has title/description/region/district,
// we encode category and priority into the description as a JSON prefix.
// Format: {"cat":"Infrastructure","pri":"High"}||actual description
const parseForumMeta = (forum) => {
  if (!forum.description) return { category: 'Other', priority: 'Medium', description: '' };
  try {
    const sepIdx = forum.description.indexOf('||');
    if (sepIdx === -1) return { category: 'Other', priority: 'Medium', description: forum.description };
    const meta = JSON.parse(forum.description.slice(0, sepIdx));
    return {
      category:    meta.cat || 'Other',
      priority:    meta.pri || 'Medium',
      description: forum.description.slice(sepIdx + 2),
    };
  } catch {
    return { category: 'Other', priority: 'Medium', description: forum.description };
  }
};

// Status is determined by whether admin has replied (comment from admin)
const deriveStatus = (forum) => {
  // Check for stored status field or infer from admin replies in comments
  if (forum.status) return forum.status;
  const hasAdminReply = forum.comments?.some(c => c.isAdmin || c.fromMinistry);
  if (hasAdminReply) return 'Replied';
  return 'Open';
};

// Encode category + priority into description prefix
const encodeDescription = (category, priority, description) =>
  `${JSON.stringify({ cat: category, pri: priority })}||${description}`;

// ── component ─────────────────────────────────────────────────────────────────

const ForumFeed = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [issues,      setIssues]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal,   setShowModal]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);

  const [form, setForm] = useState({
    title:       '',
    category:    '',
    priority:    'Medium',
    description: '',
    image:       null,
    imageName:   '',
  });

  // ── fetch issues ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchIssues = async () => {
      setLoading(true);
      try {
        // Fetch all forums — the board shows district-level issues
        const res  = await axios.get(apiUrl('/api/forums'));
        const list = Array.isArray(res.data) ? res.data : [];
        setIssues(list);
      } catch (err) {
        console.error('Failed to fetch issues:', err.message);
        setIssues([]);
      } finally {
        setLoading(false);
      }
    };
    fetchIssues();
  }, []);

  // ── derived stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const myIssues = issues.filter(f => f.createdBy?._id === user?._id || f.createdBy === user?._id);
    return {
      total:    issues.length,
      open:     issues.filter(f => deriveStatus(f) === 'Open').length,
      replied:  issues.filter(f => deriveStatus(f) === 'Replied').length,
      resolved: issues.filter(f => deriveStatus(f) === 'Resolved').length,
      mine:     myIssues.length,
    };
  }, [issues, user?._id]);

  // ── filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...issues];
    const userId = user?._id;

    if (activeTab === 'My Issues') {
      list = list.filter(f =>
        f.createdBy?._id === userId || f.createdBy === userId
      );
    } else if (activeTab === 'Open') {
      list = list.filter(f => deriveStatus(f) === 'Open');
    } else if (activeTab === 'Replied') {
      list = list.filter(f => deriveStatus(f) === 'Replied');
    } else if (activeTab === 'Resolved') {
      list = list.filter(f => deriveStatus(f) === 'Resolved');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f =>
        f.title?.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q) ||
        f.district?.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [issues, activeTab, searchQuery, user?._id]);

  // ── form handlers ──────────────────────────────────────────────────────────
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm(prev => ({ ...prev, image: file, imageName: file.name }));
  };

  const resetForm = () => setForm({
    title:'', category:'', priority:'Medium', description:'', image:null, imageName:'',
  });

  const handleCloseModal = () => { setShowModal(false); resetForm(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.category) return;
    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('title',       form.title.trim());
      fd.append('description', encodeDescription(form.category, form.priority, form.description.trim()));
      fd.append('region',      user?.region   || '');
      fd.append('district',    user?.district || '');
      fd.append('createdBy',   user?._id      || '');
      if (form.image) fd.append('image', form.image);

      const res     = await axios.post(apiUrl('/api/forums'), fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const created = res?.data;
      if (created && typeof created === 'object') {
        setIssues(prev => [created, ...prev]);
      }
      handleCloseModal();
    } catch (err) {
      console.error('Failed to submit issue:', err.message);
      alert(err?.response?.data?.error || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── tab counts ─────────────────────────────────────────────────────────────
  const tabCount = (tab) => {
    if (tab === 'All')       return stats.total;
    if (tab === 'My Issues') return stats.mine;
    if (tab === 'Open')      return stats.open;
    if (tab === 'Replied')   return stats.replied;
    if (tab === 'Resolved')  return stats.resolved;
    return 0;
  };

  // ── login gate ─────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="ff-gate">
        <div className="ff-gate-card">
          <div className="ff-gate-flag">
            <div className="ff-gate-flag-r" /><div className="ff-gate-flag-g" /><div className="ff-gate-flag-gr" />
          </div>
          <span className="ff-gate-icon">🏛️</span>
          <h2 className="ff-gate-title">District Issues Forum</h2>
          <p className="ff-gate-sub">
            This platform is reserved for District and Municipal Chief Executives
            to submit official issues and concerns to the Ministry of Local Government.
            Please sign in to continue.
          </p>
          <button className="ff-gate-btn" onClick={() => navigate('/login')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            Sign In to Access
          </button>
        </div>
      </div>
    );
  }

  // ── main render ────────────────────────────────────────────────────────────
  return (
    <div className="ff-root">

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <div className="ff-hero">
        <div className="ff-flag-stripe">
          <div className="ff-flag-r" /><div className="ff-flag-g" /><div className="ff-flag-gr" />
        </div>
        <div className="ff-hero-inner">
          <div className="ff-hero-top">
            <div className="ff-hero-left">
              <div className="ff-hero-eyebrow">
                🏛️ &nbsp;Ministry of Local Government
              </div>
              <h1 className="ff-hero-title">District Issues Forum</h1>
              <p className="ff-hero-sub">
                A secure channel for District and Municipal Chief Executives to
                submit concerns, requests, and issues directly to the Ministry.
              </p>
            </div>

            {/* Logged-in user identity */}
            <div className="ff-user-badge">
              <div className="ff-user-avatar">{getInitials(user.fullName || user.username)}</div>
              <div className="ff-user-info">
                <div className="ff-user-name">{user.fullName || user.username}</div>
                <div className="ff-user-district">{user.district}, {user.region}</div>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div className="ff-stats-strip">
            <div className="ff-stat">
              <div className="ff-stat-value">{stats.total}</div>
              <div className="ff-stat-label">Total Issues</div>
            </div>
            <div className="ff-stat">
              <div className="ff-stat-value orange">{stats.open}</div>
              <div className="ff-stat-label">Open</div>
            </div>
            <div className="ff-stat">
              <div className="ff-stat-value green">{stats.replied}</div>
              <div className="ff-stat-label">Replied</div>
            </div>
            <div className="ff-stat">
              <div className="ff-stat-value blue">{stats.resolved}</div>
              <div className="ff-stat-label">Resolved</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="ff-toolbar">
        <div className="ff-toolbar-inner">
          {/* Tabs */}
          <div className="ff-tabs" role="tablist">
            {TAB_FILTERS.map(tab => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                className={`ff-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                <span className="ff-tab-count">{tabCount(tab)}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="ff-search-wrap">
            <svg className="ff-search-icon" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="search"
              className="ff-search"
              placeholder="Search issues…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Search issues"
            />
          </div>

          {/* Compose */}
          <button className="ff-compose-btn" onClick={() => setShowModal(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Submit Issue
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="ff-body">
        {loading ? (
          <div className="ff-loading">
            <div className="ff-spinner" />
            <p>Loading issues…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="ff-empty">
            <span className="ff-empty-icon">
              {activeTab === 'My Issues' ? '📋' : '🔍'}
            </span>
            <h3>
              {activeTab === 'My Issues' ? 'No issues submitted yet' : 'No issues found'}
            </h3>
            <p>
              {activeTab === 'My Issues'
                ? 'Submit your first issue to the Ministry using the button above.'
                : 'Try a different filter or search term.'}
            </p>
            {activeTab === 'My Issues' && (
              <button className="ff-empty-btn" onClick={() => setShowModal(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Submit First Issue
              </button>
            )}
          </div>
        ) : (
          <div className="ff-grid">
            {filtered.map(forum => {
              const { category, priority, description } = parseForumMeta(forum);
              const status  = deriveStatus(forum);
              const priCls  = PRIORITY_CLASS[priority]  || 'low';
              const stsCls  = STATUS_CLASS[status]      || 'open';
              const isReplied = status === 'Replied' || status === 'Resolved';

              return (
                <div
                  key={forum._id}
                  className="ff-card"
                  onClick={() => navigate(`/forums/${forum._id}`)}
                  role="article"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && navigate(`/forums/${forum._id}`)}
                  aria-label={`Issue: ${forum.title}`}
                >
                  <div className={`ff-card-priority-bar ${priCls}`} />
                  <div className="ff-card-inner">
                    {/* Badges */}
                    <div className="ff-card-badges">
                      <span className={`ff-badge ff-badge-${priCls}`}>
                        {priority === 'Urgent' && '🚨 '}
                        {priority === 'High'   && '🔴 '}
                        {priority}
                      </span>
                      <span className={`ff-badge ff-badge-${stsCls}`}>
                        {status === 'Open'         && '⏳ '}
                        {status === 'Under Review' && '👀 '}
                        {status === 'Replied'      && '✅ '}
                        {status === 'Resolved'     && '✔️ '}
                        {status}
                      </span>
                      <span className="ff-category-chip">{category}</span>
                    </div>

                    {/* Title */}
                    <h3 className="ff-card-title">{forum.title}</h3>

                    {/* Excerpt */}
                    <p className="ff-card-excerpt">{description || 'No description provided.'}</p>

                    {/* Ministry replied indicator */}
                    {isReplied && (
                      <div className="ff-card-replied-indicator" style={{marginBottom:'0.75rem'}}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Ministry has responded
                      </div>
                    )}

                    {/* Footer */}
                    <div className="ff-card-footer">
                      <div className="ff-card-from">
                        <div className="ff-card-from-avatar">
                          {getInitials(forum.createdBy?.fullName || forum.createdBy?.username || '')}
                        </div>
                        <span>{forum.createdBy?.username || 'Unknown'} · {forum.district}</span>
                      </div>
                      <div className="ff-card-meta">
                        <span className="ff-card-meta-item">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {timeAgo(forum.createdAt)}
                        </span>
                        {forum.comments?.length > 0 && (
                          <span className="ff-card-meta-item">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                            </svg>
                            {forum.comments.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Compose modal ────────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="ff-modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) handleCloseModal(); }}
          role="dialog"
          aria-modal="true"
          aria-label="Submit a new issue"
        >
          <div className="ff-modal">
            <div className="ff-modal-flag">
              <div className="ff-flag-r" /><div className="ff-flag-g" /><div className="ff-flag-gr" />
            </div>

            <div className="ff-modal-header">
              <div className="ff-modal-header-left">
                <div className="ff-modal-title">Submit an Issue</div>
                <div className="ff-modal-subtitle">Your submission will be reviewed by the Ministry</div>
              </div>
              <button className="ff-modal-close" onClick={handleCloseModal} aria-label="Close">×</button>
            </div>

            {/* To: Ministry */}
            <div className="ff-modal-to">
              <div className="ff-modal-to-icon">🏛️</div>
              <div className="ff-modal-to-text">
                <div className="ff-modal-to-label">To</div>
                <div className="ff-modal-to-value">Ministry of Local Government &amp; Rural Development</div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="ff-modal-body">
              {/* From (read-only) */}
              <div className="ff-form-row">
                <div className="ff-form-group">
                  <label className="ff-label">From — District</label>
                  <input className="ff-input" value={user?.district || ''} readOnly />
                </div>
                <div className="ff-form-group">
                  <label className="ff-label">Region</label>
                  <input className="ff-input" value={user?.region || ''} readOnly />
                </div>
              </div>

              {/* Category + Priority */}
              <div className="ff-form-row">
                <div className="ff-form-group">
                  <label className="ff-label" htmlFor="ff-category">
                    Category <span>*</span>
                  </label>
                  <select
                    id="ff-category" name="category"
                    className="ff-select"
                    value={form.category}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Select category…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="ff-form-group">
                  <label className="ff-label" htmlFor="ff-priority">Priority</label>
                  <select
                    id="ff-priority" name="priority"
                    className="ff-select"
                    value={form.priority}
                    onChange={handleFormChange}
                  >
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Subject */}
              <div className="ff-form-group">
                <label className="ff-label" htmlFor="ff-title">
                  Subject / Title <span>*</span>
                </label>
                <input
                  id="ff-title" name="title"
                  className="ff-input"
                  placeholder="Brief summary of the issue…"
                  value={form.title}
                  onChange={handleFormChange}
                  required
                  maxLength={120}
                />
              </div>

              {/* Description */}
              <div className="ff-form-group">
                <label className="ff-label" htmlFor="ff-desc">
                  Detailed Description <span>*</span>
                </label>
                <textarea
                  id="ff-desc" name="description"
                  className="ff-textarea"
                  placeholder="Describe the issue in detail. Include any relevant context, affected communities, urgency reasons, and what action you are requesting from the Ministry…"
                  value={form.description}
                  onChange={handleFormChange}
                  required
                  minLength={30}
                />
              </div>

              {/* Attachment */}
              <div className="ff-form-group">
                <label className="ff-label">Supporting Image (optional)</label>
                <label className="ff-attach-label" htmlFor="ff-image">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                  </svg>
                  {form.imageName ? 'Change attachment' : 'Attach image or document'}
                  <input
                    id="ff-image" type="file"
                    className="ff-attach-input"
                    accept="image/*,.pdf"
                    onChange={handleImageChange}
                  />
                </label>
                {form.imageName && (
                  <div className="ff-attach-preview">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {form.imageName}
                  </div>
                )}
              </div>

              {/* Submit row */}
              <div className="ff-submit-row">
                <button type="button" className="ff-cancel-btn" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="ff-submit-btn" disabled={submitting}>
                  {submitting ? (
                    <>
                      <div className="ff-spinner" style={{width:14,height:14,borderWidth:2}} />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"/>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                      Submit to Ministry
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForumFeed;