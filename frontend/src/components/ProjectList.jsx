// src/components/ProjectList.jsx
import React, { useEffect, useState } from 'react';
import { fetchProjects } from '../services/api';

const ProjectList = () => {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetchProjects()
      .then((res) => setProjects(res.data.projects))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      <h2>Onboarded Projects</h2>
      <ul>
        {projects.map((project) => (
          <li key={project._id}>
            <strong>{project.title}</strong> – {project.district}, {project.region}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProjectList;
