import { useEffect, useState } from 'react';
import axios from 'axios';

const AdminPanel = () => {
  const [projects, setProjects] = useState([]);

const deleteProject = async (id) => {
  if (!window.confirm('Are you sure you want to delete this project?')) return;
  try {
    await axios.delete(`http://localhost:5000/api/projects/${id}`);
    setProjects(prev => prev.filter(p => p._id !== id));
  } catch (err) {
    console.error('Delete failed:', err.response?.data || err.message);
  }
};



  useEffect(() => {
  axios.get('http://localhost:5000/api/projects')
    .then(res => {
      console.log('Admin response:', res.data); // 👀 What exactly is this?
      setProjects(res.data.projects);

    })
    .catch(err => console.error(err));
}, []);

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


  return (
    <div style={{ padding: '2rem' }}>
      <h2>Admin Panel</h2>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Submitted</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map(p => (
            <tr key={p._id}>
              <td>{p.title}</td>
              <td>{p.approved ? 'Approved' : 'Pending'}</td>
              <td>{new Date(p.createdAt).toLocaleString()}</td>
              
              <td>
                <button onClick={() => toggleApproval(p._id, p.approved)}>
                {p.approved ? 'Unapprove' : 'Approve'}
                </button>
                <button onClick={() => deleteProject(p._id)}>Delete</button>

                <button onClick={() => window.location.href = `/edit/${p._id}`}>Edit</button>
                
                
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminPanel;
