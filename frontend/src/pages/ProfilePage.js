import React, { useContext, useEffect, useState, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../utils/api';
import ghanaRegions from '../data/ghanaRegions';
import '../css/ProfilePage.css';

// ── helpers ────────────────────────────────────────────────────────────────────
const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago`
    : new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const STATUS_CONFIG = {
  Resumed:     { label: 'Ongoing',     color: '#006B3F', bg: '#dcfce7' },
  Completed:   { label: 'Completed',   color: '#1d4ed8', bg: '#dbeafe' },
  Abandoned:   { label: 'Abandoned',   color: '#CE1126', bg: '#fee2e2' },
  Uncompleted: { label: 'Uncompleted', color: '#b45309', bg: '#fef3c7' },
};

const parseForumMeta = (desc = '') => {
  try {
    const sep = desc.indexOf('||');
    if (sep === -1) return { category: 'General', priority: 'Medium', description: desc };
    const meta = JSON.parse(desc.slice(0, sep));
    return { category: meta.cat || 'General', priority: meta.pri || 'Medium', description: desc.slice(sep + 2) };
  } catch { return { category: 'General', priority: 'Medium', description: desc }; }
};

// ── Edit Forum Modal ───────────────────────────────────────────────────────────
const EditForumModal = ({ forum, token, onClose, onSaved }) => {
  const [title, setTitle] = useState(forum.title || '');
  const { description } = parseForumMeta(forum.description || '');
  const [desc,  setDesc]  = useState(description);
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const handleSave = async () => {
    if (!title.trim()) { setErr('Title is required.'); return; }
    setSaving(true); setErr('');
    try {
      // Reconstruct description with original meta prefix preserved
      const sep = (forum.description || '').indexOf('||');
      const prefix = sep !== -1 ? forum.description.slice(0, sep + 2) : '';
      const newDesc = prefix + desc;
      await axios.put(apiUrl(`/api/forums/${forum._id}`),
        { title: title.trim(), description: newDesc },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      onSaved({ ...forum, title: title.trim(), description: newDesc });
      onClose();
    } catch (e) { setErr(e?.response?.data?.error || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="prp-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="prp-modal">
        <div className="prp-modal-header">
          <div className="prp-modal-title">Edit Issue</div>
          <button className="prp-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="prp-modal-body">
          {err && <div className="prp-modal-err">{err}</div>}
          <div className="prp-field">
            <label className="prp-label">Title</label>
            <input className="prp-input" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="prp-field">
            <label className="prp-label">Description</label>
            <textarea className="prp-textarea" rows={5} value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
        </div>
        <div className="prp-modal-footer">
          <button className="prp-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="prp-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Edit Project Modal ─────────────────────────────────────────────────────────
const EditProjectModal = ({ project, token, onClose, onSaved }) => {
  const [form, setForm] = useState({
    title:                  project.title                  || '',
    type:                   project.type                   || '',
    status:                 project.status                 || '',
    description:            project.description            || '',
    contractor:             project.contractor             || '',
    submittedBy:            project.submittedBy            || '',
    fundingSource:          project.fundingSource          || '',
    otherFundingSources:    project.otherFundingSources    || '',
    region:                 project.region                 || '',
    district:               project.district               || '',
    location_address:       project.location_address       || '',
    location_city:          project.location_city          || '',
    gps_latitude:           project.gps?.latitude          || '',
    gps_longitude:          project.gps?.longitude         || '',
    projectStartDate:       project.projectStartDate
                              ? new Date(project.projectStartDate).toISOString().split('T')[0]
                              : '',
    expectedCompletionDate: project.expectedCompletionDate
                              ? new Date(project.expectedCompletionDate).toISOString().split('T')[0]
                              : '',
    completionPercentage:   project.completionPercentage ?? 0,
    totalCost:              project.totalCost         != null ? project.totalCost         : '',
    amountPaid:             project.amountPaid        != null ? project.amountPaid        : '',
    outstandingAmount:      project.outstandingAmount != null ? project.outstandingAmount : '',
  });

  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(project.imageUrl ? apiUrl(project.imageUrl) : null);
  const [saving,       setSaving]       = useState(false);
  const [err,          setErr]          = useState('');

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setErr('Title is required.'); return; }
    setSaving(true); setErr('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) fd.append(k, String(v));
      });
      if (imageFile) fd.append('image', imageFile);
      const res = await axios.put(
        apiUrl(`/api/projects/${project._id}`),
        fd,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      onSaved(res.data);
      onClose();
    } catch (e) { setErr(e?.response?.data?.error || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const PROJECT_TYPES = [
    'School','Hospital','Road','Bridge','Water System','Power Project',
    'Market Stall','Drainage System','Sanitation Facility',
    'Government Office','Residential Bungalow','Sports & Recreation Center',
  ];
  const FUNDING_SOURCES = [
    { value: 'Government', label: 'Government Budget Allocation' },
    { value: 'GIIF',       label: 'Ghana Infrastructure Investment Fund (GIIF)' },
    { value: 'DACF',       label: 'District Assemblies Common Fund (DACF)' },
    { value: 'WorldBank',  label: 'World Bank Group' },
    { value: 'IMF',        label: 'International Monetary Fund (IMF)' },
    { value: 'UNDP',       label: 'United Nations Development Programme (UNDP)' },
    { value: 'Other',      label: 'Other' },
  ];

  return (
    <div className="prp-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="prp-modal prp-modal--wide">
        <div className="prp-modal-header">
          <div>
            <div className="prp-modal-title">Edit Project</div>
            <div className="prp-modal-sub">Update any field — changes are saved to the database immediately.</div>
          </div>
          <button className="prp-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="prp-modal-body">
          {err && <div className="prp-modal-err">{err}</div>}

          {/* ── Basic Info ── */}
          <div className="prp-modal-section-label">Basic Information</div>
          <div className="prp-field">
            <label className="prp-label">Project Title <span className="prp-required">*</span></label>
            <input className="prp-input" value={form.title}
              onChange={e => set('title', e.target.value)} placeholder="Project title" />
          </div>
          <div className="prp-field-row">
            <div className="prp-field">
              <label className="prp-label">Project Type</label>
              <select className="prp-select" value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="">Select type</option>
                {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="prp-field">
              <label className="prp-label">Status</label>
              <select className="prp-select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="Uncompleted">Uncompleted</option>
                <option value="Resumed">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Abandoned">Abandoned</option>
              </select>
            </div>
          </div>
          <div className="prp-field">
            <label className="prp-label">Description</label>
            <textarea className="prp-textarea" rows={3} value={form.description}
              onChange={e => set('description', e.target.value)} placeholder="Project description…" />
          </div>

          {/* ── Progress ── */}
          <div className="prp-modal-section-label">Progress &amp; Timeline</div>
          <div className="prp-field">
            <label className="prp-label">
              Completion Progress
              <span className="prp-pct-badge">{form.completionPercentage}%</span>
            </label>
            <div className="prp-range-wrap">
              <input type="range" min={0} max={100} step={1}
                value={form.completionPercentage}
                onChange={e => set('completionPercentage', Number(e.target.value))}
                className="prp-range" />
              <div className="prp-range-track">
                <div className="prp-range-fill" style={{ width: `${form.completionPercentage}%` }}/>
              </div>
            </div>
            <div className="prp-range-labels">
              <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
            </div>
          </div>
          <div className="prp-field-row">
            <div className="prp-field">
              <label className="prp-label">Start Date</label>
              <input className="prp-input" type="date" value={form.projectStartDate}
                onChange={e => set('projectStartDate', e.target.value)} />
            </div>
            <div className="prp-field">
              <label className="prp-label">Expected Completion</label>
              <input className="prp-input" type="date" value={form.expectedCompletionDate}
                onChange={e => set('expectedCompletionDate', e.target.value)} />
            </div>
          </div>

          {/* ── Financial ── */}
          <div className="prp-modal-section-label">Financial Details (GHS)</div>
          <div className="prp-field-row prp-field-row--3">
            {[
              { label: 'Total Project Cost',        key: 'totalCost' },
              { label: 'Amount Paid to Contractor', key: 'amountPaid' },
              { label: 'Outstanding Balance',       key: 'outstandingAmount' },
            ].map(({ label, key }) => (
              <div key={key} className="prp-field">
                <label className="prp-label">{label}</label>
                <div className="prp-prefix-wrap">
                  <span className="prp-prefix">GHS</span>
                  <input className="prp-input prp-input--prefix" type="number"
                    min={0} step={0.01} value={form[key]}
                    onChange={e => set(key, e.target.value)} placeholder="0.00" />
                </div>
                {key === 'outstandingAmount' && form.totalCost && form.amountPaid && (
                  <p className="prp-field-hint">
                    Suggested: GHS {Math.max(0, Number(form.totalCost) - Number(form.amountPaid))
                      .toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* ── Location ── */}
          <div className="prp-modal-section-label">Location</div>
          <div className="prp-field-row">
            <div className="prp-field">
              <label className="prp-label">City / Town</label>
              <input className="prp-input" value={form.location_city}
                onChange={e => set('location_city', e.target.value)} placeholder="e.g. Kumasi" />
            </div>
            <div className="prp-field">
              <label className="prp-label">Street Address</label>
              <input className="prp-input" value={form.location_address}
                onChange={e => set('location_address', e.target.value)} placeholder="e.g. Main Street" />
            </div>
          </div>

          {/* ── People & Funding ── */}
          <div className="prp-modal-section-label">People &amp; Funding</div>
          <div className="prp-field">
            <label className="prp-label">Contractor</label>
            <input className="prp-input" value={form.contractor}
              onChange={e => set('contractor', e.target.value)} placeholder="Contractor name" />
          </div>
          <div className="prp-field">
            <label className="prp-label">Source of Funding</label>
            <select className="prp-select" value={form.fundingSource}
              onChange={e => set('fundingSource', e.target.value)}>
              <option value="">Select funding source</option>
              {FUNDING_SOURCES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          {form.fundingSource === 'Other' && (
            <div className="prp-field">
              <label className="prp-label">Specify funding source</label>
              <input className="prp-input" value={form.otherFundingSources}
                onChange={e => set('otherFundingSources', e.target.value)}
                placeholder="Enter the actual funding source" />
            </div>
          )}

          {/* ── Image ── */}
          <div className="prp-modal-section-label">Project Image</div>
          {imagePreview && (
            <div className="prp-img-preview-wrap">
              <img src={imagePreview} alt="Preview" className="prp-img-preview" />
              <button className="prp-img-remove"
                onClick={() => { setImageFile(null); setImagePreview(null); }}>
                ✕ Remove
              </button>
            </div>
          )}
          <label className="prp-file-drop">
            <input type="file" accept="image/*" style={{ display:'none' }} onChange={handleImageChange} />
            <span className="prp-file-drop-icon">🖼️</span>
            <span className="prp-file-drop-text">
              {imageFile ? imageFile.name : 'Click to upload a new project image'}
            </span>
            <span className="prp-file-drop-hint">JPG, PNG — replaces the existing image</span>
          </label>
        </div>

        <div className="prp-modal-footer">
          <button className="prp-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="prp-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save all changes'}
          </button>
        </div>
      </div>
    </div>
  );
};


// ── Main ProfilePage ───────────────────────────────────────────────────────────
const ProfilePage = () => {
  const { user, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Redirect admins to their own settings inside the portal
  useEffect(() => {
    if (user?.isAdmin) navigate('/ministry-portal', { replace: true });
  }, [user, navigate]);

  const [activeTab,   setActiveTab]   = useState('overview');
  const [editing,     setEditing]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [msg,         setMsg]         = useState({ text: '', type: '' });

  // Data
  const [projects,    setProjects]    = useState([]);
  const [forums,      setForums]      = useState([]);
  const [loadingProj, setLoadingProj] = useState(true);
  const [loadingFor,  setLoadingFor]  = useState(true);

  // Edit modals
  const [editProject, setEditProject] = useState(null);
  const [editForum,   setEditForum]   = useState(null);

  // Profile form
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone:    user?.phone    || '',
    username: user?.username || '',
    region:   user?.region   || '',
    district: user?.district || '',
    password: '',
  });

  const userId = user?._id || user?.id;

  // Fetch user's projects
  useEffect(() => {
    if (!userId) return;
    setLoadingProj(true);
    axios.get(apiUrl('/api/projects'))
      .then(r => {
        const all = Array.isArray(r.data) ? r.data : [];
        setProjects(all.filter(p =>
          p.createdBy === userId ||
          p.createdBy?._id === userId ||
          p.submittedBy === (user?.fullName || user?.username)
        ));
      })
      .catch(() => setProjects([]))
      .finally(() => setLoadingProj(false));
  }, [userId, user?.fullName, user?.username]);

  // Fetch user's forums
  useEffect(() => {
    if (!userId) return;
    setLoadingFor(true);
    axios.get(apiUrl('/api/forums'))
      .then(r => {
        const all = Array.isArray(r.data) ? r.data : (r.data?.forums || []);
        setForums(all.filter(f =>
          f.createdBy === userId ||
          f.createdBy?._id === userId
        ));
      })
      .catch(() => setForums([]))
      .finally(() => setLoadingFor(false));
  }, [userId]);

  const stats = useMemo(() => ({
    projects: projects.length,
    forums:   forums.length,
  }), [projects, forums]);

  const handleSaveProfile = async () => {
    setSaving(true); setMsg({ text: '', type: '' });
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      await axios.put(apiUrl(`/api/auth/${userId}`), payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMsg({ text: 'Profile updated. Sign in again to see username changes.', type: 'success' });
      setEditing(false);
    } catch (e) {
      setMsg({ text: e?.response?.data?.error || 'Update failed. Please try again.', type: 'error' });
    } finally { setSaving(false); }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Delete this project permanently? This cannot be undone.')) return;
    try {
      await axios.delete(apiUrl(`/api/projects/${id}`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProjects(prev => prev.filter(p => p._id !== id));
    } catch (e) { alert(e?.response?.data?.error || 'Failed to delete project.'); }
  };

  const handleDeleteForum = async (id) => {
    if (!window.confirm('Delete this issue post permanently?')) return;
    try {
      await axios.delete(apiUrl(`/api/forums/${id}`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setForums(prev => prev.filter(f => f._id !== id));
    } catch (e) { alert(e?.response?.data?.error || 'Failed to delete issue.'); }
  };

  if (user?.isAdmin) return null;
  if (!user) {
    return (
      <div className="prp-gate">
        <div className="prp-gate-icon">🔒</div>
        <h2>Sign in to view your profile</h2>
        <button className="prp-btn-primary" onClick={() => navigate('/login')}>Sign In</button>
      </div>
    );
  }

  const TABS = [
    { id: 'overview',  label: 'Overview',    icon: '👤' },
    { id: 'projects',  label: `Projects (${stats.projects})`, icon: '🏗️'  },
    { id: 'forums',    label: `Issues (${stats.forums})`,     icon: '📨' },
  ];

  return (
    <div className="prp-root">
      {/* ── Flag stripe ── */}
      <div className="prp-flag">
        <div className="prp-flag-r"/><div className="prp-flag-g"/><div className="prp-flag-gr"/>
      </div>

      {/* ══════ PROFILE HERO ══════ */}
      <div className="prp-hero">
        <div className="prp-hero-inner">
          {/* Avatar */}
          <div className="prp-avatar">
            {getInitials(user.fullName || user.username)}
          </div>

          {/* Identity */}
          <div className="prp-hero-info">
            <h1 className="prp-hero-name">{user.fullName || user.username}</h1>
            <p className="prp-hero-username">@{user.username}</p>
            {(user.region || user.district) && (
              <p className="prp-hero-location">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                {[user.district, user.region].filter(Boolean).join(', ')}
              </p>
            )}
          </div>

          {/* Quick stats */}
          <div className="prp-hero-stats">
            <div className="prp-hero-stat">
              <div className="prp-hero-stat-val">{stats.projects}</div>
              <div className="prp-hero-stat-lab">Projects</div>
            </div>
            <div className="prp-hero-stat-divider"/>
            <div className="prp-hero-stat">
              <div className="prp-hero-stat-val">{stats.forums}</div>
              <div className="prp-hero-stat-lab">Issues</div>
            </div>
          </div>

          {/* Logout */}
          <button className="prp-logout-btn" onClick={() => { logout(); navigate('/'); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      </div>

      {/* ══════ TABS ══════ */}
      <div className="prp-tabs-bar">
        {TABS.map(t => (
          <button key={t.id}
            className={`prp-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ══════ TAB CONTENT ══════ */}
      <div className="prp-body">

        {/* ─── OVERVIEW TAB ─── */}
        {activeTab === 'overview' && (
          <div className="prp-overview">

            {msg.text && (
              <div className={`prp-msg prp-msg-${msg.type}`}>{msg.text}</div>
            )}

            <div className="prp-card">
              <div className="prp-card-header">
                <h2 className="prp-card-title">Account Information</h2>
                {!editing && (
                  <button className="prp-btn-outline" onClick={() => { setEditing(true); setMsg({ text:'', type:'' }); }}>
                    Edit profile
                  </button>
                )}
              </div>

              {!editing ? (
                <div className="prp-info-grid">
                  {[
                    { label: 'Full name',    value: form.fullName || '—' },
                    { label: 'Username',     value: `@${form.username}` },
                    { label: 'Phone',        value: form.phone    || '—' },
                    // { label: 'Region',       value: form.region   || '—' },
                    // { label: 'District',     value: form.district || '—' },
                  ].map(item => (
                    <div key={item.label} className="prp-info-item">
                      <div className="prp-info-label">{item.label}</div>
                      <div className="prp-info-value">{item.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="prp-edit-form">
                  <div className="prp-field-row">
                    <div className="prp-field">
                      <label className="prp-label">Full name</label>
                      <input className="prp-input" value={form.fullName}
                        onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                        placeholder="Your full name" />
                    </div>
                    <div className="prp-field">
                      <label className="prp-label">Phone</label>
                      <input className="prp-input" value={form.phone}
                        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="+233 XX XXX XXXX" />
                    </div>
                  </div>
                  <div className="prp-field">
                    <label className="prp-label">Username</label>
                    <input className="prp-input" value={form.username}
                      onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
                  </div>
                  {/* <div className="prp-field-row">
                    <div className="prp-field">
                      <label className="prp-label">Region</label>
                      <select className="prp-select" value={form.region}
                        onChange={e => setForm(p => ({ ...p, region: e.target.value, district: '' }))}>
                        <option value="">Select region</option>
                        {ghanaRegions.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                      </select>
                    </div>
                    <div className="prp-field">
                      <label className="prp-label">District</label>
                      <select className="prp-select" value={form.district}
                        onChange={e => setForm(p => ({ ...p, district: e.target.value }))}
                        disabled={!form.region}>
                        <option value="">Select district</option>
                        {(ghanaRegions.find(r => r.name === form.region)?.districts || []).map(d =>
                          <option key={d} value={d}>{d}</option>
                        )}
                      </select>
                    </div>
                  </div> */}
                  <div className="prp-field">
                    <label className="prp-label">New password <span className="prp-label-hint">(leave blank to keep current)</span></label>
                    <input className="prp-input" type="password" value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="••••••••" />
                  </div>
                  <div className="prp-form-actions">
                    <button className="prp-btn-ghost" onClick={() => { setEditing(false); setMsg({ text:'', type:'' }); }}>
                      Cancel
                    </button>
                    <button className="prp-btn-primary" onClick={handleSaveProfile} disabled={saving}>
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── MY PROJECTS TAB ─── */}
        {activeTab === 'projects' && (
          <div className="prp-content">
            {loadingProj ? (
              <div className="prp-loading"><div className="prp-spinner"/><p>Loading your projects…</p></div>
            ) : projects.length === 0 ? (
              <div className="prp-empty">
                <div className="prp-empty-icon">🏗️</div>
                <h3>No projects yet</h3>
                <p>Projects you submit will appear here.</p>
                <Link to="/add-project" className="prp-btn-primary" style={{textDecoration:'none',display:'inline-block',marginTop:'0.75rem'}}>
                  Add your first project
                </Link>
              </div>
            ) : (
              <div className="prp-project-list">
                {projects.map(p => {
                  const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.Uncompleted;
                  const pct = Number(p.completionPercentage) || 0;
                  return (
                    <div key={p._id} className="prp-project-card">
                      {/* Colour stripe */}
                      <div className="prp-project-stripe" style={{ background: cfg.color }}/>
                      <div className="prp-project-body">
                        <div className="prp-project-top">
                          <div className="prp-project-meta">
                            <span className="prp-status-badge"
                              style={{ background: cfg.bg, color: cfg.color }}>
                              {cfg.label}
                            </span>
                            {p.type && <span className="prp-type-chip">{p.type}</span>}
                          </div>
                          <div className="prp-project-actions">
                            <button className="prp-icon-btn prp-icon-view"
                              onClick={() => navigate(`/project/${p._id}`)} title="View details">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                              </svg>
                            </button>
                            <button className="prp-icon-btn prp-icon-edit"
                              onClick={() => setEditProject(p)} title="Edit project">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button className="prp-icon-btn prp-icon-delete"
                              onClick={() => handleDeleteProject(p._id)} title="Delete project">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                                <path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                        <h3 className="prp-project-title">{p.title}</h3>
                        {p.district && <p className="prp-project-location">📍 {p.district}, {p.region}</p>}

                        {/* Progress bar */}
                        <div className="prp-progress-wrap">
                          <div className="prp-progress-track">
                            <div className="prp-progress-fill" style={{ width: `${pct}%` }}/>
                          </div>
                          <span className="prp-progress-label">{pct}%</span>
                        </div>
                        <div className="prp-project-footer">
                          <span>{timeAgo(p.createdAt)}</span>
                          {p.contractor && <span>Contractor: {p.contractor}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── MY FORUMS / ISSUES TAB ─── */}
        {activeTab === 'forums' && (
          <div className="prp-content">
            {loadingFor ? (
              <div className="prp-loading"><div className="prp-spinner"/><p>Loading your issues…</p></div>
            ) : forums.length === 0 ? (
              <div className="prp-empty">
                <div className="prp-empty-icon">📨</div>
                <h3>No issues posted yet</h3>
                <p>Issues you raise to district officials will appear here.</p>
              </div>
            ) : (
              <div className="prp-forum-list">
                {forums.map(f => {
                  const { category, priority, description } = parseForumMeta(f.description || '');
                  const priColor = { Urgent:'#CE1126', High:'#f97316', Medium:'#b45309', Low:'#1d4ed8' }[priority] || '#64748b';
                  const priLight = { Urgent:'#fee2e2', High:'#ffedd5', Medium:'#fef3c7', Low:'#dbeafe' }[priority] || '#f1f5f9';
                  return (
                    <div key={f._id} className="prp-forum-card">
                      <div className="prp-forum-stripe" style={{ background: priColor }}/>
                      <div className="prp-forum-body">
                        <div className="prp-forum-top">
                          <div className="prp-forum-badges">
                            <span className="prp-priority-badge"
                              style={{ background: priLight, color: priColor }}>
                              {priority}
                            </span>
                            <span className="prp-category-chip">{category}</span>
                            {f.status && (
                              <span className="prp-forum-status"
                                style={{ background: f.status === 'Replied' ? '#dcfce7' : '#f1f5f9',
                                         color:      f.status === 'Replied' ? '#166534' : '#475569' }}>
                                {f.status}
                              </span>
                            )}
                          </div>
                          <div className="prp-project-actions">
                            <button className="prp-icon-btn prp-icon-view"
                              onClick={() => navigate(`/forums/${f._id}`)} title="View issue">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                              </svg>
                            </button>
                            <button className="prp-icon-btn prp-icon-edit"
                              onClick={() => setEditForum(f)} title="Edit issue">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button className="prp-icon-btn prp-icon-delete"
                              onClick={() => handleDeleteForum(f._id)} title="Delete issue">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                                <path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                        <h3 className="prp-forum-title">{f.title}</h3>
                        {description && (
                          <p className="prp-forum-desc">{description.slice(0, 140)}{description.length > 140 ? '…' : ''}</p>
                        )}
                        <div className="prp-forum-footer">
                          <span>📍 {f.district || f.region || 'Unknown'}</span>
                          <span>{timeAgo(f.createdAt)}</span>
                          {f.comments?.length > 0 && <span>💬 {f.comments.length} comment{f.comments.length !== 1 ? 's':''}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── Edit modals ── */}
      {editProject && (
        <EditProjectModal
          project={editProject}
          token={token}
          onClose={() => setEditProject(null)}
          onSaved={updated => setProjects(prev => prev.map(p => p._id === updated._id ? updated : p))}
        />
      )}
      {editForum && (
        <EditForumModal
          forum={editForum}
          token={token}
          onClose={() => setEditForum(null)}
          onSaved={updated => setForums(prev => prev.map(f => f._id === updated._id ? updated : f))}
        />
      )}
    </div>
  );
};

export default ProfilePage;