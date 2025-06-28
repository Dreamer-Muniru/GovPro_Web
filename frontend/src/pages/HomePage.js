import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/home.css';

const pinpointIcon = new Icon({
  iconUrl: '/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const HomePage = () => {
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({ region: '', district: '', type: '' });
  const [uniqueValues, setUniqueValues] = useState({ regions: [], districts: [], types: [] });
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const fetchProjects = useCallback(async () => {
    try {
      const res = await axios.get('https://govpro-web-backend.onrender.com/api/projects');
      const projectsData = res.data.projects || [];
      setProjects(projectsData);

      setUniqueValues({
        regions: [...new Set(projectsData.map(p => p.region))].filter(Boolean),
        districts: [...new Set(projectsData.map(p => p.district))].filter(Boolean),
        types: [...new Set(projectsData.map(p => p.type))].filter(Boolean),
      });
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const filteredProjects = projects.filter(project =>
    (filters.region ? project.region === filters.region : true) &&
    (filters.district ? project.district === filters.district : true) &&
    (filters.type ? project.type === filters.type : true)
  );

  // Calculate stats
  const totalProjects = projects.length;
  // const approvedProjects = projects.filter(p => p.approved).length;
  // const pendingProjects = totalProjects - approvedProjects;

  return (
    <div className="home-page">
      <div className="ghana-header">
        <h1 className="page-title">Ghana Project Tracker</h1>
      </div>

      <div className="hero-section">
        {/* Stats Banner */}
        <div className="stats-banner">
          <div className="stat-item">
            <div className="stat-value">{totalProjects}</div>
            <div className="stat-label">Total Projects</div>
          </div>    
        </div>

        {/* Map Section */}
        <div className="map-container">
          <MapContainer center={[7.9465, -1.0232]} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {filteredProjects.map(project => 
              project.gps?.latitude && project.gps?.longitude ? (
                <Marker 
                  key={project._id} 
                  position={[parseFloat(project.gps.latitude), parseFloat(project.gps.longitude)]} 
                  icon={pinpointIcon}
                >
                  <Popup>
                    <h4 className="popup-title">{project.title}</h4>
                    {project.imageUrl && (
                      <img 
                        src={`https://govpro-web-backend.onrender.com${project.imageUrl}`} 
                        alt={project.title} 
                        className="popup-image"
                      />
                    )}
                    <p className="popup-detail"><strong>Type:</strong> {project.type}</p>
                    <p className="popup-detail"><strong>Status:</strong> {project.status}</p>
                    <p className="popup-detail"><strong>Location:</strong> {project.region}, {project.district}</p>
                    <button 
                      onClick={() => navigate(`/project/${project._id}`)} 
                      className="view-details-btn"
                    >
                      View Details
                    </button>
                  </Popup>
                </Marker>
              ) : null
            )}
          </MapContainer>
        </div>

        {/* Filter Section */}
        <div className="filter-section">
          <h3>Filter Projects</h3>
          <div className="filter-controls">
            <select name="region" value={filters.region} onChange={handleFilterChange}>
              <option value="">All Regions</option>
              {uniqueValues.regions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
            <select name="district" value={filters.district} onChange={handleFilterChange}>
              <option value="">All Districts</option>
              {uniqueValues.districts.map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
            <select name="type" value={filters.type} onChange={handleFilterChange}>
              <option value="">All Types</option>
              {uniqueValues.types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="loading-spinner">Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="empty-state">No projects match your filters</div>
      ) : (
        <div className="projects-grid">
          {filteredProjects.map(project => (
            <div key={project._id} className="project-card">
              {project.imageUrl && (
                <img 
                  src={`https://govpro-web-backend.onrender.com${project.imageUrl}?${Date.now()}`} 
                  alt={project.title} 
                  className="project-image"
                />
              )}
              <div className="project-content">
                <h2>{project.title}</h2>
                <p className="project-detail"><strong>Type:</strong> {project.type}</p>
                <p className="project-detail"><strong>Status:</strong> {project.status}</p>
                <p className="project-detail"><strong>Region:</strong> {project.region}, {project.district}</p>
                {project.city && (
                  <p className="project-detail"><strong>City:</strong> {project.city}</p>
                )}
                {project.address && (
                  <p className="project-detail"><strong>Address:</strong> {project.address}</p>
                )}
                <button 
                  onClick={() => navigate(`/project/${project._id}`)} 
                  className="view-details-btn"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;