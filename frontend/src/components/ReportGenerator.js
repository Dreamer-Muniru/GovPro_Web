import React, { useState, useMemo, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import ghanaRegions from '../data/ghanaRegions';
import '../css/ReportGenerator.css';

const STATUS_OPTIONS = [
  { value:'',           label:'All Statuses' },
  { value:'Resumed',    label:'Ongoing' },
  { value:'Completed',  label:'Completed' },
  { value:'Abandoned',  label:'Abandoned' },
  { value:'Uncompleted',label:'Uncompleted' },
];

const FUNDING_OPTIONS = [
  { value:'',           label:'All Funding Sources' },
  { value:'Government', label:'Government Budget' },
  { value:'GIIF',       label:'GIIF' },
  { value:'DACF',       label:'DACF' },
  { value:'WorldBank',  label:'World Bank' },
  { value:'IMF',        label:'IMF' },
  { value:'UNDP',       label:'UNDP' },
];

const ReportGenerator = ({ projects = [], buttonOnly = false }) => {
  const { token } = useContext(AuthContext);

  const [open,          setOpen]          = useState(false);
  const [region,        setRegion]        = useState('');
  const [district,      setDistrict]      = useState('');
  const [status,        setStatus]        = useState('');
  const [fundingSource, setFundingSource] = useState('');
  const [generating,    setGenerating]    = useState(false);
  const [error,         setError]         = useState('');

  // Cascade districts from selected region using live project data
  const availableDistricts = useMemo(() => {
    if (!region) return [];
    return [...new Set(
      projects.filter(p => p.region === region && p.district).map(p => p.district)
    )].sort();
  }, [projects, region]);

  // Live count of projects matching current selections
  const matchCount = useMemo(() => {
    return projects.filter(p =>
      (!region        || p.region        === region) &&
      (!district      || p.district      === district) &&
      (!status        || p.status        === status) &&
      (!fundingSource || p.fundingSource === fundingSource)
    ).length;
  }, [projects, region, district, status, fundingSource]);

  const handleGenerate = async () => {
    if (matchCount === 0) { setError('No projects match these filters.'); return; }
    setGenerating(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (region)        params.set('region',        region);
      if (district)      params.set('district',      district);
      if (status)        params.set('status',        status);
      if (fundingSource) params.set('fundingSource', fundingSource);

      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(apiUrl(`/api/reports/projects?${params}`), { headers });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
      }

      const blob     = await res.blob();
      const url      = URL.createObjectURL(blob);
      const link     = document.createElement('a');
      link.href      = url;
      link.download  = `GovPro_Report_${(district||region||'All').replace(/\s+/g,'_')}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (e) {
      setError(e.message || 'Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        className="rg-trigger-btn"
        onClick={() => { setOpen(true); setError(''); }}
        title="Generate PDF progress report"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        Generate Report
      </button>

      {/* ── Modal ── */}
      {open && (
        <div
          className="rg-overlay"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
          role="dialog"
          aria-modal="true"
          aria-label="Generate PDF Report"
        >
          <div className="rg-modal">
            {/* Flag stripe */}
            <div className="rg-flag">
              <div className="rg-flag-r"/><div className="rg-flag-g"/><div className="rg-flag-gr"/>
            </div>

            {/* Header */}
            <div className="rg-modal-header">
              <div className="rg-modal-title-wrap">
                <div className="rg-modal-icon">📄</div>
                <div>
                  <div className="rg-modal-title">Generate Progress Report</div>
                  <div className="rg-modal-sub">
                    Produces a formatted A4 PDF with ministry letterhead
                  </div>
                </div>
              </div>
              <button className="rg-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>

            {/* Body */}
            <div className="rg-modal-body">
              {error && <div className="rg-error">{error}</div>}

              {/* Filter selectors */}
              <div className="rg-field">
                <label className="rg-label">Region</label>
                <select className="rg-select" value={region}
                  onChange={e => { setRegion(e.target.value); setDistrict(''); }}>
                  <option value="">All Regions</option>
                  {ghanaRegions.map(r => (
                    <option key={r.name} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="rg-field">
                <label className="rg-label">District</label>
                <select className="rg-select" value={district}
                  onChange={e => setDistrict(e.target.value)}
                  disabled={!region || availableDistricts.length === 0}>
                  <option value="">
                    {!region ? 'Select a region first' : availableDistricts.length === 0 ? 'No districts found' : 'All Districts'}
                  </option>
                  {availableDistricts.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="rg-field-row">
                <div className="rg-field">
                  <label className="rg-label">Status</label>
                  <select className="rg-select" value={status} onChange={e => setStatus(e.target.value)}>
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="rg-field">
                  <label className="rg-label">Funding Source</label>
                  <select className="rg-select" value={fundingSource} onChange={e => setFundingSource(e.target.value)}>
                    {FUNDING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Live match count */}
              <div className={`rg-match-count ${matchCount === 0 ? 'rg-match-zero' : ''}`}>
                <span className="rg-match-num">{matchCount}</span>
                <span className="rg-match-lab">
                  project{matchCount !== 1 ? 's' : ''} will appear in this report
                </span>
              </div>

              {/* PDF preview summary */}
              <div className="rg-preview-card">
                <div className="rg-preview-header">
                  <div className="rg-preview-flag">
                    <div/><div/><div/>
                  </div>
                  <div className="rg-preview-title-block">
                    <div className="rg-preview-ministry">REPUBLIC OF GHANA · MOLG</div>
                    <div className="rg-preview-report-title">PROJECT PROGRESS REPORT</div>
                    <div className="rg-preview-scope">
                      {[district, region].filter(Boolean).join(', ') || 'All Regions'}
                    </div>
                  </div>
                </div>
                <div className="rg-preview-contents">
                  <span>✓ Cover page with ministry letterhead</span>
                  <span>✓ Status breakdown &amp; financial overview</span>
                  <span>✓ Project listing table ({matchCount} rows)</span>
                  <span>✓ Financial summary with signature block</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="rg-modal-footer">
              <button className="rg-cancel-btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                className="rg-generate-btn"
                onClick={handleGenerate}
                disabled={generating || matchCount === 0}
              >
                {generating ? (
                  <>
                    <span className="rg-spinner"/>
                    Generating PDF…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download PDF Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportGenerator;