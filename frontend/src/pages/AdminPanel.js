import { useEffect, useState } from 'react';
import axios from 'axios';
import '../css/AdminPanel.css';

const AdminPanel = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const deleteProject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      console.error('Delete failed:', err.response?.data || err.message);
    }
  };

  const toggleApproval = async (id, currentStatus) => {
    try {
      const updated = await axios.put(`http://localhost:5000/api/projects/${id}/approve`, {
        approved: !currentStatus,
      });
      setProjects(prev =>
        prev.map(p => (p._id === id ? { ...p, approved: updated.data.approved } : p))
      );
    } catch (err) {
      console.error('Approval toggle failed:', err);
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/projects');
        setProjects(res.data.projects || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Calculate stats
  const approvedCount = projects.filter(p => p.approved).length;
  const pendingCount = projects.length - approvedCount;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1 className="admin-title">Admin Dashboard</h1>
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-value">{projects.length}</div>
            <div className="stat-label">Total Projects</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{approvedCount}</div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{pendingCount}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="empty-state">No projects found</div>
      ) : (
        <table className="projects-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map(p => (
              <tr key={p._id}>
                <td>{p.title}</td>
                <td>{p.type}</td>
                <td>
                  <span className={`status-badge ${p.approved ? 'status-approved' : 'status-pending'}`}>
                    {p.approved ? 'Approved' : 'Pending'}
                  </span>
                </td>
                <td>{new Date(p.createdAt).toLocaleString()}</td>
                <td>
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
      )}
    </div>
  );
};

export default AdminPanel;