import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import axios from 'axios';
//

// Custom pinpoint marker icon
const pinpointIcon = new Icon({
  iconUrl: '/images/marker-icon.png', 
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/projects');
        const selectedProject = res.data.projects.find(p => p._id === id);

        if (selectedProject) {
          setProject(selectedProject);
        } else {
          console.error('Project not found');
        }
      } catch (err) {
        console.error('Error fetching project details:', err);
      }
    };

    if (id) {
      fetchProject();
    }
  }, [id]);

  if (!project) return <p>Loading project details...</p>;

  return (
    <div className="project-detail-container">
      <button onClick={() => navigate('/')}>← Back to Homepage</button>
      <h1>{project.title}</h1>
      {project.imageUrl && <img src={`http://localhost:5000${project.imageUrl}`} alt={project.title} className="project-detail-image" />}
      
      <p><strong>Type:</strong> {project.type}</p>
      <p><strong>Status:</strong> {project.status}</p>
      <p><strong>Region:</strong> {project.region}, {project.district}</p>
      {project.city && <p><strong>City:</strong> {project.city}</p>}
      {project.address && <p><strong>Address:</strong> {project.address}</p>}
      {project.contractor && <p><strong>Contractor:</strong> {project.contractor}</p>}
      {project.startDate && <p><strong>Start Date:</strong> {new Date(project.startDate).toLocaleDateString()}</p>}
      {project.submittedBy && <p><strong>Submitted By:</strong> {project.submittedBy}</p>}
      <p><strong>Description:</strong> {project.description}</p>

      {/* Interactive Map */}
      <h3>Project Location</h3>
      <MapContainer center={[parseFloat(project.gps.latitude), parseFloat(project.gps.longitude)]} zoom={14} style={{ height: '300px', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[parseFloat(project.gps.latitude), parseFloat(project.gps.longitude)]} icon={pinpointIcon}>
          <Popup>
            <h4>{project.title}</h4>
            <a 
              href={`https://www.google.com/maps?q=${project.gps.latitude},${project.gps.longitude}`} 
              target="_blank" 
              rel="noopener noreferrer">
              Open in Google Maps
            </a>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default ProjectDetail;
