import axios from 'axios';
import { apiUrl } from '../utils/api';

const API = axios.create({
   baseURL: apiUrl('/api'),
  // baseURL: 'http://localhost:5000/api', 
});

export default API;
