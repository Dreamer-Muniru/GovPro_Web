import React, { useState, useEffect, useContext } from 'react';
import { createProject } from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
import ghanaRegions from '../data/ghanaRegions';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'leaflet/dist/leaflet.css';
import '../css/AddProjectForm.css';
import '../css/AddProjectForm.offline.css';   // <-- new offline-specific styles
import { saveToQueue, fileToBase64 } from '../utils/offlineDB';
import { AuthContext } from '../context/AuthContext';

const DEFAULT_LAT = 5.5546;
const DEFAULT_LNG = -0.1963;

const pinpointIcon = new Icon({
  iconUrl: '/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const MapUpdater = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 15, { animate: false });
  }, [position, map]);
  return null;
};

const MapView = ({ position, handleMarkerDrag }) => {
  if (!position) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#f3f4f6', color: '#6b7280', fontSize: '0.9rem', gap: '10px',
      }}>
        <div className="spinner" style={{
          width: '40px', height: '40px',
          border: '4px solid #e5e7eb', borderTop: '4px solid #3b82f6',
          borderRadius: '50%', animation: 'spin 1s linear infinite',
        }} />
        <span>Detecting your location…</span>
        <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }
  return (
    <MapContainer center={position} zoom={15} style={{ height: '100%', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapUpdater position={position} />
      <Marker
        position={position}
        icon={pinpointIcon}
        draggable
        eventHandlers={{ dragend: handleMarkerDrag }}
      />
    </MapContainer>
  );
};

// ─── main component ──────────────────────────────────────────────────────────

const AddProjectForm = () => {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const { user }    = useContext(AuthContext);

  const [formData, setFormData] = useState({
    title: '', type: '', fundingSource: '', otherFundingSources: '',
    description: '', region: '', district: '', location_address: '',
    location_city: '', gps_latitude: '', gps_longitude: '',
    contractor: '', status: '', startDate: '', submittedBy: '',
    completionPercentage: 0, totalCost: '', amountPaid: '', outstandingAmount: '', expectedCompletionDate: '',
  });

  const [image,          setImage]          = useState(null);
  const [previewUrl,     setPreviewUrl]      = useState('');
  const [loading,        setLoading]         = useState(false);
  const [error,          setError]           = useState('');
  const [position,       setPosition]        = useState(null);
  const [locationStatus, setLocationStatus]  = useState('loading');
  const [isOnline,       setIsOnline]        = useState(navigator.onLine);
  // After a successful offline save we show a confirmation panel instead of navigating
  const [savedOffline,   setSavedOffline]    = useState(false);

  // ── pre-fill submittedBy from logged-in user ──────────────────────────────
  useEffect(() => {
    if (user?.fullName || user?.username) {
      setFormData((prev) => ({
        ...prev,
        submittedBy: prev.submittedBy || user.fullName || user.username,
      }));
    }
  }, [user]);

  // ── online / offline detection ────────────────────────────────────────────
  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── geolocation ───────────────────────────────────────────────────────────
  const applyPosition = (latitude, longitude) => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    setPosition([lat, lng]);
    setFormData((prev) => ({
      ...prev,
      gps_latitude:  lat.toFixed(6),
      gps_longitude: lng.toFixed(6),
    }));
  };

  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('unsupported');
      applyPosition(DEFAULT_LAT, DEFAULT_LNG);
      return;
    }
    setLocationStatus('loading');
    setPosition(null);

    const onSuccess = (pos) => {
      applyPosition(pos.coords.latitude, pos.coords.longitude);
      setLocationStatus('success');
    };
    const onError = (err) => {
      const codeMap = { 1: 'denied', 2: 'unavailable', 3: 'timeout' };
      setLocationStatus(codeMap[err.code] || 'unavailable');
      applyPosition(DEFAULT_LAT, DEFAULT_LNG);
    };

    navigator.geolocation.getCurrentPosition(onSuccess, (err) => {
      navigator.geolocation.getCurrentPosition(
        onSuccess, onError,
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
  };

  useEffect(() => { requestLocation(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── form helpers ──────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleMarkerDrag = (event) => {
    const { lat, lng } = event.target.getLatLng();
    setPosition([lat, lng]);
    setFormData((prev) => ({
      ...prev,
      gps_latitude:  lat.toFixed(6),
      gps_longitude: lng.toFixed(6),
    }));
    setLocationStatus('manual');
  };

  // ── offline save ──────────────────────────────────────────────────────────
  const handleOfflineSave = async () => {
    setLoading(true);
    setError('');
    try {
      // Serialise image to base64 so it survives IndexedDB storage
      const imageData = image ? await fileToBase64(image) : null;

      await saveToQueue(
        { ...formData, startDate: formData.startDate },
        imageData
      );

      setSavedOffline(true);
      toast.info('📦 Project saved locally. It will sync when you reconnect.', {
        autoClose: 5000,
      });
    } catch (err) {
      console.error('Offline save failed:', err);
      setError('Could not save offline. Storage may be full or unavailable.');
    } finally {
      setLoading(false);
    }
  };

  // ── online submit ─────────────────────────────────────────────────────────
  const handleOnlineSubmit = async () => {
    setLoading(true);
    setError('');

    const fd = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) fd.append(key, value);
    });
    fd.append('location_region', formData.region);
    if (formData.startDate) fd.set('projectStartDate', formData.startDate);
    if (formData.fundingSource) fd.set('fundingSource', formData.fundingSource);
    if (formData.otherFundingSources) fd.set('otherFundingSources', formData.otherFundingSources);
    if (image) fd.append('image', image);

    try {
      const res = await createProject(fd);
      if (res && res.status >= 200 && res.status < 300) {
        try { await queryClient.invalidateQueries(['projects']); } catch (_) {}
        toast.success('✅ Project submitted successfully!', { autoClose: 3000 });
        navigate('/');
      } else {
        setError('Failed to submit project. Server returned an error.');
      }
    } catch (err) {
      // Network error mid-submit → fall back to offline save automatically
      if (!navigator.onLine || err.message === 'Network Error') {
        toast.warn('Connection lost. Saving project locally instead…', { autoClose: 4000 });
        await handleOfflineSave();
      } else {
        const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message;
        setError(msg ? `Submission failed: ${msg}` : 'Submission failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── form submit entry point ───────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isOnline) {
      handleOnlineSubmit();
    } else {
      handleOfflineSave();
    }
  };

  // ── offline confirmation screen ───────────────────────────────────────────
  if (savedOffline) {
    return (
      <div className="add-project-container">
        <div className="offline-confirmation">
          <div className="offline-confirmation__icon">📦</div>
          <h2 className="offline-confirmation__title">Project Saved Locally</h2>
          <p className="offline-confirmation__body">
            Your project has been stored on this device. It will be automatically
            uploaded to the server as soon as you have an internet connection.
          </p>
          <p className="offline-confirmation__hint">
            You can close this page safely — the sync will happen in the background
            next time the app is opened with connectivity.
          </p>
          <div className="offline-confirmation__actions">
            <button
              className="submit-btn"
              onClick={() => {
                setSavedOffline(false);
                setFormData({
                  title: '', type: '', fundingSource: '', otherFundingSources: '',
                  description: '', region: '', district: '', location_address: '',
                  location_city: '', gps_latitude: '', gps_longitude: '',
                  contractor: '', status: '', startDate: '',
                  submittedBy: user?.fullName || user?.username || '',
                  completionPercentage: 0, totalCost: '', amountPaid: '',
                  outstandingAmount: '', expectedCompletionDate: '',
                });
                setImage(null);
                setPreviewUrl('');
              }}
            >
              Submit Another Project
            </button>
            <button
              className="submit-btn submit-btn--secondary"
              onClick={() => navigate('/')}
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── location status messaging ─────────────────────────────────────────────
  const locationStatusContent = {
    loading:     { text: '📍 Detecting your location…',            tone: 'info',    showRetry: false },
    success:     { text: '✓ Using your current location',          tone: 'success', showRetry: false },
    denied:      { text: "Location access blocked. Allow access in your browser settings, then try again — or drag the pin.", tone: 'warning', showRetry: true },
    unavailable: { text: "Couldn't determine your location. Check device settings, or drag the pin on the map.", tone: 'warning', showRetry: true },
    timeout:     { text: 'Location request timed out. Try again, or drag the pin manually.', tone: 'warning', showRetry: true },
    unsupported: { text: "Browser doesn't support location. Drag the pin to set it manually.", tone: 'warning', showRetry: false },
    manual:      { text: '📍 Location set manually via map pin.',  tone: 'success', showRetry: false },
  }[locationStatus];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="add-project-container">
      <div className="add-project-header">
        <h1 className="add-project-title">Add New Project</h1>
      </div>

      {/* ── offline status pill ── */}
      {!isOnline && (
        <div className="offline-pill" role="alert">
          <span className="offline-pill__dot" aria-hidden="true" />
          <span>
            <strong>You are offline.</strong> Complete the form and press
            &ldquo;Save Offline&rdquo; — it will upload automatically when you reconnect.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="add-project-form">
        {/* ════ LOCATION SECTION ═══════════════════════════════════════════ */}
        <div className="form-section">
          <h3 className="section-title">Project Location</h3>

          <div className="form-group">
            <label className="form-label">Map Location</label>
            <div className="map-container">
              <MapView position={position} handleMarkerDrag={handleMarkerDrag} />
            </div>
            {locationStatusContent && (
              <div
                style={{
                  marginTop: '8px', fontSize: '0.875rem',
                  display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
                  color: locationStatusContent.tone === 'success' ? '#15803d'
                       : locationStatusContent.tone === 'warning' ? '#b45309' : '#374151',
                }}
              >
                <span>{locationStatusContent.text}</span>
                {locationStatusContent.showRetry && (
                  <button
                    type="button" onClick={requestLocation}
                    style={{
                      border: '1px solid currentColor', background: 'transparent',
                      color: 'inherit', borderRadius: '4px', padding: '2px 10px',
                      fontSize: '0.8rem', cursor: 'pointer',
                    }}
                  >
                    Try Again
                  </button>
                )}
              </div>
            )}
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
              Drag the pin to adjust the exact location.
            </p>
          </div>

          <div className="form-group">
            <div className="gps-display">
              <div>
                <label className="form-label">Latitude</label>
                <input
                  type="text" name="gps_latitude" value={formData.gps_latitude}
                  onChange={handleChange} className="form-input"
                  placeholder="Waiting for location…" readOnly required
                  style={{ cursor: 'default', background: '#f3f4f6', color: '#374151' }}
                />
              </div>
              <div>
                <label className="form-label">Longitude</label>
                <input
                  type="text" name="gps_longitude" value={formData.gps_longitude}
                  onChange={handleChange} className="form-input"
                  placeholder="Waiting for location…" readOnly required
                  style={{ cursor: 'default', background: '#f3f4f6', color: '#374151' }}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Region</label>
            <select name="region" value={formData.region} onChange={handleChange} className="form-select" required>
              <option value="">Select Region</option>
              {ghanaRegions.map((r) => (
                <option key={r.name} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">District</label>
            <select name="district" value={formData.district} onChange={handleChange}
              className="form-select" required disabled={!formData.region}>
              <option value="">Select District</option>
              {ghanaRegions.find((r) => r.name === formData.region)?.districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">City / Town</label>
            <input type="text" name="location_city" value={formData.location_city}
              onChange={handleChange} className="form-input" placeholder="Enter city or town" required />
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <input type="text" name="location_address" value={formData.location_address}
              onChange={handleChange} className="form-input" placeholder="Enter street address" required />
          </div>
        </div>

        {/* ════ DETAILS SECTION ════════════════════════════════════════════ */}
        <div className="form-section">
          <h3 className="section-title">Project Details</h3>

          <div className="form-group">
            <label className="form-label">Project Title</label>
            <input type="text" name="title" value={formData.title}
              onChange={handleChange} className="form-input" placeholder="Enter project title" required />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea name="description" value={formData.description}
              onChange={handleChange} className="form-textarea"
              placeholder="Describe the project" required />
          </div>

          <div className="form-group">
            <label className="form-label">Project Type</label>
            <select name="type" value={formData.type} onChange={handleChange} className="form-select" required>
              <option value="">Select Type</option>
              {[
                'School','Hospital','Road','Residential Bungalow','Market Stall',
                'Drainage System','Bridge','Water System','Power Project',
                'Sanitation Facility','Government Office','Sports & Recreation Center','Other',
              ].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Project Status</label>
            <select name="status" value={formData.status} onChange={handleChange} className="form-select" required>
              <option value="">Select Status</option>
              <option value="Uncompleted">Uncompleted</option>
              <option value="Abandoned">Abandoned</option>
              <option value="Resumed">Ongoing</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Source of Funding</label>
            <select name="fundingSource" value={formData.fundingSource} onChange={handleChange} className="form-select">
              <option value="">Select (optional)</option>
              <option value="Government">Government budget allocations</option>
              <option value="GIIF">Ghana Infrastructure Investment Fund (GIIF)</option>
              <option value="DACF">District Assemblies Common Fund (DACF)</option>
              <option value="WorldBank">World Bank Group</option>
              <option value="IMF">International Monetary Fund (IMF)</option>
              <option value="UNDP">United Nations Development Programme (UNDP)</option>
              <option value="Other">Other Funding</option>
            </select>
          </div>

          {formData.fundingSource === 'Other' && (
            <div className="form-group">
              <label className="form-label">Please specify other funding source</label>
              <input type="text" name="otherFundingSources" value={formData.otherFundingSources || ''}
                onChange={handleChange} className="form-input"
                placeholder="Enter source of funding" required />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input type="date" name="startDate" value={formData.startDate}
              onChange={handleChange} className="form-input" required />
          </div>

          <div className="form-group">
            <label className="form-label">Contractor</label>
            <input type="text" name="contractor" value={formData.contractor}
              onChange={handleChange} className="form-input"
              placeholder="Enter contractor name" required />
          </div>

          <div className="form-group">
            <label className="form-label">Submitted By</label>
            <input type="text" name="submittedBy" value={formData.submittedBy}
              onChange={handleChange} className="form-input" placeholder="Your name" required />
          </div>

          {/* ════ FINANCIAL & PROGRESS SECTION ═══════════════════════════════ */}
          <div className="form-section-divider">
            <h3 className="section-title">Financial &amp; Progress Details</h3>
          </div>

          {/* Progress percentage with interactive bar */}
          <div className="form-group">
            <label className="form-label">
              Project Completion Progress
              <span className="progress-pct-badge">{formData.completionPercentage}%</span>
            </label>
            <div className="progress-slider-wrap">
              <input
                type="range"
                name="completionPercentage"
                min="0" max="100" step="1"
                value={formData.completionPercentage}
                onChange={handleChange}
                className="progress-slider"
              />
              <div className="progress-track">
                <div
                  className="progress-track-fill"
                  style={{ width: `${formData.completionPercentage}%` }}
                />
              </div>
            </div>
            <div className="progress-labels">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="form-row-two">
            <div className="form-group">
              <label className="form-label">Total Project Cost (GHS)</label>
              <div className="input-prefix-wrap">
                <span className="input-prefix">GHS</span>
                <input
                  type="number" name="totalCost" value={formData.totalCost}
                  onChange={handleChange} className="form-input input-with-prefix"
                  placeholder="0.00" min="0" step="0.01"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Amount Paid to Contractor (GHS)</label>
              <div className="input-prefix-wrap">
                <span className="input-prefix">GHS</span>
                <input
                  type="number" name="amountPaid" value={formData.amountPaid}
                  onChange={handleChange} className="form-input input-with-prefix"
                  placeholder="0.00" min="0" step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="form-row-two">
            <div className="form-group">
              <label className="form-label">Outstanding Amount (GHS)</label>
              <div className="input-prefix-wrap">
                <span className="input-prefix">GHS</span>
                <input
                  type="number" name="outstandingAmount" value={formData.outstandingAmount}
                  onChange={handleChange} className="form-input input-with-prefix"
                  placeholder="0.00" min="0" step="0.01"
                />
              </div>
              {/* Auto-hint: outstanding = total - paid */}
              {formData.totalCost && formData.amountPaid && (
                <p className="field-hint">
                  Suggested: GHS {Math.max(0, parseFloat(formData.totalCost || 0) - parseFloat(formData.amountPaid || 0)).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Expected Date of Completion</label>
              <input
                type="date" name="expectedCompletionDate"
                value={formData.expectedCompletionDate}
                onChange={handleChange} className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Project Image</label>
            <label className="file-upload-label">
              <input type="file" accept="image/*" onChange={handleImageChange} className="file-upload-input" />
              Choose Project Image
            </label>
            {previewUrl && (
              <div className="image-preview">
                <img src={previewUrl} alt="Project Preview" />
              </div>
            )}
            {!isOnline && image && (
              <p className="offline-image-note">
                📸 Image captured — it will be included when the project syncs.
              </p>
            )}
          </div>

          {/* ── submit button — label changes based on connectivity ── */}
          <button type="submit" className={`submit-btn ${!isOnline ? 'submit-btn--offline' : ''}`} disabled={loading}>
            {loading ? (
              <>
                <svg className="animate-spin" style={{ display:'inline',width:'1rem',height:'1rem',marginRight:'0.4rem' }}
                  xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {isOnline ? 'Submitting…' : 'Saving locally…'}
              </>
            ) : isOnline ? 'Submit Project' : '💾 Save Offline'}
          </button>

          {!isOnline && (
            <p className="offline-submit-note">
              This project will be stored on your device and uploaded automatically once you reconnect.
            </p>
          )}

          {error && <div className="error-message">{error}</div>}
        </div>
      </form>
    </div>
  );
};

export default AddProjectForm;