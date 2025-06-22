import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../home.css';

// Custom pinpoint marker icon
const pinpointIcon = new Icon({
  iconUrl: '/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const HomePage = () => {
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({ region: '', district: '', type: '' });
  const [uniqueValues, setUniqueValues] = useState({ regions: [], districts: [], types: [] });

  const navigate = useNavigate();

  // Fetch projects from API
  const fetchProjects = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/projects');
      const projectsData = res.data.projects || [];
      setProjects(projectsData);

      // Extract unique values for filters
      setUniqueValues({
        regions: [...new Set(projectsData.map(p => p.region))].filter(Boolean),
        districts: [...new Set(projectsData.map(p => p.district))].filter(Boolean),
        types: [...new Set(projectsData.map(p => p.type))].filter(Boolean),
      });
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Filter projects correctly for both map markers & list display
  const filteredProjects = projects.filter(project =>
    (filters.region ? project.region === filters.region : true) &&
    (filters.district ? project.district === filters.district : true) &&
    (filters.type ? project.type === filters.type : true)
  );

  return (
    <div className="home-page">
      <div className="header">
        <h1 className="page-title">Ghana Project Tracker</h1>
        <button onClick={() => navigate('/add-project')}>+ Add Project</button>
      </div>

      {/* Map Section */}
      <MapContainer center={[5.6037, -0.1870]} zoom={5} style={{ height: '400px', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {filteredProjects.map(project => 
          project.gps?.latitude && project.gps?.longitude ? (
            <Marker key={project._id} position={[parseFloat(project.gps.latitude), parseFloat(project.gps.longitude)]} icon={pinpointIcon}>
              <Popup>
                <h4>{project.title}</h4>
                {project.imageUrl && <img src={`http://localhost:5000${project.imageUrl}`} alt={project.title} style={{ width: '100px', height: '80px' }} />}
                <p><strong>Type:</strong> {project.type}</p>
                <p><strong>Status:</strong> {project.status}</p>
                <p><strong>Region:</strong> {project.region}, {project.district}</p>
                <p><strong>GPS:</strong> {parseFloat(project.gps.latitude).toFixed(6)}, {parseFloat(project.gps.longitude).toFixed(6)}</p>
                {/* View Details Button inside Popup */}
                <button onClick={() => navigate(`/project/${project._id}`)} className="view-details-btn">View Details</button>
              </Popup>
            </Marker>
          ) : null
        )}
      </MapContainer>

      {/* Filter Section - Below Map */}
      <div className="filter-section">
        <h3>Filter Projects</h3>
        <div className="filter-controls">
          <select name="region" value={filters.region} onChange={handleFilterChange}>
            <option value="">All Regions</option>
            {uniqueValues.regions.map(region => <option key={region} value={region}>{region}</option>)}
          </select>
          <select name="district" value={filters.district} onChange={handleFilterChange}>
            <option value="">All Districts</option>
            {uniqueValues.districts.map(district => <option key={district} value={district}>{district}</option>)}
          </select>
          <select name="type" value={filters.type} onChange={handleFilterChange}>
            <option value="">All Types</option>
            {uniqueValues.types.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
      </div>

      {/* Project List */}
      <div className="projects-grid">
        {filteredProjects.map(project => (
          <div key={project._id} className="project-card">
            <h2>{project.title}</h2>
            <p><strong>Type:</strong> {project.type}</p>
            <p><strong>Status:</strong> {project.status}</p>
            <p><strong>Region:</strong> {project.region}, {project.district}</p>
            {project.city && <p><strong>City:</strong> {project.city}</p>}
            {project.address && <p><strong>Address:</strong> {project.address}</p>}
            <p><strong>GPS:</strong> {parseFloat(project.gps.latitude).toFixed(6)}, {parseFloat(project.gps.longitude).toFixed(6)}</p>
            {project.contractor && <p><strong>Contractor:</strong> {project.contractor}</p>}
            {project.startDate && <p><strong>Start Date:</strong> {new Date(project.startDate).toLocaleDateString()}</p>}
            {project.submittedBy && <p><strong>Submitted By:</strong> {project.submittedBy}</p>}
            <p><strong>Description:</strong> {project.description}</p>
            {project.imageUrl && <img src={`http://localhost:5000${project.imageUrl}?${Date.now()}`} alt={project.title} className="project-image" />}
            {/* View Details Button for each listed project */}
            <button onClick={() => navigate(`/project/${project._id}`)} className="view-details-btn">View Details</button>
           

          </div>
        ))}
      </div>
    </div>
  );
};

export default HomePage;
