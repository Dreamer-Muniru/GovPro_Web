import React, { useState, useEffect } from 'react';
import { createProject } from '../services/api';
import { useQueryClient } from '@tanstack/react-query';
import { apiUrl } from '../utils/api';
import ghanaRegions from '../data/ghanaRegions';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import '../css/AddProjectForm.css';

const DEFAULT_LAT = 5.5546;
const DEFAULT_LNG = -0.1963

const pinpointIcon = new Icon({
  iconUrl: '/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Repositions the map whenever `position` changes — avoids full remount.
const MapUpdater = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15, { animate: false });
    }
  }, [position, map]);
  return null;
};

// Component to handle map centering on user location
const MapView = ({ position, handleMarkerDrag }) => {
  if (!position) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6',
        color: '#6b7280',
        fontSize: '0.9rem',
        gap: '10px',
      }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span>Detecting your location…</span>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <MapContainer
      center={position}
      zoom={15}
      style={{ height: '100%', width: '100%' }}
    >
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

const AddProjectForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    fundingSource: '',
    otherFundingSources: '',
    description: '',
    region: '',
    district: '',
    location_address: '',
    location_city: '',
    gps_latitude: '',
    gps_longitude: '',
    contractor: '',
    status: '',
    startDate: '',
    submittedBy: '',
  });

  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState(null);
  const [locationStatus, setLocationStatus] = useState('loading');

  const applyPosition = (latitude, longitude) => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    setPosition([lat, lng]);
    setFormData((prev) => ({
      ...prev,
      gps_latitude: lat.toFixed(6),
      gps_longitude: lng.toFixed(6),
    }));
  };

  const requestLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('unsupported');
      // Set default position when geolocation is not supported
      const defaultLat = DEFAULT_LAT;
      const defaultLng = DEFAULT_LNG;
      setPosition([defaultLat, defaultLng]);
      setFormData((prev) => ({
        ...prev,
        gps_latitude: defaultLat.toFixed(6),
        gps_longitude: defaultLng.toFixed(6),
      }));
      return;
    }

    setLocationStatus('loading');
    setPosition(null); // Reset position while loading

    const handleSuccess = (pos) => {
      const { latitude, longitude } = pos.coords;
      applyPosition(latitude, longitude);
      setLocationStatus('success');
    };

    const handleError = (err) => {
      console.error('Geolocation error:', err);
      
      if (err.code === 1) {
        // PERMISSION_DENIED
        setLocationStatus('denied');
      } else if (err.code === 2) {
        // POSITION_UNAVAILABLE
        setLocationStatus('unavailable');
      } else if (err.code === 3) {
        // TIMEOUT
        setLocationStatus('timeout');
      } else {
        setLocationStatus('unavailable');
      }

      // Use default position as fallback
      const defaultLat = DEFAULT_LAT;
      const defaultLng = DEFAULT_LNG;
      setPosition([defaultLat, defaultLng]);
      setFormData((prev) => ({
        ...prev,
        gps_latitude: defaultLat.toFixed(6),
        gps_longitude: defaultLng.toFixed(6),
      }));
    };

    // Try with high accuracy first
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      (err) => {
        console.warn('High accuracy attempt failed, trying with low accuracy...', err);
        // If high accuracy fails, try with low accuracy (works better on Firefox)
        navigator.geolocation.getCurrentPosition(
          handleSuccess,
          (err2) => {
            console.warn('Low accuracy attempt failed:', err2);
            handleError(err2);
          },
          { 
            enableHighAccuracy: false, 
            timeout: 10000, 
            maximumAge: 60000,
            // Added these options for better Firefox compatibility
          }
        );
      },
      { 
        enableHighAccuracy: true, 
        timeout: 8000, 
        maximumAge: 0 
      }
    );
  };

  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locationStatusContent = {
    loading: { text: '📍 Detecting your location…', tone: 'info', showRetry: false },
    success: { text: '✓ Using your current location', tone: 'success', showRetry: false },
    denied: {
      text: "Location access is blocked for this site. Click the location icon in your browser's address bar, allow access, then try again — or drag the pin on the map.",
      tone: 'warning',
      showRetry: true,
    },
    unavailable: {
      text: "Couldn't determine your location. Check that location services are enabled on your device, or drag the pin on the map.",
      tone: 'warning',
      showRetry: true,
    },
    timeout: {
      text: 'Location request timed out. You can try again, or drag the pin on the map to set it manually.',
      tone: 'warning',
      showRetry: true,
    },
    unsupported: {
      text: 'Your browser doesn\u2019t support location detection. Please drag the pin on the map to set your location.',
      tone: 'warning',
      showRetry: false,
    },
  }[locationStatus];

  const handleMarkerDrag = (event) => {
    const { lat, lng } = event.target.getLatLng();
    setPosition([lat, lng]);
    setFormData((prev) => ({
      ...prev,
      gps_latitude: lat.toFixed(6),
      gps_longitude: lng.toFixed(6),
    }));
    setLocationStatus('manual');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Build FormData
    const formDataToSend = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formDataToSend.append(key, value);
    });
    formDataToSend.append('location_region', formData.region);
    if (formData.startDate) formDataToSend.set('projectStartDate', formData.startDate);
    if (formData.fundingSource) formDataToSend.set('fundingSource', formData.fundingSource);
    if (formData.otherFundingSources) formDataToSend.set('otherFundingSources', formData.otherFundingSources);
    if (image) formDataToSend.append('image', image);

    // Debug logs
    const endpoint = apiUrl('/api/projects');
    console.log('Submitting project to:', endpoint);
    for (const pair of formDataToSend.entries()) console.log('FormData:', pair[0], pair[1]);

    try {
      const res = await createProject(formDataToSend);
      console.log('CreateProject response:', res && res.status, res && res.data);
      if (res && res.status >= 200 && res.status < 300) {
        try { await queryClient.invalidateQueries(['projects']); } catch (e) { console.warn('Invalidate projects failed', e); }
        navigate('/');
      } else {
        setError('Failed to submit project. Server returned an error.');
      }
    } catch (err) {
      console.error('Submission error (caught):', err);
      const serverMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      setError(serverMessage ? `Failed to submit project: ${serverMessage}` : 'Failed to submit project. Check console/network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-project-container">
      <div className="add-project-header">
        <h1 className="add-project-title">Add New Project</h1>
      </div>

      <form onSubmit={handleSubmit} className="add-project-form">
        <div className="form-section">
          <h3 className="section-title">Project Location</h3>
          
          <div className="form-group">
            <label className="form-label">Map Location</label>
            <div className="map-container">
              <MapView 
                position={position} 
                handleMarkerDrag={handleMarkerDrag}
              />
            </div>
            {locationStatusContent && (
              <div
                className={`location-status location-status--${locationStatusContent.tone}`}
                style={{
                  marginTop: '8px',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                  color:
                    locationStatusContent.tone === 'success'
                      ? '#15803d'
                      : locationStatusContent.tone === 'warning'
                      ? '#b45309'
                      : '#374151',
                }}
              >
                <span>{locationStatusContent.text}</span>
                {locationStatusContent.showRetry && (
                  <button
                    type="button"
                    onClick={requestLocation}
                    className="location-retry-btn"
                    style={{
                      border: '1px solid currentColor',
                      background: 'transparent',
                      color: 'inherit',
                      borderRadius: '4px',
                      padding: '2px 10px',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    Try Again
                  </button>
                )}
              </div>
            )}
            <p className="map-hint" style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
              You can drag the pin on the map at any time to set the exact project location.
            </p>
          </div>

          <div className="form-group">
            <div className="gps-display">
              <div>
                <label className="form-label">Latitude</label>
                <input
                  type="text"
                  name="gps_latitude"
                  value={formData.gps_latitude}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Waiting for location…"
                  readOnly
                  required
                  style={{ cursor: 'default', background: '#f3f4f6', color: '#374151' }}
                />
              </div>
              <div>
                <label className="form-label">Longitude</label>
                <input
                  type="text"
                  name="gps_longitude"
                  value={formData.gps_longitude}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Waiting for location…"
                  readOnly
                  required
                  style={{ cursor: 'default', background: '#f3f4f6', color: '#374151' }}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Region</label>
            <select
              name="region"
              value={formData.region}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">Select Region</option>
              {ghanaRegions.map((region) => (
                <option key={region.name} value={region.name}>{region.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">District</label>
            <select
              name="district"
              value={formData.district}
              onChange={handleChange}
              className="form-select"
              required
              disabled={!formData.region}
            >
              <option value="">Select District</option>
              {ghanaRegions
                .find((r) => r.name === formData.region)
                ?.districts.map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">City/Town</label>
            <input
              type="text"
              name="location_city"
              value={formData.location_city}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter city or town"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <input
              type="text"
              name="location_address"
              value={formData.location_address}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter street address"
              required
            />
          </div>
        </div>

        <div className="form-section">
          <h3 className="section-title">Project Details</h3>

          <div className="form-group">
            <label className="form-label">Project Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter project title"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="form-textarea"
              placeholder="Describe the project details"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Project Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">Select Type</option>
              <option value="School">School</option>
              <option value="Hospital">Hospital</option>
              <option value="Road">Road</option>
              <option value="Residential Bungalow">Residential Bungalow</option>
              <option value="Market Stall">Market Stall</option>
              <option value="Drainage System">Drainage System</option>
              <option value="Bridge">Bridge</option>
              <option value="Water System">Water System</option>
              <option value="Power Project">Power Project</option>
              <option value="Sanitation Facility">Sanitation Facility</option>
              <option value="Government Office">Government Office</option>
              <option value="Sports & Recreation Center">Sports & Recreation Center</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Project Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">Select Status</option>
              <option value="Uncompleted">Uncompleted</option>
              <option value="Abandoned">Abandoned</option>
              <option value="Resumed">Ongoing</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          {/* Select Source of funding */}
          <div className="form-group">
            <label className="form-label">Source of Funding</label>
            <select
              name="fundingSource"
              value={formData.fundingSource}
              onChange={handleChange}
              className="form-select"
            >
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
          {/* Conditionally show "other funding" input only when Other selected */}
          {formData.fundingSource === 'Other' && (
            <div className="form-group">
              <label className="form-label">Please specify other funding source</label>
              <input
                type="text"
                name="otherFundingSources"
                value={formData.otherFundingSources || ''}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter source of funding"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contractor</label>
            <input
              type="text"
              name="contractor"
              value={formData.contractor}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter contractor name"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Submitted By</label>
            <input
              type="text"
              name="submittedBy"
              value={formData.submittedBy}
              onChange={handleChange}
              className="form-input"
              placeholder="Your name"
              required
            />
          </div>

          <div className="form-group image-upload">
            <label className="form-label">Project Image</label>
            <label className="file-upload-label">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="file-upload-input"
              />
              Choose Project Image
            </label>
            {previewUrl && (
              <div className="image-preview">
                <img src={previewUrl} alt="Project Preview" />
              </div>
            )}
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : 'Submit Project'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
      </form>
    </div>
  );
};

export default AddProjectForm;