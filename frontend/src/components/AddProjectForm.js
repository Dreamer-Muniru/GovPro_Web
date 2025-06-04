import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ghanaRegions from '../data/ghanaRegions';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../addProjectForm.css'

const AddProjectForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    description: '',
    region: '',
    district: '',
    location_address: '',
    location_city: '',
    location_region: '',
    gps_latitude: '',
    gps_longitude: '',
    contractor: '',
    status: '',
    startDate: '',
    submittedBy: '',
  });

  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setFormData((prev) => ({ ...prev, gps_latitude: latitude, gps_longitude: longitude }));
        setPosition([latitude, longitude]);
      });
    }
  }, []);

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
        setFormData((prev) => ({ ...prev, gps_latitude: e.latlng.lat, gps_longitude: e.latlng.lng }));
      },
    });

    return position === null ? null : <Marker position={position} />;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formDataToSend = new FormData();
    Object.keys(formData).forEach((key) => {
      formDataToSend.append(key, formData[key]);
    });

    if (image) {
      formDataToSend.append('image', image);
    }

    try {
      await axios.post('http://localhost:5000/api/projects', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSuccess();
    } catch (err) {
      console.error('Error submitting project:', err);
      setError('Failed to submit project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="project-form">
      {/* Location Section */}
      <div className="form-section">
        <h3 className="section-title">Project Location</h3>
        <div className="map-container">
          <MapContainer 
            center={position || [5.6037, -0.1870]} 
            zoom={7} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer 
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <LocationMarker />
          </MapContainer>
        </div>
        
        <div className="gps-display">
          <div className="form-group">
            <label className="form-label">GPS Latitude</label>
            <input 
              type="text" 
              name="gps_latitude" 
              value={formData.gps_latitude} 
              onChange={handleChange} 
              className="form-input gps-input"
              readOnly 
            />
          </div>
          <div className="form-group">
            <label className="form-label">GPS Longitude</label>
            <input 
              type="text" 
              name="gps_longitude" 
              value={formData.gps_longitude} 
              onChange={handleChange} 
              className="form-input gps-input"
              readOnly 
            />
          </div>
        </div>
      </div>

      {/* Basic Information Section */}
      <div className="form-section">
        <h3 className="section-title">Basic Information</h3>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Project Title*</label>
            <input 
              type="text" 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              className="form-input" 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Project Type*</label>
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
              <option value="Bridge">Bridge</option>
              <option value="Market">Market</option>
              <option value="Water">Water Project</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Status*</label>
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
            />
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="form-label">Description*</label>
          <textarea 
            name="description" 
            value={formData.description} 
            onChange={handleChange} 
            className="form-textarea" 
            required
          />
        </div>
      </div>

      {/* Location Details Section */}
      <div className="form-section">
        <h3 className="section-title">Location Details</h3>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Region*</label>
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
            <label className="form-label">District*</label>
            <select 
              name="district" 
              value={formData.district} 
              onChange={handleChange} 
              className="form-select" 
              required
              disabled={!formData.region}
            >
              <option value="">Select District</option>
              {ghanaRegions.find(r => r.name === formData.region)?.districts.map((district) => (
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
            />
          </div>
        </div>
      </div>

      {/* Additional Information Section */}
      <div className="form-section">
        <h3 className="section-title">Additional Information</h3>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Contractor</label>
            <input 
              type="text" 
              name="contractor" 
              value={formData.contractor} 
              onChange={handleChange} 
              className="form-input" 
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
            />
          </div>
        </div>
      </div>

      {/* Image Upload Section */}
      <div className="form-section">
        <h3 className="section-title">Project Image</h3>
        <div className="file-upload">
          <label htmlFor="image-upload" className="file-upload-label">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            {image ? image.name : 'Click to upload project image'}
          </label>
          <input 
            id="image-upload" 
            type="file" 
            accept="image/*" 
            onChange={handleImageChange} 
            className="file-upload-input" 
          />
        </div>
      </div>

      {/* Submit Section */}
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

      {error && <p className="error-message">{error}</p>}
    </form>
  );
};

export default AddProjectForm;