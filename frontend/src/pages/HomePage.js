import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import '../css/home.css';
import Footer from '../components/Footer';
import CommentModal from '../components/CommentModal';

const pinpointIcon = new Icon({
  iconUrl: '/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Extract API call to separate function
const fetchProjectsData = async () => {
  const res = await axios.get('https://govpro-web-backend-gely.onrender.com/api/projects');
  const projectsData = Array.isArray(res.data) ? res.data : res.data.projects || [];
  
  const projectsWithCount = projectsData
    .map(p => ({
      ...p,
      commentCount: p.comments ? p.comments.length : 0,
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  return projectsWithCount;
};

const HomePage = () => {
  const [filters, setFilters] = useState({ region: '', district: '', type: '' });
  const [modalProject, setModalProject] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const projectsPerPage = 9;

  const navigate = useNavigate();

  // Use React Query for data fetching with caching
  const { data: projects = [], isLoading: loading } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjectsData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Calculate unique values from cached data
  const uniqueValues = useMemo(() => {
    if (!projects.length) return { regions: [], districts: [], types: [] };
    
    return {
      regions: [...new Set(projects.map(p => p.region))].filter(Boolean),
      districts: [...new Set(projects.map(p => p.district))].filter(Boolean),
      types: [...new Set(projects.map(p => p.type))].filter(Boolean),
    };
  }, [projects]);

  // Install prompt handling
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

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleCommentCountChange = (projectId, newCount) => {
    // Update comment count in cached data would require queryClient.setQueryData
    // For now, this maintains existing behavior
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(project =>
      (filters.region ? project.region === filters.region : true) &&
      (filters.district ? project.district === filters.district : true) &&
      (filters.type ? project.type === filters.type : true)
    );
  }, [projects, filters]);

  // Pagination
  const { currentProjects, totalPages } = useMemo(() => {
    const indexOfLastProject = currentPage * projectsPerPage;
    const indexOfFirstProject = indexOfLastProject - projectsPerPage;
    return {
      currentProjects: filteredProjects.slice(indexOfFirstProject, indexOfLastProject),
      totalPages: Math.ceil(filteredProjects.length / projectsPerPage)
    };
  }, [filteredProjects, currentPage, projectsPerPage]);

  return (
    <>
      <div className="home-page">
        <div className="ghana-header">
          <h1 className="page-title">Ghana Project Tracker</h1>
        </div>
        
        {deferredPrompt && (
          <button onClick={handleInstallClick} className="install-btn">
            <span className="install-icon">📲</span>
            <span className="install-text">Install App</span>
          </button>
        )}

        <div className="hero-section">
          <div className="map-container">
            <MapContainer 
              center={[7.9465, -1.0232]}
              zoom={7}
              minZoom={7}
              maxZoom={18}
              maxBounds={[[4.5, -3.5], [11.2, 1.3]]}
              maxBoundsViscosity={1.0}
              scrollWheelZoom={true}
              style={{ height: '500px', width: '100%' }}
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
                    <Popup
                      autoPan={true}
                      autoPanPadding={[40, 40]}
                      closeButton={true}
                      className="project-popup"
                      maxWidth={200}
                      minWidth={180}
                      offset={[0, -10]}
                    >
                      <h4 className="popup-title">{project.title}</h4>
                      {project.imageUrl && (
                        <img
                          src={`https://govpro-web-backend-gely.onrender.com${project.imageUrl}`}
                          alt={project.title}
                          className="popup-image"
                        />
                      )}
                      <p className="popup-detail"><strong>Type:</strong> {project.type}</p>
                      <p className="popup-detail"><strong>Status:</strong> {project.status}</p>
                      <p className="popup-detail"><strong>Location:</strong> {project.region}</p>
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
            {currentProjects.map(project => (
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
      
      {totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={currentPage === i + 1 ? 'active-page' : ''}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
      
      <Footer/>
    </>
  );
};

export default HomePage;