import React, { createContext, useContext, useState, useCallback } from 'react';

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);

  // This is the critical fix - using useCallback to maintain referential equality
  const addProject = useCallback((newProject) => {
    setProjects(prevProjects => {
      // Check if project already exists (by _id)
      const existingIndex = prevProjects.findIndex(p => p._id === newProject._id);
      if (existingIndex >= 0) {
        // Update existing project
        const updated = [...prevProjects];
        updated[existingIndex] = newProject;
        return updated;
      }
      // Add new project to beginning of array
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

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};