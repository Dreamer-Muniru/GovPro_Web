import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ghanaRegions from '../data/ghanaRegions';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { Icon } from 'leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import '../css/AddProjectForm.css';

const pinpointIcon = new Icon({
  iconUrl: '/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const AddProjectForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    type: '',
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
  const [position, setPosition] = useState([10.853388, -0.174521]);
  const [mapKey, setMapKey] = useState(Date.now());

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const coords = [latitude, longitude];
          setPosition(coords);
          setFormData((prev) => ({
            ...prev,
            gps_latitude: latitude.toFixed(6),
            gps_longitude: longitude.toFixed(6),
          }));
          setMapKey(Date.now());
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError('Location access denied. Enable GPS for accurate coordinates.');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  }, []);

  const handleMarkerDrag = (event) => {
    const { lat, lng } = event.target.getLatLng();
    setPosition([lat, lng]);
    setFormData((prev) => ({
      ...prev,
      gps_latitude: lat.toFixed(6),
      gps_longitude: lng.toFixed(6),
    }));
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

    const formDataToSend = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      formDataToSend.append(key, value);
    });
    if (image) formDataToSend.append('image', image);

    try {
      await axios.post('http://localhost:5000/api/projects', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate('/');
    } catch (err) {
      console.error('Submission error:', err);
      setError('Failed to submit project. Please check all fields and try again.');
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
              <MapContainer 
                key={mapKey} 
                center={position} 
                zoom={15} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker
                  position={position}
                  icon={pinpointIcon}
                  draggable
                  eventHandlers={{ dragend: handleMarkerDrag }}
                />
              </MapContainer>
            </div>
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
                  placeholder="GPS Latitude"
                  required
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
                  placeholder="GPS Longitude"
                  required
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
              <option value="Resumed">Resumed</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

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
              // required
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