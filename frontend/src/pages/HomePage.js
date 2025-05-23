import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import AddProjectForm from '../components/AddProjectForm';
import { useProjectContext } from '../context/ProjectContext';

const HomePage = () => {
  const { projects, setAllProjects } = useProjectContext();
  const [filters, setFilters] = useState({
    region: '',
    district: '',
    type: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Debug: Log when projects change
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

  // Initial load
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const filteredProjects = projects.filter((project) => {
    const matchesRegion = filters.region ? project.region === filters.region : true;
    const matchesDistrict = filters.district ? project.district === filters.district : true;
    const matchesType = filters.type ? project.type === filters.type : true;
    return matchesRegion && matchesDistrict && matchesType;
  });

  const regions = [...new Set(projects.map(p => p.region).filter(Boolean))];
  const districts = [...new Set(projects.map(p => p.district).filter(Boolean))];
  const types = [...new Set(projects.map(p => p.type).filter(Boolean))];

  return (
     <div className="home-page">
      <h1>Ghana Project Tracker</h1>
      
      <AddProjectForm />

      <div className="filters">
        <h3>Filter Projects</h3>
        <div className="filter-controls">
          <select name="region" value={filters.region} onChange={handleFilterChange}>
            <option value="">All Regions</option>
            {regions.map((r, idx) => (
              <option key={idx} value={r}>{r}</option>
            ))}
          </select>
          <select name="district" value={filters.district} onChange={handleFilterChange}>
            <option value="">All Districts</option>
            {districts.map((d, idx) => (
              <option key={idx} value={d}>{d}</option>
            ))}
          </select>
          <select name="type" value={filters.type} onChange={handleFilterChange}>
            <option value="">All Types</option>
            {types.map((t, idx) => (
              <option key={idx} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="loading">Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="no-projects">
          <p>No projects found. {projects.length > 0 ? 'Try changing filters.' : ''}</p>
        </div>
      ) : (
        <div className="project-grid">
          {filteredProjects.map((project) => (
            <div key={project._id} className="project-card">
              <h2>{project.title || 'Untitled Project'}</h2>
              
              <div className="project-meta">
                <p><strong>Type:</strong> {project.type || 'N/A'}</p>
                <p><strong>Status:</strong> {project.status || 'N/A'}</p>
                <p><strong>Location:</strong> {[project.region, project.district].filter(Boolean).join(', ') || 'N/A'}</p>
                {project.address && <p><strong>Address:</strong> {project.address}</p>}
              </div>

              {project.description && (
                <div className="project-description">
                  <p><strong>Description:</strong></p>
                  <p>{project.description}</p>
                </div>
              )}

              <div className="project-details">
                <p><strong>Contractor:</strong> {project.contractor || 'N/A'}</p>
                {project.startDate && (
                  <p><strong>Start Date:</strong> {new Date(project.startDate).toLocaleDateString()}</p>
                )}
                {project.submittedBy && (
                  <p><strong>Submitted By:</strong> {project.submittedBy}</p>
                )}
              </div>

              {project.latitude && project.longitude && (
                <div className="project-coordinates">
                  <p><strong>Coordinates:</strong> {project.latitude}, {project.longitude}</p>
                </div>
              )}

              {project.imageUrl && (
                <div className="project-image">
                  <img
                    src={project.imageUrl}
                    alt={project.title || 'Project image'}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .home-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .filters {
          margin: 30px 0;
          padding: 20px;
          background: #f5f5f5;
          border-radius: 8px;
        }
        .filter-controls {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .filter-controls select {
          padding: 8px;
          min-width: 200px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .project-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        .project-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .project-card h2 {
          margin-top: 0;
          color: #333;
        }
        .project-image img {
          width: 100%;
          height: 200px;
          object-fit: cover;
          border-radius: 4px;
          margin-top: 15px;
        }
        .loading, .no-projects {
          text-align: center;
          padding: 20px;
        }
      `}</style>
    </div>
  );
};

export default HomePage;