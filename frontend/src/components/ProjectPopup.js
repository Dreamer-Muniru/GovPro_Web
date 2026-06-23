import React from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../utils/api';
import '../css/ProjectPopup.css';

const TYPE_ICON = {
  'School':                     '🏫',
  'Hospital':                   '🏥',
  'Road':                       '🛣️',
  'Bridge':                     '🌉',
  'Water System':               '💧',
  'Power Project':              '⚡',
  'Market Stall':               '🏪',
  'Drainage System':            '🌊',
  'Sanitation Facility':        '🚻',
  'Government Office':          '🏛️',
  'Residential Bungalow':       '🏠',
  'Sports & Recreation Center': '🏟️',
};

const STATUS_PCT = {
  'Resumed':     65,
  'Uncompleted': 30,
  'Abandoned':   10,
  'Completed':  100,
};

const STATUS_CLASS = {
  'Resumed':     'ongoing',
  'Uncompleted': '',
  'Abandoned':   'abandoned',
  'Completed':   'completed',
};

const STATUS_LABEL = {
  'Resumed':     'Ongoing',
  'Uncompleted': 'Uncompleted',
  'Abandoned':   'Abandoned',
  'Completed':   'Completed',
};

const ProjectPopup = ({ project, onClose, onNext, totalCount, currentIndex }) => {
  const navigate = useNavigate();
  if (!project) return null;

  const pct       = STATUS_PCT[project.status] ?? 30;
  const icon      = TYPE_ICON[project.type]    ?? '🏗️';
  const startYear = project.projectStartDate || project.startDate
    ? new Date(project.projectStartDate || project.startDate).getFullYear()
    : '—';

  const handleViewDetails = () => {
    onClose();
    navigate(`/project/${project._id}`);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="pp-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Featured project: ${project.title}`}
    >
      <div className="pp-card">
        <div className="pp-flag">
          <div className="pp-flag-r" />
          <div className="pp-flag-g" />
          <div className="pp-flag-gr" />
        </div>

        <div className="pp-header">
          <div className="pp-live-badge">
            <div className="pp-live-dot" aria-hidden="true" />
            <span className="pp-live-text">Featured project</span>
          </div>
          <button className="pp-close" onClick={onClose} aria-label="Close project popup">×</button>
        </div>

        <div className="pp-image-wrap">
          {project.imageUrl ? (
            <img src={apiUrl(project.imageUrl)} alt={project.title} className="pp-image" />
          ) : (
            <div className="pp-image-placeholder" aria-hidden="true">{icon}</div>
          )}
          <div className="pp-region-tag">{project.region}</div>
          <div className={`pp-status-badge pp-status-${(project.status || '').toLowerCase()}`}>
            {STATUS_LABEL[project.status] || project.status}
          </div>
        </div>

        <div className="pp-body">
          <div className="pp-location">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {project.district ? `${project.district} · ` : ''}{project.region}
          </div>

          <div className="pp-title">{project.title}</div>

          <div className="pp-meta">
            <div className="pp-meta-item">
              <div className="pp-meta-label">Type</div>
              <div className="pp-meta-value">{project.type || '—'}</div>
            </div>
            <div className="pp-meta-item">
              <div className="pp-meta-label">Status</div>
              <div className={`pp-meta-value ${STATUS_CLASS[project.status] || ''}`}>
                {STATUS_LABEL[project.status] || project.status}
              </div>
            </div>
            {project.fundingSource && (
              <div className="pp-meta-item">
                <div className="pp-meta-label">Funding</div>
                <div className="pp-meta-value">{project.fundingSource}</div>
              </div>
            )}
            <div className="pp-meta-item">
              <div className="pp-meta-label">Started</div>
              <div className="pp-meta-value">{startYear}</div>
            </div>
          </div>

          <div className="pp-progress">
            <div className="pp-progress-top">
              <span>Completion estimate</span>
              <span className="pp-progress-pct">{pct}%</span>
            </div>
            <div className="pp-progress-bar">
              <div className="pp-progress-fill" style={{ width: `${pct}%` }}
                role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} />
            </div>
          </div>

          <button className="pp-cta" onClick={handleViewDetails}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            View full project details
          </button>
        </div>

        <div className="pp-footer">
          <div className="pp-pager" aria-label={`Project ${currentIndex + 1} of ${totalCount}`}>
            {Array.from({ length: Math.min(totalCount, 5) }).map((_, i) => (
              <div key={i}
                className={`pp-pager-dot ${i === currentIndex % Math.min(totalCount, 5) ? 'active' : ''}`} />
            ))}
          </div>
          <div className="pp-footer-actions">
            {totalCount > 1 && (
              <button className="pp-next" onClick={onNext} aria-label="Show next project">
                Next
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            )}
            <button className="pp-skip" onClick={onClose}>Dismiss</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectPopup;