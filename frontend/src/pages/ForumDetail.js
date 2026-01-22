import React, { useEffect, useState, useContext, useRef } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../css/ForumDetail.css';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../utils/api';

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

  // Caching references
  const hasFetchedRef = useRef(false);
  const cacheTimeRef = useRef(null);
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache (shorter for forum details as they update more frequently)

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
      // Check if we have cached data and it's still valid
      const now = Date.now();
      const cacheValid = cacheTimeRef.current && (now - cacheTimeRef.current < CACHE_DURATION);

      // If we have cached data and cache is valid, don't fetch
      if (hasFetchedRef.current && cacheValid && forum && comments.length >= 0) {
        console.log('✅ Using cached forum detail data');
        setLoading(false);
        return;
      }

      // Otherwise, fetch fresh data
      console.log('🔄 Fetching fresh forum detail data...');
      setLoading(true);
      try {
        const forumRes = await axios.get(apiUrl(`/api/forums/${id}`));
        const commentRes = await axios.get(apiUrl(`/api/comments/${id}`));
        setForum(forumRes.data);
        setComments(commentRes.data);

        // Update cache timestamp
        hasFetchedRef.current = true;
        cacheTimeRef.current = Date.now();
        console.log('✅ Forum detail cached at:', new Date().toLocaleTimeString());
      } catch (err) {
        console.error('Error loading forum:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchForumAndComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Function to refresh forum and comments
  // const refreshForumDetail = async () => {
  //   console.log('🔄 Refreshing forum detail...');
  //   setLoading(true);
  //   try {
  //     const forumRes = await axios.get(apiUrl(`/api/forums/${id}`));
  //     const commentRes = await axios.get(apiUrl(`/api/comments/${id}`));
  //     setForum(forumRes.data);
  //     setComments(commentRes.data);

      // Update cache timestamp
  //     cacheTimeRef.current = Date.now();
  //     console.log('✅ Forum detail refreshed at:', new Date().toLocaleTimeString());
  //   } catch (err) {
  //     console.error('Error refreshing forum:', err.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

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
      setShowReactions(false);

      // Update cache timestamp since we have fresh data
      cacheTimeRef.current = Date.now();
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

      // Update cache timestamp since we have fresh data
      cacheTimeRef.current = Date.now();
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
      formData.append('createdBy', user?._id);

      await axios.post(apiUrl('/api/comments'), formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setNewComment({ content: '' });
      const updatedComments = await axios.get(apiUrl(`/api/comments/${id}`));
      setComments(updatedComments.data);

      // Update cache timestamp since we have fresh data
      cacheTimeRef.current = Date.now();
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

  // Calculate cache age for display
  // const getCacheAge = () => {
  //   if (!cacheTimeRef.current) return null;
  //   const ageMs = Date.now() - cacheTimeRef.current;
  //   const ageMinutes = Math.floor(ageMs / 60000);
  //   const ageSeconds = Math.floor((ageMs % 60000) / 1000);
  //   if (ageMinutes > 0) return `${ageMinutes}m ago`;
  //   return `${ageSeconds}s ago`;
  // };

  // const isCached = hasFetchedRef.current && cacheTimeRef.current;

  // Only show loading spinner if we have no cached data
  if (loading && !forum) {
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
      <div className="forum-detail-header">
        <button className="back-button" onClick={() => navigate('/forum-feed')}>← Back to Forum Feed</button>
        {/* {isCached && (
          <div className="cache-status">
            <span className="cache-indicator-detail" title="Using cached data">
              ⚡ Cached {getCacheAge()}
            </span>
            <button className="refresh-icon-btn" onClick={refreshForumDetail} title="Refresh forum">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        )} */}
      </div>

      {/* Sweet Intro Text */}
      <div className="forum-intro">
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
          <div
            className="like-button-wrapper"
            onMouseEnter={() => setShowReactions(true)}
            onMouseLeave={() => setShowReactions(false)}
            onTouchStart={() => setShowReactions(true)}
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
    </div>
  );
};

export default ForumDetail;