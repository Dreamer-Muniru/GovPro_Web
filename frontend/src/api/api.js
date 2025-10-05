import axios from 'axios';
import { apiUrl } from '../utils/api';

const API = axios.create({
  baseURL: apiUrl('/api'),
});

export default API;
