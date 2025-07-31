import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import '../css/CommentBox.css';
import { AuthContext } from '../context/AuthContext';
import '../css/home.css';
import { formatDistanceToNow } from 'date-fns';

const commentCache = {};

const CommentBox = ({ projectId, onCommentPosted, onCommentCountChange, showHeader = true }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { token } = useContext(AuthContext);

  // Fetch comments when projectId changes
  const fetchComments = async () => {
    setFetching(true);
    try {
      const res = await axios.get(`https://govpro-web-backend-gely.onrender.com/api/projects/${projectId}`);
      const fetchedComments = res.data.comments || [];
      commentCache[projectId] = fetchedComments;
      setComments(fetchedComments);
      if (onCommentCountChange) onCommentCountChange(fetchedComments.length);
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

  // Handle posting a new comment
 const handleSend = async (e) => {
  e.preventDefault();
  if (!newComment.trim()) return;

  if (!token) {
    alert('You must be logged in to comment.');
    return;
  }

  setLoading(true);
  try {
    console.log('Sending comment request...'); // Debug log
    console.log('Token:', token); // Debug log
    
    const res = await axios.post(
      `https://govpro-web-backend-gely.onrender.com/api/projects/${projectId}/comments`,
      { comment: newComment },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    console.log('Comment response:', res.data); // Debug log
    
    setNewComment('');
    await fetchComments();
  } catch (err) {
    console.error('Failed to post comment:', err.response?.data || err.message);
    alert('Comment failed: ' + (err.response?.data?.error || 'Unknown error'));
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="comment-box">
      {showHeader && (
        <div className="comment-box-header">
          <span>Comments:</span>
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
          
          <p>No comments yet. Be the first to share your thoughts!</p>
        ) : (
          comments.map((c, i) => (
            
            <div key={c._id || i} className="comment-item">
              <div className="comment-username">
                {c.username || 'Anonymous'}
              </div>
              <div className="comment-text">
                {c.comment}
              </div>
              <div className="comment-time">
                {formatDistanceToNow(new Date(c.createdAt || new Date()), { addSuffix: true })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Only show comment form if user is logged in */}
      {token && (
        <form className="comment-form" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !newComment.trim()}>
            {loading ? 'Posting...' : 'Send'}
          </button>
        </form>
      )}
    </div>
  );
};

export default CommentBox;