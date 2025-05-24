import React, { createContext, useContext, useState, useCallback } from 'react';

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);

  const addProject = useCallback((newProject) => {
    setProjects(prevProjects => {
      // Check if project exists by _id
      if (!newProject._id || prevProjects.some(p => p._id === newProject._id)) {
        return prevProjects;
      }
      return [newProject, ...prevProjects];
    });
  }, []);

  const setAllProjects = useCallback((projects) => {
    setProjects(projects);
  }, []);

  return (
    <ProjectContext.Provider value={{ 
      projects, 
      addProject, 
      setAllProjects 
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => useContext(ProjectContext);