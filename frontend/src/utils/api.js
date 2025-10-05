export const API_BASE =
  (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
  (typeof window !== 'undefined' ? window.location.origin : '');

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
