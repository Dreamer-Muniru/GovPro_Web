import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import axios from 'axios';
import '../ProjectDetail.css';

const pinpointIcon = new Icon({
  iconUrl: '/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await axios.get('https://govpro-web-backend.onrender.com/api/projects');
        const selectedProject = res.data.projects.find(p => p._id === id);

        if (selectedProject) {
          setProject(selectedProject);
        } else {
          console.error('Project not found');
          navigate('/not-found');
        }
      } catch (err) {
        console.error('Error fetching project details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProject();
    }
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="project-detail-container">
        <div className="loading-spinner"></div>
        <p>Loading project details...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-detail-container">
        <p>Project not found</p>
        <button className="back-button" onClick={() => navigate('/')}>← Back to Homepage</button>
      </div>
    );
  }

  return (
    <div className="project-detail-container">
      <button className="back-button" onClick={() => navigate('/')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Homepage
      </button>

      <div className="project-header">
        <h1 className="project-title">{project.title}</h1>
        {project.imageUrl && (
          <img 
            src={`https://govpro-web-backend.onrender.com${project.imageUrl}`} 
            alt={project.title} 
            className="project-image" 
          />
        )}
      </div>

      <div className="project-details">
        <div className="detail-card">
          <h3>Basic Information</h3>
          <div className="detail-item">
            <span className="detail-label">Type:</span>
            <span className="detail-value">{project.type}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Status:</span>
            <span className="detail-value">{project.status}</span>
          </div>
          {project.contractor && (
            <div className="detail-item">
              <span className="detail-label">Contractor:</span>
              <span className="detail-value">{project.contractor}</span>
            </div>
          )}
          {project.startDate && (
            <div className="detail-item">
              <span className="detail-label">Start Date:</span>
              <span className="detail-value">{new Date(project.startDate).toLocaleDateString()}</span>
            </div>
          )}
          {project.submittedBy && (
            <div className="detail-item">
              <span className="detail-label">Submitted By:</span>
              <span className="detail-value">{project.submittedBy}</span>
            </div>
          )}
        </div>

        <div className="detail-card">
          <h3>Location Details</h3>
          <div className="detail-item">
            <span className="detail-label">Region:</span>
            <span className="detail-value">{project.region}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">District:</span>
            <span className="detail-value">{project.district}</span>
          </div>
          {project.city && (
            <div className="detail-item">
              <span className="detail-label">City/Town:</span>
              <span className="detail-value">{project.city}</span>
            </div>
          )}
          {project.address && (
            <div className="detail-item">
              <span className="detail-label">Address:</span>
              <span className="detail-value">{project.address}</span>
            </div>
          )}
          <div className="detail-item">
            <span className="detail-label">GPS Coordinates:</span>
            <span className="detail-value">
              {parseFloat(project.gps.latitude).toFixed(6)}, {parseFloat(project.gps.longitude).toFixed(6)}
            </span>
          </div>
        </div>
      </div>

      <div className="description-section">
        <h3>Project Description</h3>
        <p>{project.description}</p>
      </div>

      <div className="map-section">
        <h3>Project Location</h3>
        <div className="map-container">
          <MapContainer 
            center={[parseFloat(project.gps.latitude), parseFloat(project.gps.longitude)]} 
            zoom={14} 
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer 
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <Marker 
              position={[parseFloat(project.gps.latitude), parseFloat(project.gps.longitude)]} 
              icon={pinpointIcon}
            >
              <Popup>
                <h4>{project.title}</h4>
                {project.imageUrl && (
                  <img 
                    src={`https://govpro-web-backend.onrender.com${project.imageUrl}`} 
                    alt={project.title} 
                    style={{ 
                      width: '100px', 
                      height: '80px', 
                      display: 'block', 
                      marginBottom: '5px',
                      borderRadius: '4px'
                    }} 
                  />
                )}
                <p><strong>Type:</strong> {project.type}</p>
                <p><strong>Status:</strong> {project.status}</p>
                <p><strong>Region:</strong> {project.region}, {project.district}</p>
                <a 
                  href={`https://www.google.com/maps?q=${project.gps.latitude},${project.gps.longitude}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="gmaps-link"
                >
                  Open in Google Maps
                </a>
              </Popup>
            </Marker>
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;