import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import { useProjectContext } from '../context/ProjectContext';
import AddProjectForm from '../components/AddProjectForm';
import Modal from 'react-modal';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

Modal.setAppElement('#root');

const HomePage = () => {
  const { projects, setAllProjects } = useProjectContext();
  const [filters, setFilters] = useState({
    region: '',
    district: '',
    type: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/projects');
      setAllProjects(res.data.projects || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [setAllProjects]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const filteredProjects = projects.filter(project => {
    return (
      (filters.region ? project.region === filters.region : true) &&
      (filters.district ? project.district === filters.district : true) &&
      (filters.type ? project.type === filters.type : true)
    );
  });

  const regions = [...new Set(projects.map(p => p.region).filter(Boolean))].sort();
  const districts = [...new Set(projects.map(p => p.district).filter(Boolean))].sort();
  const types = [...new Set(projects.map(p => p.type).filter(Boolean))].sort();

  const customStyles = {
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      zIndex: 1000
    },
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      transform: 'translate(-50%, -50%)',
      width: '90%',
      maxWidth: '800px',
      maxHeight: '90vh',
      padding: '0',
      overflow: 'hidden',
      border: 'none',
      borderRadius: '8px'
    }
  };

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '20px',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <h1 style={{ 
        textAlign: 'center', 
        marginBottom: '30px',
        color: '#333'
      }}>Ghana Project Tracker</h1>
      
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        gap: '30px'
      }}>
        {/* Map Section */}
        <div>
          <div style={{ 
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            position: 'relative'
          }}>
            <div style={{ 
              height: '400px', 
              borderRadius: '8px', 
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                top: '10px',
                left: 0,
                right: 0,
                textAlign: 'center',
                zIndex: 1000
              }}>
                <div style={{
                  display: 'inline-block',
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  fontWeight: 'bold',
                  color: '#333'
                }}>
                  <button
                  onClick={() => setModalIsOpen(true)}
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '10px',
                    padding: '12px 20px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    zIndex: 1,
                    fontWeight: 'bold',
                    fontSize: '16px',
                    boxShadow: '0 2px 4px rgba(232, 216, 216, 0.2)',
                    transition: 'transform 0.2s',
                    ':hover': {
                      transform: 'scale(1.05)'
                  }
                }}
                >
                + Add Project
              </button>
                </div>
              </div>
              
              <MapContainer
                center={[5.6037, -0.1870]}
                zoom={7}
                style={{ height: '100%', width: '100%' }}
              > 
              
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {filteredProjects
                  .filter(p => p.latitude && p.longitude)
                  .map(project => (
                    <Marker
                      key={project._id}
                      position={[parseFloat(project.latitude), parseFloat(project.longitude)]}
                      eventHandlers={{
                        click: () => {
                          setSelectedProject(project);
                        },
                      }}
                    >
                      <Popup>
                        <div style={{ maxWidth: '200px' }}>
                          <h4 style={{ marginTop: 0, marginBottom: '8px' }}>{project.title}</h4>
                          <p style={{ margin: '4px 0' }}><strong>Type:</strong> {project.type}</p>
                          <p style={{ margin: '4px 0' }}><strong>Status:</strong> {project.status}</p>
                          <p style={{ margin: '4px 0' }}><strong>Region:</strong> {project.region}</p>
                          <p style={{ margin: '4px 0' }}><strong>District:</strong> {project.district}</p>
                          {project.city && (
                            <p style={{ margin: '4px 0' }}><strong>City:</strong> {project.city}</p>
                          )}
                          {project.address && (
                            <p style={{ margin: '4px 0' }}><strong>Address:</strong> {project.address}</p>
                          )}
                          <p style={{ margin: '4px 0' }}>
                            <strong>GPS:</strong> {parseFloat(project.latitude).toFixed(6)}, {parseFloat(project.longitude).toFixed(6)}
                          </p>
                          {project.imageUrl && (
                            <img 
                              src={project.imageUrl} 
                              alt={project.title} 
                              style={{ 
                                width: '100%', 
                                height: '100px', 
                                objectFit: 'cover',
                                marginTop: '8px',
                                borderRadius: '4px'
                              }}
                            />
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
              </MapContainer>
              
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div>
          {/* Filters */}
          <div style={{ 
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#333' }}>Filter Projects</h3>
            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Region</label>
                <select
                  name="region"
                  value={filters.region}
                  onChange={handleFilterChange}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    borderRadius: '6px', 
                    border: '1px solid #ddd',
                    fontSize: '16px'
                  }}
                >
                  <option value="">All Regions</option>
                  {regions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>District</label>
                <select
                  name="district"
                  value={filters.district}
                  onChange={handleFilterChange}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    borderRadius: '6px', 
                    border: '1px solid #ddd',
                    fontSize: '16px'
                  }}
                >
                  <option value="">All Districts</option>
                  {districts.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#444' }}>Type</label>
                <select
                  name="type"
                  value={filters.type}
                  onChange={handleFilterChange}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    borderRadius: '6px', 
                    border: '1px solid #ddd',
                    fontSize: '16px'
                  }}
                >
                  <option value="">All Types</option>
                  {types.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Projects List */}
          {isLoading ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <p>Loading projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <p>No projects found {projects.length > 0 ? 'matching your filters' : ''}</p>
              {projects.length > 0 && (
                <button 
                  onClick={() => setFilters({ region: '', district: '', type: '' })}
                  style={{
                    marginTop: '15px',
                    padding: '12px 24px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    transition: 'background-color 0.3s',
                    ':hover': {
                      backgroundColor: '#45a049'
                    }
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '20px'
            }}>
              {filteredProjects.map(project => (
                <div 
                  key={project._id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '20px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'transform 0.2s',
                    ':hover': {
                      transform: 'translateY(-5px)'
                    }
                  }}
                >
                  <h2 style={{ marginTop: 0, marginBottom: '10px', color: '#333' }}>{project.title || 'Untitled Project'}</h2>
                  <p style={{ margin: '8px 0' }}><strong>Type:</strong> {project.type}</p>
                  <p style={{ margin: '8px 0' }}><strong>Status:</strong> {project.status}</p>
                  <p style={{ margin: '8px 0' }}><strong>Location:</strong> {project.region}, {project.district}</p>
                 {project.gps && project.gps.latitude && project.gps.longitude && (
                  <p style={{ margin: '8px 0', fontSize: '14px', color: '#666' }}>
                    <strong>GPS Coordinates:</strong> {parseFloat(project.gps.latitude).toFixed(6)}, {parseFloat(project.gps.longitude).toFixed(6)}
                  </p>
                )}
                                  
                  {/* Added missing fields here */}
                  {project.address && (
                    <p style={{ margin: '8px 0' }}><strong>Address:</strong> {project.address}</p>
                  )}
                  {project.city && (
                    <p style={{ margin: '8px 0' }}><strong>City:</strong> {project.city}</p>
                  )}
                  {project.contractor && (
                    <p style={{ margin: '8px 0' }}><strong>Contractor:</strong> {project.contractor}</p>
                  )}
                  {project.startDate && (
                    <p style={{ margin: '8px 0' }}><strong>Start Date:</strong> {new Date(project.startDate).toLocaleDateString()}</p>
                  )}
                  {project.submittedBy && (
                    <p style={{ margin: '8px 0' }}><strong>Submitted By:</strong> {project.submittedBy}</p>
                  )}
                  
                  {/* GPS Coordinates */}
                  {project.latitude && project.longitude && (
                    <p style={{ margin: '8px 0', fontSize: '14px', color: '#666' }}>
                      <strong>GPS Coordinates:</strong> {parseFloat(project.latitude).toFixed(6)}, {parseFloat(project.longitude).toFixed(6)}
                    </p>
                  )}
                  
                  {project.description && (
                    <>
                      <p style={{ margin: '8px 0' }}><strong>Description:</strong></p>
                      <p style={{ margin: '8px 0', color: '#555' }}>{project.description}</p>
                    </>
                  )}
                  {project.imageUrl && (
                    <img
                      src={project.imageUrl}
                      alt={project.title || 'Project image'}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        marginTop: '15px'
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Project Modal */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        style={customStyles}
        contentLabel="Add Project Modal"
        shouldCloseOnOverlayClick={true}
      >
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
          <AddProjectForm 
            onSuccess={() => {
              setModalIsOpen(false);
              fetchProjects();
            }} 
            embeddedModal={true}
          />
        </div>
      </Modal>
    </div>
  );
};

export default HomePage;