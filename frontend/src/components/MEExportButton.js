import React, { useState } from 'react';
import { apiUrl } from '../utils/api';

/**
 * MEExportButton
 * A self-contained button that downloads the M&E PDF.
 * Props: region, district, token, label (optional)
 */
const MEExportButton = ({ region = '', district = '', token, label = 'M&E Report' }) => {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleDownload = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (region)   params.set('region',   region);
      if (district) params.set('district', district);

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(apiUrl(`/api/reports/me-pdf?${params}`), { headers });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `ME_Report_${(district||region||'National').replace(/\s+/g,'_')}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{display:'inline-flex',flexDirection:'column',alignItems:'flex-start',gap:4}}>
      <button
        onClick={handleDownload}
        disabled={loading}
        style={{
          display:'inline-flex', alignItems:'center', gap:7,
          padding:'8px 16px',
          background: loading ? '#94a3b8' : '#006B3F',
          color:'#fff', border:'none', borderRadius:9,
          fontSize:12, fontWeight:700, cursor: loading?'not-allowed':'pointer',
          fontFamily:'inherit', transition:'background 0.15s, transform 0.12s',
          whiteSpace:'nowrap',
        }}
        onMouseEnter={e => { if(!loading) e.currentTarget.style.background='#004d2e'; }}
        onMouseLeave={e => { if(!loading) e.currentTarget.style.background='#006B3F'; }}
      >
        {loading ? (
          <>
            <span style={{width:12,height:12,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'me-spin 0.7s linear infinite',display:'inline-block'}}/>
            Generating…
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            {label}
          </>
        )}
      </button>
      {error && <span style={{fontSize:11,color:'#CE1126',fontWeight:500}}>{error}</span>}
      <style>{`@keyframes me-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default MEExportButton;