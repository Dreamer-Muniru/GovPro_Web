const PRODUCTION_API = 'https://govpro-web-backend-gely.onrender.com';

const inferBaseFromWindow = () => {
  if (typeof window === 'undefined') return PRODUCTION_API;
  const { protocol, hostname, port } = window.location;
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0';

  // CRA dev server runs on :3000/:3001 — API lives on :5000
  if (isLocal && (!port || port === '3000' || port === '3001')) {
    return `${protocol}//localhost:5000`;
  }

  // Deployed frontend (Vercel, Netlify, custom domain, etc.)
  return PRODUCTION_API;
};

const envBase = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || '';

let resolvedBase = envBase || inferBaseFromWindow();
// Safety: if REACT_APP_API_URL points at the frontend dev server, use the backend port instead
if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0):3000$/.test(resolvedBase)) {
  resolvedBase = resolvedBase.replace(/:\d+$/, ':5000').replace('0.0.0.0', 'localhost');
}

export const API_BASE = resolvedBase;

function trimTrailingSlashes(value) {
  return String(value || '').replace(/\/+$/, '');
}

function trimLeadingSlashes(value) {
  return String(value || '').replace(/^\/+/, '');
}

export function apiUrl(path) {
  const base = trimTrailingSlashes(API_BASE);
  const normalizedPath = trimLeadingSlashes(path);
  return `${base}/${normalizedPath}`;
}