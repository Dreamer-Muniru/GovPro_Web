import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import axios from 'axios';
import AddProjectForm from '../components/AddProjectForm';
import Modal from 'react-modal';
import '../home.css';

Modal.setAppElement('#root');

const customModalStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    padding: '0',
    border: 'none',
    borderRadius: '12px',
    overflow: 'hidden',
    maxWidth: '90%',
    width: '800px',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  }
};

const HomePage = () => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    region: '',
    district: '',
    type: ''
  });
  const [uniqueValues, setUniqueValues] = useState({
    regions: [],
    districts: [],
    types: []
  });

  const fetchProjects = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/projects');
      const projectsData = res.data.projects || [];
      setProjects(projectsData);
      setFilteredProjects(projectsData);
      
      // Extract unique values for filters
      const regions = [...new Set(projectsData.map(p => p.region))].filter(Boolean);
      const districts = [...new Set(projectsData.map(p => p.district))].filter(Boolean);
      const types = [...new Set(projectsData.map(p => p.type))].filter(Boolean);
      
      setUniqueValues({
        regions,
        districts,
        types
      });
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    // Apply filters whenever filters or projects change
    const filtered = projects.filter(project => {
      return (
        (filters.region === '' || project.region === filters.region) &&
        (filters.district === '' || project.district === filters.district) &&
        (filters.type === '' || project.type === filters.type)
      );
    });
    setFilteredProjects(filtered);
  }, [filters, projects]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      region: '',
      district: '',
      type: ''
    });
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  return (
    <div className="home-page">
      <div className="header">
        <h1 className="page-title">Ghana Project Tracker</h1>
        <button 
          className="add-project-btn"
          onClick={() => setModalIsOpen(true)}
        >
          + Add Project
        </button>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <h3>Filter Projects</h3>
        <div className="filter-controls">
          <div className="filter-group">
            <label htmlFor="region-filter">Region:</label>
            <select
              id="region-filter"
              name="region"
              value={filters.region}
              onChange={handleFilterChange}
            >
              <option value="">All Regions</option>
              {uniqueValues.regions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="district-filter">District:</label>
            <select
              id="district-filter"
              name="district"
              value={filters.district}
              onChange={handleFilterChange}
            >
              <option value="">All Districts</option>
              {uniqueValues.districts.map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="type-filter">Type:</label>
            <select
              id="type-filter"
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
            >
              <option value="">All Types</option>
              {uniqueValues.types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <button 
            className="reset-filters-btn"
            onClick={resetFilters}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Map Section */}
      <div className="map-container">
        <MapContainer 
          center={[5.6037, -0.1870]} 
          zoom={7} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer 
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {filteredProjects.map(project => (
            <Marker key={project._id} position={[project.gps.latitude, project.gps.longitude]}>
              <Popup>
                <h4 className="popup-title">{project.title}</h4>
                {project.imageUrl && (
                  <img 
                    src={`http://localhost:5000${project.imageUrl}`} 
                    alt={project.title} 
                    className="popup-image"
                  />
                )}
                <p className="project-detail"><strong>Type:</strong> {project.type}</p>
                <p className="project-detail"><strong>Status:</strong> {project.status}</p>
                <p className="project-detail"><strong>Location:</strong> {project.region}, {project.district}</p>
                <p className="project-detail"><strong>GPS:</strong> {parseFloat(project.gps.latitude).toFixed(6)}, {parseFloat(project.gps.longitude).toFixed(6)}</p>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Projects List */}
      <div className="projects-grid">
        {filteredProjects.length > 0 ? (
          filteredProjects.map(project => (
            <div key={project._id} className="project-card">
              <h2 className="project-title">{project.title}</h2>
              <p className="project-detail"><strong>Type:</strong> {project.type}</p>
              <p className="project-detail"><strong>Status:</strong> {project.status}</p>
              <p className="project-detail"><strong>Region:</strong> {project.region}, {project.district}</p>
              {project.city && <p className="project-detail"><strong>City:</strong> {project.city}</p>}
              {project.address && <p className="project-detail"><strong>Address:</strong> {project.address}</p>}
              {project.gps.latitude && project.gps.longitude && (
                <p className="project-detail"><strong>GPS:</strong> {parseFloat(project.gps.latitude).toFixed(6)}, {parseFloat(project.gps.longitude).toFixed(6)}</p>
              )}
              {project.contractor && <p className="project-detail"><strong>Contractor:</strong> {project.contractor}</p>}
              {project.startDate && <p className="project-detail"><strong>Start Date:</strong> {new Date(project.startDate).toLocaleDateString()}</p>}
              {project.submittedBy && <p className="project-detail"><strong>Submitted By:</strong> {project.submittedBy}</p>}
              <p className="project-detail"><strong>Description:</strong> {project.description}</p>
              {project.imageUrl && (
                <img 
                  src={`http://localhost:5000${project.imageUrl}`} 
                  alt={project.title} 
                  className="project-image"
                />
              )}
            </div>
          ))
        ) : (
          <div className="no-results">
            <p>No projects match the selected filters.</p>
            <button onClick={resetFilters}>Reset filters</button>
          </div>
        )}
      </div>

      {/* Add Project Modal */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        style={customModalStyles}
        contentLabel="Add Project Modal"
      >
        <AddProjectForm 
          onSuccess={() => { 
            closeModal();
            fetchProjects();
          }} 
        />
      </Modal>
    </div>
  );
};

export default HomePage;