/**
 * OfflineSyncBanner.js
 *
 * Sticky top banner (rendered just below <Navbar />) that shows:
 *   • "You are offline" when disconnected
 *   • "N projects waiting to sync" when online with a queue
 *   • "Syncing…" spinner while sync is running
 *
 * Receives the state from useOfflineSync via props so the hook
 * lives in one place (App.js) and everything re-renders together.
 */

import React from 'react';
import './OfflineSyncBanner.css';

const OfflineSyncBanner = ({ isOnline, pending, syncing, syncNow }) => {
  // Nothing to show when online and queue is empty
  if (isOnline && pending === 0 && !syncing) return null;

  return (
    <div
      className={`osb-root ${
        !isOnline ? 'osb-offline' : syncing ? 'osb-syncing' : 'osb-pending'
      }`}
      role="status"
      aria-live="polite"
    >
      <span className="osb-icon" aria-hidden="true">
        {!isOnline ? '📡' : syncing ? '🔄' : '☁️'}
      </span>

      <span className="osb-message">
        {!isOnline
          ? 'You are offline. Projects you submit will be saved locally and synced when you reconnect.'
          : syncing
          ? 'Syncing your offline projects…'
          : `${pending} offline project${pending !== 1 ? 's' : ''} waiting to sync.`}
      </span>

      {/* Show manual sync button only when online, not already syncing, and queue non-empty */}
      {isOnline && !syncing && pending > 0 && (
        <button
          className="osb-sync-btn"
          onClick={syncNow}
          aria-label="Sync offline projects now"
        >
          Sync now
        </button>
      )}

      {syncing && (
        <span className="osb-spinner" aria-hidden="true" />
      )}
    </div>
  );
};

export default OfflineSyncBanner;