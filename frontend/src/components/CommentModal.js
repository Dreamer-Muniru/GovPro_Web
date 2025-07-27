import React from 'react';
import CommentBox from './CommentBox';

const CommentModal = ({ project, onClose, onCommentCountChange }) => {
  if (!project) return null;

  return (
    <div className="comment-modal-overlay" onClick={onClose}>
      <div className="comment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Comments on {project.title}</h3>
          <button className="close-modal" onClick={onClose}>
            &times;
          </button>
        </div>
        
        {/* Force the CommentBox to render */}
        <div style={{ padding: '20px' }}>
          <CommentBox 
            projectId={project._id} 
            onCommentCountChange={newCount => onCommentCountChange(project._id, newCount)}
            showHeader={true}  // Changed to true to force header display
          />
        </div>
      </div>
    </div>
  );
};

export default CommentModal;