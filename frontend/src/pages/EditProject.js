import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ghanaRegions from '../data/ghanaRegions';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { Icon } from 'leaflet';
import { useNavigate, useParams } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import '../addProjectForm.css';

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
  const [error, setError] = useState('');
  const [mapKey, setMapKey] = useState(Date.now());

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/projects/${id}`);
        const data = res.data;

        setFormData({
          title: data.title || '',
          type: data.type || '',
          description: data.description || '',
          region: data.region || '',
          district: data.district || '',
          location_address: data.location_address || '',
          location_city: data.location_city || '',
          gps_latitude: data.gps_latitude || '',
          gps_longitude: data.gps_longitude || '',
          contractor: data.contractor || '',
          status: data.status || '',
          startDate: data.startDate ? data.startDate.slice(0, 10) : '',
          submittedBy: data.submittedBy || '',
        });

        if (data.gps_latitude && data.gps_longitude) {
          setPosition([parseFloat(data.gps_latitude), parseFloat(data.gps_longitude)]);
        }

        setPreviewUrl(`http://localhost:5000/api/projects/${id}/image`);
      } catch (err) {
        console.error('Failed to load project:', err);
        setError('Could not load project data.');
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
      await axios.put(`http://localhost:5000/api/projects/${id}`, updatedData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      navigate('/admin');
    } catch (err) {
      console.error('Update failed:', err);
      setError('Failed to update project. Please review the form and try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="project-form">
      <h1>Edit Project</h1>

      <div className="form-section">
        <h3>Project Location</h3>
        <MapContainer
          key={mapKey}
          center={position}
          zoom={15}
          style={{ height: '250px', width: '100%' }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker
            position={position}
            icon={pinpointIcon}
            draggable
            eventHandlers={{ dragend: handleMarkerDrag }}
          />
        </MapContainer>
        <div className="gps-display">
          <input
            type="text"
            name="gps_latitude"
            value={formData.gps_latitude}
            onChange={handleChange}
            placeholder="Latitude"
            required
          />
          <input
            type="text"
            name="gps_longitude"
            value={formData.gps_longitude}
            onChange={handleChange}
            placeholder="Longitude"
            required
          />
        </div>
      </div>

      <div className="form-section">
        <h3>Project Details</h3>
        <input type="text" name="title" value={formData.title} onChange={handleChange} required />
        <textarea name="description" value={formData.description} onChange={handleChange} required />
        <input type="text" name="submittedBy" value={formData.submittedBy} onChange={handleChange} required />
        <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required />
        <input type="text" name="contractor" value={formData.contractor} onChange={handleChange} required />
        <input type="text" name="location_address" value={formData.location_address} onChange={handleChange} required />
        <input type="text" name="location_city" value={formData.location_city} onChange={handleChange} required />

        <select name="type" value={formData.type} onChange={handleChange} required>
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

        <select name="status" value={formData.status} onChange={handleChange} required>
          <option value="">Select Status</option>
          <option value="Uncompleted">Uncompleted</option>
          <option value="Abandoned">Abandoned</option>
          <option value="Resumed">Resumed</option>
          <option value="Completed">Completed</option>
        </select>

        <select name="region" value={formData.region} onChange={handleChange} required>
          <option value="">Select Region</option>
          {ghanaRegions.map((region) => (
            <option key={region.name} value={region.name}>{region.name}</option>
          ))}
        </select>

        <select
          name="district"
          value={formData.district}
          onChange={handleChange}
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

        <label>Update Image (optional):</label>
        <input type="file" accept="image/*" onChange={handleImageChange} />

        {previewUrl && (
          <div className="image-preview">
            <img src={previewUrl} alt="Preview" style={{ width: '200px' }} />
          </div>
        )}

        <button type="submit">Update Project</button>
      </div>

      {error && <p className="error-message">{error}</p>}
    </form>
  );
};

export default EditProject;
