import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useProjectContext } from '../context/ProjectContext';
import AddProjectForm from '../components/AddProjectForm';

const HomePage = () => {
  const { projects, setAllProjects } = useProjectContext();
  const [filters, setFilters] = useState({
    region: '',
    district: '',
    type: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Debug effect
  useEffect(() => {
    console.log('Projects updated:', projects);
  }, [projects]);

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
        {/* Form Section */}
        <div>
          <AddProjectForm />
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
            <h3 style={{ marginTop: 0 }}>Filter Projects</h3>
            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Region</label>
                <select
                  name="region"
                  value={filters.region}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '8px' }}
                >
                  <option value="">All Regions</option>
                  {regions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>District</label>
                <select
                  name="district"
                  value={filters.district}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '8px' }}
                >
                  <option value="">All Districts</option>
                  {districts.map(district => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Type</label>
                <select
                  name="type"
                  value={filters.type}
                  onChange={handleFilterChange}
                  style={{ width: '100%', padding: '8px' }}
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
                    marginTop: '10px',
                    padding: '8px 16px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
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
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <h2 style={{ marginTop: 0 }}>{project.title || 'Untitled Project'}</h2>
                  <p><strong>Type:</strong> {project.type}</p>
                  <p><strong>Status:</strong> {project.status}</p>
                  <p><strong>Location:</strong> {project.region}, {project.district}</p>
                  {project.description && (
                    <>
                      <p><strong>Description:</strong></p>
                      <p>{project.description}</p>
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
                        marginTop: '10px'
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;