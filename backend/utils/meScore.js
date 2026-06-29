/**
 * meScore.js — M&E Risk Scoring Engine
 * 
 * Computes a 0–100 risk score for each project.
 * LOWER score = HIGHER risk (more problems).
 * 100 = perfect health.  0 = critical.
 *
 * Components:
 *   Budget vs Progress  (0–40 pts)  ← biggest signal
 *   Recency of reports  (0–25 pts)
 *   Schedule adherence  (0–20 pts)
 *   Citizen signal      (0–15 pts)
 */

'use strict';

// ── helpers ────────────────────────────────────────────────────────────────────
const daysSince = (date) => {
  if (!date) return Infinity;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// ── Traffic light from score ──────────────────────────────────────────────────
const trafficLight = (score) => {
  if (score >= 70) return { light: 'green',  emoji: '🟢', label: 'On Track'       };
  if (score >= 40) return { light: 'amber',  emoji: '🟡', label: 'Needs Attention' };
  return               { light: 'red',    emoji: '🔴', label: 'At Risk'          };
};

// ── Score a single project ─────────────────────────────────────────────────────
/**
 * @param {Object} project   — full project document (lean/plain object)
 * @param {Array}  citizenReports — CitizenReport docs for this project
 * @param {Array}  progressEntries — workProgress entries (from contractor model or project)
 * @returns {Object} { score, light, emoji, label, breakdown }
 */
const scoreProject = (project, citizenReports = [], progressEntries = []) => {
  const breakdown = {};
  let score = 100;

  // ── 1. Budget vs Progress (max penalty: -40) ─────────────────────────────────
  const paid  = Number(project.amountPaid)        || 0;
  const total = Number(project.totalCost)          || 0;
  const prog  = Number(project.completionPercentage) || 0;
  const budgetUtil   = total > 0 ? paid / total : null;    // 0.0–1.0
  const physicalProg = prog / 100;                          // 0.0–1.0

  if (budgetUtil !== null) {
    const gap = budgetUtil - physicalProg;  // positive = over-paid vs progress
    // gap > 0.3  → spent >30% more than progress (red flag)
    // gap < -0.1 → severely underspent (may indicate stalled work)
    let budgetPenalty = 0;
    if (gap > 0.5)       budgetPenalty = 40;   // critical mismatch
    else if (gap > 0.3)  budgetPenalty = 28;
    else if (gap > 0.15) budgetPenalty = 16;
    else if (gap > 0.05) budgetPenalty = 8;
    else if (gap < -0.3) budgetPenalty = 15;   // heavily underspent (stalled?)
    else if (gap < -0.1) budgetPenalty = 6;

    breakdown.budgetVsProgress = {
      penalty: budgetPenalty,
      detail:  `Budget utilised: ${Math.round(budgetUtil * 100)}% · Physical progress: ${prog}% · Gap: ${gap >= 0 ? '+' : ''}${Math.round(gap * 100)}%`,
    };
    score -= budgetPenalty;
  } else {
    // No financial data entered — moderate penalty for missing info
    breakdown.budgetVsProgress = { penalty: 10, detail: 'No financial data entered' };
    score -= 10;
  }

  // ── 2. Report recency (max penalty: -25) ─────────────────────────────────────
  // Use the most recent of: progress entry, citizen report, or project updatedAt
  const progressDates = progressEntries.map(e => new Date(e.date || e.uploadedAt || e.createdAt));
  const citizenDates  = citizenReports.map(r => new Date(r.submittedAt));
  const allReportDates = [...progressDates, ...citizenDates].filter(d => !isNaN(d));
  const lastReport = allReportDates.length > 0
    ? new Date(Math.max(...allReportDates))
    : null;

  const daysWithoutReport = daysSince(lastReport || project.updatedAt || project.createdAt);
  let recencyPenalty = 0;
  if      (daysWithoutReport > 90) recencyPenalty = 25;
  else if (daysWithoutReport > 60) recencyPenalty = 18;
  else if (daysWithoutReport > 30) recencyPenalty = 10;
  else if (daysWithoutReport > 14) recencyPenalty = 4;

  breakdown.reportRecency = {
    penalty: recencyPenalty,
    detail:  lastReport
      ? `Last report: ${daysWithoutReport} day${daysWithoutReport !== 1 ? 's' : ''} ago`
      : `No field reports on record`,
  };
  score -= recencyPenalty;

  // ── 3. Schedule adherence (max penalty: -20) ─────────────────────────────────
  const expectedDate = project.expectedCompletionDate
    ? new Date(project.expectedCompletionDate) : null;
  let schedulePenalty = 0;

  if (project.status === 'Completed') {
    schedulePenalty = 0;  // completed projects don't get penalised for schedule
  } else if (project.status === 'Abandoned') {
    schedulePenalty = 20;
  } else if (expectedDate) {
    const daysOverdue = Math.floor((Date.now() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
    if      (daysOverdue > 180) schedulePenalty = 20;
    else if (daysOverdue > 90)  schedulePenalty = 14;
    else if (daysOverdue > 30)  schedulePenalty = 8;
    else if (daysOverdue > 0)   schedulePenalty = 4;
  } else if (!expectedDate && prog < 100) {
    schedulePenalty = 5;  // no end date set — minor flag
  }

  breakdown.scheduleAdherence = {
    penalty: schedulePenalty,
    detail:  expectedDate
      ? (schedulePenalty > 0 ? `Overdue by ${Math.floor((Date.now() - expectedDate.getTime()) / 86400000)} days` : 'Within expected timeline')
      : (project.status === 'Abandoned' ? 'Project abandoned' : 'No expected completion date set'),
  };
  score -= schedulePenalty;

  // ── 4. Citizen signal (max penalty: -15) ─────────────────────────────────────
  const negativeObs  = ['stalled', 'abandoned', 'poor_quality'];
  const negReports   = citizenReports.filter(r => negativeObs.includes(r.observation));
  const totalReports = citizenReports.length;

  let citizenPenalty = 0;
  if (negReports.length >= 3)        citizenPenalty = 15;
  else if (negReports.length === 2)  citizenPenalty = 10;
  else if (negReports.length === 1)  citizenPenalty = 5;
  // Bonus: if there are reports and most are positive, slight reward (don't go below 0)
  const positiveReports = citizenReports.filter(r => r.observation === 'progressing' || r.observation === 'completed');
  const citizenBonus = totalReports > 0 && positiveReports.length > negReports.length ? 3 : 0;

  breakdown.citizenSignal = {
    penalty: citizenPenalty - citizenBonus,
    detail:  totalReports === 0
      ? 'No citizen reports submitted'
      : `${totalReports} report${totalReports !== 1 ? 's' : ''} — ${negReports.length} negative, ${positiveReports.length} positive`,
  };
  score -= (citizenPenalty - citizenBonus);

  const finalScore = clamp(Math.round(score), 0, 100);
  const light      = trafficLight(finalScore);

  return {
    score:     finalScore,
    ...light,
    breakdown,
    projectId: project._id?.toString(),
  };
};

// ── Score multiple projects (batch) ───────────────────────────────────────────
const scoreProjects = (projects, citizenReportMap = {}, progressMap = {}) => {
  return projects.map(p => ({
    project:  p,
    ...scoreProject(
      p,
      citizenReportMap[p._id?.toString()] || [],
      progressMap[p._id?.toString()] || p.workProgress || []
    ),
  }));
};

module.exports = { scoreProject, scoreProjects, trafficLight };