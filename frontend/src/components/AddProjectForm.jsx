import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ghanaRegions from '../data/ghanaRegions';
import { useProjectContext } from '../context/ProjectContext';

const projectTypes = [
  'School', 'Hospital', 'Road', 'Residential Bungalow', 'Market Stall',
  'Drainage System', 'Bridge', 'Water System', 'Power Project',
  'Sanitation Facility', 'Government Office', 'Sports & Recreation Center', 'Other'
];

const statusOptions = ['Uncompleted', 'Abandoned', 'Resumed', 'Completed'];

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

    // Validate required fields
    const requiredFields = ['title', 'type', 'description', 'region', 'district'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setMessage({
        text: `Missing required fields: ${missingFields.join(', ')}`,
        type: 'error'
      });
      setIsSubmitting(false);
      return;
    }

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
        addProject({
          ...res.data,
          imageUrl: res.data.imageUrl || null
        });
        setMessage({
          text: '✅ Project submitted successfully!',
          type: 'success'
        });
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
   <form onSubmit={handleSubmit} encType="multipart/form-data" className="project-form">
      <h2>Add New Project</h2>
      
      <div className="form-group">
        <label>Project Title*</label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Project Type*</label>
        <select
          name="type"
          value={formData.type}
          onChange={handleChange}
          required
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
            placeholder="Specify type"
            value={formData.customType}
            onChange={handleChange}
          />
        )}
      </div>

      <div className="form-group">
        <label>Description*</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Region*</label>
        <select
          name="region"
          value={formData.region}
          onChange={handleRegionChange}
          required
        >
          <option value="">Select Region</option>
          {ghanaRegions.map(region => (
            <option key={region.name} value={region.name}>{region.name}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>District*</label>
        <select
          name="district"
          value={formData.district}
          onChange={handleChange}
          required
          disabled={!formData.region}
        >
          <option value="">Select District</option>
          {districts.map(district => (
            <option key={district} value={district}>{district}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Address</label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label>City</label>
        <input
          type="text"
          name="city"
          value={formData.city}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label>Contractor</label>
        <input
          type="text"
          name="contractor"
          value={formData.contractor}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label>Status</label>
        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
        >
          {statusOptions.map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Start Date</label>
        <input
          type="date"
          name="startDate"
          value={formData.startDate}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label>Submitted By</label>
        <input
          type="text"
          name="submittedBy"
          value={formData.submittedBy}
          onChange={handleChange}
        />
      </div>

      <div className="form-group">
        <label>Project Image</label>
        <input
          type="file"
          name="image"
          accept="image/*"
          onChange={handleChange}
          key={fileInputKey}
        />
      </div>

      <div className="form-group">
        <p>📍 Latitude: {formData.latitude || 'Not available'}</p>
        <p>📍 Longitude: {formData.longitude || 'Not available'}</p>
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : 'Submit Project'}
      </button>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <style jsx>{`
        .project-form {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background: #f9f9f9;
          border-radius: 8px;
        }
        .form-group {
          margin-bottom: 15px;
        }
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        input, select, textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        textarea {
          min-height: 100px;
        }
        button {
          background: #4CAF50;
          color: white;
          padding: 10px 15px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        button:disabled {
          background: #cccccc;
        }
        .message {
          padding: 10px;
          margin-top: 15px;
          border-radius: 4px;
        }
        .success {
          background: #dff0d8;
          color: #3c763d;
        }
        .error {
          background: #f2dede;
          color: #a94442;
        }
      `}</style>
    </form>
  );
};

export default AddProjectForm;