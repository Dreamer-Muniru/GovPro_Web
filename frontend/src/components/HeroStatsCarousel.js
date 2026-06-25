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
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, active, duration]);

  return value;
}

// Shorten region/district labels for display
const shortenLabel = (name = '') =>
  name
    .replace(/ Region$/i, '')
    .replace(/ Municipal$/i, '')
    .replace(/ Metropolitan$/i, '')
    .replace(/ District$/i, '');

// ── Slide 1: Top regions by project count ─────────────────────────────────────
const RegionSlide = ({ projects, active }) => {
  const regionData = useMemo(() => {
    const map = {};
    projects.forEach(p => {
      if (!p.region) return;
      if (!map[p.region]) map[p.region] = { total: 0, ongoing: 0, completed: 0, abandoned: 0 };
      map[p.region].total += 1;
      if (p.status === 'Resumed')    map[p.region].ongoing   += 1;
      if (p.status === 'Completed')  map[p.region].completed += 1;
      if (p.status === 'Abandoned')  map[p.region].abandoned += 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 8);                         // show up to 8 regions
  }, [projects]);

  const max = regionData[0]?.[1].total || 1;

  return (
    <div className="hsc-slide">
      <div className="hsc-slide-header">
        <span className="hsc-slide-eyebrow">Regional breakdown</span>
        <h3 className="hsc-slide-title">Top regions by project count</h3>
      </div>
      <div className="hsc-bars">
        {regionData.map(([region, data], i) => {
          const pct = Math.round((data.total / max) * 100);
          return (
            <div key={region} className="hsc-bar-row">
              <span className="hsc-bar-label">{shortenLabel(region)}</span>
              <div className="hsc-bar-track">
                <div
                  className={`hsc-bar-fill ${active ? 'hsc-bar-fill--animated' : ''}`}
                  style={{
                    width: active ? `${pct}%` : '0%',
                    background: 'rgba(255,255,255,0.82)',
                    transitionDelay: `${i * 0.1}s`,
                  }}
                />
              </div>
              {/* Meaningful breakdown instead of a raw number */}
              <span className="hsc-bar-breakdown">
                <span className="hsc-bd-total">{data.total}</span>
                <span className="hsc-bd-detail">
                  {data.ongoing > 0   && <span className="hsc-bd-ongoing">{data.ongoing} ongoing</span>}
                  {data.completed > 0 && <span className="hsc-bd-completed">{data.completed} done</span>}
                  {data.abandoned > 0 && <span className="hsc-bd-abandoned">{data.abandoned} stalled</span>}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Slide 2: Leading districts for ongoing projects ───────────────────────────
// Horizontal bar chart, sorted tallest→shortest (highest count at top).
// Designed to handle all 265 districts — shows top 8.
const DistrictSlide = ({ projects, active }) => {
  const districtData = useMemo(() => {
    const map = {};
    projects
      .filter(p => p.status === 'Resumed' && p.district)
      .forEach(p => { map[p.district] = (map[p.district] || 0) + 1; });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])   // highest first
      .slice(0, 8);                   // top 8 districts
  }, [projects]);

  const max = districtData[0]?.[1] || 1;

  return (
    <div className="hsc-slide">
      <div className="hsc-slide-header">
        <span className="hsc-slide-eyebrow">Most active districts</span>
        <h3 className="hsc-slide-title">Leading districts for ongoing projects</h3>
      </div>

      {districtData.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: '2rem', fontSize: 13 }}>
          No ongoing projects yet
        </p>
      ) : (
        <div className="hsc-bars hsc-bars--district">
          {districtData.map(([district, count], i) => {
            const pct = Math.round((count / max) * 100);
            return (
              <div key={district} className="hsc-bar-row">
                <span className="hsc-bar-label hsc-bar-label--district">
                  <span className="hsc-bar-rank">#{i + 1}</span>
                  {shortenLabel(district)}
                </span>
                <div className="hsc-bar-track">
                  <div
                    className={`hsc-bar-fill ${active ? 'hsc-bar-fill--animated' : ''}`}
                    style={{
                      width: active ? `${pct}%` : '0%',
                      background: 'rgba(252, 209, 22, 0.85)',   // Ghana gold — single consistent color
                      transitionDelay: `${i * 0.09}s`,
                    }}
                  />
                </div>
                <span className="hsc-bar-count">
                  {count} <span style={{ fontSize: 9, opacity: 0.6 }}>proj</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── main carousel ─────────────────────────────────────────────────────────────

const SLIDE_DURATION = 5500;

const HeroStatsCarousel = ({ projects }) => {
  const [current,   setCurrent]   = useState(0);
  const [paused,    setPaused]    = useState(false);
  const [direction, setDirection] = useState('next');
  const intervalRef = useRef(null);

  const slides = [
    { id: 'region',   label: 'By Region',  component: RegionSlide   },
    { id: 'district', label: 'Districts',  component: DistrictSlide },
  ];

  const go = (idx, dir = 'next') => {
    setDirection(dir);
    setCurrent((idx + slides.length) % slides.length);
  };

  const next = () => go(current + 1, 'next');
  const prev = () => go(current - 1, 'prev');

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

      {/* Slide */}
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