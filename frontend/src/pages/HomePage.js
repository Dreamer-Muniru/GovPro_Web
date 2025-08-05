import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/home.css';
import Footer from '../components/Footer';
import CommentModal from '../components/CommentModal';
// import CommentBox from '../components/CommentBox';
// import { AuthContext } from '../context/AuthContext'; 

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
  const [modalProject, setModalProject] = useState(null);
  // const { token } = useContext(AuthContext);

  // Increment comment count (fake for now)
  // const incrementCommentCount = (projectId) => {
  //   setProjects((prevProjects) =>
  //     prevProjects.map((proj) =>
  //       proj._id === projectId
  //         ? {
  //             ...proj,
  //             comments: [...(proj.comments || []), { comment: 'placeholder' }], // fake append
  //           }
  //         : proj
  //     )
  //   );
  // };

  // Install prompt handling
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault(); 
      setDeferredPrompt(e); 
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    setDeferredPrompt(null);
  };

  const navigate = useNavigate();
  

  const fetchProjects = useCallback(async () => {
    try {
      const res = await axios.get('https://govpro-web-backend-gely.onrender.com/api/projects');
      const projectsData = Array.isArray(res.data) ? res.data : res.data.projects || [];
      setProjects(projectsData);

      // Add commentCount property for each project
      const projectsWithCount = projectsData.map(p => ({
        ...p,
        commentCount: p.comments ? p.comments.length : 0,
      }));
      setProjects(projectsWithCount);

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

  // This function will be called from the modal/CommentBox
  const handleCommentCountChange = (projectId, newCount) => {
    setProjects(prev =>
      prev.map(p =>
        p._id === projectId
          ? { ...p, commentCount: newCount }
          : p
      )
    );
    // Also update modalProject if open, so the modal stays in sync
    setModalProject(prev =>
      prev && prev._id === projectId
        ? { ...prev, commentCount: newCount }
        : prev
    );
  };

  const filteredProjects = projects.filter(project =>
    (filters.region ? project.region === filters.region : true) &&
    (filters.district ? project.district === filters.district : true) &&
    (filters.type ? project.type === filters.type : true)
  );

  const totalProjects = projects.length;

  return (
    <>
    <div className="home-page">
      <div className="ghana-header">
        <h1 className="page-title">Ghana Project Tracker</h1>
        {deferredPrompt && (
          <button onClick={handleInstallClick} className="install-btn">
            <span className="install-icon">📲</span>
            <span className="install-text">Install App</span>
          </button>
        )}
      </div>

      <div className="hero-section">
        <div className="map-container">
          <MapContainer 
            bounds={[[4.5, -3.5], [11.2, 1.3]]}
            minZoom={6}
            maxBounds={[[4.5, -3.5], [11.2, 1.3]]}
            maxBoundsViscosity={1.0}
            scrollWheelZoom={true}
            style={{ height: '850px', width: '100%' }}
          >
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
                        src={`https://govpro-web-backend-gely.onrender.com${project.imageUrl}`} 
                        alt={project.title} 
                        className="popup-image"
                        style={{ 
                          width: '100px', 
                          height: '80px', 
                          display: 'block', 
                          marginBottom: '5px',
                          borderRadius: '4px'
                        }} 
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
                  src={`https://govpro-web-backend-gely.onrender.com${project.imageUrl}?${Date.now()}`} 
                  alt={project.title} 
                  className="project-image"
                />
              )}
              <div className="project-content">
                <h2>{project.title}</h2>
                <p className="project-detail"><strong>Type:</strong> {project.type}</p>
                <p className="project-detail"><strong>Status:</strong> {project.status}</p>
                <p className="project-detail"><strong>Region:</strong> {project.region}, {project.district}</p>
                {project.city && <p className="project-detail"><strong>City:</strong> {project.city}</p>}
                {project.address && <p className="project-detail"><strong>Address:</strong> {project.address}</p>}
                <button 
                  onClick={() => navigate(`/project/${project._id}`)} 
                  className="view-details-btn"
                >
                  View Details
                </button>

                {/* Updated comment section - always visible */}
                <div className="comment-section">
                  <div 
                    className="comment-count-container"
                    onClick={() => setModalProject(project)}
                  >
                    <i className="far fa-comment comment-icon"></i>
                    <span className="comment-count-number">
                      {project.commentCount ?? project.comments?.length ?? 0}
                    </span>
                    <span className="comment-count-text">Comments</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {modalProject && (
        <CommentModal 
          project={modalProject}
          onClose={() => setModalProject(null)}
          onCommentCountChange={handleCommentCountChange}
        />
      )}
      
    </div>
    <Footer/>
    </>
  );
};

export default HomePage;