/**
 * useOfflineSync.js
 *
 * Central hook that:
 *  - tracks online/offline status
 *  - exposes pendingCount so any component can show a badge
 *  - runs automatic sync whenever the browser comes back online
 *  - exposes a manual syncNow() trigger
 *  - handles exponential back-off on repeated failures (max 3 retries)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import {
  getPendingQueued,
  updateStatus,
  removeFromQueue,
  base64ToFile,
} from './offlineDB';
import { createProject } from '../services/api';

const MAX_RETRIES = 3;

// Build a multipart FormData from a queued record (mirrors AddProjectForm logic)
function buildFormData(record) {
  const fd = new FormData();
  const f  = record.fields;

  const textFields = [
    'title', 'type', 'fundingSource', 'otherFundingSources',
    'description', 'region', 'district', 'location_address',
    'location_city', 'gps_latitude', 'gps_longitude',
    'contractor', 'status', 'submittedBy',
  ];

  textFields.forEach((key) => {
    if (f[key] !== undefined && f[key] !== null) fd.append(key, f[key]);
  });

  // Mirror the two overrides AddProjectForm applies before sending
  fd.append('location_region', f.region || '');
  if (f.startDate) fd.append('projectStartDate', f.startDate);

  // Re-hydrate image from base64 if present
  if (record.imageData) {
    fd.append('image', base64ToFile(record.imageData));
  }

  return fd;
}

export function useOfflineSync() {
  const [isOnline,    setIsOnline]    = useState(navigator.onLine);
  const [pending,     setPending]     = useState(0);
  const [syncing,     setSyncing]     = useState(false);
  const isSyncingRef = useRef(false);   // guard against concurrent sync runs

  // ── refresh pending count ────────────────────────────────────────────────
  const refreshCount = useCallback(async () => {
    try {
      const rows = await getPendingQueued();
      setPending(rows.length);
    } catch {
      // IndexedDB unavailable (e.g. private browsing in some browsers)
    }
  }, []);

  // ── core sync logic ──────────────────────────────────────────────────────
  const syncNow = useCallback(async () => {
    if (isSyncingRef.current || !navigator.onLine) return;

    isSyncingRef.current = true;
    setSyncing(true);

    try {
      const rows = await getPendingQueued();
      if (rows.length === 0) return;

      let successCount = 0;
      let failCount    = 0;

      for (const record of rows) {
        // Skip if already exceeded retry limit
        if (record.retryCount >= MAX_RETRIES) {
          failCount++;
          continue;
        }

        await updateStatus(record.id, 'syncing', record.retryCount);

        try {
          const fd = buildFormData(record);
          await createProject(fd);
          await removeFromQueue(record.id);
          successCount++;
        } catch (err) {
          const nextRetry = record.retryCount + 1;
          await updateStatus(
            record.id,
            nextRetry >= MAX_RETRIES ? 'failed' : 'pending',
            nextRetry
          );
          failCount++;
          console.warn(`[OfflineSync] record ${record.id} failed (attempt ${nextRetry}):`, err.message);
        }
      }

      // User-facing feedback
      if (successCount > 0) {
        toast.success(
          `✅ ${successCount} offline project${successCount > 1 ? 's' : ''} synced successfully!`,
          { autoClose: 4000 }
        );
      }
      if (failCount > 0) {
        toast.error(
          `⚠️ ${failCount} project${failCount > 1 ? 's' : ''} failed to sync. ` +
          (failCount > 0 && rows.some(r => r.retryCount + 1 >= MAX_RETRIES)
            ? 'Manual retry needed.'
            : 'Will retry automatically.'),
          { autoClose: 6000 }
        );
      }
    } finally {
      isSyncingRef.current = false;
      setSyncing(false);
      refreshCount();
    }
  }, [refreshCount]);

  // ── online / offline listeners ───────────────────────────────────────────
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      // Small delay so the connection is stable before hitting the server
      setTimeout(() => syncNow(), 1500);
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [syncNow]);

  // ── on mount: sync any leftover queue from a previous session ────────────
  useEffect(() => {
    refreshCount();
    if (navigator.onLine) syncNow();
  }, [syncNow, refreshCount]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isOnline, pending, syncing, syncNow, refreshCount };
}