/**
 * ProjectMap.js
 * Live project map with colour-coded status pins, rich popups,
 * district heatmap layer, and a floating legend/layer toggle.
 *
 * Depends on: react-leaflet, leaflet  (already installed)
 * No extra npm packages required — heatmap is a pure canvas layer.
 */

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../utils/api';
import '../css/ProjectMap.css';

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS = {
  Resumed:     { label: 'Ongoing',      color: '#006B3F', hex: 0x006B3F, emoji: '🔨' },
  Completed:   { label: 'Completed',    color: '#1d4ed8', hex: 0x1d4ed8, emoji: '✅' },
  Abandoned:   { label: 'Abandoned',    color: '#CE1126', hex: 0xCE1126, emoji: '⚠️'  },
  Uncompleted: { label: 'Uncompleted',  color: '#f59e0b', hex: 0xf59e0b, emoji: '⏳' },
};

const statusColor = (s) => STATUS[s]?.color || '#64748b';
const statusLabel = (s) => STATUS[s]?.label || s || 'Unknown';

// ── SVG pin factory ────────────────────────────────────────────────────────────
// Creates a crisp SVG pin with a coloured head and white centre dot.
// No external image files needed — works offline and on any server.
function makePinIcon(color, size = 36) {
  const half = size / 2;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.4}" viewBox="0 0 ${size} ${size * 1.4}">
      <filter id="sh" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
      </filter>
      <ellipse cx="${half}" cy="${size * 1.35}" rx="${half * 0.35}" ry="${half * 0.12}"
        fill="rgba(0,0,0,0.2)"/>
      <circle cx="${half}" cy="${half}" r="${half - 2}" fill="${color}" filter="url(#sh)"/>
      <circle cx="${half}" cy="${half}" r="${half * 0.38}" fill="rgba(255,255,255,0.92)"/>
      <line x1="${half}" y1="${size - 2}" x2="${half}" y2="${size * 1.3}"
        stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`.trim();
  return L.divIcon({
    className: '',
    html: svg,
    iconSize:   [size,     size * 1.4],
    iconAnchor: [half,     size * 1.4],
    popupAnchor:[0,       -size * 1.1],
  });
}

// Pre-build one icon per status
const PIN_ICONS = {
  Resumed:     makePinIcon(STATUS.Resumed.color),
  Completed:   makePinIcon(STATUS.Completed.color),
  Abandoned:   makePinIcon(STATUS.Abandoned.color),
  Uncompleted: makePinIcon(STATUS.Uncompleted.color),
  default:     makePinIcon('#64748b'),
};

// ── Heatmap canvas layer ───────────────────────────────────────────────────────
// Pure Leaflet layer — no leaflet.heat package needed.
// Renders a radial gradient canvas overlay weighted by project density per district.
class HeatmapLayer extends L.Layer {
  constructor(points, options = {}) {
    super(options);
    this._points = points; // [{lat, lng, weight}]
    this._radius = options.radius || 35000; // metres
  }

  onAdd(map) {
    this._map = map;
    this._canvas = L.DomUtil.create('canvas', 'heatmap-canvas');
    const size = map.getSize();
    this._canvas.width  = size.x;
    this._canvas.height = size.y;
    this._canvas.style.position = 'absolute';
    this._canvas.style.pointerEvents = 'none';
    this._canvas.style.zIndex = '200';
    map.getPanes().overlayPane.appendChild(this._canvas);
    map.on('moveend zoomend resize', this._draw, this);
    this._draw();
    return this;
  }

  onRemove(map) {
    map.getPanes().overlayPane.removeChild(this._canvas);
    map.off('moveend zoomend resize', this._draw, this);
  }

  _draw() {
    if (!this._map || !this._canvas) return;
    const map  = this._map;
    const size = map.getSize();
    this._canvas.width  = size.x;
    this._canvas.height = size.y;
    const ctx = this._canvas.getContext('2d');
    ctx.clearRect(0, 0, size.x, size.y);

    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, topLeft);

    if (!this._points.length) return;
    const maxWeight = Math.max(...this._points.map(p => p.weight), 1);

    this._points.forEach(({ lat, lng, weight }) => {
      const pt  = map.latLngToContainerPoint([lat, lng]);
      const r   = Math.max(30, Math.min(120, (weight / maxWeight) * 90 + 30));
      const alpha = 0.15 + (weight / maxWeight) * 0.45;
      const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r);
      grad.addColorStop(0,   `rgba(206,17,38,${alpha})`);
      grad.addColorStop(0.5, `rgba(252,209,22,${alpha * 0.5})`);
      grad.addColorStop(1,   'rgba(0,107,63,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  update(points) {
    this._points = points;
    this._draw();
  }
}

// ── React component that manages the heatmap layer lifecycle ──────────────────
function HeatmapOverlay({ points, visible }) {
  const map     = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (visible && points.length > 0) {
      if (!layerRef.current) {
        layerRef.current = new HeatmapLayer(points).addTo(map);
      } else {
        layerRef.current.update(points);
      }
    } else if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
  }, [visible, points, map]);

  useEffect(() => () => {
    if (layerRef.current) map.removeLayer(layerRef.current);
  }, [map]);

  return null;
}

// ── Project markers layer ─────────────────────────────────────────────────────
function ProjectMarkers({ projects, onSelect }) {
  const map        = useMap();
  const markersRef = useRef({});
  const layerRef   = useRef(null);

  useEffect(() => {
    // Clean previous layer
    if (layerRef.current) map.removeLayer(layerRef.current);
    markersRef.current = {};
    const group = L.layerGroup().addTo(map);
    layerRef.current = group;

    projects.forEach(project => {
      const lat = parseFloat(project.gps?.latitude);
      const lng = parseFloat(project.gps?.longitude);
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

      const icon   = PIN_ICONS[project.status] || PIN_ICONS.default;
      const marker = L.marker([lat, lng], { icon, title: project.title });

      marker.on('click', () => onSelect(project));
      marker.bindTooltip(project.title, {
        direction: 'top',
        offset:    [0, -30],
        className: 'pm-tooltip',
      });

      group.addLayer(marker);
      markersRef.current[project._id] = marker;
    });

    return () => { if (layerRef.current) map.removeLayer(layerRef.current); };
  }, [projects, map, onSelect]);

  return null;
}

// ── Fly-to on project select ───────────────────────────────────────────────────
function FlyToProject({ project }) {
  const map = useMap();
  useEffect(() => {
    if (!project) return;
    const lat = parseFloat(project.gps?.latitude);
    const lng = parseFloat(project.gps?.longitude);
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      map.flyTo([lat, lng], 13, { duration: 1.2 });
    }
  }, [project, map]);
  return null;
}

// ── Progress ring (mini SVG) ──────────────────────────────────────────────────
function MiniRing({ pct = 0, color = '#006B3F' }) {
  const r = 18; const circ = 2 * Math.PI * r;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-label={`${pct}% complete`}>
      <circle cx="22" cy="22" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4"/>
      <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeLinecap="round" strokeDasharray={circ}
        strokeDashoffset={circ - (pct / 100) * circ}
        style={{ transform:'rotate(-90deg)', transformOrigin:'22px 22px', transition:'stroke-dashoffset 0.6s ease' }}
      />
      <text x="22" y="27" textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>{pct}%</text>
    </svg>
  );
}

// ── Currency formatter ────────────────────────────────────────────────────────
const fmtGHS = (v) => v != null ? `GHS ${Number(v).toLocaleString('en-GH', { minimumFractionDigits:0 })}` : null;

// ── Main exported component ───────────────────────────────────────────────────
const ProjectMap = ({ projects = [] }) => {
  const navigate      = useNavigate();
  const [selected,    setSelected]    = useState(null);   // project in detail panel
  const [showHeat,    setShowHeat]    = useState(false);
  const [showPins,    setShowPins]    = useState(true);
  const [statusFilter,setStatusFilter]= useState('');     // '' = all

  // Projects with valid GPS
  const mappable = useMemo(() =>
    projects.filter(p => {
      const lat = parseFloat(p.gps?.latitude);
      const lng = parseFloat(p.gps?.longitude);
      return lat && lng && !isNaN(lat) && !isNaN(lng);
    }), [projects]);

  // Apply status filter
  const visible = useMemo(() =>
    statusFilter ? mappable.filter(p => p.status === statusFilter) : mappable,
  [mappable, statusFilter]);

  // Heatmap points: aggregate by district centroid (use the mean of project coords)
  const heatPoints = useMemo(() => {
    const districtMap = {};
    mappable.filter(p => p.status === 'Resumed' || !statusFilter || p.status === statusFilter)
      .forEach(p => {
        const key = p.district || p.region || 'unknown';
        if (!districtMap[key]) districtMap[key] = { lats:[], lngs:[], count:0 };
        districtMap[key].lats.push(parseFloat(p.gps.latitude));
        districtMap[key].lngs.push(parseFloat(p.gps.longitude));
        districtMap[key].count++;
      });
    return Object.values(districtMap).map(d => ({
      lat:    d.lats.reduce((a,b) => a+b, 0) / d.lats.length,
      lng:    d.lngs.reduce((a,b) => a+b, 0) / d.lngs.length,
      weight: d.count,
    }));
  }, [mappable, statusFilter]);

  // Status summary counts (from ALL projects, not just mappable)
  const counts = useMemo(() => {
    const c = { Resumed:0, Completed:0, Abandoned:0, Uncompleted:0, total: projects.length, mapped: mappable.length };
    projects.forEach(p => { if (c[p.status] !== undefined) c[p.status]++; });
    return c;
  }, [projects, mappable]);

  const handleSelect = useCallback((project) => setSelected(project), []);

  const selectedColor = selected ? statusColor(selected.status) : '#64748b';
  const selectedPct   = selected ? (Number(selected.completionPercentage) || 0) : 0;

  return (
    <div className="pm-root">
      {/* ── Map stats bar ── */}
      <div className="pm-stats-bar">
        <div className="pm-stats-inner">
          {/* Total / mapped */}
          <div className="pm-stat-total">
            <span className="pm-stat-total-num">{counts.total}</span>
            <span className="pm-stat-total-lab">Total projects</span>
            <span className="pm-stat-total-sub">({counts.mapped} on map)</span>
          </div>
          <div className="pm-stats-divider"/>
          {/* Per-status pills */}
          {Object.entries(STATUS).map(([key, cfg]) => (
            <button
              key={key}
              className={`pm-stat-pill ${statusFilter === key ? 'active' : ''}`}
              style={{ '--pill-color': cfg.color }}
              onClick={() => setStatusFilter(prev => prev === key ? '' : key)}
              title={`Filter to ${cfg.label} only`}
            >
              <span className="pm-stat-pill-dot" style={{ background: cfg.color }}/>
              <span className="pm-stat-pill-label">{cfg.label}</span>
              <span className="pm-stat-pill-count">{counts[key]}</span>
            </button>
          ))}
          {statusFilter && (
            <button className="pm-clear-filter" onClick={() => setStatusFilter('')}>
              ✕ All
            </button>
          )}
          {/* Layer toggles */}
          <div className="pm-layer-toggles">
            <button
              className={`pm-layer-btn ${showPins ? 'on' : ''}`}
              onClick={() => setShowPins(p => !p)}
              title="Toggle project pins"
            >
              📍 Pins
            </button>
            <button
              className={`pm-layer-btn ${showHeat ? 'on' : ''}`}
              onClick={() => setShowHeat(p => !p)}
              title="Toggle district heatmap"
            >
              🌡️ Heatmap
            </button>
          </div>
        </div>
      </div>

      {/* ── Map + panel layout ── */}
      <div className={`pm-layout ${selected ? 'pm-layout--split' : ''}`}>

        {/* Map */}
        <div className="pm-map-wrap">
          <MapContainer
            center={[7.9465, -1.0232]}
            zoom={7}
            minZoom={6}
            maxZoom={16}
            scrollWheelZoom
            zoomControl
            style={{ height:'100%', width:'100%' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
              maxZoom={19}
            />

            {/* Heatmap layer */}
            <HeatmapOverlay points={heatPoints} visible={showHeat} />

            {/* Project pins */}
            {showPins && <ProjectMarkers projects={visible} onSelect={handleSelect} />}

            {/* Fly to selected project */}
            <FlyToProject project={selected} />
          </MapContainer>

          {/* Legend overlay */}
          <div className="pm-legend">
            <div className="pm-legend-title">Status</div>
            {Object.entries(STATUS).map(([key, cfg]) => (
              <div key={key} className="pm-legend-row">
                <span className="pm-legend-dot" style={{ background: cfg.color }}/>
                <span className="pm-legend-label">{cfg.label}</span>
              </div>
            ))}
            {showHeat && (
              <>
                <div className="pm-legend-divider"/>
                <div className="pm-legend-title">Heatmap</div>
                <div className="pm-legend-heat-bar"/>
                <div className="pm-legend-heat-labels">
                  <span>Low</span><span>High</span>
                </div>
              </>
            )}
          </div>

          {/* No-GPS notice */}
          {mappable.length === 0 && (
            <div className="pm-no-gps">
              <span>📍</span>
              <span>No projects have GPS coordinates yet.<br/>Add GPS when onboarding a project to see it here.</span>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="pm-detail-panel">
            <div className="pm-detail-header" style={{ borderTop:`4px solid ${selectedColor}` }}>
              <button className="pm-detail-close" onClick={() => setSelected(null)} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>

              {selected.imageUrl ? (
                <img src={apiUrl(selected.imageUrl)} alt={selected.title} className="pm-detail-img"/>
              ) : (
                <div className="pm-detail-img-placeholder">
                  <span>{STATUS[selected.status]?.emoji || '🏗️'}</span>
                </div>
              )}

              <div className="pm-detail-header-body">
                <span className="pm-detail-status-badge"
                  style={{ background: selectedColor + '20', color: selectedColor }}>
                  <span style={{ display:'inline-block', width:7, height:7, borderRadius:'50%', background:selectedColor, marginRight:5 }}/>
                  {statusLabel(selected.status)}
                </span>
                <h3 className="pm-detail-title">{selected.title}</h3>
                <div className="pm-detail-location">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  {[selected.district, selected.region].filter(Boolean).join(', ')}
                </div>
              </div>
            </div>

            <div className="pm-detail-body">
              {/* Progress ring + pct */}
              <div className="pm-detail-progress-row">
                <MiniRing pct={selectedPct} color={selectedColor}/>
                <div>
                  <div className="pm-detail-progress-label">Completion progress</div>
                  <div className="pm-detail-progress-sub">{selectedPct}% complete</div>
                </div>
              </div>

              {/* Info grid */}
              <div className="pm-detail-grid">
                {[
                  { label: 'Type',        value: selected.type },
                  { label: 'Contractor',  value: selected.contractor },
                  { label: 'Started',     value: selected.projectStartDate
                      ? new Date(selected.projectStartDate).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})
                      : null },
                  { label: 'Due',         value: selected.expectedCompletionDate
                      ? new Date(selected.expectedCompletionDate).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})
                      : null },
                ].filter(r => r.value).map(r => (
                  <div key={r.label} className="pm-detail-grid-item">
                    <div className="pm-detail-grid-label">{r.label}</div>
                    <div className="pm-detail-grid-value">{r.value}</div>
                  </div>
                ))}
              </div>

              {/* Financials */}
              {(selected.totalCost != null || selected.amountPaid != null || selected.outstandingAmount != null) && (
                <div className="pm-detail-financials">
                  {selected.totalCost != null && (
                    <div className="pm-fin-item pm-fin-total">
                      <div className="pm-fin-label">Total cost</div>
                      <div className="pm-fin-value">{fmtGHS(selected.totalCost)}</div>
                    </div>
                  )}
                  {selected.amountPaid != null && (
                    <div className="pm-fin-item pm-fin-paid">
                      <div className="pm-fin-label">Paid</div>
                      <div className="pm-fin-value">{fmtGHS(selected.amountPaid)}</div>
                      {selected.totalCost > 0 && (
                        <div className="pm-fin-bar">
                          <div className="pm-fin-bar-fill"
                            style={{ width:`${Math.min(100, (selected.amountPaid/selected.totalCost)*100)}%` }}/>
                        </div>
                      )}
                    </div>
                  )}
                  {selected.outstandingAmount != null && (
                    <div className="pm-fin-item pm-fin-outstanding">
                      <div className="pm-fin-label">Outstanding</div>
                      <div className="pm-fin-value">{fmtGHS(selected.outstandingAmount)}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Description snippet */}
              {selected.description && (
                <p className="pm-detail-desc">
                  {selected.description.length > 160
                    ? selected.description.slice(0, 157) + '…'
                    : selected.description}
                </p>
              )}

              {/* CTA */}
              <button className="pm-detail-cta"
                onClick={() => navigate(`/project/${selected._id}`)}>
                View full project details
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectMap;