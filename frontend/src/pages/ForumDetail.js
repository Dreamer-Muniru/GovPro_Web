import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../css/ForumDetail.css';
import { apiUrl } from '../utils/api';

// ── constants (mirror ForumFeed.js) ──────────────────────────────────────────

const PRIORITY_CLASS = {
  Urgent: 'urgent', High: 'high', Medium: 'medium', Low: 'low',
};

const STATUS_CLASS = {
  'Open': 'open', 'Under Review': 'review',
  'Replied': 'replied', 'Resolved': 'resolved',
};

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

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

// Parse encoded description (same logic as ForumFeed.js)
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

const deriveStatus = (forum) => {
  if (forum.status) return forum.status;
  const hasAdminReply = forum.comments?.some(c => c.isAdmin || c.fromMinistry);
  if (hasAdminReply) return 'Replied';
  return 'Open';
};

// ── component ─────────────────────────────────────────────────────────────────

const ForumDetail = () => {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { user }    = useContext(AuthContext);

  const [forum,       setForum]       = useState(null);
  const [comments,    setComments]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [commentText,       setCommentText]       = useState('');
  const [posting,           setPosting]           = useState(false);
  const [collapsedComments, setCollapsedComments] = useState({});   // id → true when collapsed

  const toggleComment = (id) =>
    setCollapsedComments(prev => ({ ...prev, [id]: !prev[id] }));

  // ── fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const [forumRes, commentsRes] = await Promise.all([
          axios.get(apiUrl(`/api/forums/${id}`)),
          axios.get(apiUrl(`/api/comments/${id}`)),
        ]);
        if (!cancelled) {
          setForum(forumRes.data);
          const loadedComments = Array.isArray(commentsRes.data) ? commentsRes.data : [];
          setComments(loadedComments);
          // Start every top-level comment collapsed
          const allCollapsed = {};
          loadedComments
            .filter(c => !c.fromMinistry && !c.isAdminReply)
            .forEach((c, i) => { allCollapsed[c._id || i] = true; });
          setCollapsedComments(allCollapsed);
        }
      } catch (err) {
        console.error('Failed to load issue:', err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [id]);

  // ── post comment ───────────────────────────────────────────────────────────
  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !user?._id) return;
    setPosting(true);

    try {
      const fd = new FormData();
      fd.append('forumId',   id);
      fd.append('content',   commentText.trim());
      fd.append('createdBy', user._id);

      await axios.post(apiUrl('/api/comments'), fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setCommentText('');
      // Refresh comments
      const res = await axios.get(apiUrl(`/api/comments/${id}`));
      const refreshed = Array.isArray(res.data) ? res.data : [];
      setComments(refreshed);
      // Keep existing collapsed states, collapse any new ones
      setCollapsedComments(prev => {
        const next = { ...prev };
        refreshed
          .filter(c => !c.fromMinistry && !c.isAdminReply)
          .forEach((c, i) => { if (next[c._id || i] === undefined) next[c._id || i] = true; });
        return next;
      });
    } catch (err) {
      console.error('Failed to post comment:', err.message);
      alert('Failed to post comment. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  // ── loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fd-root">
        <div className="fd-topbar">
          <div className="fd-flag"><div className="fd-flag-r"/><div className="fd-flag-g"/><div className="fd-flag-gr"/></div>
          <div className="fd-topbar-inner">
            <button className="fd-back-btn" onClick={() => navigate('/forum-feed')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back to Issues
            </button>
          </div>
        </div>
        <div className="fd-loading">
          <div className="fd-spinner" />
          <p>Loading issue…</p>
        </div>
      </div>
    );
  }

  if (!forum) {
    return (
      <div className="fd-root">
        <div className="fd-not-found">
          <span style={{fontSize:'3rem'}}>📭</span>
          <h3>Issue not found</h3>
          <p>This issue may have been removed or you don't have access.</p>
          <button className="ff-gate-btn" style={{marginTop:'0.5rem'}} onClick={() => navigate('/forum-feed')}>
            Back to Issues Board
          </button>
        </div>
      </div>
    );
  }

  // ── derive display values ──────────────────────────────────────────────────
  const { category, priority, description } = parseForumMeta(forum);
  const status   = deriveStatus(forum);
  const priCls   = PRIORITY_CLASS[priority] || 'low';
  const stsCls   = STATUS_CLASS[status]     || 'open';
  const stripeClass = `fd-stripe-${priCls}`;

  // Ministry replies = comments where isAdmin or fromMinistry flag is set
  // For now, surface ALL comments from users with isAdmin = true
  const ministryReplies = comments.filter(c => c.fromMinistry || c.isAdminReply);
  const userComments    = comments.filter(c => !c.fromMinistry && !c.isAdminReply);

  const authorName  = forum.createdBy?.fullName || forum.createdBy?.username || 'Unknown';
  const authorInit  = getInitials(authorName);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fd-root">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="fd-topbar">
        <div className="fd-flag">
          <div className="fd-flag-r"/><div className="fd-flag-g"/><div className="fd-flag-gr"/>
        </div>
        <div className="fd-topbar-inner">
          <button className="fd-back-btn" onClick={() => navigate('/forum-feed')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back to Issues
          </button>
          <div className="fd-breadcrumb">
            <span>Issues Forum</span>
            <span className="fd-breadcrumb-sep">›</span>
            <span className="fd-breadcrumb-current">{forum.district}</span>
            <span className="fd-breadcrumb-sep">›</span>
            <span className="fd-breadcrumb-current" style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {forum.title}
            </span>
          </div>
        </div>
      </div>

      <div className="fd-content">

        {/* ── Issue card ───────────────────────────────────────────────────── */}
        <div className="fd-issue-card">
          <div className={`fd-issue-priority-stripe ${stripeClass}`} />

          <div className="fd-issue-header">
            {/* Badges */}
            <div className="fd-badges">
              <span className={`fd-badge fd-badge-${priCls}`}>
                {priority === 'Urgent' && '🚨 '}
                {priority === 'High'   && '🔴 '}
                {priority}
              </span>
              <span className={`fd-badge fd-badge-${stsCls}`}>
                {status === 'Open'         && '⏳ '}
                {status === 'Under Review' && '👀 '}
                {status === 'Replied'      && '✅ '}
                {status === 'Resolved'     && '✔️ '}
                {status}
              </span>
              <span className="fd-badge fd-badge-cat">{category}</span>
            </div>

            {/* Title */}
            <h1 className="fd-issue-title">{forum.title}</h1>

            {/* Meta */}
            <div className="fd-issue-meta">
              <div className="fd-meta-item">
                <div className="fd-meta-avatar">{authorInit}</div>
                <span>{authorName}</span>
              </div>
              <div className="fd-meta-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                {forum.district}, {forum.region}
              </div>
              <div className="fd-meta-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {formatDate(forum.createdAt)}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="fd-issue-body">
            {forum.imageUrl && (
              <img
                src={apiUrl(forum.imageUrl)}
                alt="Issue attachment"
                className="fd-issue-image"
              />
            )}
            <p className="fd-issue-description">{description}</p>
          </div>
        </div>

        {/* ── Ministry Response ─────────────────────────────────────────────── */}
        <div className="fd-ministry-section">
          <div className="fd-ministry-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Ministry Response
          </div>

          {ministryReplies.length === 0 ? (
            <div className="fd-ministry-waiting">
              <span className="fd-waiting-icon">📬</span>
              <div className="fd-waiting-title">Awaiting Ministry Review</div>
              <p className="fd-waiting-sub">
                Your issue has been submitted and is pending review by the
                Ministry of Local Government. You will see the official response here.
              </p>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'0.875rem'}}>
              {ministryReplies.map((reply, i) => (
                <div key={reply._id || i} className="fd-ministry-reply">
                  <div className="fd-ministry-reply-header">
                    <div className="fd-ministry-icon">🏛️</div>
                    <div className="fd-ministry-reply-meta">
                      <div className="fd-ministry-reply-from">
                        Ministry of Local Government &amp; Rural Development
                      </div>
                      <div className="fd-ministry-reply-time">
                        {timeAgo(reply.createdAt || reply.updatedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="fd-ministry-reply-body">
                    {reply.content || reply.comment}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Discussion section ────────────────────────────────────────────── */}
        <div className="fd-discussion">
          <div className="fd-section-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            Discussion ({userComments.length})
            {userComments.length > 0 && (
              <span className="fd-section-hint">click a user to expand</span>
            )}
          </div>

          <div className="fd-comments">
            {userComments.length === 0 ? (
              <div className="fd-no-comments">
                No discussion yet. Be the first to add a comment below.
              </div>
            ) : (
              userComments.map((comment, i) => {
                const cName      = comment.createdBy?.username || comment.createdBy?.fullName || 'Unknown';
                const cInit      = getInitials(cName);
                const commentId  = comment._id || i;
                const isCollapsed = !!collapsedComments[commentId];
                const replyCount = comment.replies?.length || 0;
                return (
                  <div key={commentId} className={`fd-comment ${isCollapsed ? 'fd-comment--collapsed' : ''}`}>
                    {/* Clickable header — toggles body */}
                    <div
                      className="fd-comment-header fd-comment-header--clickable"
                      onClick={() => toggleComment(commentId)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && toggleComment(commentId)}
                      aria-expanded={!isCollapsed}
                      aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} comment by ${cName}`}
                    >
                      <div className="fd-comment-avatar">{cInit}</div>
                      <div style={{flex:1}}>
                        <div className="fd-comment-name">{cName}</div>
                        {comment.district && (
                          <div className="fd-comment-district">{comment.district}</div>
                        )}
                      </div>
                      {isCollapsed && replyCount > 0 && (
                        <span className="fd-comment-reply-badge">{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
                      )}
                      <span className="fd-comment-time">{timeAgo(comment.createdAt)}</span>
                      {/* Chevron indicator */}
                      <svg
                        className={`fd-chevron ${isCollapsed ? 'fd-chevron--collapsed' : ''}`}
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </div>

                    {/* Collapsible body */}
                    {!isCollapsed && (
                      <div className="fd-comment-body">
                        <p className="fd-comment-text">{comment.content || comment.comment}</p>

                        {/* Replies to this comment */}
                        {comment.replies?.map((reply, j) => {
                          const rName = reply.createdBy?.username || 'Unknown';
                          const rInit = getInitials(rName);
                          return (
                            <div key={reply._id || j} className="fd-comment fd-comment-reply">
                              <div className="fd-comment-header">
                                <div className="fd-comment-avatar" style={{background:'linear-gradient(135deg,#475569,#94a3b8)'}}>{rInit}</div>
                                <div style={{flex:1}}>
                                  <div className="fd-comment-name">{rName}</div>
                                </div>
                                <span className="fd-comment-time">{timeAgo(reply.createdAt)}</span>
                              </div>
                              <div className="fd-comment-body">
                                <p className="fd-comment-text">{reply.content}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Compose */}
          {user ? (
            <div className="fd-compose">
              <div className="fd-compose-header">
                <div className="fd-compose-avatar">{getInitials(user.fullName || user.username)}</div>
                <div>
                  <div className="fd-compose-label">{user.fullName || user.username}</div>
                  <div className="fd-compose-sublabel">{user.district}</div>
                </div>
              </div>
              <form onSubmit={handlePostComment}>
                <textarea
                  className="fd-compose-textarea"
                  placeholder="Add a comment or additional context to this issue…"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  required
                  minLength={3}
                />
                <div className="fd-compose-footer">
                  <button
                    type="submit"
                    className="fd-compose-send"
                    disabled={posting || !commentText.trim()}
                  >
                    {posting ? (
                      <>
                        <div className="fd-spinner" style={{width:13,height:13,borderWidth:2}} />
                        Posting…
                      </>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"/>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                        Post Comment
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="fd-login-prompt">
              <p>Sign in to join the discussion on this issue.</p>
              <button
                className="fd-login-prompt-btn"
                onClick={() => navigate('/login')}
              >
                Sign In
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ForumDetail;