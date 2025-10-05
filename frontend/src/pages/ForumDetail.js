import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { apiUrl } from '../utils/api';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_BASE, apiUrl } from '../utils/api';
import '../css/ForumDetail.css';
import { useNavigate } from 'react-router-dom';


const ForumDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [forum, setForum] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState({ content: '' });
  const [loading, setLoading] = useState(true);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [showReplyInputs, setShowReplyInputs] = useState({});
  const [showReplies, setShowReplies] = useState({});
  const [replyContents, setReplyContents] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '', image: null });


  const getReactionIcon = (type) => {
  switch (type) {
    case 'like': return '👍';
    case 'love': return '❤️';
    case 'angry': return '😠';
    default: return '👍';
  }
};



  useEffect(() => {
    const fetchForumAndComments = async () => {
      try {
        const forumRes = await axios.get(apiUrl(`/api/forums/${id}`));
        const commentRes = await axios.get(apiUrl(`/api/comments/${id}`));
        setForum(forumRes.data);
        setEditForm({ title: forumRes.data.title || '', description: forumRes.data.description || '', image: null });
        setComments(commentRes.data);
      } catch (err) {
        console.error('Error loading forum:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchForumAndComments();
  }, [id]);

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return time.toLocaleDateString();
  };

  // Reaction or Like handle
 const handleReact = async (type) => {
  try {
    await axios.post(apiUrl(`/api/forums/${forum._id}/react`), {
      type,
      userId: user?._id
    });

    const res = await axios.get(apiUrl(`/api/forums/${forum._id}`));
    setForum(res.data);
    setShowReactions(false); // ✅ Close picker after selection
  } catch (err) {
    console.error('Reaction failed:', err.message);
  }
};



  const toggleReplyInput = (commentId) => {
    setShowReplyInputs(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const toggleReplies = (commentId) => {
    setShowReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const handleReplySubmit = async (e, parentId) => {
    e.preventDefault();
    const content = replyContents[parentId];
    if (!content) return;

    setSubmitting(true);
    try {
      console.log('Commenting as:', user?._id);
      await axios.post(apiUrl('/api/comments/reply'), {
        forumId: id,
        parentId,
        content,
        createdBy: user?._id

      });

      setReplyContents(prev => ({ ...prev, [parentId]: '' }));
      setShowReplyInputs(prev => ({ ...prev, [parentId]: false }));
      
      const updatedComments = await axios.get(apiUrl(`/api/comments/${id}`));
      setComments(updatedComments.data);
    } catch (err) {
      console.error('Failed to post reply:', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.content.trim()) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('forumId', id);
      formData.append('content', newComment.content);
      formData.append('createdBy', user?._id
);

      await axios.post(apiUrl('/api/comments'), formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setNewComment({ content: '' });
      const updatedComments = await axios.get(apiUrl(`/api/comments/${id}`));
      setComments(updatedComments.data);
    } catch (err) {
      console.error('Failed to post comment:', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (username) => {
    return username ? username.charAt(0).toUpperCase() : 'U';
  };

  const countTotalComments = (comments) => {
    let count = 0;
    const countReplies = (commentList) => {
      commentList.forEach(comment => {
        count++;
        if (comment.replies && comment.replies.length > 0) {
          countReplies(comment.replies);
        }
      });
    };
    countReplies(comments);
    return count;
  };

  const isOwner = !!(user && forum && (user._id === forum.createdBy?._id));

  const handleToggleMenu = () => setShowMenu((s) => !s);
  const handleOpenEdit = () => { setShowMenu(false); setShowEditModal(true); };
  const handleCloseEdit = () => setShowEditModal(false);

  const handleDelete = async () => {
    if (!window.confirm('Delete this forum? This cannot be undone.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(apiUrl(`/api/forums/${forum._id}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/forum-feed');
    } catch (err) {
      console.error('Delete failed:', err?.response?.data?.error || err.message);
      alert(err?.response?.data?.error || 'Failed to delete forum');
    }
  };

  const handleEditInput = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setEditForm((p) => ({ ...p, image: files?.[0] || null }));
    } else {
      setEditForm((p) => ({ ...p, [name]: value }));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', editForm.title);
      formData.append('description', editForm.description);
      if (editForm.image) formData.append('image', editForm.image);

      const res = await axios.put(apiUrl(`/api/forums/${forum._id}`), formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
      });
      setForum(res.data);
      setShowEditModal(false);
    } catch (err) {
      console.error('Update failed:', err?.response?.data?.error || err.message);
      alert(err?.response?.data?.error || 'Failed to update forum');
    }
  };

  const renderCommentNode = (comment, isReply = false) => {
    const replyCount = comment.replies ? comment.replies.length : 0;
    const showThisReplies = showReplies[comment._id];

    return (
      <div key={comment._id} className="comment">
        <div className="comment-header">
          <div className="comment-avatar">
            {getInitials(comment.createdBy?.username)}
          </div>
          <div className="comment-user-info">
            <div className="comment-username">
              {comment.createdBy?.username || 'User'}
            </div>
            <div className="comment-meta">
              <span className="comment-region">
                {comment.district || forum.district}
              </span>
              <span className="comment-time">
                {getTimeAgo(comment.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="comment-content">
          {comment.content}
        </div>

        {comment.imageUrl && (
          <img
            src={apiUrl(comment.imageUrl)}
            alt="Comment"
            className="comment-image"
          />
        )}

        {/* Reply Button */}
        <button 
          className="reply-btn"
          onClick={() => toggleReplyInput(comment._id)}
        >
          Reply
        </button>

        {/* View Replies Button */}
        {!isReply && replyCount > 0 && (
          <button 
            className="view-replies-btn"
            onClick={() => toggleReplies(comment._id)}
          >
            {showThisReplies ? 'Hide' : `View ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
          </button>
        )}

        {/* Reply Form */}
        {showReplyInputs[comment._id] && (
          <form 
            onSubmit={(e) => handleReplySubmit(e, comment._id)}
            className="reply-form"
          >
            <div className="reply-input-container">
              <div className="reply-avatar">
                {getInitials(user?.username)}
              </div>
              <div className="reply-input-wrapper">
                <textarea
                  placeholder="Write a reply..."
                  value={replyContents[comment._id] || ''}
                  onChange={(e) =>
                    setReplyContents(prev => ({ ...prev, [comment._id]: e.target.value }))
                  }
                  className="reply-textarea"
                  required
                />
                <button 
                  type="submit" 
                  className="send-reply-btn"
                  disabled={submitting}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22,2 15,22 11,13 2,9"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Render Replies */}
        {showThisReplies && comment.replies && comment.replies.length > 0 && (
          <div className="replies-list">
            {comment.replies.map((reply) => renderCommentNode(reply, true))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="forum-detail">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading forum...</p>
        </div>
      </div>
    );
  }

  if (!forum) {
    return (
      <div className="forum-detail">
        <div className="empty-comments">
          <p>Forum not found</p>
        </div>
      </div>
    );
  }

  const totalComments = countTotalComments(comments);
    const userReaction = forum.reactions?.find(r => r.user === user?.id)?.type;

  return (
    <div className="forum-detail">
    <div>
      <button className="back-button" onClick={() => navigate('/forum-feed')}>← Back to Forum Feed</button>
    </div>
    
      {/* Sweet Intro Text */}
      <div className="forum-intro">
    {/* <button className="back-button" onClick={() => navigate('forumFeed')}>← Back to Homepage</button> */}
        💬 Join the conversation! Share your thoughts and connect with your community
      </div>

      {/* Main Forum Post Card */}
      <div className="forum-post-card">
        {/* Post Header */}
        <div className="post-header">
          <div className="post-avatar">
            {getInitials(forum.createdBy?.username)}
          </div>
          <div className="post-user-info">
            <div className="post-username">
              {forum.createdBy?.username || 'User'}
            </div>
            <div className="post-meta">
              <span className="post-region">
                {forum.region}, {forum.district}
              </span>
              <span className="post-time">
                {getTimeAgo(forum.createdAt)}
              </span>
            </div>
          </div>
          {isOwner && (
            <div className="post-actions-menu">
              <button className="more-btn" onClick={handleToggleMenu} aria-label="More options">⋯</button>
              {showMenu && (
                <div className="menu-dropdown">
                  <button onClick={handleOpenEdit}>Edit</button>
                  <button onClick={handleDelete} className="danger">Delete</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Post Content */}
        <div className="post-content">
          <h1 className="post-title">{forum.title}</h1>
          <p className="post-description">{forum.description}</p>
          {forum.imageUrl && (
            <img
              src={apiUrl(forum.imageUrl)}
              alt="Forum"
              className="post-image"
            />
          )}
        </div>

        {/* Post Actions */}
        <div className="post-actions">
          <div className="post-actions">
          <div 
            className="like-button-wrapper" 
            onMouseEnter={() => setShowReactions(true)} 
            onMouseLeave={() => setShowReactions(false)} 
            onTouchStart={() => setShowReactions(true)} // Mobile press
          >
            <button className="like-button">
              {forum.reactions?.length || 0} {userReaction ? getReactionIcon(userReaction) : '👍'} Like
            </button>

            {showReactions && (
              <div className="reaction-picker">
                <span onClick={() => handleReact('like')}>👍</span>
                <span onClick={() => handleReact('love')}>❤️</span>
                <span onClick={() => handleReact('angry')}>😠</span>
              </div>
            )}
          </div>
        </div>

      



          {/* Comments Button */}
          <button 
            className="action-btn"
            onClick={() => setShowCommentsModal(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Comment
            {totalComments > 0 && (
              <span className="comment-count">{totalComments}</span>
            )}
          </button>
        </div>
      </div>

      {/* Comments Modal */}
      {showCommentsModal && (
        <div className="comments-modal-overlay" onClick={() => setShowCommentsModal(false)}>
          <div className="comments-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <h2 className="modal-title">Comments</h2>
              <button 
                className="close-btn"
                onClick={() => setShowCommentsModal(false)}
              >
                ×
              </button>
            </div>

            {/* Comments Container */}
            <div className="comments-container">
              {comments.length === 0 ? (
                <div className="empty-comments">
                  <p>No comments yet. Be the first to comment!</p>
                </div>
              ) : (
                comments.map((comment) => renderCommentNode(comment))
              )}
            </div>

            {/* New Comment Form */}
            <form onSubmit={handleCommentSubmit} className="new-comment-form">
              <div className="new-comment-container">
                <div className="new-comment-avatar">
                  {getInitials(user?.username)}
                </div>
                <div className="new-comment-wrapper">
                  <textarea
                    value={newComment.content}
                    onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
                    placeholder="Write a comment..."
                    className="new-comment-input"
                    required
                  />
                  <button 
                    type="submit" 
                    className="send-comment-btn"
                    disabled={submitting}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22,2 15,22 11,13 2,9"></polygon>
                    </svg>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="comments-modal-overlay" onClick={handleCloseEdit}>
          <div className="comments-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Forum</h2>
              <button className="close-btn" onClick={handleCloseEdit}>×</button>
            </div>
            <form onSubmit={handleEditSubmit} className="new-comment-form">
              <div className="new-comment-container">
                <div className="new-comment-wrapper" style={{ width: '100%' }}>
                  <input
                    type="text"
                    name="title"
                    value={editForm.title}
                    onChange={handleEditInput}
                    className="new-comment-input"
                    placeholder="Title"
                    required
                  />
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={handleEditInput}
                    className="new-comment-input"
                    placeholder="Description"
                    required
                  />
                  <input type="file" name="image" accept="image/*" onChange={handleEditInput} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button type="button" className="btn-secondary" onClick={handleCloseEdit}>Cancel</button>
                    <button type="submit" className="send-comment-btn">Save</button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForumDetail;