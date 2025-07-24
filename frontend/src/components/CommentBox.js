// components/CommentBox.jsx
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import '../css/CommentBox.css';
import { AuthContext } from '../context/AuthContext';
import '../css/home.css';


const commentCache = {};
const CommentBox = ({ projectId, onCommentPosted  }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const {token } = useContext(AuthContext);
  

  useEffect(() => {
  const fetchComments = async () => {
    if (commentCache[projectId]) {
      setComments(commentCache[projectId]);
      return;
    }
    try {
      setComments(null); // trigger loading state
      const res = await axios.get(`https://govpro-web-backend.onrender.com/api/projects/${projectId}`);
      commentCache[projectId] = res.data.comments || [];
      setComments(commentCache[projectId]);
    } catch (err) {
      console.error('Failed to fetch comments:', err.response?.data || err.message);
    }
  };
  fetchComments();
}, [projectId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!token) {
      alert('You must be logged in to comment.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `https://govpro-web-backend.onrender.com/api/projects/${projectId}/comments`,
        { comment: newComment },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setComments((prev) => [...prev, res.data.comment]);
      setNewComment('');
      if (onCommentPosted) onCommentPosted();
    } catch (err) {
      console.error('Failed to post comment:', err.response?.data || err.message);
      alert('Comment failed: ' + (err.response?.data?.error || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comment-box">
      <div className="comment-list">
       {comments === null ? (
        <div className="comment-loading">
          <div className="comment-skeleton"></div>
          <div className="comment-skeleton short"></div>
        </div>
          ) : comments.length === 0 ? (
            <p>No comments yet. Be the first to share your thoughts!</p>
            
          ) : (
          comments.map((c, i) => (
            <div key={i} className="comment-item">
              <strong>{c.username || 'Anonymous'}</strong>: {c.comment}
            </div>
          ))


        )}
      </div>

      <form className="comment-form" onSubmit={handleSend}>
        <input
          type="text"
          placeholder={token ? "Write a comment..." : "Login to comment"}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={!token || loading}
        />
        <button type="submit" disabled={!token || loading}>
          {loading ? 'Posting...' : 'Send'}
        </button>
      </form>

      {!token && (
        <p className="login-notice">You must be logged in to submit a comment.</p>
      )}
    </div>
  );
};

export default CommentBox;
