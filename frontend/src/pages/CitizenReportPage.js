import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../utils/api';
import '../css/CitizenReportPage.css';

const OBSERVATIONS = [
  { value: 'progressing',  label: '✅ Work is progressing well',    color: '#006B3F', bg: '#f0fdf4' },
  { value: 'stalled',      label: '⚠️  Work has stopped',           color: '#d97706', bg: '#fffbeb' },
  { value: 'abandoned',    label: '🚫 Site looks abandoned',         color: '#CE1126', bg: '#fff1f2' },
  { value: 'completed',    label: '🏁 Work appears completed',       color: '#1d4ed8', bg: '#eff6ff' },
  { value: 'poor_quality', label: '🔍 Quality concerns observed',   color: '#7c3aed', bg: '#f5f3ff' },
  { value: 'other',        label: '💬 Other concern',               color: '#475569', bg: '#f8fafc' },
];

const STATUS_LABEL = {
  Resumed:     'Ongoing',
  Completed:   'Completed',
  Abandoned:   'Abandoned',
  Uncompleted: 'Not started',
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  : null;

const fmtDateShort = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  : null;

export default function CitizenReportPage() {
  const { id } = useParams();

  // Set a generic browser tab title — no platform name visible to citizens
  useEffect(() => {
    document.title = 'Community Project Report';
    return () => { document.title = 'GovPro'; };
  }, []);

  const [project,      setProject]      = useState(null);
  const [periodInfo,   setPeriodInfo]   = useState(null);
  const [loadingProj,  setLoadingProj]  = useState(true);
  const [projectError, setProjectError] = useState('');

  const [observation,    setObservation]    = useState('');
  const [description,    setDescription]    = useState('');
  const [reporterName,   setReporterName]   = useState('');
  const [reporterPhone,  setReporterPhone]  = useState('');
  const [photo,          setPhoto]          = useState(null);
  const [photoPreview,   setPhotoPreview]   = useState(null);

  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Fetch project + current period status
  useEffect(() => {
    const fetchAll = async () => {
      setLoadingProj(true);
      try {
        const [projRes, periodRes] = await Promise.all([
          axios.get(apiUrl(`/api/projects/${id}`)),
          axios.get(apiUrl(`/api/citizen-reports/project/${id}`)),
        ]);
        setProject(projRes.data);
        setPeriodInfo(periodRes.data);
      } catch (e) {
        setProjectError('Project not found. Please check the QR code and try again.');
      } finally {
        setLoadingProj(false);
      }
    };
    fetchAll();
  }, [id]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!observation) { setSubmitError('Please select what you observe at the site.'); return; }
    setSubmitting(true); setSubmitError('');
    try {
      const fd = new FormData();
      fd.append('projectId',    id);
      fd.append('observation',  observation);
      if (description)   fd.append('description',   description);
      if (reporterName)  fd.append('reporterName',  reporterName);
      if (reporterPhone) fd.append('reporterPhone', reporterPhone);
      if (photo)         fd.append('photo',         photo);

      await axios.post(apiUrl('/api/citizen-reports'), fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmitted(true);
    } catch (e) {
      if (e.response?.data?.error === 'rate_limited') {
        setPeriodInfo(e.response.data);   // refresh with blocking info
      } else {
        setSubmitError(e.response?.data?.error || 'Submission failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loadingProj) {
    return (
      <div className="crp-loading">
        <div className="crp-spinner"/>
        <p>Loading project details…</p>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="crp-error-wrap">
        <div className="crp-error-icon">❌</div>
        <h2>Project not found</h2>
        <p>{projectError}</p>
      </div>
    );
  }

  const slotTaken    = !!periodInfo?.existingReport;
  const nextWindow   = periodInfo?.nextWindowDate ? new Date(periodInfo.nextWindowDate) : null;
  // const obsConfig    = OBSERVATIONS.find(o => o.value === observation);

  // ── Submitted success ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="crp-root">
        <div className="crp-flag"><div/><div/><div/></div>
        <div className="crp-success">
          <div className="crp-success-icon">🙏</div>
          <h2 className="crp-success-title">Thank you!</h2>
          <p className="crp-success-msg">
            Your report on <strong>{project.title}</strong> has been submitted to the Ministry of Local Government.
            Your contribution helps ensure accountability for government projects.
          </p>
          <div className="crp-success-ref">
            Submitted for official review
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="crp-root">
      {/* Ghana flag stripe */}
      <div className="crp-flag"><div/><div/><div/></div>

      {/* Header */}
      <div className="crp-header">
        <div className="crp-header-logo">🏛️</div>
        <div className="crp-header-text">
          <div className="crp-header-ministry">Republic of Ghana</div>
          <div className="crp-header-title">Citizen Project Monitor</div>
        </div>
      </div>

      {/* Project card */}
      <div className="crp-project-card">
        <div className="crp-project-type-chip">{project.type || 'Government Project'}</div>
        <h1 className="crp-project-title">{project.title}</h1>
        <div className="crp-project-meta">
          <span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            {[project.district, project.region].filter(Boolean).join(', ')}
          </span>
          {project.status && (
            <span className={`crp-status-badge crp-status-${project.status.toLowerCase()}`}>
              {STATUS_LABEL[project.status] || project.status}
            </span>
          )}
        </div>
        <div className="crp-project-details">
          {project.contractor && (
            <div className="crp-detail-row">
              <span className="crp-detail-label">Contractor</span>
              <span className="crp-detail-value">{project.contractor}</span>
            </div>
          )}
          {project.completionPercentage > 0 && (
            <div className="crp-detail-row">
              <span className="crp-detail-label">Official progress</span>
              <div className="crp-detail-value" style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
                <div className="crp-progress-bar">
                  <div className="crp-progress-fill"
                    style={{width:`${project.completionPercentage}%`}}/>
                </div>
                <span>{project.completionPercentage}%</span>
              </div>
            </div>
          )}
          {project.expectedCompletionDate && (
            <div className="crp-detail-row">
              <span className="crp-detail-label">Expected completion</span>
              <span className="crp-detail-value">{fmtDate(project.expectedCompletionDate)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Rate limit notice — slot taken */}
      {slotTaken ? (
        <div className="crp-rate-limit-card">
          <div className="crp-rate-limit-icon">📋</div>
          <h3 className="crp-rate-limit-title">Report already submitted</h3>
          <p className="crp-rate-limit-msg">
            A community report was submitted for this project on{' '}
            <strong>{fmtDateShort(periodInfo.existingReport.submittedAt)}</strong>.
            To keep reports manageable and meaningful, only one report is collected per two-week window.
          </p>
          {nextWindow && (
            <div className="crp-rate-limit-next">
              Next reporting window opens{' '}
              <strong>{fmtDateShort(nextWindow)}</strong>
            </div>
          )}
          <div className="crp-rate-limit-obs">
            Community observation: <span style={{fontWeight:700}}>
              {OBSERVATIONS.find(o => o.value === periodInfo.existingReport.observation)?.label || periodInfo.existingReport.observation}
            </span>
          </div>
        </div>
      ) : (
        /* Reporting form */
        <form className="crp-form" onSubmit={handleSubmit}>
          <div className="crp-form-header">
            <h2 className="crp-form-title">Submit your observation</h2>
            <p className="crp-form-sub">
              You are at this project site. What do you see right now?
              Your report goes directly to the Ministry.
            </p>
            {periodInfo?.period && (
              <div className="crp-window-badge">
                Reporting window: {periodInfo.period.replace('-A',' (1st–15th)').replace('-B',' (16th–31st)')}
              </div>
            )}
          </div>

          {submitError && <div className="crp-error-msg">{submitError}</div>}

          {/* Observation selector */}
          <div className="crp-field">
            <label className="crp-label">What do you observe? <span className="crp-required">*</span></label>
            <div className="crp-obs-grid">
              {OBSERVATIONS.map(obs => (
                <button
                  key={obs.value}
                  type="button"
                  className={`crp-obs-btn ${observation === obs.value ? 'selected' : ''}`}
                  style={observation === obs.value ? { background: obs.bg, borderColor: obs.color, color: obs.color } : {}}
                  onClick={() => setObservation(obs.value)}
                >
                  {obs.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="crp-field">
            <label className="crp-label">Describe what you see <span className="crp-hint">(optional)</span></label>
            <textarea
              className="crp-textarea"
              rows={3}
              maxLength={500}
              placeholder="e.g. The foundation was laid 3 months ago but no workers have been seen since…"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
            <div className="crp-char-count">{description.length}/500</div>
          </div>

          {/* Photo upload */}
          <div className="crp-field">
            <label className="crp-label">Take a photo <span className="crp-hint">(optional but very helpful)</span></label>
            {photoPreview ? (
              <div className="crp-photo-preview-wrap">
                <img src={photoPreview} alt="Preview" className="crp-photo-preview"/>
                <button type="button" className="crp-photo-remove"
                  onClick={() => { setPhoto(null); setPhotoPreview(null); }}>
                  ✕ Remove photo
                </button>
              </div>
            ) : (
              <label className="crp-photo-drop">
                <input type="file" accept="image/*" capture="environment"
                  style={{display:'none'}} onChange={handlePhotoChange}/>
                <span className="crp-photo-icon">📷</span>
                <span className="crp-photo-text">Tap to take a photo or upload from gallery</span>
                <span className="crp-photo-hint">JPG or PNG, max 10MB</span>
              </label>
            )}
          </div>

          {/* Reporter info */}
          <div className="crp-field-row">
            <div className="crp-field">
              <label className="crp-label">Your name <span className="crp-hint">(optional)</span></label>
              <input className="crp-input" type="text" placeholder="Anonymous"
                value={reporterName} onChange={e => setReporterName(e.target.value)}/>
            </div>
            <div className="crp-field">
              <label className="crp-label">Phone <span className="crp-hint">(optional)</span></label>
              <input className="crp-input" type="tel" placeholder="+233 XX XXX XXXX"
                value={reporterPhone} onChange={e => setReporterPhone(e.target.value)}/>
            </div>
          </div>

          <div className="crp-privacy-note">
            🔒 Your personal details are optional and will only be used if the Ministry needs to follow up.
            Reports can be submitted anonymously.
          </div>

          <button type="submit" className="crp-submit-btn" disabled={submitting || !observation}>
            {submitting ? (
              <><span className="crp-btn-spinner"/>Submitting…</>
            ) : (
              <>📤 Submit Report to Ministry</>
            )}
          </button>
        </form>
      )}

      <div className="crp-footer">
        <div className="crp-footer-flag"><div/><div/><div/></div>
        <p>Ministry of Local Government &amp; Rural Development</p>
        <p>Community reports are reviewed by district and government officials.</p>
      </div>
    </div>
  );
}