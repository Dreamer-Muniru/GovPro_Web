import React, { useContext } from 'react';
import CommentBox from './CommentBox';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const CommentModal = ({ project, onClose, onCommentCountChange }) => {
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  if (!project) return null;

  const handleLoginRedirect = () => {
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    navigate('/login');
  };

  return (
    <div className="comment-modal-overlay" onClick={onClose}>
      <div className="comment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Comments on {project.title}</h3>
          <button className="close-modal" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Only show the mapped comments for non-logged-in users */}
        {!token && (
          <div className="comments-container">
            {project.comments?.length > 0 ? (
              project.comments.map((comment, index) => (
                <div key={comment._id || index} className="comment-item">
                  <div className="comment-username">
                    {comment.user?.name || 'Anonymous'}
                  </div>
                  <div className="comment-text">
                    {comment.text || comment.comment}
                  </div>
                  <div className="comment-time">
                    {formatDistanceToNow(new Date(comment.createdAt || new Date()), { addSuffix: true })}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-comments">No comments yet. Be the first to comment!</div>
            )}
          </div>
        )}

        <div className="comment-input-container">
          {token ? (
            <CommentBox
              projectId={project._id}
              onCommentCountChange={newCount => onCommentCountChange(project._id, newCount)}
              showHeader={false}
            />
          ) : (
            <div className="login-to-comment">
              <div className="login-message">
                <i className="fas fa-lock"></i>
                <span>You need to be logged in to comment</span>
              </div>
              <button
                className="login-redirect-btn"
                onClick={handleLoginRedirect}
              >
                Login to Comment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentModal;