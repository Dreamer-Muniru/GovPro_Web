// src/components/AddProjectForm.js
import React, { useState } from 'react';
import axios from 'axios';

const AddProjectForm = ({ onProjectAdded }) => {
  const [formData, setFormData] = useState({
    title: '',
    type: '',
    description: '',
    region: '',
    district: '',
    location: '',
    gpsLat: '',
    gpsLng: '',
    contractorName: '',
    imageUrl: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newProject = {
      ...formData,
      gps: {
        lat: formData.gpsLat,
        lng: formData.gpsLng,
      },
    };

    try {
      const res = await axios.post('http://localhost:5000/api/projects', newProject);
      if (res.data.success) {
        alert('Project added successfully');
        onProjectAdded(); // Trigger a refresh
        setFormData({
          title: '',
          type: '',
          description: '',
          region: '',
          district: '',
          location: '',
          gpsLat: '',
          gpsLng: '',
          contractorName: '',
          imageUrl: '',
        });
      }
    } catch (err) {
      console.error('Error submitting project:', err);
      alert('Submission failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
      <h2>Onboard a New Project</h2>
      <input name="title" placeholder="Title" value={formData.title} onChange={handleChange} required /><br />
      <input name="type" placeholder="Type" value={formData.type} onChange={handleChange} required /><br />
      <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} required /><br />
      <input name="region" placeholder="Region" value={formData.region} onChange={handleChange} required /><br />
      <input name="district" placeholder="District" value={formData.district} onChange={handleChange} required /><br />
      <input name="location" placeholder="Location" value={formData.location} onChange={handleChange} required /><br />
      <input name="gpsLat" placeholder="Latitude" value={formData.gpsLat} onChange={handleChange} required /><br />
      <input name="gpsLng" placeholder="Longitude" value={formData.gpsLng} onChange={handleChange} required /><br />
      <input name="contractorName" placeholder="Contractor Name" value={formData.contractorName} onChange={handleChange} required /><br />
      <input name="imageUrl" placeholder="Image URL" value={formData.imageUrl} onChange={handleChange} /><br />
      <button type="submit">Submit Project</button>
    </form>
  );
};

export default AddProjectForm;
