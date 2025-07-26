// src/services/api.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const fetchProjects = () => axios.get(`${API_BASE_URL}/projects`);

export const createProject = (projectData) =>
  axios.post(`${API_BASE_URL}/projects`, projectData);
