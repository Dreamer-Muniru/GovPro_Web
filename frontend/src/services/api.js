// src/services/api.js
import axios from 'axios';
import { apiUrl } from '../utils/api';

const API_BASE_URL = apiUrl('/api');

export const fetchProjects = () => axios.get(`${API_BASE_URL}/projects`);

export const createProject = (projectData) =>
  axios.post(`${API_BASE_URL}/projects`, projectData);
