import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ghanaRegions from '../data/ghanaRegions';
import { useProjectContext } from '../context/ProjectContext';

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

const AddProjectForm = () => {
  const { addProject } = useProjectContext();
  const [formData, setFormData] = useState(initialFormState);
  const [districts, setDistricts] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [imageFile, setImageFile] = useState(null);

  // Get current location
  useEffect(() => {
    const getLocation = () => {
      navigator.geolocation?.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
        },
        (error) => console.error("GPS error:", error)
      );
    };
    getLocation();
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
    setFormData({
      ...initialFormState,
      latitude: formData.latitude || '',
      longitude: formData.longitude || '',
      status: 'Uncompleted'
    });
    setDistricts([]);
    setImageFile(null);
    setFileInputKey(Date.now());
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
        setMessage({ text: '✅ Project submitted successfully!', type: 'success' });
        resetForm();
      }
    } catch (error) {
      console.error('Submission error:', error);
      setMessage({
        text: `❌ ${error.response?.data?.message || 'Failed to submit project'}`,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data" style={{ 
      maxWidth: '600px', 
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f9f9f9',
      borderRadius: '8px'
    }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Add New Project</h2>
      
      {/* Project Title */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Project Title*</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
        />
      </div>

      {/* Project Type */}
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

      {/* Description */}
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

      {/* Region */}
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

      {/* District */}
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

      {/* Address */}
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

      {/* City */}
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

      {/* Contractor */}
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

      {/* Status */}
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

      {/* Start Date */}
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

      {/* Submitted By */}
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

      {/* GPS Coordinates */}
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

      {/* Image Upload */}
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

      {/* Submit Button */}
      <button 
        type="submit" 
        disabled={isSubmitting}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: isSubmitting ? '#cccccc' : '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold',
          marginTop: '10px'
        }}
      >
        {isSubmitting ? 'Submitting...' : 'Submit Project'}
      </button>

      {/* Message Display */}
      {message.text && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: message.type === 'error' ? '#ffdddd' : '#ddffdd',
          borderLeft: `5px solid ${message.type === 'error' ? '#f44336' : '#4CAF50'}`,
          borderRadius: '4px'
        }}>
          {message.text}
        </div>
      )}
    </form>
  );
};

export default AddProjectForm;