import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import '../css/AdminPanel.css';
import { apiUrl } from '../utils/api';
import ghanaRegions from '../data/ghanaRegions';

const PER_PAGE = 8;

const AdminPanel = () => {
  const [projects, setProjects] = useState([]);
  const [forums, setForums] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingForums, setLoadingForums] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Filters
  const [filterRegion, setFilterRegion] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Admin token
  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Fetch data
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [projRes, forumRes] = await Promise.all([
          axios.get(apiUrl('/api/projects')),
          axios.get(apiUrl('/api/forums')),
        ]);

        setProjects(Array.isArray(projRes.data) ? projRes.data : []);
        setForums(Array.isArray(forumRes.data) ? forumRes.data : []);
      } catch (err) {
        console.error('Fetch failed:', err?.message || err);
      } finally {
        setLoadingProjects(false);
        setLoadingForums(false);
      }
    };

    const fetchUsers = async () => {
      try {
        const res = await axios.get(apiUrl('/api/users/count'));
        setUserCount(Number(res?.data?.count) || 0);
      } catch (err) {
        console.error('User count failed:', err?.message || err);
        setUserCount(0);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchAll();
    fetchUsers();
  }, []);

  // Client-side filtering
  const filteredProjects = useMemo(() => {
    return projects.filter(p =>
      (filterRegion ? p.region === filterRegion : true) &&
      (filterDistrict ? p.district === filterDistrict : true)
    );
  }, [projects, filterRegion, filterDistrict]);

  // Pagination derived lists
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PER_PAGE));
  const currentProjects = useMemo(() => {
    const start = (currentPage - 1) * PER_PAGE;
    return filteredProjects.slice(start, start + PER_PAGE);
  }, [filteredProjects, currentPage]);

  // Stats
  const approvedCount = filteredProjects.filter(p => p.approved).length;
  const pendingCount = filteredProjects.length - approvedCount;

  // Project actions
  const deleteProject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await axios.delete(apiUrl(`/api/projects/${id}`), { headers: authHeaders });
      setProjects(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      console.error('Delete failed:', err.response?.data || err.message);
      alert(err?.response?.data?.error || 'Failed to delete project');
    }
  };

  const toggleApproval = async (id, currentStatus) => {
    try {
      const updated = await axios.put(apiUrl(`/api/projects/${id}/approve`), { approved: !currentStatus });
      setProjects(prev =>
        prev.map(p => (p._id === id ? { ...p, approved: updated.data.approved } : p))
      );
    } catch (err) {
      console.error('Approval toggle failed:', err);
      alert(err?.response?.data?.error || 'Failed to toggle approval');
    }
  };

  // Forum actions (admin)
  const deleteForum = async (id) => {
    if (!window.confirm('Are you sure you want to delete this forum?')) return;
    try {
      await axios.delete(apiUrl(`/api/forums/${id}`), { headers: authHeaders });
      setForums(prev => prev.filter(f => f._id !== id));
    } catch (err) {
      console.error('Forum delete failed:', err.response?.data || err.message);
      alert(err?.response?.data?.error || 'Failed to delete forum');
    }
  };

  const editForum = async (id) => {
    const title = prompt('Enter new title (leave blank to keep the same):') ?? '';
    const description = prompt('Enter new description (leave blank to keep the same):') ?? '';
    if (!title && !description) return;

    try {
      const payload = {};
      if (title) payload.title = title;
      if (description) payload.description = description;

      const res = await axios.put(apiUrl(`/api/forums/${id}`), payload, { headers: authHeaders });
      const updated = res?.data;
      setForums(prev => prev.map(f => (f._id === id ? updated : f)));
    } catch (err) {
      console.error('Forum update failed:', err.response?.data || err.message);
      alert(err?.response?.data?.error || 'Failed to update forum');
    }
  };

  // Handlers for filters
  const handleRegionChange = (e) => {
    const value = e.target.value;
    setFilterRegion(value);
    setFilterDistrict(''); // reset district when region changes
    setCurrentPage(1);
  };

  const handleDistrictChange = (e) => {
    setFilterDistrict(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="admin-container">
      {/* Admin Header */}
      <div className="admin-header">
        <h1 className="admin-title">Admin Dashboard</h1>

        {/* Statistics */}
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-value">{filteredProjects.length}</div>
            <div className="stat-label">Filtered Projects</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{approvedCount}</div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{pendingCount}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{forums.length}</div>
            <div className="stat-label">Total Forums</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {loadingUsers ? '...' : userCount}
            </div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-row">
          <select value={filterRegion} onChange={handleRegionChange} className="filter-select">
            <option value="">All Regions</option>
            {ghanaRegions.map(r => (
              <option key={r.name} value={r.name}>{r.name}</option>
            ))}
          </select>

          <select
            value={filterDistrict}
            onChange={handleDistrictChange}
            className="filter-select"
            disabled={!filterRegion}
          >
            <option value="">All Districts</option>
            {(ghanaRegions.find(r => r.name === filterRegion)?.districts || []).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Section */}
      <h2 className="section-title">Project Management</h2>
      
      {loadingProjects ? (
        <div className="empty-state">
          <div className="loading-spinner"></div>
          Loading projects...
        </div>
      ) : currentProjects.length === 0 ? (
        <div className="empty-state">
          {filterRegion || filterDistrict ? 'No projects match your filters' : 'No projects found'}
        </div>
      ) : (
        <>
          <table className="projects-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Status</th>
                <th>Region/District</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentProjects.map(p => (
                <tr key={p._id}>
                  <td data-label="Title">{p.title}</td>
                  <td data-label="Type">{p.type}</td>
                  <td data-label="Status">
                    <span className={`status-badge ${p.approved ? 'status-approved' : 'status-pending'}`}>
                      {p.approved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td data-label="Location">{p.region}, {p.district}</td>
                  <td data-label="Submitted">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td data-label="Actions">
                    <div className="action-buttons">
                      <button 
                        onClick={() => toggleApproval(p._id, p.approved)}
                        className={`action-btn ${p.approved ? 'unapprove-btn' : 'approve-btn'}`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          {p.approved ? (
                            <path d="M18 6L6 18M6 6l12 12" />
                          ) : (
                            <path d="M5 13l4 4L19 7" />
                          )}
                        </svg>
                        {p.approved ? 'Unapprove' : 'Approve'}
                      </button>
                      <button 
                        onClick={() => deleteProject(p._id)}
                        className="action-btn delete-btn"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                        Delete
                      </button>
                      <button 
                        onClick={() => window.location.href = `/edit/${p._id}`}
                        className="action-btn edit-btn"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
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
        </>
      )}

      {/* Forums Section */}
      <h2 className="section-title">Forum Management</h2>
      
      {loadingForums ? (
        <div className="empty-state">
          <div className="loading-spinner"></div>
          Loading forums...
        </div>
      ) : forums.length === 0 ? (
        <div className="empty-state">No forums found</div>
      ) : (
        <table className="projects-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>District</th>
              <th>Created By</th>
              <th>Posted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {forums.map(f => (
              <tr key={f._id}>
                <td data-label="Title">{f.title}</td>
                <td data-label="District">{f.district}</td>
                <td data-label="Created By">{f.createdBy?.username || 'Unknown'}</td>
                <td data-label="Posted">{new Date(f.createdAt).toLocaleDateString()}</td>
                <td data-label="Actions">
                  <div className="action-buttons">
                    <button 
                      onClick={() => editForum(f._id)}
                      className="action-btn edit-btn"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Edit
                    </button>
                    <button 
                      onClick={() => deleteForum(f._id)}
                      className="action-btn delete-btn"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminPanel;