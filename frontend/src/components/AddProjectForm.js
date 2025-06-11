import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ghanaRegions from '../data/ghanaRegions';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { Icon } from 'leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import '../addProjectForm.css';

// Custom pinpoint marker icon
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
      navigate('/'); // ✅ Redirect to HomePage.js after success
    } catch (err) {
      console.error('Submission error:', err);
      setError('Failed to submit project. Please check all fields and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="project-form">
      <h1>Add New Project</h1>

      <div className="form-section">
        <h3>Project Location</h3>
        <MapContainer key={mapKey} center={position} zoom={15} style={{ height: '250px', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker
            position={position}
            icon={pinpointIcon}
            draggable
            eventHandlers={{ dragend: handleMarkerDrag }}
          />
        </MapContainer>
        <div className="gps-display">
          <input type="text" name="gps_latitude" value={formData.gps_latitude} readOnly />
          <input type="text" name="gps_longitude" value={formData.gps_longitude} readOnly />
        </div>
      </div>

      <div className="form-section">
        <h3>Project Details</h3>
        <input type="text" name="title" placeholder="Project Title" onChange={handleChange} required />
        <textarea name="description" placeholder="Project Description" onChange={handleChange} required />
        <input type="text" name="submittedBy" placeholder="Submitted By" onChange={handleChange} required />
        <input type="date" name="startDate" onChange={handleChange} required />
        <input type="text" name="contractor" placeholder="Contractor Name" onChange={handleChange} required />
        <input type="text" name="location_address" placeholder="Location Address" onChange={handleChange} required />
        <input type="text" name="location_city" placeholder="Location City" onChange={handleChange} required />

       <select
        name="type"
        value={formData.type}
        onChange={handleChange}
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


    <select
      name="status"
      value={formData.status}
      onChange={handleChange}
      required
    >
      <option value="">Select Status</option>
      <option value="Uncompleted">Uncompleted</option>
      <option value="Abandoned">Abandoned</option>
      <option value="Resumed">Resumed</option>
      <option value="Completed">Completed</option>
    </select>


        <select name="region" onChange={handleChange} required>
          <option value="">Select Region</option>
          {ghanaRegions.map((region) => (
            <option key={region.name} value={region.name}>{region.name}</option>
          ))}
        </select>

        <select name="district" onChange={handleChange} required disabled={!formData.region}>
          <option value="">Select District</option>
          {ghanaRegions.find(r => r.name === formData.region)?.districts.map((district) => (
            <option key={district} value={district}>{district}</option>
          ))}
        </select>

        <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} />
        <button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Project'}</button>
      </div>

      {error && <p className="error-message">{error}</p>}
    </form>
  );
};

export default AddProjectForm;
