// components/CommentBox.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../css/CommentBox.css';

const CommentBox = ({ projectId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch existing comments when drawer opens
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const res = await axios.get(`/api/projects/${projectId}`);
        setComments(res.data.comments || []);
      } catch (err) {
        console.error('Failed to fetch comments');
      }
    };

    fetchComments();
  }, [projectId]);

  // Post new comment
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const res = await axios.post(`/api/projects/${projectId}/comments`, {
        comment: newComment,
      });

      setComments((prev) => [...prev, res.data.comment]); // Optimistic update
      setNewComment('');
    } catch (err) {
      console.error('Failed to post comment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="comment-box">
      <div className="comment-list">
        {comments.length === 0 ? (
          <p>No comments yet. Be the first to share your thoughts!</p>
        ) : (
          comments.map((c, i) => (
            <div key={i} className="comment-item">
              <strong>{c.username}</strong>: {c.comment}
            </div>
          ))
        )}
      </div>

      <form className="comment-form" onSubmit={handleSend}>
        <input
          type="text"
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Posting...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default CommentBox;
