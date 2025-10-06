const inferBaseFromWindow = () => {
  if (typeof window === 'undefined') return '';
  const { protocol, hostname, port } = window.location;
  // If running CRA dev server on :3000, point to backend :5000
  if (port === '3001') {
    return `${protocol}//localhost:5000`;
  }
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};

const envBase = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) || '';

let resolvedBase = envBase || inferBaseFromWindow();
// Safety: if someone set REACT_APP_API_URL to the frontend origin on :3000, override to backend :5000
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