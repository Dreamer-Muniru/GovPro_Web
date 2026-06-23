import React, { useState, useEffect, useRef, useMemo } from 'react';
import '../css/HeroStatsCarousel.css';

// ── helpers ───────────────────────────────────────────────────────────────────

function useCountUp(target, active, duration = 1200) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    if (!active) { setValue(0); return; }
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, active, duration]);

  return value;
}

// ── sub-components ────────────────────────────────────────────────────────────

const BAR_COLORS = ['#CE1126', '#FCD116', '#006B3F', '#f97316', '#8b5cf6'];

// Slide 1: horizontal bar chart by region
const RegionSlide = ({ projects, active }) => {
  const regionCounts = useMemo(() => {
    const map = {};
    projects.forEach(p => {
      if (p.region) map[p.region] = (map[p.region] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [projects]);

  const max = regionCounts[0]?.[1] || 1;

  return (
    <div className="hsc-slide">
      <div className="hsc-slide-header">
        <span className="hsc-slide-eyebrow">Regional breakdown</span>
        <h3 className="hsc-slide-title">Top regions by project count</h3>
      </div>
      <div className="hsc-bars">
        {regionCounts.map(([region, count], i) => {
          const pct = Math.round((count / max) * 100);
          // Shorten long region names
          const label = region.replace(' Region', '').replace(' region', '');
          return (
            <div key={region} className="hsc-bar-row">
              <span className="hsc-bar-label">{label}</span>
              <div className="hsc-bar-track">
                <div
                  className={`hsc-bar-fill ${active ? 'hsc-bar-fill--animated' : ''}`}
                  style={{
                    width: active ? `${pct}%` : '0%',
                    background: BAR_COLORS[i % BAR_COLORS.length],
                    transitionDelay: `${i * 0.12}s`,
                  }}
                />
              </div>
              <span className="hsc-bar-count">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Slide 2: status breakdown with count-up numbers
const StatusSlide = ({ projects, active }) => {
  const stats = useMemo(() => ({
    total:     projects.length,
    ongoing:   projects.filter(p => p.status === 'Resumed').length,
    abandoned: projects.filter(p => p.status === 'Abandoned').length,
    completed: projects.filter(p => p.status === 'Completed').length,
  }), [projects]);

  const total     = useCountUp(stats.total,     active, 900);
  const ongoing   = useCountUp(stats.ongoing,   active, 1100);
  const abandoned = useCountUp(stats.abandoned, active, 1300);
  const completed = useCountUp(stats.completed, active, 1000);

  const pctOngoing   = stats.total ? Math.round((stats.ongoing   / stats.total) * 100) : 0;
  const pctAbandoned = stats.total ? Math.round((stats.abandoned / stats.total) * 100) : 0;
  const pctCompleted = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;

  const metrics = [
    { label: 'Total tracked',  value: total,     color: '#94a3b8', pct: 100,          icon: '📋' },
    { label: 'Ongoing',        value: ongoing,   color: '#4ade80', pct: pctOngoing,   icon: '🔨' },
    { label: 'Abandoned',      value: abandoned, color: '#f87171', pct: pctAbandoned, icon: '⚠️' },
    { label: 'Completed',      value: completed, color: '#FCD116', pct: pctCompleted, icon: '✅' },
  ];

  return (
    <div className="hsc-slide">
      <div className="hsc-slide-header">
        <span className="hsc-slide-eyebrow">At a glance</span>
        <h3 className="hsc-slide-title">Project status breakdown</h3>
      </div>
      <div className="hsc-status-grid">
        {metrics.map(({ label, value, color, pct, icon }) => (
          <div key={label} className="hsc-status-card">
            <div className="hsc-status-icon">{icon}</div>
            <div className="hsc-status-value" style={{ color }}>{value}</div>
            <div className="hsc-status-label">{label}</div>
            <div className="hsc-status-bar-track">
              <div
                className={`hsc-status-bar-fill ${active ? 'hsc-status-bar-fill--animated' : ''}`}
                style={{ width: active ? `${pct}%` : '0%', background: color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Slide 3: top 3 districts by ongoing projects (podium)
const DistrictSlide = ({ projects, active }) => {
  const podium = useMemo(() => {
    const map = {};
    projects
      .filter(p => p.status === 'Resumed' && p.district)
      .forEach(p => { map[p.district] = (map[p.district] || 0) + 1; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 3);
    // Reorder for visual podium: [2nd, 1st, 3rd]
    if (sorted.length === 3) return [sorted[1], sorted[0], sorted[2]];
    return sorted;
  }, [projects]);

  const PODIUM_HEIGHTS = ['68px', '95px', '50px'];
  const PODIUM_COLORS  = ['#94a3b8', '#FCD116', '#CD7F32'];
  const PODIUM_RANKS   = ['2nd', '1st', '3rd'];

  return (
    <div className="hsc-slide">
      <div className="hsc-slide-header">
        <span className="hsc-slide-eyebrow">Most active districts</span>
        <h3 className="hsc-slide-title">Leading districts for ongoing projects</h3>
      </div>
      <div className="hsc-podium">
        {podium.map(([district, count], i) => (
          <div key={district} className="hsc-podium-col">
            <div className="hsc-podium-count" style={{ color: PODIUM_COLORS[i] }}>{count}</div>
            <div className="hsc-podium-name">{district.replace(' Municipal', '').replace(' District', '').replace(' Metropolitan', '')}</div>
            <div
              className={`hsc-podium-block ${active ? 'hsc-podium-block--animated' : ''}`}
              style={{
                height: active ? PODIUM_HEIGHTS[i] : '0px',
                background: PODIUM_COLORS[i],
                transitionDelay: `${i * 0.15}s`,
              }}
            >
              <span className="hsc-podium-rank">{PODIUM_RANKS[i]}</span>
            </div>
          </div>
        ))}
        {podium.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', width: '100%' }}>
            No ongoing projects yet
          </p>
        )}
      </div>
    </div>
  );
};

// Slide 4: Abandoned vs Completed comparison with animated ring
const ComparisonSlide = ({ projects, active }) => {
  const stats = useMemo(() => {
    const abandoned = projects.filter(p => p.status === 'Abandoned').length;
    const completed = projects.filter(p => p.status === 'Completed').length;
    const total     = abandoned + completed || 1;
    return {
      abandoned,
      completed,
      recoveryRate: Math.round((completed / total) * 100),
    };
  }, [projects]);

  const rate      = useCountUp(stats.recoveryRate, active, 1400);
  const abandoned = useCountUp(stats.abandoned,    active, 1000);
  const completed = useCountUp(stats.completed,    active, 1200);

  // SVG ring params
  const R          = 42;
  const CIRCUM     = 2 * Math.PI * R;
  const fillOffset = active
    ? CIRCUM - (stats.recoveryRate / 100) * CIRCUM
    : CIRCUM;

  return (
    <div className="hsc-slide">
      <div className="hsc-slide-header">
        <span className="hsc-slide-eyebrow">Recovery insight</span>
        <h3 className="hsc-slide-title">Completion vs abandonment rate</h3>
      </div>
      <div className="hsc-comparison">
        {/* Animated SVG ring */}
        <div className="hsc-ring-wrap">
          <svg width="110" height="110" viewBox="0 0 110 110" aria-hidden="true">
            <circle cx="55" cy="55" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
            <circle
              cx="55" cy="55" r={R}
              fill="none"
              stroke="#4ade80"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUM}
              strokeDashoffset={fillOffset}
              style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1) 0.3s', transform: 'rotate(-90deg)', transformOrigin: '55px 55px' }}
            />
          </svg>
          <div className="hsc-ring-center">
            <div className="hsc-ring-pct">{rate}%</div>
            <div className="hsc-ring-sublabel">completion</div>
          </div>
        </div>

        {/* Two stat blocks */}
        <div className="hsc-comp-stats">
          <div className="hsc-comp-stat">
            <div className="hsc-comp-value" style={{ color: '#4ade80' }}>{completed}</div>
            <div className="hsc-comp-label">Completed</div>
            <div className="hsc-comp-bar-track">
              <div className={`hsc-comp-bar ${active ? 'hsc-comp-bar--animated' : ''}`}
                style={{ width: active ? `${stats.recoveryRate}%` : '0%', background: '#4ade80' }} />
            </div>
          </div>
          <div className="hsc-comp-stat">
            <div className="hsc-comp-value" style={{ color: '#f87171' }}>{abandoned}</div>
            <div className="hsc-comp-label">Abandoned</div>
            <div className="hsc-comp-bar-track">
              <div className={`hsc-comp-bar ${active ? 'hsc-comp-bar--animated' : ''}`}
                style={{ width: active ? `${100 - stats.recoveryRate}%` : '0%', background: '#f87171', transitionDelay: '0.2s' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── main carousel ─────────────────────────────────────────────────────────────

const SLIDE_DURATION = 5000;

const HeroStatsCarousel = ({ projects }) => {
  const [current,   setCurrent]   = useState(0);
  const [paused,    setPaused]    = useState(false);
  const [direction, setDirection] = useState('next'); // 'next' | 'prev'
  const intervalRef = useRef(null);

  const slides = [
    { id: 'region',     label: 'By Region',   component: RegionSlide },
    { id: 'status',     label: 'Status',       component: StatusSlide },
    { id: 'district',   label: 'Districts',    component: DistrictSlide },
    { id: 'comparison', label: 'Completion',   component: ComparisonSlide },
  ];

  const go = (idx, dir = 'next') => {
    setDirection(dir);
    setCurrent((idx + slides.length) % slides.length);
  };

  const next = () => go(current + 1, 'next');
  const prev = () => go(current - 1, 'prev');

  // Auto-advance
  useEffect(() => {
    if (paused || !projects.length) return;
    intervalRef.current = setInterval(next, SLIDE_DURATION);
    return () => clearInterval(intervalRef.current);
  }, [current, paused, projects.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!projects.length) return null;

  const SlideComponent = slides[current].component;

  return (
    <div
      className="hsc-root"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Progress bar */}
      {!paused && (
        <div className="hsc-progress-bar" key={`${current}-progress`}>
          <div className="hsc-progress-fill" style={{ animationDuration: `${SLIDE_DURATION}ms` }} />
        </div>
      )}

      {/* Slide content */}
      <div className={`hsc-slide-wrap hsc-slide-wrap--${direction}`} key={current}>
        <SlideComponent projects={projects} active={true} />
      </div>

      {/* Controls */}
      <div className="hsc-controls">
        <button className="hsc-arrow hsc-arrow--prev" onClick={prev} aria-label="Previous slide">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>

        <div className="hsc-dots">
          {slides.map((s, i) => (
            <button
              key={s.id}
              className={`hsc-dot ${i === current ? 'hsc-dot--active' : ''}`}
              onClick={() => go(i, i > current ? 'next' : 'prev')}
              aria-label={s.label}
              aria-current={i === current}
            />
          ))}
        </div>

        <button className="hsc-arrow hsc-arrow--next" onClick={next} aria-label="Next slide">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>

      <p className="hsc-pause-hint">{paused ? '▶ hover to resume' : '⏸ hover to pause'}</p>
    </div>
  );
};

export default HeroStatsCarousel;