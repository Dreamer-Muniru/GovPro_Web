import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { apiUrl } from '../utils/api';
import '../css/CommentBox.css';
import { AuthContext } from '../context/AuthContext';
import '../css/home.css';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const commentCache = {};

const CommentBox = ({ projectId, onCommentPosted, onCommentCountChange, showHeader = true }) => {
  const [comments,   setComments]   = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [fetching,   setFetching]   = useState(true);
  const { token }  = useContext(AuthContext);
  const navigate   = useNavigate();

  const fetchComments = async () => {
    setFetching(true);
    try {
      const res = await axios.get(apiUrl(`/api/projects/${projectId}`));
      const fetched = res.data.comments || [];
      commentCache[projectId] = fetched;
      setComments(fetched);
      if (onCommentCountChange) onCommentCountChange(fetched.length);
    } catch (err) {
      console.error('Failed to fetch comments:', err.response?.data || err.message);
      setComments([]);
      if (onCommentCountChange) onCommentCountChange(0);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line
  }, [projectId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !token) return;
    setLoading(true);
    try {
      await axios.post(
        apiUrl(`/api/projects/${projectId}/comments`),
        { comment: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewComment('');
      await fetchComments();
      if (onCommentPosted) onCommentPosted();
    } catch (err) {
      console.error('Failed to post comment:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comment-box">
      {showHeader && (
        <div className="comment-box-header">
          <span>Comments</span>
          <span className="comment-count">{comments.length}</span>
        </div>
      )}

      <div className="comment-list">
        {fetching ? (
          <div className="comment-loading">
            <div className="comment-skeleton"></div>
            <div className="comment-skeleton short"></div>
          </div>
        ) : comments.length === 0 ? (
          <p style={{textAlign:'center',color:'#94a3b8',fontSize:13,padding:'1rem 0'}}>
            No comments yet. Be the first to share your thoughts!
          </p>
        ) : (
          comments.map((c, i) => (
            <div key={c._id || i} className="comment-item">
              <div className="comment-username">{c.username || 'Anonymous'}</div>
              <div className="comment-text">{c.comment}</div>
              <div className="comment-time">
                {formatDistanceToNow(new Date(c.createdAt || new Date()), { addSuffix: true })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Comment form — requires login */}
      {token ? (
        <form className="comment-form" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Write a comment…"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !newComment.trim()}>
            {loading ? 'Posting…' : 'Send'}
          </button>
        </form>
      ) : (
        <div className="comment-login-guard">
          <div className="comment-login-guard-icon">🔒</div>
          <p className="comment-login-guard-text">Sign in to join the conversation</p>
          <button
            className="comment-login-guard-btn"
            onClick={() => {
              localStorage.setItem('redirectAfterLogin', window.location.pathname);
              navigate('/login');
            }}
          >
            Sign In to Comment
          </button>
        </div>
      )}
    </div>
  );
};

export default CommentBox;