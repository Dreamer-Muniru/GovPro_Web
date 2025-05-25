import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import ghanaRegions from '../data/ghanaRegions';
import { useProjectContext } from '../context/ProjectContext';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const projectTypes = [
  'School', 'Hospital', 'Road', 'Residential Bungalow', 'Market Stall',
  'Drainage System', 'Bridge', 'Water System', 'Power Project',
  'Sanitation Facility', 'Government Office', 'Sports & Recreation Center', 'Other'
];

const initialFormState = {
  title: '',
  type: '',
  customType: '',
  description: '',
  region: '',
  district: '',
  address: '',
  city: '',
  contractor: '',
  latitude: '',
  longitude: '',
  status: 'Uncompleted',
  startDate: '',
  submittedBy: ''
};

const AddProjectForm = ({ onSuccess, embeddedModal }) => {
  const { addProject } = useProjectContext();
  const [position, setPosition] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [districts, setDistricts] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [imageFile, setImageFile] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setPosition(e.latlng);
        setFormData(prev => ({
          ...prev,
          latitude: e.latlng.lat,
          longitude: e.latlng.lng
        }));
      },
    });

    return position ? (
      <Marker position={position}>
        <Popup>Project Location</Popup>
      </Marker>
    ) : null;
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPosition(newPos);
          setFormData(prev => ({
            ...prev,
            latitude: newPos.lat,
            longitude: newPos.lng
          }));
        },
        () => {
          const defaultPos = { lat: 5.6037, lng: -0.1870 };
          setPosition(defaultPos);
          setFormData(prev => ({
            ...prev,
            latitude: defaultPos.lat,
            longitude: defaultPos.lng
          }));
        }
      );
    }
  }, []);

  const handleRegionChange = (e) => {
    const selectedRegion = e.target.value;
    const regionObj = ghanaRegions.find(r => r.name === selectedRegion);
    setFormData(prev => ({
      ...prev,
      region: selectedRegion,
      district: ''
    }));
    setDistricts(regionObj?.districts || []);
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setImageFile(files[0]);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setDistricts([]);
    setImageFile(null);
    setFileInputKey(Date.now());
    setPosition({ lat: 5.6037, lng: -0.1870 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'type' && formData.type === 'Other') {
        data.append('type', formData.customType || 'Other');
      } else if (key !== 'customType' && value) {
        data.append(key, value);
      }
    });

    if (imageFile) {
      data.append('image', imageFile);
    }

    try {
      const res = await axios.post('http://localhost:5000/api/projects', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?._id) {
        const completeProject = {
          ...res.data,
          title: formData.title,
          type: formData.type === 'Other' ? formData.customType : formData.type,
          region: formData.region,
          district: formData.district,
          status: formData.status,
          address: formData.address,
          city: formData.city,
          contractor: formData.contractor,
          latitude: formData.latitude,
          longitude: formData.longitude,
          startDate: formData.startDate,
          submittedBy: formData.submittedBy,
          imageUrl: res.data.imageUrl || null
        };

        addProject(completeProject);
        setMessage({ text: 'Project submitted successfully!', type: 'success' });
        setShowSuccess(true);
        resetForm();
        
        // Close modal after 2 seconds
        setTimeout(() => {
          setShowSuccess(false);
          if (onSuccess) onSuccess();
        }, 2000);
      }
    } catch (error) {
      console.error('Submission error:', error);
      setMessage({
        text: error.response?.data?.message || 'Failed to submit project',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data" style={{ 
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Map Section */}
      {embeddedModal && (
        <div style={{ 
          height: '300px',
          position: 'relative',
          marginBottom: '20px',
          border: '2px dashed #ddd',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '10px',
            left: 0,
            right: 0,
            textAlign: 'center',
            zIndex: 1000
          }}>
            <div style={{
              display: 'inline-block',
              backgroundColor: 'rgba(255,255,255,0.9)',
              padding: '8px 16px',
              borderRadius: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              fontWeight: 'bold',
              color: '#333'
            }}>
              Click on the map to set project location
            </div>
          </div>
          
          <MapContainer
            center={position || [5.6037, -0.1870]}
            zoom={position ? 15 : 7}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <LocationMarker />
          </MapContainer>
          
          {position && (
            <div style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              backgroundColor: 'rgba(255,255,255,0.9)',
              padding: '8px 12px',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              zIndex: 1000,
              fontSize: '14px'
            }}>
              <strong>Selected Location:</strong> {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
            </div>
          )}
        </div>
      )}

      {/* Form Fields */}
      <div style={{ 
        flex: 1,
        overflowY: 'auto',
        padding: '0 20px',
        marginBottom: '20px',
        scrollbarWidth: 'thin',
        scrollbarColor: '#888 #f1f1f1'
      }}>
        <h2 style={{ 
          textAlign: 'center', 
          marginBottom: '20px',
          color: '#333'
        }}>Add New Project</h2>
        
        {/* Success Message */}
        {showSuccess && (
          <div style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '20px',
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            Project submitted successfully! The form will close shortly...
          </div>
        )}

        {/* Error Message */}
        {message.text && message.type === 'error' && (
          <div style={{
            backgroundColor: '#f44336',
            color: 'white',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {message.text}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Project Title*</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            style={{ 
              width: '100%', 
              padding: '12px', 
              borderRadius: '6px', 
              border: '1px solid #ddd',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Project Type*</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">Select Type</option>
            {projectTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {formData.type === 'Other' && (
            <input
              type="text"
              name="customType"
              placeholder="Specify project type"
              value={formData.customType}
              onChange={handleChange}
              style={{ width: '100%', padding: '8px', marginTop: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Description*</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '8px', minHeight: '100px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Region*</label>
          <select
            name="region"
            value={formData.region}
            onChange={handleRegionChange}
            required
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">Select Region</option>
            {ghanaRegions.map(region => (
              <option key={region.name} value={region.name}>{region.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>District*</label>
          <select
            name="district"
            value={formData.district}
            onChange={handleChange}
            required
            disabled={!formData.region}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">Select District</option>
            {districts.map(district => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>City</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Contractor</label>
          <input
            type="text"
            name="contractor"
            value={formData.contractor}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="Uncompleted">Uncompleted</option>
            <option value="Abandoned">Abandoned</option>
            <option value="Resumed">Resumed</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Start Date</label>
          <input
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Submitted By</label>
          <input
            type="text"
            name="submittedBy"
            value={formData.submittedBy}
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>GPS Coordinates</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Latitude</label>
              <input
                type="text"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                readOnly
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: '#f0f0f0' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Longitude</label>
              <input
                type="text"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                readOnly
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: '#f0f0f0' }}
              />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Project Image</label>
          <input
            type="file"
            name="image"
            accept="image/*"
            onChange={handleChange}
            key={fileInputKey}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>

      </div>

      {/* Submit Button */}
      <div style={{
        padding: '20px',
        borderTop: '1px solid #eee',
        backgroundColor: 'white'
      }}>
        <button 
          type="submit" 
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: isSubmitting ? '#cccccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            transition: 'background-color 0.3s'
          }}
        >
          {isSubmitting ? (
            <span>Submitting...</span>
          ) : (
            <span>Submit Project</span>
          )}
        </button>
      </div>
    </form>
  );
};

export default AddProjectForm;