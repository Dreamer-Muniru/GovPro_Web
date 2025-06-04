import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import axios from 'axios';
import AddProjectForm from '../components/AddProjectForm';
import Modal from 'react-modal';
import '../home.css'
Modal.setAppElement('#root');

const HomePage = () => {
  const [projects, setProjects] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/projects');
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

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
          {projects.map(project => (
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
        {projects.map(project => (
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
        ))}
      </div>

      {/* Add Project Modal */}
      <Modal 
        isOpen={modalIsOpen} 
        onRequestClose={() => setModalIsOpen(false)}
        className="ReactModal__Content"
        overlayClassName="ReactModal__Overlay"
      >
        <AddProjectForm onSuccess={() => { setModalIsOpen(false); fetchProjects(); }} />
      </Modal>
    </div>
  );
};

export default HomePage;