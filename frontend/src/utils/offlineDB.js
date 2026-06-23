/**
 * offlineDB.js
 * Thin wrapper around IndexedDB for the offline project submission queue.
 * All public functions return Promises so callers can use async/await.
 */

const DB_NAME = 'GhanaPTOffline';
const DB_VERSION = 1;
const STORE = 'pendingProjects';

// ─── open / upgrade ──────────────────────────────────────────────────────────

let _db = null; // module-level singleton

function openDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        // Index so we can efficiently query by status
        store.createIndex('status', 'status', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      _db = event.target.result;
      // If the connection is closed externally, reset so next call re-opens
      _db.onclose = () => { _db = null; };
      resolve(_db);
    };

    request.onerror = (event) => {
      reject(new Error('IndexedDB open failed: ' + event.target.error));
    };
  });
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function txStore(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function promisifyRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => reject(req.error);
  });
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Save a project draft to the queue.
 *
 * @param {Object} fields   - All plain-text form fields
 * @param {Object|null} imageData - { base64, name, type } or null
 * @returns {Promise<number>} The auto-generated record id
 */
export async function saveToQueue(fields, imageData = null) {
  const db = await openDB();
  const record = {
    savedAt: Date.now(),
    status: 'pending',       // pending | syncing | failed
    retryCount: 0,
    fields,
    imageData,               // serialised image; null when no photo attached
  };
  const store = txStore(db, 'readwrite');
  return promisifyRequest(store.add(record));
}

/**
 * Return every record (all statuses).
 * @returns {Promise<Array>}
 */
export async function getAllQueued() {
  const db = await openDB();
  return promisifyRequest(txStore(db, 'readonly').getAll());
}

/**
 * Return only records with status === 'pending' or 'failed'.
 * @returns {Promise<Array>}
 */
export async function getPendingQueued() {
  const all = await getAllQueued();
  return all.filter((r) => r.status === 'pending' || r.status === 'failed');
}

/**
 * Update the status (and optionally retryCount) of a single record.
 * @param {number} id
 * @param {'pending'|'syncing'|'failed'} status
 * @param {number} [retryCount]
 */
export async function updateStatus(id, status, retryCount) {
  const db = await openDB();
  const store = txStore(db, 'readwrite');
  const record = await promisifyRequest(store.get(id));
  if (!record) return;
  record.status = status;
  if (retryCount !== undefined) record.retryCount = retryCount;
  return promisifyRequest(store.put(record));
}

/**
 * Permanently delete a record once successfully synced.
 * @param {number} id
 */
export async function removeFromQueue(id) {
  const db = await openDB();
  return promisifyRequest(txStore(db, 'readwrite').delete(id));
}

/**
 * Count of records still waiting (pending or failed).
 * @returns {Promise<number>}
 */
export async function pendingCount() {
  const rows = await getPendingQueued();
  return rows.length;
}

/**
 * Convert a browser File object → base64 string for IndexedDB storage.
 * @param {File} file
 * @returns {Promise<{base64: string, name: string, type: string}>}
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve({
      base64: reader.result,   // data:image/jpeg;base64,....
      name: file.name,
      type: file.type,
    });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a stored base64 string back to a File object for FormData.
 * @param {{base64: string, name: string, type: string}} imageData
 * @returns {File}
 */
export function base64ToFile({ base64, name, type }) {
  const arr   = base64.split(',');
  const bstr  = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
  return new File([u8arr], name, { type });
}