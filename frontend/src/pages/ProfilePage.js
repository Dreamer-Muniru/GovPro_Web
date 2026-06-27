import React, { useContext, useEffect, useState, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { apiUrl } from '../utils/api';
// import ghanaRegions from '../data/ghanaRegions';
import '../css/profile.css';

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

  // contractors
  const [contractors,     setContractors]     = useState([]);
  const [loadingCon,      setLoadingCon]      = useState(true);
  const [selContractor,   setSelContractor]   = useState(null);
  const [conProfileTab,   setConProfileTab]   = useState('overview');
  const [conFilter,       setConFilter]       = useState({ search:'', category:'', status:'' });
  const [showConOnboard,  setShowConOnboard]  = useState(false);
  const [conStep,         setConStep]         = useState(1);
  const [conErr,          setConErr]          = useState('');
  const [conboarding,     setConboarding]     = useState(false);
  const [conForm,         setConForm]         = useState({
    companyName:'', registrationNumber:'', category:'', status:'Active',
    contactName:'', contactPhone:'', contactEmail:'', address:'', notes:'',
  });
  const [conFiles,        setConFiles]        = useState([]);

  // contractor profile sub-state
  const [addDocFiles,     setAddDocFiles]     = useState([]);
  const [savingDocs,      setSavingDocs]      = useState(false);
  const [progDesc,        setProgDesc]        = useState('');
  const [progDate,        setProgDate]        = useState('');
  const [progFile,        setProgFile]        = useState(null);
  const [savingProg,      setSavingProg]      = useState(false);
  const [payDesc,         setPayDesc]         = useState('');
  const [payAmount,       setPayAmount]       = useState('');
  const [payDate,         setPayDate]         = useState('');
  const [payStatus,       setPayStatus]       = useState('Pending');
  const [payReceipt,      setPayReceipt]      = useState(null);
  const [payCert,         setPayCert]         = useState(null);
  const [savingPay,       setSavingPay]       = useState(false);

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
        const userDistrict = user?.district || '';
        const userRegion   = user?.region   || '';
        setProjects(all.filter(p => {
          // Match by creator ID (most reliable for old projects that stored createdBy)
          const byCreator = p.createdBy === userId || p.createdBy?._id === userId;
          // Match by submittedBy name (fallback for projects without createdBy)
          const byName    = user?.fullName
            ? p.submittedBy === user.fullName
            : p.submittedBy === user?.username;
          // Match by district (for new projects onboarded after the JWT fix —
          // shows all projects from the user's district, which is correct for MMDCE)
          const byDistrict = userDistrict &&
            p.district?.toLowerCase() === userDistrict.toLowerCase();
          // Match by region only (broad fallback — only if no district is set on either)
          const byRegion = !userDistrict && userRegion &&
            p.region?.toLowerCase() === userRegion.toLowerCase();

          return byCreator || byName || byDistrict || byRegion;
        }));
      })
      .catch(() => setProjects([]))
      .finally(() => setLoadingProj(false));
  }, [userId, user?.fullName, user?.username, user?.district, user?.region]);

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

  // Fetch contractors — scoped to the user's district
  useEffect(() => {
    setLoadingCon(true);
    axios.get(apiUrl('/api/contractors'), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => {
        const all = Array.isArray(r.data) ? r.data : [];
        const userDistrict = user?.district || '';
        // Show contractors from same district; if no district, show all
        setContractors(userDistrict
          ? all.filter(c => !c.district || c.district.toLowerCase() === userDistrict.toLowerCase())
          : all
        );
      })
      .catch(() => setContractors([]))
      .finally(() => setLoadingCon(false));
  }, [userId, user?.district, token]);

  const stats = useMemo(() => ({
    projects:    projects.length,
    forums:      forums.length,
    contractors: contractors.length,
  }), [projects, forums, contractors]);

  // ── Contractor handlers ─────────────────────────────────────────────────────
  const authHdrs = token ? { Authorization: `Bearer ${token}` } : {};

  const refetchContractors = () => {
    const userDistrict = user?.district || '';
    axios.get(apiUrl('/api/contractors'), { headers: authHdrs })
      .then(r => {
        const all = Array.isArray(r.data) ? r.data : [];
        setContractors(userDistrict
          ? all.filter(c => !c.district || c.district.toLowerCase() === userDistrict.toLowerCase())
          : all
        );
      }).catch(() => {});
  };

  const handleConOnboardSubmit = async () => {
    if (!conForm.companyName || !conForm.registrationNumber || !conForm.category) {
      setConErr('Company name, registration number and category are required.'); return;
    }
    setConboarding(true); setConErr('');
    try {
      const fd = new FormData();
      // Lock region/district to user's account values
      Object.entries({ ...conForm, region: user?.region || '', district: user?.district || '' })
        .forEach(([k, v]) => { if (v) fd.append(k, v); });
      conFiles.forEach(({ file, type }) => {
        fd.append('documents', file);
        fd.append('documentTypes', type);
      });
      await axios.post(apiUrl('/api/contractors'), fd, {
        headers: { ...authHdrs, 'Content-Type': 'multipart/form-data' },
      });
      setShowConOnboard(false); setConStep(1);
      setConForm({ companyName:'', registrationNumber:'', category:'', status:'Active',
        contactName:'', contactPhone:'', contactEmail:'', address:'', notes:'' });
      setConFiles([]);
      refetchContractors();
    } catch(e) { setConErr(e?.response?.data?.error || 'Failed to onboard contractor.'); }
    finally { setConboarding(false); }
  };

  const handleDeleteContractor = async (id) => {
    if (!window.confirm('Remove this contractor permanently?')) return;
    try {
      await axios.delete(apiUrl(`/api/contractors/${id}`), { headers: authHdrs });
      refetchContractors();
      if (selContractor?._id === id) setSelContractor(null);
    } catch(e) { alert('Failed to remove contractor.'); }
  };

  const handleUpdateConStatus = async (id, status) => {
    try {
      await axios.put(apiUrl(`/api/contractors/${id}`), { status }, { headers: authHdrs });
      refetchContractors();
      if (selContractor?._id === id) setSelContractor(prev => ({ ...prev, status }));
    } catch(e) { alert('Failed to update status.'); }
  };

  const handleAddDocs = async () => {
    if (!addDocFiles.length || !selContractor) return;
    setSavingDocs(true);
    try {
      const fd = new FormData();
      addDocFiles.forEach(({ file, type }) => { fd.append('documents', file); fd.append('documentTypes', type); });
      const r = await axios.post(apiUrl(`/api/contractors/${selContractor._id}/documents`), fd, {
        headers: { ...authHdrs, 'Content-Type': 'multipart/form-data' },
      });
      setSelContractor(prev => ({ ...prev, documents: r.data }));
      setAddDocFiles([]);
    } catch(e) { alert('Failed to upload documents.'); }
    finally { setSavingDocs(false); }
  };

  const handleDeleteDoc = async (docId) => {
    try {
      await axios.delete(apiUrl(`/api/contractors/${selContractor._id}/documents/${docId}`), { headers: authHdrs });
      setSelContractor(prev => ({ ...prev, documents: prev.documents.filter(d => d._id !== docId) }));
    } catch(e) { alert('Failed to remove document.'); }
  };

  const handleAddProgress = async () => {
    if (!progDesc.trim() || !selContractor) return;
    setSavingProg(true);
    try {
      const fd = new FormData();
      fd.append('description', progDesc);
      if (progDate) fd.append('date', progDate);
      if (progFile) fd.append('file', progFile);
      const r = await axios.post(apiUrl(`/api/contractors/${selContractor._id}/progress`), fd, {
        headers: { ...authHdrs, 'Content-Type': 'multipart/form-data' },
      });
      setSelContractor(prev => ({ ...prev, workProgress: r.data }));
      setProgDesc(''); setProgDate(''); setProgFile(null);
    } catch(e) { alert('Failed to add progress.'); }
    finally { setSavingProg(false); }
  };

  const handleAddPayment = async () => {
    if (!payDesc.trim() || !payAmount || !selContractor) return;
    setSavingPay(true);
    try {
      const fd = new FormData();
      fd.append('description', payDesc);
      fd.append('amount', payAmount);
      fd.append('status', payStatus);
      if (payDate) fd.append('date', payDate);
      if (payReceipt)  fd.append('receipt', payReceipt);
      if (payCert)     fd.append('certificate', payCert);
      const r = await axios.post(apiUrl(`/api/contractors/${selContractor._id}/payments`), fd, {
        headers: { ...authHdrs, 'Content-Type': 'multipart/form-data' },
      });
      setSelContractor(prev => ({ ...prev, paymentRecords: r.data }));
      setPayDesc(''); setPayAmount(''); setPayDate(''); setPayStatus('Pending');
      setPayReceipt(null); setPayCert(null);
    } catch(e) { alert('Failed to add payment.'); }
    finally { setSavingPay(false); }
  };

  const filteredContractors = contractors.filter(c => {
    if (conFilter.category && c.category !== conFilter.category) return false;
    if (conFilter.status   && c.status   !== conFilter.status)   return false;
    if (conFilter.search) {
      const q = conFilter.search.toLowerCase();
      if (!c.companyName?.toLowerCase().includes(q) &&
          !c.registrationNumber?.toLowerCase().includes(q) &&
          !c.district?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

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
    { id: 'overview',     label: 'Overview',                         icon: '👤' },
    { id: 'projects',     label: `Projects (${stats.projects})`,     icon: '🏗️'  },
    { id: 'forums',       label: `Issues (${stats.forums})`,         icon: '📨' },
    { id: 'contractors',  label: `Contractors (${stats.contractors})`, icon: '🏢' },
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

      {/* ─── CONTRACTORS TAB ─── */}
      {activeTab === 'contractors' && (
        <div className="prp-content">
          {/* Filter + Onboard header */}
          <div style={{display:'flex',alignItems:'center',gap:'0.75rem',flexWrap:'wrap',marginBottom:'1.25rem'}}>
            <input className="prp-input" style={{flex:1,minWidth:160,maxWidth:220}}
              placeholder="Search contractors…"
              value={conFilter.search}
              onChange={e => setConFilter(p=>({...p,search:e.target.value}))} />
            <select className="prp-select" style={{flex:1,minWidth:140,maxWidth:180}}
              value={conFilter.category} onChange={e => setConFilter(p=>({...p,category:e.target.value}))}>
              <option value="">All Categories</option>
              {['Road & Transport','Building & Construction','Water & Sanitation',
                'Electrical & Power','ICT & Communications','Agriculture','General']
                .map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="prp-select" style={{flex:1,minWidth:130,maxWidth:160}}
              value={conFilter.status} onChange={e => setConFilter(p=>({...p,status:e.target.value}))}>
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Blacklisted">Blacklisted</option>
            </select>
            <button className="prp-btn-primary" style={{whiteSpace:'nowrap'}}
              onClick={() => { setShowConOnboard(true); setConStep(1); setConErr(''); }}>
              + Onboard Contractor
            </button>
          </div>

          {loadingCon ? (
            <div className="prp-loading"><div className="prp-spinner"/><p>Loading contractors…</p></div>
          ) : filteredContractors.length === 0 ? (
            <div className="prp-empty">
              <div className="prp-empty-icon">🏢</div>
              <h3>No contractors yet</h3>
              <p>Onboard a contractor to manage their details, documents and payments.</p>
            </div>
          ) : (
            <div className="prp-contractor-grid">
              {filteredContractors.map(c => {
                const stripeColor = c.status==='Active' ? '#006B3F' : c.status==='Suspended' ? '#f97316' : '#CE1126';
                const statusBg    = c.status==='Active' ? '#dcfce7' : c.status==='Suspended' ? '#ffedd5' : '#fee2e2';
                const statusClr   = c.status==='Active' ? '#166534' : c.status==='Suspended' ? '#9a3412' : '#991b1b';
                return (
                  <div key={c._id} className="prp-contractor-card"
                    onClick={() => { setSelContractor(c); setConProfileTab('overview'); }}>
                    <div className="prp-contractor-stripe" style={{background:stripeColor}}/>
                    <div className="prp-contractor-body">
                      <div className="prp-contractor-top">
                        <div className="prp-contractor-avatar">🏢</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div className="prp-contractor-name">{c.companyName}</div>
                          <div className="prp-contractor-reg">{c.registrationNumber}</div>
                        </div>
                        <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:10,background:statusBg,color:statusClr,whiteSpace:'nowrap'}}>
                          {c.status}
                        </span>
                      </div>
                      <div className="prp-contractor-meta">
                        <span className="prp-type-chip">📁 {c.category}</span>
                        {c.district && <span className="prp-type-chip">📍 {c.district}</span>}
                        {c.contactPerson?.phone && <span className="prp-type-chip">📞 {c.contactPerson.phone}</span>}
                      </div>
                      <div className="prp-project-footer" style={{marginTop:'0.5rem'}}>
                        <span>📄 {c.documents?.length||0} doc{(c.documents?.length||0)!==1?'s':''}</span>
                        <span>💰 {c.paymentRecords?.length||0} payment{(c.paymentRecords?.length||0)!==1?'s':''}</span>
                        <span>{new Date(c.onboardedAt||c.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Contractor profile slide-in panel ── */}
          {selContractor && (
            <>
              <div className="prp-con-overlay" onClick={() => setSelContractor(null)}/>
              <div className="prp-con-panel">
                {/* Header */}
                <div className="prp-con-header">
                  <div className="prp-flag"><div className="prp-flag-r"/><div className="prp-flag-g"/><div className="prp-flag-gr"/></div>
                  <div style={{display:'flex',alignItems:'flex-start',gap:12,padding:'1rem 1.25rem 1.25rem'}}>
                    <div style={{width:44,height:44,borderRadius:12,background:'rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🏢</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:15,fontWeight:800,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{selContractor.companyName}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,0.45)',marginBottom:6}}>{selContractor.registrationNumber}</div>
                      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                        <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:10,
                          background: selContractor.status==='Active'?'#dcfce7':selContractor.status==='Suspended'?'#ffedd5':'#fee2e2',
                          color: selContractor.status==='Active'?'#166534':selContractor.status==='Suspended'?'#9a3412':'#991b1b'}}>
                          {selContractor.status}
                        </span>
                        <span style={{fontSize:10,color:'rgba(255,255,255,0.45)'}}>{selContractor.category}</span>
                      </div>
                    </div>
                    <button onClick={() => setSelContractor(null)}
                      style={{width:28,height:28,borderRadius:'50%',border:'1px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.6)',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      ×
                    </button>
                  </div>
                </div>

                {/* Inner tabs */}
                <div className="prp-con-tabs">
                  {[
                    {id:'overview',  label:'Overview'},
                    {id:'documents', label:`Documents (${selContractor.documents?.length||0})`},
                    {id:'progress',  label:`Progress (${selContractor.workProgress?.length||0})`},
                    {id:'payments',  label:`Payments (${selContractor.paymentRecords?.length||0})`},
                  ].map(t => (
                    <button key={t.id}
                      className={`prp-con-tab ${conProfileTab===t.id?'active':''}`}
                      onClick={() => setConProfileTab(t.id)}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Panel body */}
                <div className="prp-con-body">

                  {/* Overview */}
                  {conProfileTab === 'overview' && (
                    <>
                      <div className="prp-info-grid">
                        {[
                          {label:'Company Name',      value:selContractor.companyName},
                          {label:'Registration No.',  value:selContractor.registrationNumber},
                          {label:'Category',          value:selContractor.category},
                          {label:'Region',            value:selContractor.region||'—'},
                          {label:'District',          value:selContractor.district||'—'},
                          {label:'Address',           value:selContractor.address||'—'},
                          {label:'Contact Person',    value:selContractor.contactPerson?.name||'—'},
                          {label:'Contact Phone',     value:selContractor.contactPerson?.phone||'—'},
                          {label:'Contact Email',     value:selContractor.contactPerson?.email||'—'},
                          {label:'Onboarded',         value:new Date(selContractor.onboardedAt||selContractor.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})},
                        ].map(item => (
                          <div key={item.label} className="prp-info-item">
                            <div className="prp-info-label">{item.label}</div>
                            <div className="prp-info-value">{item.value}</div>
                          </div>
                        ))}
                      </div>
                      {selContractor.notes && (
                        <div className="prp-card" style={{marginBottom:'1rem'}}>
                          <div className="prp-info-label" style={{padding:'0.875rem 1rem 0',fontSize:10}}>Notes</div>
                          <p style={{fontSize:13,color:'#374151',lineHeight:1.65,margin:0,padding:'0.5rem 1rem 1rem',whiteSpace:'pre-wrap'}}>{selContractor.notes}</p>
                        </div>
                      )}
                      <div className="prp-card" style={{padding:'1rem'}}>
                        <div className="prp-info-label" style={{marginBottom:8}}>Update Status</div>
                        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                          {['Active','Suspended','Blacklisted'].map(s => (
                            <button key={s} onClick={() => handleUpdateConStatus(selContractor._id, s)}
                              style={{padding:'7px 16px',borderRadius:8,border:'1.5px solid',fontWeight:600,fontSize:12,cursor:'pointer',fontFamily:'inherit',transition:'all 0.15s',
                                background: selContractor.status===s ? (s==='Active'?'#006B3F':s==='Suspended'?'#f97316':'#CE1126') : '#fff',
                                color:      selContractor.status===s ? '#fff' : '#475569',
                                borderColor: selContractor.status===s ? 'transparent' : '#e2e8f0'}}>
                              {s}
                            </button>
                          ))}
                          <button onClick={() => handleDeleteContractor(selContractor._id)}
                            style={{marginLeft:'auto',padding:'7px 16px',borderRadius:8,border:'1px solid #fecaca',background:'#fff5f5',color:'#CE1126',fontWeight:600,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
                            Remove
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Documents */}
                  {conProfileTab === 'documents' && (
                    <>
                      {(!selContractor.documents||selContractor.documents.length===0) ? (
                        <div className="prp-empty" style={{padding:'2rem'}}><p>No documents uploaded yet.</p></div>
                      ) : (
                        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:'1.5rem'}}>
                          {selContractor.documents.map(doc => (
                            <div key={doc._id} style={{display:'flex',alignItems:'center',gap:10,background:'#fff',borderRadius:10,border:'1px solid #e2e8f0',padding:'10px 12px'}}>
                              <span style={{fontSize:20}}>{doc.type==='businessCertificate'?'📋':doc.type==='taxClearance'?'🧾':doc.type==='incorporation'?'🏛️':doc.type==='insurance'?'🛡️':'📄'}</span>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:12,fontWeight:600,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{doc.name}</div>
                                <div style={{fontSize:10,color:'#94a3b8'}}>{doc.type?.replace(/([A-Z])/g,' $1').trim()}</div>
                              </div>
                              <a href={apiUrl(doc.fileUrl)} target="_blank" rel="noreferrer"
                                style={{display:'flex',alignItems:'center',gap:4,fontSize:11,fontWeight:600,color:'#0369a1',padding:'5px 10px',borderRadius:7,border:'1px solid #bae6fd',background:'#f0f9ff',textDecoration:'none'}}>
                                ⬇ Download
                              </a>
                              <button onClick={() => handleDeleteDoc(doc._id)}
                                style={{width:28,height:28,borderRadius:7,border:'1px solid #fecaca',background:'#fff5f5',color:'#CE1126',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="prp-card" style={{padding:'1rem'}}>
                        <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:'0.875rem'}}>📎 Upload Documents</div>
                        <div style={{display:'flex',flexDirection:'column',gap:8}}>
                          {addDocFiles.map((item,i) => (
                            <div key={i} style={{display:'flex',gap:8,alignItems:'center'}}>
                              <div style={{flex:1,fontSize:12,color:'#475569',background:'#f8fafc',borderRadius:8,padding:'7px 10px',border:'1px solid #e2e8f0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.file.name}</div>
                              <select className="prp-select" style={{width:150}} value={item.type}
                                onChange={e => setAddDocFiles(prev => prev.map((x,j) => j===i?{...x,type:e.target.value}:x))}>
                                <option value="businessCertificate">Business Certificate</option>
                                <option value="taxClearance">Tax Clearance</option>
                                <option value="incorporation">Incorporation</option>
                                <option value="insurance">Insurance</option>
                                <option value="other">Other</option>
                              </select>
                              <button onClick={() => setAddDocFiles(prev=>prev.filter((_,j)=>j!==i))}
                                style={{background:'none',border:'none',color:'#CE1126',cursor:'pointer',fontSize:20,lineHeight:1,padding:'4px'}}>×</button>
                            </div>
                          ))}
                          <label style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',border:'1.5px dashed #e2e8f0',borderRadius:9,fontSize:12,color:'#64748b',background:'#f8fafc',cursor:'pointer',transition:'border-color 0.2s'}}
                            onMouseEnter={e=>e.currentTarget.style.borderColor='#CE1126'}
                            onMouseLeave={e=>e.currentTarget.style.borderColor='#e2e8f0'}>
                            <input type="file" style={{display:'none'}} multiple accept=".pdf,.jpg,.jpeg,.png"
                              onChange={e=>{const f=Array.from(e.target.files).map(f=>({file:f,type:'other'}));setAddDocFiles(p=>[...p,...f]);e.target.value='';}}/>
                            ⬆ Click to select files (PDF, images)
                          </label>
                          {addDocFiles.length > 0 && (
                            <button className="prp-btn-primary" disabled={savingDocs} onClick={handleAddDocs}>
                              {savingDocs ? 'Uploading…' : `Upload ${addDocFiles.length} file${addDocFiles.length!==1?'s':''}`}
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Work Progress */}
                  {conProfileTab === 'progress' && (
                    <>
                      {(!selContractor.workProgress||selContractor.workProgress.length===0) ? (
                        <div className="prp-empty" style={{padding:'2rem'}}><p>No progress entries yet.</p></div>
                      ) : (
                        <div style={{display:'flex',flexDirection:'column',gap:0,marginBottom:'1.5rem'}}>
                          {[...selContractor.workProgress].reverse().map((entry,i) => (
                            <div key={entry._id||i} style={{display:'flex',gap:12,paddingBottom:'1.25rem',position:'relative'}}>
                              <div style={{position:'absolute',left:14,top:28,bottom:0,width:2,background:'#e2e8f0'}}/>
                              <div style={{width:30,height:30,borderRadius:'50%',background:'#fff',border:'2px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,position:'relative',zIndex:1,flexShrink:0}}>📋</div>
                              <div style={{flex:1,background:'#fff',borderRadius:10,border:'1px solid #e2e8f0',padding:'10px 12px'}}>
                                <p style={{fontSize:13,color:'#374151',lineHeight:1.6,margin:'0 0 6px'}}>{entry.description}</p>
                                <div style={{display:'flex',gap:12,fontSize:10,color:'#94a3b8',flexWrap:'wrap',alignItems:'center'}}>
                                  <span>📅 {new Date(entry.date||entry.uploadedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span>
                                  {entry.fileUrl && (
                                    <a href={apiUrl(entry.fileUrl)} target="_blank" rel="noreferrer"
                                      style={{color:'#0369a1',fontWeight:600,fontSize:11}}>⬇ {entry.fileName||'Attachment'}</a>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="prp-card" style={{padding:'1rem'}}>
                        <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:'0.875rem'}}>➕ Add Progress Report</div>
                        <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                          <textarea className="prp-textarea" rows={3} placeholder="Describe the work progress…"
                            value={progDesc} onChange={e=>setProgDesc(e.target.value)}/>
                          <div className="prp-field-row">
                            <div className="prp-field">
                              <label className="prp-label">Date</label>
                              <input className="prp-input" type="date" value={progDate} onChange={e=>setProgDate(e.target.value)}/>
                            </div>
                            <div className="prp-field">
                              <label className="prp-label">Attachment (optional)</label>
                              <label style={{display:'flex',alignItems:'center',gap:7,padding:'8px 11px',border:'1.5px dashed #e2e8f0',borderRadius:9,fontSize:12,color:'#64748b',cursor:'pointer',background:'#f8fafc'}}>
                                <input type="file" style={{display:'none'}} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  onChange={e=>setProgFile(e.target.files[0]||null)}/>
                                {progFile ? progFile.name : '⬆ Choose file…'}
                              </label>
                            </div>
                          </div>
                          <div style={{display:'flex',justifyContent:'flex-end'}}>
                            <button className="prp-btn-primary" disabled={savingProg||!progDesc.trim()} onClick={handleAddProgress}>
                              {savingProg ? 'Saving…' : 'Add Progress Entry'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Payments */}
                  {conProfileTab === 'payments' && (
                    <>
                      {(!selContractor.paymentRecords||selContractor.paymentRecords.length===0) ? (
                        <div className="prp-empty" style={{padding:'2rem'}}><p>No payment records yet.</p></div>
                      ) : (
                        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:'1.5rem'}}>
                          {[...selContractor.paymentRecords].reverse().map((rec,i) => (
                            <div key={rec._id||i} style={{background:'#fff',borderRadius:12,border:'1px solid #e2e8f0',overflow:'hidden'}}>
                              <div style={{display:'flex',alignItems:'flex-start',gap:12,padding:'1rem'}}>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:18,fontWeight:800,color:'#0f172a',fontVariantNumeric:'tabular-nums'}}>
                                    GHS {Number(rec.amount).toLocaleString('en-GH',{minimumFractionDigits:2})}
                                  </div>
                                  <div style={{fontSize:12,color:'#64748b',marginTop:3}}>{rec.description}</div>
                                  <div style={{fontSize:11,color:'#94a3b8',marginTop:4}}>
                                    📅 {new Date(rec.date||rec.uploadedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
                                  </div>
                                </div>
                                <span style={{fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:10,
                                  background: rec.status==='Paid'?'#dcfce7':rec.status==='Approved'?'#dbeafe':rec.status==='Rejected'?'#fee2e2':'#f1f5f9',
                                  color: rec.status==='Paid'?'#166534':rec.status==='Approved'?'#1e40af':rec.status==='Rejected'?'#991b1b':'#475569'}}>
                                  {rec.status}
                                </span>
                              </div>
                              {(rec.receiptUrl||rec.certUrl) && (
                                <div style={{display:'flex',gap:8,padding:'0.75rem 1rem',borderTop:'1px solid #f1f5f9',background:'#f8fafc',flexWrap:'wrap'}}>
                                  {rec.receiptUrl && <a href={apiUrl(rec.receiptUrl)} target="_blank" rel="noreferrer"
                                    style={{display:'flex',alignItems:'center',gap:4,fontSize:11,fontWeight:600,color:'#0369a1',padding:'5px 10px',borderRadius:7,border:'1px solid #bae6fd',background:'#f0f9ff',textDecoration:'none'}}>
                                    🧾 {rec.receiptFileName||'Receipt'}</a>}
                                  {rec.certUrl && <a href={apiUrl(rec.certUrl)} target="_blank" rel="noreferrer"
                                    style={{display:'flex',alignItems:'center',gap:4,fontSize:11,fontWeight:600,color:'#0369a1',padding:'5px 10px',borderRadius:7,border:'1px solid #bae6fd',background:'#f0f9ff',textDecoration:'none'}}>
                                    📜 {rec.certFileName||'Certificate'}</a>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="prp-card" style={{padding:'1rem'}}>
                        <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:'0.875rem'}}>💰 Add Payment Record</div>
                        <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
                          <div className="prp-field">
                            <label className="prp-label">Description *</label>
                            <input className="prp-input" placeholder="e.g. First instalment payment"
                              value={payDesc} onChange={e=>setPayDesc(e.target.value)}/>
                          </div>
                          <div className="prp-field-row">
                            <div className="prp-field">
                              <label className="prp-label">Amount (GHS) *</label>
                              <input className="prp-input" type="number" min={0} step={0.01} placeholder="0.00"
                                value={payAmount} onChange={e=>setPayAmount(e.target.value)}/>
                            </div>
                            <div className="prp-field">
                              <label className="prp-label">Date</label>
                              <input className="prp-input" type="date" value={payDate} onChange={e=>setPayDate(e.target.value)}/>
                            </div>
                          </div>
                          <div className="prp-field">
                            <label className="prp-label">Status</label>
                            <select className="prp-select" value={payStatus} onChange={e=>setPayStatus(e.target.value)}>
                              <option value="Pending">Pending</option>
                              <option value="Approved">Approved</option>
                              <option value="Paid">Paid</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </div>
                          <div className="prp-field-row">
                            <div className="prp-field">
                              <label className="prp-label">Receipt</label>
                              <label style={{display:'flex',alignItems:'center',gap:7,padding:'8px 11px',border:'1.5px dashed #e2e8f0',borderRadius:9,fontSize:12,color:'#64748b',cursor:'pointer',background:'#f8fafc'}}>
                                <input type="file" style={{display:'none'}} accept=".pdf,.jpg,.jpeg,.png" onChange={e=>setPayReceipt(e.target.files[0]||null)}/>
                                {payReceipt?payReceipt.name:'⬆ Upload receipt…'}
                              </label>
                            </div>
                            <div className="prp-field">
                              <label className="prp-label">Certificate of Payment</label>
                              <label style={{display:'flex',alignItems:'center',gap:7,padding:'8px 11px',border:'1.5px dashed #e2e8f0',borderRadius:9,fontSize:12,color:'#64748b',cursor:'pointer',background:'#f8fafc'}}>
                                <input type="file" style={{display:'none'}} accept=".pdf,.jpg,.jpeg,.png" onChange={e=>setPayCert(e.target.files[0]||null)}/>
                                {payCert?payCert.name:'⬆ Upload certificate…'}
                              </label>
                            </div>
                          </div>
                          <div style={{display:'flex',justifyContent:'flex-end'}}>
                            <button className="prp-btn-primary" disabled={savingPay||!payDesc.trim()||!payAmount} onClick={handleAddPayment}>
                              {savingPay?'Saving…':'Add Payment Record'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Contractor Onboarding Modal ── */}
      {showConOnboard && (
        <div className="prp-modal-overlay" onClick={e=>{if(e.target===e.currentTarget){setShowConOnboard(false);setConStep(1);}}}>
          <div className="prp-modal" style={{maxWidth:580}}>
            <div className="prp-flag"><div className="prp-flag-r"/><div className="prp-flag-g"/><div className="prp-flag-gr"/></div>
            <div className="prp-modal-header">
              <div>
                <div className="prp-modal-title">Onboard Contractor</div>
                <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>
                  Step {conStep} of 2 — {conStep===1?'Company Details':'Documents & Files'}
                </div>
              </div>
              <button className="prp-modal-close" onClick={()=>{setShowConOnboard(false);setConStep(1);}}>×</button>
            </div>

            {/* Step indicator */}
            <div style={{display:'flex',borderBottom:'1px solid #f1f5f9'}}>
              {['Company Details','Documents & Files'].map((label,i) => (
                <div key={i} style={{flex:1,padding:'10px 16px',fontSize:12,fontWeight:600,textAlign:'center',
                  borderBottom: conStep===i+1?'2px solid #CE1126':'2px solid transparent',
                  color: conStep===i+1?'#CE1126':'#94a3b8',
                  background: conStep===i+1?'#fff8f8':'transparent',transition:'all 0.2s'}}>
                  <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:18,height:18,borderRadius:'50%',
                    background:conStep===i+1?'#CE1126':'#e2e8f0',color:conStep===i+1?'#fff':'#94a3b8',
                    fontSize:10,fontWeight:700,marginRight:6}}>
                    {i+1}
                  </span>
                  {label}
                </div>
              ))}
            </div>

            <div className="prp-modal-body">
              {conErr && <div className="prp-modal-err">{conErr}</div>}

              {conStep === 1 && (
                <>
                  <div className="prp-field-row">
                    <div className="prp-field">
                      <label className="prp-label">Company Name <span style={{color:'#CE1126'}}>*</span></label>
                      <input className="prp-input" placeholder="e.g. Accra Build Ltd"
                        value={conForm.companyName} onChange={e=>setConForm(p=>({...p,companyName:e.target.value}))}/>
                    </div>
                    <div className="prp-field">
                      <label className="prp-label">Registration No. <span style={{color:'#CE1126'}}>*</span></label>
                      <input className="prp-input" placeholder="e.g. BN-2024-00123"
                        value={conForm.registrationNumber} onChange={e=>setConForm(p=>({...p,registrationNumber:e.target.value}))}/>
                    </div>
                  </div>
                  <div className="prp-field-row">
                    <div className="prp-field">
                      <label className="prp-label">Category <span style={{color:'#CE1126'}}>*</span></label>
                      <select className="prp-select" value={conForm.category} onChange={e=>setConForm(p=>({...p,category:e.target.value}))}>
                        <option value="">Select category</option>
                        {['Road & Transport','Building & Construction','Water & Sanitation',
                          'Electrical & Power','ICT & Communications','Agriculture','General']
                          .map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="prp-field">
                      <label className="prp-label">Status</label>
                      <select className="prp-select" value={conForm.status} onChange={e=>setConForm(p=>({...p,status:e.target.value}))}>
                        <option value="Active">Active</option>
                        <option value="Suspended">Suspended</option>
                        <option value="Blacklisted">Blacklisted</option>
                      </select>
                    </div>
                  </div>
                  <div className="prp-field-row">
                    <div className="prp-field">
                      <label className="prp-label">Contact Person</label>
                      <input className="prp-input" placeholder="Full name"
                        value={conForm.contactName} onChange={e=>setConForm(p=>({...p,contactName:e.target.value}))}/>
                    </div>
                    <div className="prp-field">
                      <label className="prp-label">Contact Phone</label>
                      <input className="prp-input" placeholder="+233XXXXXXXXX"
                        value={conForm.contactPhone} onChange={e=>setConForm(p=>({...p,contactPhone:e.target.value}))}/>
                    </div>
                  </div>
                  <div className="prp-field">
                    <label className="prp-label">Contact Email</label>
                    <input className="prp-input" type="email" placeholder="contractor@email.com"
                      value={conForm.contactEmail} onChange={e=>setConForm(p=>({...p,contactEmail:e.target.value}))}/>
                  </div>
                  <div className="prp-field">
                    <label className="prp-label">Physical Address</label>
                    <input className="prp-input" placeholder="Street / Town"
                      value={conForm.address} onChange={e=>setConForm(p=>({...p,address:e.target.value}))}/>
                  </div>
                  {/* District info locked to user account */}
                  {(user?.region || user?.district) && (
                    <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:9,padding:'10px 14px',fontSize:12,color:'#166534'}}>
                      📍 This contractor will be filed under <strong>{[user.district,user.region].filter(Boolean).join(', ')}</strong>
                    </div>
                  )}
                  <div className="prp-field">
                    <label className="prp-label">Notes</label>
                    <textarea className="prp-textarea" rows={2} placeholder="Any additional information…"
                      value={conForm.notes} onChange={e=>setConForm(p=>({...p,notes:e.target.value}))}/>
                  </div>
                  <div className="prp-modal-footer" style={{paddingTop:0}}>
                    <button className="prp-btn-ghost" onClick={()=>setShowConOnboard(false)}>Cancel</button>
                    <button className="prp-btn-primary"
                      disabled={!conForm.companyName||!conForm.registrationNumber||!conForm.category}
                      onClick={()=>{setConErr('');setConStep(2);}}>
                      Next: Upload Documents →
                    </button>
                  </div>
                </>
              )}

              {conStep === 2 && (
                <>
                  <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:9,padding:'10px 14px',fontSize:13,color:'#166534',marginBottom:'0.5rem'}}>
                    ✅ Company details saved. Upload documents (optional — can be added later).
                  </div>
                  {conFiles.length > 0 && (
                    <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:'1rem'}}>
                      {conFiles.map((item,i) => (
                        <div key={i} style={{display:'flex',gap:8,alignItems:'center',background:'#f8fafc',borderRadius:8,padding:'8px 10px',border:'1px solid #e2e8f0'}}>
                          <span style={{fontSize:16}}>📄</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,color:'#374151',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.file.name}</div>
                            <div style={{fontSize:10,color:'#94a3b8'}}>{(item.file.size/1024).toFixed(1)} KB</div>
                          </div>
                          <select className="prp-select" style={{width:160}} value={item.type}
                            onChange={e=>setConFiles(prev=>prev.map((x,j)=>j===i?{...x,type:e.target.value}:x))}>
                            <option value="businessCertificate">Business Certificate</option>
                            <option value="taxClearance">Tax Clearance</option>
                            <option value="incorporation">Incorporation</option>
                            <option value="insurance">Insurance</option>
                            <option value="other">Other</option>
                          </select>
                          <button onClick={()=>setConFiles(prev=>prev.filter((_,j)=>j!==i))}
                            style={{background:'none',border:'none',color:'#CE1126',cursor:'pointer',fontSize:20,lineHeight:1,padding:'2px 4px'}}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,padding:'2rem',border:'2px dashed #e2e8f0',borderRadius:12,cursor:'pointer',background:'#f8fafc',transition:'border-color 0.2s'}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor='#CE1126'}
                    onMouseLeave={e=>e.currentTarget.style.borderColor='#e2e8f0'}>
                    <span style={{fontSize:'2rem'}}>📎</span>
                    <span style={{fontSize:13,fontWeight:600,color:'#475569'}}>Click to select documents</span>
                    <span style={{fontSize:11,color:'#94a3b8'}}>PDF, JPG, PNG — certificates, tax clearance, incorporation docs</span>
                    <input type="file" style={{display:'none'}} multiple accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e=>{const f=Array.from(e.target.files).map(f=>({file:f,type:'businessCertificate'}));setConFiles(p=>[...p,...f]);e.target.value='';}}/>
                  </label>
                  <div className="prp-modal-footer" style={{paddingTop:0}}>
                    <button className="prp-btn-ghost" onClick={()=>setConStep(1)}>← Back</button>
                    <button className="prp-btn-primary" disabled={conboarding} onClick={handleConOnboardSubmit}>
                      {conboarding?'Onboarding…':`Finish — Onboard${conFiles.length>0?` (${conFiles.length} file${conFiles.length!==1?'s':''})`:''}` }
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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