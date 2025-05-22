import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ghanaRegions from '../data/ghanaRegions';

const projectTypes = [
  'School', 'Hospital', 'Road', 'Residential Bungalow', 'Market Stall',
  'Drainage System', 'Bridge', 'Water System', 'Power Project',
  'Sanitation Facility', 'Government Office', 'Sports & Recreation Center', 'Other'
];

const statusOptions = ['Uncompleted', 'Abandoned', 'Resumed', 'Completed'];

const AddProjectForm = () => {
  const [formData, setFormData] = useState({
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
    image: null,
    status: 'Uncompleted',
    startDate: '',
    submittedBy: ''
  });

  const [districts, setDistricts] = useState([]);
  const [message, setMessage] = useState('');

  // Auto-fetch GPS coordinates on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
        },
        (error) => {
          console.error("GPS error:", error);
        }
      );
    }
  }, []);

  // Update districts when region changes
  const handleRegionChange = (e) => {
    const selectedRegion = e.target.value;
    const regionObj = ghanaRegions.find(r => r.name === selectedRegion);
    const regionDistricts = regionObj ? regionObj.districts : [];
    
    setFormData((prev) => ({
      ...prev,
      region: selectedRegion,
      district: '',
    }));
    setDistricts(regionDistricts);
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === 'image') {
      setFormData({ ...formData, image: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

 const data = new FormData();
    data.append('title', formData.title);
    data.append('type', formData.type === 'Other' ? formData.customType : formData.type);
    data.append('customType', formData.customType);
    data.append('description', formData.description);
    data.append('region', formData.region);
    data.append('district', formData.district);
    data.append('contractor', formData.contractor);
    data.append('status', formData.status);
    data.append('startDate', formData.startDate);
    data.append('submittedBy', formData.submittedBy);

    // Include location and GPS fields as flat keys (let backend reconstruct them)
    data.append('address', formData.address);
    data.append('city', formData.city);
    data.append('latitude', formData.latitude);
    data.append('longitude', formData.longitude);
    if (formData.image) {
      data.append('image', formData.image);
    }

    try {
      const res = await axios.post('http://localhost:5000/api/projects', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage('✅ Project submitted successfully!');
      
      setFormData({
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
        image: null,
        status: 'Uncompleted',
        startDate: '',
        submittedBy: ''
      });
      setDistricts([]);
    } catch (error) {
      console.error('❌ Error submitting project:', error);
      const errorMsg = error.response?.data?.message || 'Failed to submit project.';
      setMessage(`❌ ${errorMsg}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} encType="multipart/form-data">
      <input type="text" name="title" placeholder="Project Title" value={formData.title} onChange={handleChange} required />

      <select name="type" value={formData.type} onChange={handleChange} required>
        <option value="">Select Project Type</option>
        {projectTypes.map((type) => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>

      {formData.type === 'Other' && (
        <input type="text" name="customType" placeholder="Custom Project Type" value={formData.customType} onChange={handleChange} />
      )}

      <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} required />

      <select name="region" value={formData.region} onChange={handleRegionChange} required>
        <option value="">Select Region</option>
        {ghanaRegions.map((region) => (
          <option key={region.name} value={region.name}>{region.name}</option>
        ))}
      </select>

      <select name="district" value={formData.district} onChange={handleChange} required>
        <option value="">Select District</option>
        {districts.map((district) => (
          <option key={district} value={district}>{district}</option>
        ))}
      </select>

      <input type="text" name="address" placeholder="Address" value={formData.address} onChange={handleChange} />
      <input type="text" name="city" placeholder="City" value={formData.city} onChange={handleChange} />
      <input type="text" name="contractor" placeholder="Contractor Name" value={formData.contractor} onChange={handleChange} />
      <input type="text" name="submittedBy" placeholder="Submitted By" value={formData.submittedBy} onChange={handleChange} />

      <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} />

      <select name="status" value={formData.status} onChange={handleChange}>
        {statusOptions.map(status => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>

      <input type="file" name="image" accept="image/*" onChange={handleChange} />

      <p>GPS Latitude: {formData.latitude || 'Not fetched yet'}</p>
      <p>GPS Longitude: {formData.longitude || 'Not fetched yet'}</p>

      <button type="submit">Submit Project</button>
      {message && <p>{message}</p>}
    </form>
  );
};

export default AddProjectForm;
