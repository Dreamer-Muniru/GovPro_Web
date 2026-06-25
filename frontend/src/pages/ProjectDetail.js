import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import CommentBox from '../components/CommentBox';
import '../css/ProjectDetail.css';

// ── Funding source display map ─────────────────────────────────────────────────
const FUNDING_LABELS = {
  Government: 'Government Budget Allocation',
  GIIF:       'Ghana Infrastructure Investment Fund (GIIF)',
  DACF:       'District Assemblies Common Fund (DACF)',
  WorldBank:  'World Bank Group',
  IMF:        'International Monetary Fund (IMF)',
  UNDP:       'United Nations Development Programme (UNDP)',
};

const getFundingDisplay = (project) => {
  if (!project.fundingSource) return null;
  if (project.fundingSource === 'Other') return project.otherFundingSources || 'Other';
  return FUNDING_LABELS[project.fundingSource] || project.fundingSource;
};

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Resumed:     { label: 'Ongoing',      color: '#006B3F', bg: '#dcfce7', dot: '#006B3F' },
  Completed:   { label: 'Completed',    color: '#1d4ed8', bg: '#dbeafe', dot: '#3b82f6' },
  Abandoned:   { label: 'Abandoned',    color: '#CE1126', bg: '#fee2e2', dot: '#CE1126' },
  Uncompleted: { label: 'Uncompleted',  color: '#92400e', bg: '#fef3c7', dot: '#f59e0b' },
};

// ── Currency formatter ─────────────────────────────────────────────────────────
const fmtGHS = (val) => {
  if (val === null || val === undefined) return null;
  return `GHS ${Number(val).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ── Date formatter ─────────────────────────────────────────────────────────────
const fmtDate = (val) => {
  if (!val) return null;
  return new Date(val).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

// ── Type icons ─────────────────────────────────────────────────────────────────
const TYPE_ICON = {
  School: '🏫', Hospital: '🏥', Road: '🛣️', Bridge: '🌉',
  'Water System': '💧', 'Power Project': '⚡', 'Market Stall': '🏪',
  'Drainage System': '🌊', 'Sanitation Facility': '🚽',
  'Government Office': '🏛️', 'Residential Bungalow': '🏠',
  'Sports & Recreation Center': '🏟️',
};

// ── Circular progress SVG ──────────────────────────────────────────────────────
const CircularProgress = ({ pct = 0 }) => {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 75 ? '#006B3F' : pct >= 40 ? '#FCD116' : '#CE1126';
  return (
    <div className="pd-progress-ring-wrap">
      <svg width="130" height="130" viewBox="0 0 130 130" aria-label={`${pct}% complete`}>
        <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10"/>
        <circle
          cx="65" cy="65" r={r} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '65px 65px',
                   transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="pd-progress-ring-center">
        <div className="pd-progress-ring-pct">{pct}%</div>
        <div className="pd-progress-ring-label">complete</div>
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
const ProjectDetail = () => {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { token } = useContext(AuthContext);

  const [project,  setProject]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      try {
        const res = await axios.get(apiUrl(`/api/projects/${id}`));
        setProject(res.data);
      } catch (err) {
        setError('Project not found or failed to load.');
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  if (loading) {
    return (
      <div className="pd-loading">
        <div className="pd-spinner"/>
        <p>Loading project…</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="pd-error">
        <div className="pd-error-icon">🔍</div>
        <h2>Project not found</h2>
        <p>{error}</p>
        <button className="pd-back-btn" onClick={() => navigate('/')}>← Back to Home</button>
      </div>
    );
  }

  const statusCfg   = STATUS_CONFIG[project.status] || STATUS_CONFIG.Uncompleted;
  const fundingDisplay = getFundingDisplay(project);
  const pct         = Number(project.completionPercentage) || 0;
  const typeIcon    = TYPE_ICON[project.type] || '🏗️';
  const startDate   = fmtDate(project.projectStartDate || project.startDate);
  const endDate     = fmtDate(project.expectedCompletionDate);
  const hasFinancials = project.totalCost != null || project.amountPaid != null || project.outstandingAmount != null;

  return (
    <div className="pd-root">

      {/* ── Ghana flag stripe ── */}
      <div className="pd-flag">
        <div className="pd-flag-r"/><div className="pd-flag-g"/><div className="pd-flag-gr"/>
      </div>

      {/* ── Back nav ── */}
      <div className="pd-nav">
        <button className="pd-back-btn" onClick={() => navigate(-1)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <span className="pd-breadcrumb">Projects / {project.title}</span>
      </div>

      {/* ══════════════════════ HERO SECTION ══════════════════════ */}
      <div className="pd-hero">
        {/* Left — image or placeholder */}
        <div className="pd-hero-media">
          {project.imageUrl && !imgError ? (
            <img
              src={apiUrl(project.imageUrl)}
              alt={project.title}
              className="pd-hero-image"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="pd-hero-placeholder">
              <span className="pd-hero-placeholder-icon">{typeIcon}</span>
            </div>
          )}
          {/* Status badge over image */}
          <div className="pd-status-badge" style={{ background: statusCfg.bg, color: statusCfg.color }}>
            <span className="pd-status-dot" style={{ background: statusCfg.dot }}/>
            {statusCfg.label}
          </div>
        </div>

        {/* Right — identity + progress */}
        <div className="pd-hero-content">
          <div className="pd-hero-type-chip">
            <span>{typeIcon}</span> {project.type}
          </div>

          <h1 className="pd-hero-title">{project.title}</h1>

          <div className="pd-hero-location">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            {[project.district, project.region].filter(Boolean).join(', ')}
          </div>

          {/* Completion ring */}
          <CircularProgress pct={pct} />

          {/* Quick stat chips */}
          <div className="pd-hero-chips">
            {startDate && (
              <div className="pd-chip">
                <div className="pd-chip-label">Started</div>
                <div className="pd-chip-value">{startDate}</div>
              </div>
            )}
            {endDate && (
              <div className="pd-chip">
                <div className="pd-chip-label">Expected completion</div>
                <div className="pd-chip-value">{endDate}</div>
              </div>
            )}
            {project.contractor && (
              <div className="pd-chip">
                <div className="pd-chip-label">Contractor</div>
                <div className="pd-chip-value">{project.contractor}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════ BODY ══════════════════════ */}
      <div className="pd-body">

        {/* ── Description ── */}
        {project.description && (
          <section className="pd-section">
            <h2 className="pd-section-title">
              <span className="pd-section-icon">📋</span> About this project
            </h2>
            <p className="pd-description">{project.description}</p>
          </section>
        )}

        {/* ── Financial summary ── */}
        {hasFinancials && (
          <section className="pd-section">
            <h2 className="pd-section-title">
              <span className="pd-section-icon">💰</span> Financial overview
            </h2>
            <div className="pd-finance-grid">
              {project.totalCost != null && (
                <div className="pd-finance-card pd-finance-total">
                  <div className="pd-finance-label">Total project cost</div>
                  <div className="pd-finance-amount">{fmtGHS(project.totalCost)}</div>
                </div>
              )}
              {project.amountPaid != null && (
                <div className="pd-finance-card pd-finance-paid">
                  <div className="pd-finance-label">Paid to contractor</div>
                  <div className="pd-finance-amount">{fmtGHS(project.amountPaid)}</div>
                  {project.totalCost != null && project.totalCost > 0 && (
                    <div className="pd-finance-pct-bar">
                      <div className="pd-finance-pct-fill"
                        style={{ width: `${Math.min(100, (project.amountPaid / project.totalCost) * 100).toFixed(1)}%` }}/>
                    </div>
                  )}
                </div>
              )}
              {project.outstandingAmount != null && (
                <div className="pd-finance-card pd-finance-outstanding">
                  <div className="pd-finance-label">Outstanding balance</div>
                  <div className="pd-finance-amount">{fmtGHS(project.outstandingAmount)}</div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Project details grid ── */}
        <section className="pd-section">
          <h2 className="pd-section-title">
            <span className="pd-section-icon">📁</span> Project details
          </h2>
          <div className="pd-details-grid">
            {[
              { label: 'Project type',     value: project.type },
              { label: 'Status',           value: statusCfg.label },
              { label: 'Region',           value: project.region },
              { label: 'District',         value: project.district },
              { label: 'City / Town',      value: project.location_city },
              { label: 'Address',          value: project.location_address },
              { label: 'Contractor',       value: project.contractor },
              { label: 'Submitted by',     value: project.submittedBy },
              { label: 'Source of funding',value: fundingDisplay },
              { label: 'Start date',       value: startDate },
              { label: 'Expected completion', value: endDate },
              { label: 'Completion progress', value: pct > 0 ? `${pct}%` : null },
            ].filter(item => item.value).map(item => (
              <div key={item.label} className="pd-detail-item">
                <div className="pd-detail-label">{item.label}</div>
                <div className="pd-detail-value">{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Map coordinates (if available) ── */}
        {(project.gps?.latitude && project.gps?.longitude) && (
          <section className="pd-section">
            <h2 className="pd-section-title">
              <span className="pd-section-icon">📍</span> GPS coordinates
            </h2>
            <div className="pd-gps-row">
              <div className="pd-gps-chip">
                <span className="pd-gps-label">Latitude</span>
                <span className="pd-gps-value">{project.gps.latitude}</span>
              </div>
              <div className="pd-gps-chip">
                <span className="pd-gps-label">Longitude</span>
                <span className="pd-gps-value">{project.gps.longitude}</span>
              </div>
              <a
                className="pd-map-link"
                href={`https://www.google.com/maps?q=${project.gps.latitude},${project.gps.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                  <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                Open in Maps
              </a>
            </div>
          </section>
        )}

        {/* ── Comments ── */}
        <section className="pd-section">
          <h2 className="pd-section-title">
            <span className="pd-section-icon">💬</span> Public comments
          </h2>
          <CommentBox projectId={id} showHeader={false} />
        </section>

      </div>
    </div>
  );
};

export default ProjectDetail;