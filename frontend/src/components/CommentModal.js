import React from 'react';
import CommentBox from './CommentBox';
import { formatDistanceToNow } from 'date-fns';

const CommentModal = ({ project, onClose, onCommentPosted }) => {
  return (
    <div className="comment-modal-overlay" onClick={onClose}>
      <div className="comment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Comments on {project.title}</h3>
          <button className="close-modal" onClick={onClose}>
            &times;
          </button>
        </div>
        
        <div className="comments-container">
          {project.comments?.length > 0 ? (
            project.comments.map((comment, index) => (
              <div key={index} className="comment">
                <div className="comment-header">
                  <span className="comment-author">
                    {comment.user?.name || 'Anonymous'}
                  </span>
                  <span className="comment-time">
                    {formatDistanceToNow(new Date(comment.createdAt || new Date()), { addSuffix: true })}
                  </span>
                </div>
                <div className="comment-text">
                  {comment.text || comment.comment}
                </div>
              </div>
            ))
          ) : (
            <div className="no-comments">No comments yet. Be the first to comment!</div>
          )}
        </div>
        
        <div className="comment-input-container">
          <CommentBox 
            projectId={project._id} 
            onCommentPosted={() => {
              onCommentPosted();
              // Don't close the modal after posting
            }}
            showHeader={false}  // Add this prop to hide the duplicate header
          />
        </div>
      </div>
    </div>
  );
};

export default CommentModal;