import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ghanaRegions from '../data/ghanaRegions';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { Icon } from 'leaflet';
import { useNavigate, useParams } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import '../css/EditProject.css'

const pinpointIcon = new Icon({
  iconUrl: '/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const EditProject = () => {
  const { id } = useParams();
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
  const [position, setPosition] = useState([10.853388, -0.174521]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await axios.get(`https://govpro-web-backend.onrender.com/api/projects/${id}`);
        const data = res.data;
        
        setFormData({
          title: data.title || '',
          description: data.description || '',
          type: data.type || '',
          region: data.region || '',
          district: data.district || '',
          location_address: data.location_address || '',
          location_city: data.location_city || '',
          gps_latitude: data.gps.latitude || '',
          gps_longitude: data.gps.longitude || '',
          contractor: data.contractor || '',
          status: data.status || '',
          startDate: data.startDate ? data.startDate.slice(0, 10) : '',
          submittedBy: data.submittedBy || '',
        });

        if (data.gps.latitude && data.gps.longitude) {
          setPosition([parseFloat(data.gps.latitude), parseFloat(data.gps.longitude)]);
        }

        setPreviewUrl(`https://govpro-web-backend.onrender.com${data.imageUrl}?${Date.now()}`);
      } catch (err) {
        console.error('Failed to load project:', err);
        setError('Could not load project data.');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

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

  const handleMarkerDrag = (event) => {
    const { lat, lng } = event.target.getLatLng();
    setPosition([lat, lng]);
    setFormData((prev) => ({
      ...prev,
      gps_latitude: lat.toFixed(6),
      gps_longitude: lng.toFixed(6),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const updatedData = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      updatedData.append(key, value);
    });
    if (image) updatedData.append('image', image);

    try {
      await axios.put(`https://govpro-web-backend.onrender.com/api/projects/${id}`, updatedData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate('/admin');
    } catch (err) {
      console.error('Update failed:', err);
      setError('Failed to update project. Please review the form and try again.');
    }
  };

  if (loading) {
    return (
      <div className="edit-project-container">
        <div className="loading-spinner"></div>
        <p>Loading project data...</p>
      </div>
    );
  }

  return (
    <div className="edit-project-container">
      <div className="edit-header">
        <h1 className="edit-title">Edit Project</h1>
      </div>

      <form onSubmit={handleSubmit} className="edit-form">
        <div className="form-section">
          <h3 className="section-title">Location Information</h3>
          
          <div className="form-group">
            <label className="form-label">Project Location</label>
            <div className="map-container">
              <MapContainer
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
            <div className="gps-coordinates">
              <div>
                <label className="form-label">Latitude</label>
                <input
                  type="text"
                  name="gps_latitude"
                  value={formData.gps_latitude}
                  onChange={handleChange}
                  className="form-input"
                  required
                  readOnly
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
                  required
                  readOnly
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
              Choose New Image
            </label>
            {previewUrl && (
              <div className="image-preview">
                <img src={previewUrl} alt="Project Preview" />
              </div>
            )}
          </div>

          <button type="submit" className="submit-btn">
            Update Project
          </button>
        </div>
      </form>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default EditProject;