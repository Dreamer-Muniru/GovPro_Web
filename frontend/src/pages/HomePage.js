import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import '../css/home.css';
import Footer from '../components/Footer';
import CommentModal from '../components/CommentModal';
import { apiUrl } from '../utils/api';
import ProjectPopup from '../components/ProjectPopup';
import HeroStatsCarousel from '../components/HeroStatsCarousel';
import ProjectMap from '../components/ProjectMap';
import ReportGenerator from '../components/ReportGenerator';

const TYPE_ICON = {
  'School':'🏫','Hospital':'🏥','Road':'🛣️','Bridge':'🌉',
  'Water System':'💧','Power Project':'⚡','Market Stall':'🏪',
  'Drainage System':'🌊','Sanitation Facility':'🚻',
  'Government Office':'🏛️','Residential Bungalow':'🏠',
  'Sports & Recreation Center':'🏟️',
};

const STATUS_CLASS = {
  'Resumed':'status-resumed','Completed':'status-completed',
  'Abandoned':'status-abandoned','Uncompleted':'status-uncompleted',
};

const STATUS_LABEL = {
  'Resumed':'Ongoing','Completed':'Completed',
  'Abandoned':'Abandoned','Uncompleted':'Uncompleted',
};

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-img" />
    <div className="skeleton-body">
      <div className="skeleton-line title" />
      <div className="skeleton-line wide" />
      <div className="skeleton-line med" />
      <div className="skeleton-line short" />
      <div className="skeleton-footer">
        <div className="skeleton-btn" />
        <div className="skeleton-btn" style={{maxWidth:60}} />
      </div>
    </div>
  </div>
);

const fetchProjectsData = async () => {
  const res  = await axios.get(apiUrl('/api/projects'));
  const data = Array.isArray(res.data) ? res.data : res.data.projects || [];
  return data
    .map(p => ({ ...p, commentCount: p.comments ? p.comments.length : 0 }))
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
};

function buildPopupPool(projects) {
  const ongoing  = projects.filter(p => p.status === 'Resumed');
  const pool     = ongoing.length >= 3 ? ongoing : projects;
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 10);
}

const HomePage = () => {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const [filters, setFilters]               = useState({ region:'', district:'', type:'', status:'', fundingSource:'' });
  const [modalProject, setModalProject]     = useState(null);
  const [currentPage, setCurrentPage]       = useState(1);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installable, setInstallable]       = useState(false);
  const projectsPerPage = 9;

  const [showPopup,  setShowPopup]  = useState(false);
  const [popupPool,  setPopupPool]  = useState([]);
  const [popupIndex, setPopupIndex] = useState(0);
  const popupProject = popupPool[popupIndex] ?? null;

  const { data: projects = [], isLoading: loading } = useQuery({
    queryKey: ['projects'],
    queryFn:  fetchProjectsData,
    staleTime:  5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  const uniqueValues = useMemo(() => {
    if (!projects.length) return { regions:[], districts:[], types:[], fundingSources:[] };
    // Districts cascade: if a region is selected, only show districts in that region
    const districtPool = filters.region
      ? projects.filter(p => p.region === filters.region)
      : projects;
    return {
      regions:       [...new Set(projects.map(p => p.region))].filter(Boolean).sort(),
      districts:     [...new Set(districtPool.map(p => p.district))].filter(Boolean).sort(),
      types:         [...new Set(projects.map(p => p.type))].filter(Boolean).sort(),
      fundingSources:[...new Set(projects.map(p => p.fundingSource))].filter(Boolean).sort(),
    };
  }, [projects, filters.region]);

  // Popup
  useEffect(() => {
    if (!projects.length) return;
    const pool  = buildPopupPool(projects);
    setPopupPool(pool);
    setPopupIndex(0);
    const timer = setTimeout(() => setShowPopup(true), 3000);
    return () => clearTimeout(timer);
  }, [projects]);

  const handleClosePopup = () => setShowPopup(false);
  const handleNextPopup  = () => setPopupIndex(prev => (prev + 1) % popupPool.length);

  // ── PWA install — capture prompt + track installed state ─────────────────
  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) return; // already installed, don't show button

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // appinstalled fires when install completes
    const onInstalled = () => {
      setInstallable(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    // When region changes, reset district so stale districts don't persist
    if (name === 'region') {
      setFilters(prev => ({ ...prev, region: value, district: '' }));
    } else {
      setFilters(prev => ({ ...prev, [name]: value }));
    }
    setCurrentPage(1);
  };

  const handleCommentCountChange = (projectId, newCount) => {
    try {
      queryClient.setQueryData(['projects'], (old = []) =>
        old.map(p => p._id === projectId ? { ...p, commentCount: newCount } : p)
      );
    } catch (err) {
      console.warn('Failed to update comment count in cache', err);
    }
  };

  const filteredProjects = useMemo(() =>
    projects.filter(p =>
      (filters.region        ? p.region        === filters.region        : true) &&
      (filters.district      ? p.district      === filters.district      : true) &&
      (filters.type          ? p.type          === filters.type          : true) &&
      (filters.status        ? p.status        === filters.status        : true) &&
      (filters.fundingSource ? p.fundingSource === filters.fundingSource : true)
    ), [projects, filters]);

  const { currentProjects, totalPages } = useMemo(() => {
    const last = currentPage * projectsPerPage;
    return {
      currentProjects: filteredProjects.slice(last - projectsPerPage, last),
      totalPages:      Math.ceil(filteredProjects.length / projectsPerPage),
    };
  }, [filteredProjects, currentPage, projectsPerPage]);

  return (
    <>
      <div className="home-page">

        {/* Flag stripe */}
        <div className="ghana-header">
          <div className="flag-container">
            <div className="flag-stripe red" />
            <div className="flag-stripe yellow" />
            <div className="flag-stripe green" />
          </div>
        </div>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="hp-hero">
          <div className="hp-hero-eyebrow">🇬🇭 &nbsp;Civic Transparency Platform</div>
          <h1 className="hp-hero-title">
            Tracking&nbsp;<span className="accent-gold">Government</span>&nbsp;Projects
            <br />Across&nbsp;<span className="accent-green">Ghana</span>
          </h1>
          <p className="hp-hero-sub">
            Real-time visibility into infrastructure projects in every region and
            district — submitted by citizens, verified for accountability.
          </p>

          {/* ── Live data carousel — replaces static stat pills ── */}
          <HeroStatsCarousel projects={projects} />
        </div>

        {/* ── Map ──────────────────────────────────────────────────────────── */}
        <div className="hp-map-section">
          <div className="hp-map-header">
            <div className="hp-map-title">
              <div className="hp-map-dot" aria-hidden="true" />
              Live project map
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'0.75rem',flexWrap:'wrap'}}>
              <span className="hp-map-hint">
                Click any pin to view details · toggle heatmap to see coverage gaps
              </span>
              <ReportGenerator projects={projects} />
            </div>
          </div>
          <ProjectMap projects={projects} />
        </div>

        {/* ── Filter bar ───────────────────────────────────────────────────── */}
        <div className="filter-section">
          {/* Row 1 — always visible: Region, District, Type */}
          <div className="filter-controls">
            <span className="filter-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              Filter
            </span>
            <select name="region" value={filters.region} onChange={handleFilterChange} aria-label="Filter by region">
              <option value="">All Regions</option>
              {uniqueValues.regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select name="district" value={filters.district} onChange={handleFilterChange} aria-label="Filter by district"
              disabled={!filters.region}>
              <option value="">{filters.region ? 'All Districts' : 'Select region first'}</option>
              {uniqueValues.districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select name="type" value={filters.type} onChange={handleFilterChange} aria-label="Filter by type">
              <option value="">All Types</option>
              {uniqueValues.types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {/* Clear all button — only when any filter active */}
            {(filters.region || filters.district || filters.type || filters.status || filters.fundingSource) && (
              <button
                className="filter-clear-btn"
                onClick={() => { setFilters({ region:'', district:'', type:'', status:'', fundingSource:'' }); setCurrentPage(1); }}
                aria-label="Clear all filters"
              >
                ✕ Clear
              </button>
            )}
          </div>

          {/* Row 2 — appears once a district is selected: Status + Funding Source */}
          {filters.district && (
            <div className="filter-controls filter-controls--secondary">
              <span className="filter-label filter-label--secondary">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Refine
              </span>
              <select name="status" value={filters.status} onChange={handleFilterChange} aria-label="Filter by status"
                className="filter-select--status">
                <option value="">All Statuses</option>
                <option value="Resumed">🔨 Ongoing</option>
                <option value="Completed">✅ Completed</option>
                <option value="Abandoned">⚠️ Abandoned</option>
                <option value="Uncompleted">⏳ Uncompleted</option>
              </select>
              <select name="fundingSource" value={filters.fundingSource} onChange={handleFilterChange} aria-label="Filter by funding source"
                className="filter-select--funding">
                <option value="">All Funding Sources</option>
                <option value="Government">Government Budget</option>
                <option value="GIIF">GIIF</option>
                <option value="DACF">DACF</option>
                <option value="WorldBank">World Bank</option>
                <option value="IMF">IMF</option>
                <option value="UNDP">UNDP</option>
                {uniqueValues.fundingSources
                  .filter(f => !['Government','GIIF','DACF','WorldBank','IMF','UNDP'].includes(f))
                  .map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              {/* Active filter chips */}
              <div className="filter-active-chips">
                {filters.status && (
                  <span className="filter-chip">
                    {filters.status === 'Resumed' ? 'Ongoing' : filters.status}
                    <button onClick={() => setFilters(p => ({...p, status:''}))} aria-label="Remove status filter">×</button>
                  </span>
                )}
                {filters.fundingSource && (
                  <span className="filter-chip">
                    {filters.fundingSource}
                    <button onClick={() => setFilters(p => ({...p, fundingSource:''}))} aria-label="Remove funding filter">×</button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Projects ─────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="skeleton-grid">
            {Array.from({ length: 6 }).map((_,i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <div className="hp-projects-section">
            <div className="hp-section-header">
              <h2 className="hp-section-title">
                {filters.region || filters.district || filters.type ? 'Filtered projects' : 'All projects'}
              </h2>
              <span className="hp-section-count">
                {filteredProjects.length} result{filteredProjects.length !== 1 ? 's' : ''}
              </span>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon">🔍</span>
                <h3>No projects found</h3>
                <p>Try adjusting your filters to see more results.</p>
              </div>
            ) : (
              <div className="projects-grid">
                {currentProjects.map(project => (
                  <div key={project._id} className="project-card">
                    <div className="project-image-wrap">
                      {project.imageUrl ? (
                        <img
                          src={`${apiUrl(project.imageUrl)}?w=400`}
                          alt={project.title}
                          className="project-image"
                          loading="lazy"
                        />
                      ) : (
                        <div className="project-image-placeholder" aria-hidden="true">
                          {TYPE_ICON[project.type] ?? '🏗️'}
                        </div>
                      )}
                      <span className={`project-status-badge ${STATUS_CLASS[project.status] || ''}`}>
                        {STATUS_LABEL[project.status] || project.status}
                      </span>
                      <span className="project-region-tag">{project.region}</span>
                    </div>
                    <div className="project-content">
                      <h2>{project.title}</h2>
                      <div className="project-meta-row">
                        <span className="project-meta-chip">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                            <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                          </svg>
                          {project.type}
                        </span>
                        <span className="project-meta-chip">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/>
                            <circle cx="12" cy="10" r="3"/>
                          </svg>
                          {project.district || project.region}
                        </span>
                      </div>
                      {project.description && (
                        <p className="project-desc">{project.description}</p>
                      )}
                      <div className="project-card-footer">
                        <button onClick={() => navigate(`/project/${project._id}`)} className="view-details-btn">
                          View Details
                        </button>
                        <div
                          className="comment-count-container"
                          onClick={() => setModalProject(project)}
                          role="button" tabIndex={0}
                          onKeyDown={e => e.key === 'Enter' && setModalProject(project)}
                          aria-label={`${project.commentCount ?? 0} comments`}
                        >
                          <i className="far fa-comment comment-icon" aria-hidden="true" />
                          <span className="comment-count-number">
                            {project.commentCount ?? project.comments?.length ?? 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {modalProject && (
          <CommentModal
            project={modalProject}
            onClose={() => setModalProject(null)}
            onCommentCountChange={handleCommentCountChange}
          />
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: totalPages }, (_,i) => (
            <button
              key={i}
              onClick={() => { setCurrentPage(i+1); window.scrollTo({ top:0, behavior:'smooth' }); }}
              className={currentPage === i+1 ? 'active-page' : ''}
              aria-label={`Page ${i+1}`}
              aria-current={currentPage === i+1 ? 'page' : undefined}
            >
              {i+1}
            </button>
          ))}
        </div>
      )}

      <Footer />

      {/* PWA install button — only shown when browser confirms installability */}
      {installable && (
        <button onClick={handleInstallClick} className="install-btn" aria-label="Install Ghana Project Tracker app">
          <img src="/images/logo.png" alt="" className="install-logo-icon" aria-hidden="true" />
          <span className="install-text">Install App</span>
        </button>
      )}

      {showPopup && popupProject && (
        <ProjectPopup
          project={popupProject}
          onClose={handleClosePopup}
          onNext={handleNextPopup}
          totalCount={popupPool.length}
          currentIndex={popupIndex}
        />
      )}
    </>
  );
};

export default HomePage;