import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { apiUrl } from '../utils/api';
import ghanaRegions from '../data/ghanaRegions';
import '../css/ProjectInsights.css';

// ── helpers ────────────────────────────────────────────────────────────────────
const STATUS_LABEL = {
  Resumed:     'Ongoing',
  Completed:   'Completed',
  Abandoned:   'Abandoned',
  Uncompleted: 'Uncompleted',
};

// Normalise any raw status value → one of our 4 canonical keys
const normalise = (s) => {
  if (!s) return 'Uncompleted';
  if (s === 'Resumed'  || s === 'Ongoing')      return 'Resumed';
  if (s === 'Completed')                        return 'Completed';
  if (s === 'Abandoned')                        return 'Abandoned';
  return 'Uncompleted';
};

const pct = (n, total) => (total === 0 ? 0 : Math.round((n / total) * 100));

const fmtNum = (n) => Number(n).toLocaleString();

// ── status colour config ───────────────────────────────────────────────────────
const STATUS_CFG = {
  Resumed:     { label: 'Ongoing',      color: '#006B3F', light: '#dcfce7', border: '#86efac' },
  Completed:   { label: 'Completed',    color: '#1d4ed8', light: '#dbeafe', border: '#93c5fd' },
  Uncompleted: { label: 'Uncompleted',  color: '#b45309', light: '#fef3c7', border: '#fcd34d' },
  Abandoned:   { label: 'Abandoned',    color: '#CE1126', light: '#fee2e2', border: '#fca5a5' },
};

// Ordered for display
const STATUS_KEYS = ['Resumed', 'Completed', 'Uncompleted', 'Abandoned'];

// ── Horizontal bar ─────────────────────────────────────────────────────────────
const HBar = ({ value, max, color }) => (
  <div className="pi-hbar-track">
    <div className="pi-hbar-fill"
      style={{ width: max > 0 ? `${(value / max) * 100}%` : '0%', background: color }}/>
  </div>
);

// ── main component ─────────────────────────────────────────────────────────────
const ProjectInsights = () => {
  const [projects,      setProjects]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [statusFilter,  setStatusFilter]  = useState('All');
  const [regionSearch,  setRegionSearch]  = useState('');
  const [openRegions,   setOpenRegions]   = useState({});   // {regionName: boolean}

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(apiUrl('/api/projects'));
        const data = Array.isArray(res.data) ? res.data : res.data?.projects || [];
        setProjects(data);
      } catch (e) {
        setError('Failed to load projects. Please refresh.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  // ── summary stats ─────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const total       = projects.length;
    const ongoing     = projects.filter(p => normalise(p.status) === 'Resumed').length;
    const completed   = projects.filter(p => normalise(p.status) === 'Completed').length;
    const abandoned   = projects.filter(p => normalise(p.status) === 'Abandoned').length;
    const uncompleted = projects.filter(p => normalise(p.status) === 'Uncompleted').length;
    return { total, ongoing, completed, abandoned, uncompleted };
  }, [projects]);

  // ── filtered projects (for the table / detail sections) ───────────────────
  const filtered = useMemo(() => {
    if (statusFilter === 'All') return projects;
    return projects.filter(p => normalise(p.status) === statusFilter);
  }, [projects, statusFilter]);

  // ── regional breakdown ────────────────────────────────────────────────────
  const regionalData = useMemo(() => {
    // Build a map: regionName → { total, ongoing, completed, abandoned, uncompleted, districts: {} }
    const map = {};
    projects.forEach(p => {
      const region   = p.region   || 'Unknown';
      const district = p.district || 'Unknown';
      const status   = normalise(p.status);

      if (!map[region]) {
        map[region] = { total: 0, Resumed: 0, Completed: 0, Abandoned: 0, Uncompleted: 0, districts: {} };
      }
      map[region].total++;
      map[region][status]++;

      if (!map[region].districts[district]) {
        map[region].districts[district] = { total: 0, Resumed: 0, Completed: 0, Abandoned: 0, Uncompleted: 0 };
      }
      map[region].districts[district].total++;
      map[region].districts[district][status]++;
    });

    // Sort regions by total descending
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, data]) => ({
        name,
        ...data,
        // Sort districts by total descending
        districtList: Object.entries(data.districts)
          .sort((a, b) => b[1].total - a[1].total)
          .map(([dname, ddata]) => ({ name: dname, ...ddata })),
      }));
  }, [projects]);

  const maxRegionTotal = regionalData[0]?.total || 1;

  const toggleRegion = (name) =>
    setOpenRegions(prev => ({ ...prev, [name]: !prev[name] }));

  const filteredRegions = useMemo(() => {
    if (!regionSearch.trim()) return regionalData;
    const q = regionSearch.toLowerCase();
    return regionalData.filter(r => r.name.toLowerCase().includes(q));
  }, [regionalData, regionSearch]);

  // ── render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="pi-loading">
        <div className="pi-spinner"/>
        <p>Loading insights…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pi-error">
        <span>⚠️</span> {error}
      </div>
    );
  }

  return (
    <div className="pi-root">

      {/* ── Ghana flag stripe ── */}
      <div className="pi-flag">
        <div className="pi-flag-r"/><div className="pi-flag-g"/><div className="pi-flag-gr"/>
      </div>

      {/* ── Page header ── */}
      <div className="pi-page-header">
        <div className="pi-page-header-inner">
          <div className="pi-eyebrow">📊 Analytics</div>
          <h1 className="pi-page-title">Project Insights</h1>
          <p className="pi-page-sub">
            Live breakdown of {fmtNum(summary.total)} government projects across all regions and districts.
          </p>
        </div>
      </div>

      <div className="pi-body">

        {/* ══════ SUMMARY CARDS ══════ */}
        <section className="pi-section">
          <div className="pi-summary-grid">
            {/* Total */}
            <div className="pi-summary-card pi-card-total">
              <div className="pi-summary-icon">📋</div>
              <div className="pi-summary-value">{fmtNum(summary.total)}</div>
              <div className="pi-summary-label">Total projects</div>
            </div>
            {/* Ongoing (was Abandoned — replaced per request) */}
            <div className="pi-summary-card pi-card-ongoing">
              <div className="pi-summary-icon">🔨</div>
              <div className="pi-summary-value">{fmtNum(summary.ongoing)}</div>
              <div className="pi-summary-label">Ongoing</div>
              <div className="pi-summary-pct">{pct(summary.ongoing, summary.total)}%</div>
            </div>
            <div className="pi-summary-card pi-card-completed">
              <div className="pi-summary-icon">✅</div>
              <div className="pi-summary-value">{fmtNum(summary.completed)}</div>
              <div className="pi-summary-label">Completed</div>
              <div className="pi-summary-pct">{pct(summary.completed, summary.total)}%</div>
            </div>
            <div className="pi-summary-card pi-card-uncompleted">
              <div className="pi-summary-icon">⏳</div>
              <div className="pi-summary-value">{fmtNum(summary.uncompleted)}</div>
              <div className="pi-summary-label">Uncompleted</div>
              <div className="pi-summary-pct">{pct(summary.uncompleted, summary.total)}%</div>
            </div>
            <div className="pi-summary-card pi-card-abandoned">
              <div className="pi-summary-icon">⚠️</div>
              <div className="pi-summary-value">{fmtNum(summary.abandoned)}</div>
              <div className="pi-summary-label">Abandoned</div>
              <div className="pi-summary-pct">{pct(summary.abandoned, summary.total)}%</div>
            </div>
          </div>
        </section>

        {/* ══════ REGION BAR CHART ══════ */}
        {regionalData.length > 0 && (
          <section className="pi-section">
            <div className="pi-section-header">
              <h2 className="pi-section-title">
                <span>📊</span> Projects by Region
              </h2>
              <div className="pi-bar-legend">
                {STATUS_KEYS.map(sk => (
                  <span key={sk} className="pi-legend-item">
                    <span className="pi-legend-dot" style={{ background: STATUS_CFG[sk].color }}/>
                    {STATUS_CFG[sk].label}
                  </span>
                ))}
              </div>
            </div>
            <div className="pi-bar-chart">
              {regionalData.map(region => {
                const maxVal = Math.max(...regionalData.map(r => r.total));
                return (
                  <div key={region.name} className="pi-bar-row">
                    <div className="pi-bar-region-name">
                      {region.name.replace(' Region', '').replace(' region', '')}
                    </div>
                    <div className="pi-bar-stack-wrap">
                      {/* Stacked bar: each status segment proportional to its count */}
                      <div className="pi-bar-stack">
                        {STATUS_KEYS.map(sk => region[sk] > 0 && (
                          <div
                            key={sk}
                            className="pi-bar-segment"
                            style={{
                              width: `${(region[sk] / maxVal) * 100}%`,
                              background: STATUS_CFG[sk].color,
                              opacity: 0.88,
                            }}
                            title={`${STATUS_CFG[sk].label}: ${region[sk]}`}
                          />
                        ))}
                      </div>
                      {/* Segment count labels */}
                      <div className="pi-bar-counts">
                        {STATUS_KEYS.map(sk => region[sk] > 0 && (
                          <span key={sk} className="pi-bar-count-label"
                            style={{ color: STATUS_CFG[sk].color }}>
                            {STATUS_CFG[sk].label[0]}:{region[sk]}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="pi-bar-total">{region.total}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ══════ STATUS FILTER + COUNT ══════ */}
        <section className="pi-section">
          <div className="pi-section-header">
            <h2 className="pi-section-title">Filter by Status</h2>
            <span className="pi-filter-count">{fmtNum(filtered.length)} project{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="pi-status-tabs">
            {['All', ...STATUS_KEYS].map(key => {
              const cfg   = key === 'All' ? null : STATUS_CFG[key];
              const count = key === 'All' ? summary.total : summary[key === 'Resumed' ? 'ongoing' : key.toLowerCase()];
              return (
                <button
                  key={key}
                  className={`pi-status-tab ${statusFilter === key ? 'active' : ''}`}
                  style={statusFilter === key && cfg
                    ? { background: cfg.light, color: cfg.color, borderColor: cfg.border }
                    : {}}
                  onClick={() => setStatusFilter(key)}
                >
                  {key === 'All' ? 'All projects' : STATUS_CFG[key].label}
                  <span className="pi-tab-count">{fmtNum(count)}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ══════ DETAILED REGIONAL DATA ══════ */}
        <section className="pi-section">
          <div className="pi-section-header">
            <h2 className="pi-section-title">
              <span>🗺️</span> Detailed Regional Data
            </h2>
            <input
              className="pi-region-search"
              placeholder="Search regions…"
              value={regionSearch}
              onChange={e => setRegionSearch(e.target.value)}
            />
          </div>

          {filteredRegions.length === 0 ? (
            <div className="pi-empty">No regions match your search.</div>
          ) : (
            <div className="pi-region-list">
              {filteredRegions.map(region => {
                const isOpen = !!openRegions[region.name];
                return (
                  <div key={region.name} className={`pi-region-item ${isOpen ? 'open' : ''}`}>

                    {/* ── Region header (clickable toggle) ── */}
                    <button
                      className="pi-region-header"
                      onClick={() => toggleRegion(region.name)}
                      aria-expanded={isOpen}
                    >
                      <div className="pi-region-header-left">
                        <span className="pi-region-chevron" aria-hidden="true">
                          {isOpen ? '▾' : '▸'}
                        </span>
                        <span className="pi-region-name">{region.name}</span>
                        <span className="pi-region-total-badge">{region.total} projects</span>
                      </div>

                      {/* Mini bar chart — 4 status colours stacked */}
                      <div className="pi-region-mini-bars" onClick={e => e.stopPropagation()}>
                        {STATUS_KEYS.map(sk => region[sk] > 0 && (
                          <div key={sk} className="pi-region-mini-bar-wrap">
                            <div className="pi-region-mini-bar-fill"
                              style={{
                                width: `${(region[sk] / maxRegionTotal) * 120}px`,
                                background: STATUS_CFG[sk].color,
                                opacity: 0.85,
                              }}/>
                            <span className="pi-region-mini-count">{region[sk]}</span>
                          </div>
                        ))}
                      </div>

                      {/* Status badge pills */}
                      <div className="pi-region-status-pills" onClick={e => e.stopPropagation()}>
                        {STATUS_KEYS.map(sk => region[sk] > 0 && (
                          <span key={sk} className="pi-status-pill"
                            style={{ background: STATUS_CFG[sk].light, color: STATUS_CFG[sk].color, borderColor: STATUS_CFG[sk].border }}>
                            {STATUS_CFG[sk].label[0]}: {region[sk]}
                          </span>
                        ))}
                      </div>
                    </button>

                    {/* ── District breakdown (expanded) ── */}
                    {isOpen && (
                      <div className="pi-district-list">
                        <div className="pi-district-table-head">
                          <span className="pi-dt-district">District</span>
                          <span className="pi-dt-total">Total</span>
                          <span className="pi-dt-stat" style={{color: STATUS_CFG.Resumed.color}}>Ongoing</span>
                          <span className="pi-dt-stat" style={{color: STATUS_CFG.Completed.color}}>Completed</span>
                          <span className="pi-dt-stat" style={{color: STATUS_CFG.Uncompleted.color}}>Uncompleted</span>
                          <span className="pi-dt-stat" style={{color: STATUS_CFG.Abandoned.color}}>Abandoned</span>
                        </div>
                        {region.districtList.map(d => (
                          <div key={d.name} className="pi-district-row">
                            <span className="pi-dt-district">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.4}}>
                                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                              </svg>
                              {d.name}
                            </span>
                            <span className="pi-dt-total pi-dt-bold">{d.total}</span>
                            <span className="pi-dt-stat">
                              {d.Resumed > 0 ? (
                                <span className="pi-dt-badge" style={{background: STATUS_CFG.Resumed.light, color: STATUS_CFG.Resumed.color}}>
                                  {d.Resumed}
                                </span>
                              ) : <span className="pi-dt-zero">—</span>}
                            </span>
                            <span className="pi-dt-stat">
                              {d.Completed > 0 ? (
                                <span className="pi-dt-badge" style={{background: STATUS_CFG.Completed.light, color: STATUS_CFG.Completed.color}}>
                                  {d.Completed}
                                </span>
                              ) : <span className="pi-dt-zero">—</span>}
                            </span>
                            <span className="pi-dt-stat">
                              {d.Uncompleted > 0 ? (
                                <span className="pi-dt-badge" style={{background: STATUS_CFG.Uncompleted.light, color: STATUS_CFG.Uncompleted.color}}>
                                  {d.Uncompleted}
                                </span>
                              ) : <span className="pi-dt-zero">—</span>}
                            </span>
                            <span className="pi-dt-stat">
                              {d.Abandoned > 0 ? (
                                <span className="pi-dt-badge" style={{background: STATUS_CFG.Abandoned.light, color: STATUS_CFG.Abandoned.color}}>
                                  {d.Abandoned}
                                </span>
                              ) : <span className="pi-dt-zero">—</span>}
                            </span>
                          </div>
                        ))}

                        {/* Region subtotal row */}
                        <div className="pi-district-row pi-district-subtotal">
                          <span className="pi-dt-district">Region total</span>
                          <span className="pi-dt-total pi-dt-bold">{region.total}</span>
                          <span className="pi-dt-stat pi-dt-bold" style={{color: STATUS_CFG.Resumed.color}}>{region.Resumed || 0}</span>
                          <span className="pi-dt-stat pi-dt-bold" style={{color: STATUS_CFG.Completed.color}}>{region.Completed || 0}</span>
                          <span className="pi-dt-stat pi-dt-bold" style={{color: STATUS_CFG.Uncompleted.color}}>{region.Uncompleted || 0}</span>
                          <span className="pi-dt-stat pi-dt-bold" style={{color: STATUS_CFG.Abandoned.color}}>{region.Abandoned || 0}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ══════ FILTERED PROJECT LIST ══════ */}
        {statusFilter !== 'All' && (
          <section className="pi-section">
            <div className="pi-section-header">
              <h2 className="pi-section-title">
                {STATUS_CFG[statusFilter]?.label || statusFilter} projects
              </h2>
            </div>
            {filtered.length === 0 ? (
              <div className="pi-empty">No projects with this status.</div>
            ) : (
              <div className="pi-project-table-wrap">
                <table className="pi-project-table">
                  <thead>
                    <tr>
                      <th>Title</th><th>Type</th><th>Region</th><th>District</th><th>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p._id}>
                        <td className="pi-pt-title">{p.title}</td>
                        <td>{p.type}</td>
                        <td>{p.region}</td>
                        <td>{p.district}</td>
                        <td>
                          <div className="pi-pt-progress-wrap">
                            <div className="pi-pt-progress-bar">
                              <div className="pi-pt-progress-fill"
                                style={{ width: `${p.completionPercentage || 0}%` }}/>
                            </div>
                            <span className="pi-pt-pct">{p.completionPercentage || 0}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  );
};

export default ProjectInsights;