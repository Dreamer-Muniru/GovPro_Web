import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import '../css/QRCodeGenerator.css';

/**
 * QRCodeGenerator
 * Props:
 *   project  — the full project object
 *   baseUrl  — optional override (defaults to window.location.origin)
 */
const QRCodeGenerator = ({ project, baseUrl }) => {
  const [open, setOpen] = useState(false);
  const printRef = useRef(null);

  if (!project?._id) return null;

  const origin  = baseUrl || window.location.origin;
  const qrUrl   = `${origin}/citizen/report/${project._id}`;
  const today   = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    if (!printContent) return;
    const win = window.open('', '_blank', 'width=794,height=1123');
    win.document.write(`
      <!DOCTYPE html><html><head>
        <meta charset="utf-8"/>
        <title>QR Code — ${project.title}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #000; }
          .qr-print-page {
            width: 210mm; min-height: 297mm;
            padding: 20mm;
            display: flex; flex-direction: column; align-items: center;
          }
          .qr-print-flag { display: flex; width: 100%; height: 8px; margin-bottom: 20px; }
          .qr-print-flag div { flex: 1; }
          .qr-print-flag div:nth-child(1) { background: #CE1126; }
          .qr-print-flag div:nth-child(2) { background: #FCD116; }
          .qr-print-flag div:nth-child(3) { background: #006B3F; }
          .qr-print-ministry { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #475569; text-align: center; margin-bottom: 4px; }
          .qr-print-title-block { text-align: center; margin-bottom: 24px; }
          .qr-print-main-title { font-size: 22px; font-weight: 900; color: #0f172a; line-height: 1.2; margin-bottom: 8px; }
          .qr-print-sub { font-size: 13px; color: #475569; }
          .qr-code-box { border: 3px solid #0f172a; border-radius: 16px; padding: 24px; margin: 20px 0; background: #fff; }
          .qr-print-details { width: 100%; margin: 20px 0; }
          .qr-print-detail-row { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
          .qr-print-detail-label { font-weight: 700; color: #475569; min-width: 120px; text-transform: uppercase; font-size: 10px; }
          .qr-print-detail-value { color: #0f172a; font-weight: 500; }
          .qr-print-instruction { background: #f0fdf4; border: 2px solid #006B3F; border-radius: 12px; padding: 16px 20px; text-align: center; margin: 16px 0; }
          .qr-print-instruction h3 { font-size: 15px; font-weight: 800; color: #006B3F; margin-bottom: 6px; }
          .qr-print-instruction p { font-size: 12px; color: #166534; line-height: 1.6; }
          .qr-print-url { font-size: 9px; color: #94a3b8; text-align: center; margin-top: 8px; word-break: break-all; }
          .qr-print-footer-flag { display: flex; width: 100%; height: 5px; margin-top: auto; padding-top: 20px; }
          .qr-print-footer-flag div { flex: 1; }
          .qr-print-footer-flag div:nth-child(1) { background: #CE1126; }
          .qr-print-footer-flag div:nth-child(2) { background: #FCD116; }
          .qr-print-footer-flag div:nth-child(3) { background: #006B3F; }
          .qr-print-generated { font-size: 9px; color: #94a3b8; text-align: center; margin-top: 8px; }
        </style>
      </head><body>${printContent}</body></html>
    `);
    win.document.close();
    win.onload = () => { win.print(); };
  };

  const STATUS_LABEL = {
    Resumed:'Ongoing', Completed:'Completed', Abandoned:'Abandoned', Uncompleted:'Not started',
  };

  return (
    <>
      {/* Trigger button */}
      <button className="qrg-trigger-btn" onClick={() => setOpen(true)} title="Generate QR Code for site posting">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="4" height="4"/>
        </svg>
        Generate Site QR
      </button>

      {/* Modal */}
      {open && (
        <div className="qrg-overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="qrg-modal">
            <div className="qrg-flag"><div/><div/><div/></div>
            <div className="qrg-modal-header">
              <div>
                <div className="qrg-modal-title">Site QR Code</div>
                <div className="qrg-modal-sub">Print and post this at the project site</div>
              </div>
              <button className="qrg-close" onClick={() => setOpen(false)}>×</button>
            </div>

            <div className="qrg-modal-body">
              {/* Live preview */}
              <div className="qrg-preview">
                <div className="qrg-preview-project">{project.title}</div>
                <div className="qrg-preview-location">
                  {[project.district, project.region].filter(Boolean).join(', ')}
                </div>
                <div className="qrg-qr-box">
                  <QRCodeSVG
                    value={qrUrl}
                    size={180}
                    level="H"
                    includeMargin={false}
                    imageSettings={{
                      src: '/images/logo.png',
                      height: 32,
                      width: 32,
                      excavate: true,
                    }}
                  />
                </div>
                <div className="qrg-preview-instruction">
                  📱 Scan to report what you see at this site
                </div>
                <div className="qrg-preview-url">{qrUrl}</div>
              </div>

              {/* Print-ready hidden div */}
              <div style={{display:'none'}}>
                <div ref={printRef}>
                  <div className="qr-print-page">
                    <div className="qr-print-flag"><div/><div/><div/></div>
                    <div className="qr-print-ministry">Republic of Ghana · Ministry of Local Government &amp; Rural Development</div>
                    <div className="qr-print-title-block">
                      <div className="qr-print-main-title">{project.title}</div>
                      <div className="qr-print-sub">{[project.district, project.region].filter(Boolean).join(', ')}</div>
                    </div>

                    <div className="qr-code-box">
                      <QRCodeSVG value={qrUrl} size={220} level="H" includeMargin={false}/>
                    </div>

                    <div className="qr-print-instruction">
                      <h3>📱 Scan this QR code to submit your report</h3>
                      <p>
                        You live or work near this project site. Scan with your phone camera to tell the Ministry
                        what you actually see. Your report goes directly to government officials.
                        No account needed. Reports are accepted twice a month.
                      </p>
                    </div>

                    <div className="qr-print-details">
                      {[
                        { label: 'Project Type',  value: project.type },
                        { label: 'Status',        value: STATUS_LABEL[project.status] || project.status },
                        { label: 'Contractor',    value: project.contractor },
                        { label: 'District',      value: project.district },
                        { label: 'Region',        value: project.region },
                        { label: 'Progress',      value: project.completionPercentage != null ? `${project.completionPercentage}%` : null },
                        { label: 'Expected date', value: project.expectedCompletionDate
                            ? new Date(project.expectedCompletionDate).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})
                            : null },
                      ].filter(r => r.value).map(r => (
                        <div key={r.label} className="qr-print-detail-row">
                          <span className="qr-print-detail-label">{r.label}</span>
                          <span className="qr-print-detail-value">{r.value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="qr-print-url">{qrUrl}</div>
                    <div className="qr-print-footer-flag"><div/><div/><div/></div>
                    <div className="qr-print-generated">Generated {today} · Ghana Project Tracker</div>
                  </div>
                </div>
              </div>

              <p className="qrg-info">
                Citizens can scan this code with any phone camera — no app required.
                One report is accepted per two-week period to keep submissions manageable.
              </p>
            </div>

            <div className="qrg-modal-footer">
              <button className="qrg-cancel-btn" onClick={() => setOpen(false)}>Close</button>
              <button className="qrg-print-btn" onClick={handlePrint}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"/>
                  <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                  <rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QRCodeGenerator;