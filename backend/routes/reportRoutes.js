/**
 * reportRoutes.js
 * GET /api/reports/projects
 * Query params: region, district, status, fundingSource, title (report title override)
 *
 * Streams a professionally formatted A4 PDF using pdfkit.
 * Install: npm install pdfkit
 */

const express  = require('express');
const router   = express.Router();
const PDFDoc   = require('pdfkit');
const Project  = require('../models/projects');

// ── colours (Ghana palette) ───────────────────────────────────────────────────
const C = {
  red:        '#CE1126',
  gold:       '#FCD116',
  green:      '#006B3F',
  navy:       '#0f172a',
  slate:      '#475569',
  muted:      '#94a3b8',
  light:      '#f1f5f9',
  white:      '#ffffff',
  border:     '#e2e8f0',
  // status
  ongoing:    '#006B3F',
  completed:  '#1d4ed8',
  abandoned:  '#CE1126',
  incomplete: '#d97706',
};

const STATUS_COLOR = {
  Resumed:     C.ongoing,
  Completed:   C.completed,
  Abandoned:   C.abandoned,
  Uncompleted: C.incomplete,
};
const STATUS_LABEL = {
  Resumed:     'Ongoing',
  Completed:   'Completed',
  Abandoned:   'Abandoned',
  Uncompleted: 'Uncompleted',
};

const FUNDING_LABEL = {
  Government: 'Government Budget',
  GIIF:       'GIIF',
  DACF:       'DACF',
  WorldBank:  'World Bank',
  IMF:        'IMF',
  UNDP:       'UNDP',
};

const fmtGHS = (v) => v != null ? `GHS ${Number(v).toLocaleString('en-GH', { minimumFractionDigits: 2 })}` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—';
const fmtPct  = (v) => (v != null && v !== '') ? `${Number(v)}%` : '0%';

// ── helpers ───────────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const h = hex.replace('#','');
  return {
    r: parseInt(h.slice(0,2),16),
    g: parseInt(h.slice(2,4),16),
    b: parseInt(h.slice(4,6),16),
  };
}
function fillRect(doc, x, y, w, h, color) {
  const { r, g, b } = hexToRgb(color);
  doc.rect(x, y, w, h).fill([r, g, b]);
}
function strokeRect(doc, x, y, w, h, color, lineWidth = 0.5) {
  const { r, g, b } = hexToRgb(color);
  doc.rect(x, y, w, h).lineWidth(lineWidth).stroke([r, g, b]);
}

// ── page dimensions ───────────────────────────────────────────────────────────
const A4_W = 595.28;
const A4_H = 841.89;
const M    = 45;       // margin
const BODY_W = A4_W - M * 2;

// ── running page number footer ─────────────────────────────────────────────────
function addFooter(doc, pageNum, totalPages, reportTitle) {
  const y = A4_H - 32;
  // Flag stripe at bottom
  fillRect(doc, 0,    y + 18, A4_W / 3,     4, C.red);
  fillRect(doc, A4_W / 3,  y + 18, A4_W / 3, 4, C.gold);
  fillRect(doc, (A4_W / 3) * 2, y + 18, A4_W / 3, 4, C.green);

  doc.fontSize(8).fillColor(C.muted)
     .text(reportTitle, M, y, { width: BODY_W * 0.6, align:'left' })
     .text(`Page ${pageNum} of ${totalPages}`, M, y, { width: BODY_W, align:'right' });
}

// ── GET /api/reports/projects ─────────────────────────────────────────────────
router.get('/projects', async (req, res) => {
  try {
    const { region = '', district = '', status = '', fundingSource = '' } = req.query;

    // Build mongo filter
    const filter = {};
    if (region)        filter.region        = region;
    if (district)      filter.district      = district;
    if (status)        filter.status        = status;
    if (fundingSource) filter.fundingSource = fundingSource;

    const projects = await Project.find(filter).sort({ region:1, district:1, title:1 }).lean();

    if (!projects.length) {
      return res.status(404).json({ error: 'No projects found for the selected filters.' });
    }

    // ── financial totals ──────────────────────────────────────────────────────
    const totals = projects.reduce((acc, p) => ({
      totalCost:         acc.totalCost         + (Number(p.totalCost)         || 0),
      amountPaid:        acc.amountPaid        + (Number(p.amountPaid)        || 0),
      outstandingAmount: acc.outstandingAmount + (Number(p.outstandingAmount) || 0),
    }), { totalCost:0, amountPaid:0, outstandingAmount:0 });

    // ── status counts ─────────────────────────────────────────────────────────
    const statusCounts = { Resumed:0, Completed:0, Abandoned:0, Uncompleted:0 };
    projects.forEach(p => { if (statusCounts[p.status] !== undefined) statusCounts[p.status]++; });

    // ── build PDF ─────────────────────────────────────────────────────────────
    // We do two passes: first count pages, then generate with correct totals.
    // Simpler: generate, track page count, then set in footer via callback.
    const PROJECTS_PER_PAGE = 12;
    const dataPages  = Math.ceil(projects.length / PROJECTS_PER_PAGE);
    const totalPages = 1 + dataPages + 1; // cover + data pages + summary page

    const reportScope = [district, region].filter(Boolean).join(', ') || 'All Regions';
    const reportTitle = `Ghana Project Tracker — ${reportScope}`;
    const generatedAt = new Date().toLocaleString('en-GB', {
      day:'numeric', month:'long', year:'numeric',
      hour:'2-digit', minute:'2-digit',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="GovPro_Report_${(district||region||'All').replace(/\s+/g,'_')}_${Date.now()}.pdf"`);

    const doc = new PDFDoc({ size:'A4', margin:0, bufferPages:true });
    doc.pipe(res);

    // ════════════════════════════════════════════════════════════════════════
    // PAGE 1 — COVER
    // ════════════════════════════════════════════════════════════════════════

    // Dark navy header band
    fillRect(doc, 0, 0, A4_W, 200, C.navy);

    // Ghana flag stripe across top
    fillRect(doc, 0, 0, A4_W / 3,           6, C.red);
    fillRect(doc, A4_W / 3, 0, A4_W / 3,    6, C.gold);
    fillRect(doc, (A4_W / 3)*2, 0, A4_W / 3,6, C.green);

    // ── Coat of Arms representation (stylised star + eagle silhouette) ────
    // We draw a Ghana Black Star (circle + 5-point star) in gold
    const coa_cx = A4_W / 2;
    const coa_cy = 80;

    // Outer circle
    const { r: gr, g: gg, b: gb } = hexToRgb(C.gold);
    doc.circle(coa_cx, coa_cy, 38).lineWidth(2.5).stroke([gr, gg, gb]);

    // 5-point star inside circle (drawn as polygon)
    const star = (cx, cy, outer, inner, points) => {
      const path = [];
      for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI / points) - Math.PI / 2;
        const r = i % 2 === 0 ? outer : inner;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        path.push({ x, y });
      }
      return path;
    };
    const pts = star(coa_cx, coa_cy, 28, 12, 5);
    doc.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(pt => doc.lineTo(pt.x, pt.y));
    doc.closePath().fill([gr, gg, gb]);

    // ── Ministry text ──────────────────────────────────────────────────────
    doc.fillColor(C.white)
       .fontSize(8).font('Helvetica')
       .text('REPUBLIC OF GHANA', 0, 130, { width: A4_W, align:'center' })
       .fontSize(9).font('Helvetica-Bold')
       .text('MINISTRY OF LOCAL GOVERNMENT AND RURAL DEVELOPMENT', 0, 143, { width: A4_W, align:'center' })
       .fontSize(7).font('Helvetica')
       .fillColor(C.gold)
       .text('Government of Ghana — Official Project Monitoring Report', 0, 158, { width: A4_W, align:'center' });

    // ── Flag stripe band separating header ────────────────────────────────
    fillRect(doc, 0, 200, A4_W / 3,           8, C.red);
    fillRect(doc, A4_W / 3, 200, A4_W / 3,    8, C.gold);
    fillRect(doc, (A4_W / 3)*2, 200, A4_W / 3,8, C.green);

    // ── Report title area ──────────────────────────────────────────────────
    doc.fillColor(C.navy)
       .fontSize(22).font('Helvetica-Bold')
       .text('PROJECT PROGRESS REPORT', M, 230, { width: BODY_W, align:'center' });

    doc.fillColor(C.slate)
       .fontSize(13).font('Helvetica')
       .text(reportScope, M, 260, { width: BODY_W, align:'center' });

    // Decorative rule
    const { r:rr, g:rg, b:rb } = hexToRgb(C.red);
    doc.moveTo(M, 282).lineTo(A4_W - M, 282).lineWidth(1).stroke([rr, rg, rb]);
    const { r:gr2, g:gg2, b:gb2 } = hexToRgb(C.gold);
    doc.moveTo(M, 284).lineTo(A4_W - M, 284).lineWidth(0.5).stroke([gr2, gg2, gb2]);
    const { r:grn, g:gng, b:gnb } = hexToRgb(C.green);
    doc.moveTo(M, 286).lineTo(A4_W - M, 286).lineWidth(1).stroke([grn, gng, gnb]);

    // ── Meta info grid ─────────────────────────────────────────────────────
    const metaY   = 306;
    const cellW   = BODY_W / 3;
    const metaItems = [
      { label:'Report Date',   value: new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}) },
      { label:'Total Projects',value: String(projects.length) },
      { label:'Status Filter', value: status ? STATUS_LABEL[status] : 'All Statuses' },
    ];
    metaItems.forEach((item, i) => {
      const x = M + i * cellW;
      fillRect(doc, x, metaY, cellW - 8, 50, C.light);
      strokeRect(doc, x, metaY, cellW - 8, 50, C.border);
      doc.fontSize(7).font('Helvetica').fillColor(C.muted)
         .text(item.label.toUpperCase(), x + 8, metaY + 8, { width: cellW - 24 });
      doc.fontSize(13).font('Helvetica-Bold').fillColor(C.navy)
         .text(item.value, x + 8, metaY + 20, { width: cellW - 24 });
    });

    // ── Status breakdown boxes ─────────────────────────────────────────────
    const sbY  = 380;
    const sbW  = (BODY_W - 24) / 4;
    const statuses = ['Resumed','Completed','Abandoned','Uncompleted'];

    doc.fontSize(9).font('Helvetica-Bold').fillColor(C.navy)
       .text('STATUS BREAKDOWN', M, sbY - 20, { width: BODY_W });

    statuses.forEach((s, i) => {
      const x     = M + i * (sbW + 8);
      const color = STATUS_COLOR[s] || C.slate;
      const { r, g, b } = hexToRgb(color);
      fillRect(doc, x, sbY, sbW, 64, C.white);
      strokeRect(doc, x, sbY, sbW, 64, color, 1);
      // Top accent stripe
      fillRect(doc, x, sbY, sbW, 4, color);
      // Count
      doc.fontSize(24).font('Helvetica-Bold').fillColor([r, g, b])
         .text(String(statusCounts[s]), x + 4, sbY + 10, { width: sbW - 8, align:'center' });
      doc.fontSize(8).font('Helvetica').fillColor(C.slate)
         .text(STATUS_LABEL[s], x + 4, sbY + 38, { width: sbW - 8, align:'center' });
    });

    // ── Financial overview ─────────────────────────────────────────────────
    const foY = 476;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(C.navy)
       .text('FINANCIAL OVERVIEW', M, foY - 20, { width: BODY_W });

    const foItems = [
      { label:'Total Project Cost',    value: fmtGHS(totals.totalCost),         color:'#eff6ff', border:'#bfdbfe' },
      { label:'Total Paid',            value: fmtGHS(totals.amountPaid),         color:'#f0fdf4', border:'#bbf7d0' },
      { label:'Total Outstanding',     value: fmtGHS(totals.outstandingAmount),  color:'#fff7ed', border:'#fed7aa' },
    ];
    const foCellW = (BODY_W - 16) / 3;
    foItems.forEach((item, i) => {
      const x = M + i * (foCellW + 8);
      const { r: br, g: bg, b: bb } = hexToRgb(item.border);
      fillRect(doc, x, foY, foCellW, 56, item.color);
      strokeRect(doc, x, foY, foCellW, 56, item.border, 1);
      doc.fontSize(7).font('Helvetica').fillColor(C.muted)
         .text(item.label.toUpperCase(), x + 8, foY + 8, { width: foCellW - 16 });
      doc.fontSize(11).font('Helvetica-Bold').fillColor(C.navy)
         .text(item.value, x + 8, foY + 22, { width: foCellW - 16 });
    });

    // ── "Confidential" watermark text ─────────────────────────────────────
    doc.fontSize(7).font('Helvetica').fillColor(C.muted)
       .text('OFFICIAL USE ONLY — GOVERNMENT OF GHANA', M, foY + 76, { width: BODY_W, align:'center' });

    // ── Generated date ─────────────────────────────────────────────────────
    doc.fontSize(7).fillColor(C.muted)
       .text(`Generated: ${generatedAt}`, M, A4_H - 55, { width: BODY_W, align:'center' });

    addFooter(doc, 1, totalPages, reportTitle);

    // ════════════════════════════════════════════════════════════════════════
    // PAGES 2+ — PROJECT TABLE
    // ════════════════════════════════════════════════════════════════════════

    // Column config
    const COLS = [
      { header:'#',           width: 22,  align:'center' },
      { header:'Project Title',width: 135, align:'left'   },
      { header:'District',    width: 64,  align:'left'   },
      { header:'Type',        width: 60,  align:'left'   },
      { header:'Status',      width: 58,  align:'center' },
      { header:'Progress',    width: 40,  align:'center' },
      { header:'Contractor',  width: 75,  align:'left'   },
      { header:'Start',       width: 46,  align:'center' },
    ];
    const ROW_H     = 26;
    const HEAD_H    = 22;
    const TABLE_TOP = 70;
    const TABLE_W   = COLS.reduce((s,c) => s+c.width, 0);

    let pageIdx = 2;

    for (let page = 0; page < dataPages; page++) {
      doc.addPage({ size:'A4', margin:0 });

      // Page header
      fillRect(doc, 0, 0, A4_W, 50, C.navy);
      fillRect(doc, 0, 0, A4_W / 3,       4, C.red);
      fillRect(doc, A4_W/3, 0, A4_W/3,    4, C.gold);
      fillRect(doc, (A4_W/3)*2, 0, A4_W/3,4, C.green);

      doc.fontSize(11).font('Helvetica-Bold').fillColor(C.white)
         .text('PROJECT LISTING', M, 14, { width: BODY_W * 0.6, align:'left' });
      doc.fontSize(8).font('Helvetica').fillColor(C.gold)
         .text(reportScope, M, 28, { width: BODY_W * 0.6 });
      doc.fontSize(8).font('Helvetica').fillColor(C.muted)
         .text(`Page ${pageIdx} of ${totalPages}`, M, 20, { width: BODY_W, align:'right' });

      // Table header
      let tx = M;
      fillRect(doc, M, TABLE_TOP, TABLE_W, HEAD_H, C.navy);
      COLS.forEach(col => {
        doc.fontSize(6.5).font('Helvetica-Bold').fillColor(C.white)
           .text(col.header, tx + 3, TABLE_TOP + 7, { width: col.width - 6, align: col.align });
        tx += col.width;
      });

      const slice    = projects.slice(page * PROJECTS_PER_PAGE, (page + 1) * PROJECTS_PER_PAGE);
      let rowY       = TABLE_TOP + HEAD_H;

      slice.forEach((project, i) => {
        const globalIdx = page * PROJECTS_PER_PAGE + i;
        const bg        = i % 2 === 0 ? C.white : C.light;
        fillRect(doc, M, rowY, TABLE_W, ROW_H, bg);

        // Left status colour stripe
        const sColor = STATUS_COLOR[project.status] || C.slate;
        fillRect(doc, M, rowY, 3, ROW_H, sColor);

        // Row border
        strokeRect(doc, M, rowY, TABLE_W, ROW_H, C.border, 0.3);

        // Row values
        const cells = [
          { value: String(globalIdx + 1),                   col: COLS[0] },
          { value: project.title || '—',                    col: COLS[1] },
          { value: project.district || project.region || '—',col:COLS[2] },
          { value: project.type || '—',                     col: COLS[3] },
          { value: STATUS_LABEL[project.status] || project.status || '—', col: COLS[4], color: sColor },
          { value: fmtPct(project.completionPercentage),    col: COLS[5] },
          { value: project.contractor || '—',               col: COLS[6] },
          { value: fmtDate(project.projectStartDate),       col: COLS[7] },
        ];

        let cx = M;
        cells.forEach(({ value, col, color }) => {
          const { r, g, b } = hexToRgb(color || C.navy);
          doc.fontSize(7).font('Helvetica').fillColor([r, g, b])
             .text(value, cx + 5, rowY + 9, { width: col.width - 8, align: col.align, ellipsis:true });
          cx += col.width;
        });

        rowY += ROW_H;
      });

      // Bottom rule
      const { r: grn2, g: gng2, b: gnb2 } = hexToRgb(C.border);
      doc.moveTo(M, rowY).lineTo(M + TABLE_W, rowY).lineWidth(0.5).stroke([grn2, gng2, gnb2]);

      addFooter(doc, pageIdx, totalPages, reportTitle);
      pageIdx++;
    }

    // ════════════════════════════════════════════════════════════════════════
    // LAST PAGE — FINANCIAL SUMMARY
    // ════════════════════════════════════════════════════════════════════════
    doc.addPage({ size:'A4', margin:0 });

    // Header
    fillRect(doc, 0, 0, A4_W, 50, C.navy);
    fillRect(doc, 0, 0, A4_W/3, 4, C.red);
    fillRect(doc, A4_W/3, 0, A4_W/3, 4, C.gold);
    fillRect(doc, (A4_W/3)*2, 0, A4_W/3, 4, C.green);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(C.white)
       .text('FINANCIAL & CONTRACTOR SUMMARY', M, 18, { width:BODY_W });

    // Per-project financial detail table
    const FCOLS = [
      { header:'Project',     width:170, align:'left'   },
      { header:'Status',      width:62,  align:'center' },
      { header:'Total Cost',  width:78,  align:'right'  },
      { header:'Paid',        width:78,  align:'right'  },
      { header:'Outstanding', width:78,  align:'right'  },
      { header:'Progress',    width:39,  align:'center' },
    ];
    const FTABLE_W = FCOLS.reduce((s,c)=>s+c.width,0);
    const FH = 21;

    let fy = 66;
    // Table head
    let fx = M;
    fillRect(doc, M, fy, FTABLE_W, 20, C.navy);
    FCOLS.forEach(col => {
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor(C.white)
         .text(col.header, fx+3, fy+6, { width:col.width-6, align:col.align });
      fx += col.width;
    });
    fy += 20;

    projects.forEach((project, i) => {
      if (fy + FH > A4_H - 80) {
        addFooter(doc, pageIdx, totalPages, reportTitle);
        doc.addPage({ size:'A4', margin:0 });
        pageIdx++;
        fillRect(doc, 0, 0, A4_W, 50, C.navy);
        doc.fontSize(9).font('Helvetica-Bold').fillColor(C.white)
           .text('FINANCIAL SUMMARY (continued)', M, 18, { width:BODY_W });
        fy = 60;
        // Re-draw table header
        fx = M;
        fillRect(doc, M, fy, FTABLE_W, 20, C.navy);
        FCOLS.forEach(col => {
          doc.fontSize(6.5).font('Helvetica-Bold').fillColor(C.white)
             .text(col.header, fx+3, fy+6, { width:col.width-6, align:col.align });
          fx += col.width;
        });
        fy += 20;
      }

      const bg     = i%2===0 ? C.white : C.light;
      const sColor = STATUS_COLOR[project.status] || C.slate;
      fillRect(doc, M, fy, FTABLE_W, FH, bg);
      fillRect(doc, M, fy, 3, FH, sColor);
      strokeRect(doc, M, fy, FTABLE_W, FH, C.border, 0.3);

      const fcells = [
        { v: project.title||'—',                       col:FCOLS[0], c:C.navy },
        { v: STATUS_LABEL[project.status]||'—',        col:FCOLS[1], c:sColor },
        { v: fmtGHS(project.totalCost),                col:FCOLS[2], c:C.navy },
        { v: fmtGHS(project.amountPaid),               col:FCOLS[3], c:C.green },
        { v: fmtGHS(project.outstandingAmount),        col:FCOLS[4], c: Number(project.outstandingAmount)>0 ? '#d97706' : C.navy },
        { v: fmtPct(project.completionPercentage),     col:FCOLS[5], c:C.navy },
      ];
      let ccx = M;
      fcells.forEach(({v, col, c}) => {
        const {r, g, b} = hexToRgb(c);
        doc.fontSize(7).font('Helvetica').fillColor([r, g, b])
           .text(v, ccx+5, fy+7, { width:col.width-8, align:col.align, ellipsis:true });
        ccx += col.width;
      });
      fy += FH;
    });

    // ── Totals row ────────────────────────────────────────────────────────
    fy += 6;
    fillRect(doc, M, fy, FTABLE_W, 28, C.navy);
    const totCells = [
      { v:'TOTALS', col:FCOLS[0] },
      { v:'',       col:FCOLS[1] },
      { v:fmtGHS(totals.totalCost),         col:FCOLS[2] },
      { v:fmtGHS(totals.amountPaid),        col:FCOLS[3] },
      { v:fmtGHS(totals.outstandingAmount), col:FCOLS[4] },
      { v:'',       col:FCOLS[5] },
    ];
    let tcx = M;
    totCells.forEach(({v, col}) => {
      doc.fontSize(7).font('Helvetica-Bold').fillColor(C.gold)
         .text(v, tcx+5, fy+10, { width:col.width-8, align:col.align });
      tcx += col.width;
    });

    // ── Signature block ───────────────────────────────────────────────────
    const sigY = Math.max(fy + 60, A4_H - 160);
    doc.fontSize(8).font('Helvetica').fillColor(C.slate)
       .text('This report was automatically generated by the Ghana Project Tracker platform.', M, sigY, { width:BODY_W, align:'center' });
    doc.fontSize(7).fillColor(C.muted)
       .text('Data is sourced directly from the project database as of the report generation date.', M, sigY+14, { width:BODY_W, align:'center' });

    // Signature lines
    const sig = [
      { label:'District Officer',      x: M },
      { label:'Regional Coordinator',  x: M + BODY_W * 0.38 },
      { label:'Ministry Official',     x: M + BODY_W * 0.72 },
    ];
    const lineY = sigY + 50;
    sig.forEach(({ label, x }) => {
      const lineW = BODY_W * 0.25;
      const { r: gr, g: gg, b: gb } = hexToRgb(C.navy);
      doc.moveTo(x, lineY).lineTo(x + lineW, lineY).lineWidth(0.7).stroke([gr, gg, gb]);
      doc.fontSize(7).font('Helvetica').fillColor(C.muted)
         .text(label, x, lineY + 5, { width: lineW, align:'center' });
    });

    addFooter(doc, pageIdx, totalPages, reportTitle);

    doc.end();

  } catch (err) {
    console.error('Report generation error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate report.' });
    }
  }
});

module.exports = router;