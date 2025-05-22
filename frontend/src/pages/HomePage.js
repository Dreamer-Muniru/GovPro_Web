// src/pages/HomePage.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AddProjectForm from '../components/AddProjectForm';

const HomePage = () => {
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({
    region: '',
    district: '',
    type: ''
  });

  const fetchProjects = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/projects');
      console.log('Fetched projects:', res.data.projects); 
      setProjects(res.data.projects);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const filteredProjects = projects.filter((project) => {
    const matchesRegion = filters.region ? project.region === filters.region : true;
    const matchesDistrict = filters.district ? project.district === filters.district : true;
    const matchesType = filters.type ? project.type === filters.type : true;
    return matchesRegion && matchesDistrict && matchesType;
  });

  // Extract unique values for dropdowns
  const regions = [...new Set(projects.map(p => p.region).filter(Boolean))];
  const districts = [...new Set(projects.map(p => p.district).filter(Boolean))];
  const types = [...new Set(projects.map(p => p.type).filter(Boolean))];

  return (
    <div style={{ padding: '20px' }}>
      <h1>Ghana Project Tracker</h1>

      {/* Add Project Form */}
      <AddProjectForm onProjectAdded={fetchProjects} />

      {/* Filters */}
      <div style={{ margin: '20px 0' }}>
        <h3>Filter Projects</h3>
        <select name="region" value={filters.region} onChange={handleFilterChange}>
          <option value="">All Regions</option>
          {regions.map((r, idx) => (
            <option key={idx} value={r}>{r}</option>
          ))}
        </select>

        <select name="district" value={filters.district} onChange={handleFilterChange} style={{ marginLeft: '10px' }}>
          <option value="">All Districts</option>
          {districts.map((d, idx) => (
            <option key={idx} value={d}>{d}</option>
          ))}
        </select>

        <select name="type" value={filters.type} onChange={handleFilterChange} style={{ marginLeft: '10px' }}>
          <option value="">All Types</option>
          {types.map((t, idx) => (
            <option key={idx} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Project List */}
      {filteredProjects.length === 0 ? (
        <p>No matching projects found.</p>
      ) : (
        filteredProjects.map((project) => {
          console.log('Project data:', project); // Useful for debugging
          return (
            <div key={project._id} style={{ border: '1px solid #ccc', marginBottom: '10px', padding: '10px' }}>
              <h2>{project.title || 'Untitled Project'}</h2>
              <p><strong>Type: </strong> {project.type || 'N/A'}</p>
              <p><strong>Description: </strong> {project.description || 'N/A'}</p>
              <p><strong>Region: </strong> {project.region || 'N/A'}</p>
              <p><strong>District: </strong> {project.district || 'N/A'}</p>
              <p><strong>Location: </strong> {project.location?.address || 'N/A'}</p>
              <p><strong>City: </strong> {project.location?.city || 'N/A'}</p>
              <p><strong>Address: </strong> {project.location?.address || 'N/A'}</p>
              <p><strong>Contractor: </strong> {project.contractor || 'N/A'}</p>
              <p><strong>Status: </strong> {project.status || 'N/A'}</p>
              <p><strong>Date Submitted: </strong> {project.dateSubmitted ? new Date(project.dateSubmitted).toLocaleDateString() : 'N/A'}</p>
              <p><strong>Submitted By: </strong> {project.submittedBy || 'N/A'}</p>
              <p><strong>GPS: </strong>
                {project.gps && project.gps.latitude && project.gps.longitude
                  ? `Lat ${project.gps.latitude}, Lng ${project.gps.longitude}`
                  : 'N/A'}
              </p>
              {project.imageUrl && (
                <img
                  src={project.imageUrl}
                  alt={project.title || 'Project Image'}
                  style={{ width: '200px', objectFit: 'cover' }}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default HomePage;
