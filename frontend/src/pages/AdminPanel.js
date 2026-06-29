import React, { useEffect, useState, useMemo, useContext, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import ghanaRegions from '../data/ghanaRegions';
import '../css/AdminPanel.css';

const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago`
    : new Date(dateStr).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
};

const isNew = (dateStr) => Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000;

const parseForumMeta = (forum) => {
  if (!forum.description) return { category:'Other', priority:'Medium', description:'' };
  try {
    const sepIdx = forum.description.indexOf('||');
    if (sepIdx === -1) return { category:'Other', priority:'Medium', description: forum.description };
    const meta = JSON.parse(forum.description.slice(0, sepIdx));
    return { category: meta.cat||'Other', priority: meta.pri||'Medium', description: forum.description.slice(sepIdx+2) };
  } catch { return { category:'Other', priority:'Medium', description: forum.description }; }
};

const deriveStatus = (forum) => {
  if (forum.status) return forum.status;
  const hasAdminReply = forum.comments?.some(c => c.isAdmin || c.fromMinistry || c.createdBy?.isAdmin);
  return hasAdminReply ? 'Replied' : 'Open';
};

const PRIORITY_ORDER = { Urgent:0, High:1, Medium:2, Low:3 };
const STRIPE_CLS  = { Urgent:'ap-stripe-urgent', High:'ap-stripe-high', Medium:'ap-stripe-medium', Low:'ap-stripe-low' };
const PRI_CLS     = { Urgent:'ap-mini-badge-urgent', High:'ap-mini-badge-high', Medium:'ap-mini-badge-medium', Low:'ap-mini-badge-low' };
const STS_CLS     = { 'Open':'ap-mini-badge-open', 'Under Review':'ap-mini-badge-review', 'Replied':'ap-mini-badge-replied', 'Resolved':'ap-mini-badge-resolved' };
const PER_PAGE    = 8;

// ── AdminEditProjectModal ──────────────────────────────────────────────────────
// Full-featured project edit modal used inside the admin dashboard.
// Accepts hdrs, ghanaRegions, apiUrl as props (already in scope of AdminPanel).
const AdminEditProjectModal = ({ project, hdrs, ghanaRegions, apiUrl, onClose, onSaved }) => {
  const [form, setForm] = React.useState({
    title:                  project.title                  || '',
    type:                   project.type                   || '',
    status:                 project.status                 || '',
    description:            project.description            || '',
    contractor:             project.contractor             || '',
    fundingSource:          project.fundingSource          || '',
    otherFundingSources:    project.otherFundingSources    || '',
    location_address:       project.location_address       || '',
    location_city:          project.location_city          || '',
    projectStartDate:       project.projectStartDate
                              ? new Date(project.projectStartDate).toISOString().split('T')[0] : '',
    expectedCompletionDate: project.expectedCompletionDate
                              ? new Date(project.expectedCompletionDate).toISOString().split('T')[0] : '',
    completionPercentage:   project.completionPercentage   ?? 0,
    totalCost:              project.totalCost         != null ? project.totalCost         : '',
    amountPaid:             project.amountPaid        != null ? project.amountPaid        : '',
    outstandingAmount:      project.outstandingAmount != null ? project.outstandingAmount : '',
  });
  const [imageFile,    setImageFile]    = React.useState(null);
  const [imagePreview, setImagePreview] = React.useState(project.imageUrl ? apiUrl(project.imageUrl) : null);
  const [saving,       setSaving]       = React.useState(false);
  const [err,          setErr]          = React.useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const PROJECT_TYPES = ['School','Hospital','Road','Bridge','Water System','Power Project',
    'Market Stall','Drainage System','Sanitation Facility','Government Office',
    'Residential Bungalow','Sports & Recreation Center'];

  const FUNDING_SOURCES = [
    { value:'Government', label:'Government Budget Allocation' },
    { value:'GIIF',       label:'Ghana Infrastructure Investment Fund (GIIF)' },
    { value:'DACF',       label:'District Assemblies Common Fund (DACF)' },
    { value:'WorldBank',  label:'World Bank Group' },
    { value:'IMF',        label:'International Monetary Fund (IMF)' },
    { value:'UNDP',       label:'United Nations Development Programme (UNDP)' },
    { value:'Other',      label:'Other' },
  ];

  const handleSave = async () => {
    if (!form.title.trim()) { setErr('Title is required.'); return; }
    setSaving(true); setErr('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) fd.append(k, String(v));
      });
      if (imageFile) fd.append('image', imageFile);
      const res = await axios.put(apiUrl(`/api/projects/${project._id}`), fd, {
        headers: { ...hdrs, 'Content-Type': 'multipart/form-data' },
      });
      onSaved(res.data);
    } catch (e) { setErr(e?.response?.data?.error || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  // Shared input style helpers
  const inputStyle = {
    width:'100%', padding:'8px 11px', border:'1.5px solid #e2e8f0', borderRadius:8,
    fontSize:13, fontFamily:'inherit', color:'#1e293b', background:'#f8fafc',
    boxSizing:'border-box',
  };
  const labelStyle = { fontSize:11, fontWeight:700, color:'#374151', marginBottom:3, display:'block' };
  const sectionStyle = {
    fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.8px',
    color:'#94a3b8', borderBottom:'1px solid #f1f5f9', paddingBottom:4, marginBottom:2,
  };
  const rowStyle = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 };
  const row3Style = { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 };

  return (
    <div
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(5px)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{background:'#fff',borderRadius:18,width:'100%',maxWidth:'min(700px,96vw)',maxHeight:'92vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.25)',display:'flex',flexDirection:'column'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',padding:'1.25rem 1.5rem 1rem',borderBottom:'1px solid #f1f5f9',flexShrink:0}}>
          <div>
            <div style={{fontSize:'1rem',fontWeight:700,color:'#0f172a'}}>Edit Project</div>
            <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>
              {project.title} — update any field and save
            </div>
          </div>
          <button onClick={onClose}
            style={{width:28,height:28,borderRadius:'50%',border:'1px solid #e2e8f0',background:'#f8fafc',fontSize:16,color:'#64748b',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{padding:'1.25rem 1.5rem',display:'flex',flexDirection:'column',gap:'0.875rem',overflowX:'hidden'}}>
          {err && (
            <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#991b1b'}}>
              {err}
            </div>
          )}

          {/* Basic Info */}
          <div style={sectionStyle}>Basic Information</div>
          <div style={{...inputStyle,padding:0}}>
            <input style={{...inputStyle,border:'none',background:'transparent'}}
              placeholder="Project title *" value={form.title}
              onChange={e => set('title', e.target.value)} />
          </div>
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Project Type</label>
              <select style={inputStyle} value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="">Select type</option>
                {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="Uncompleted">Uncompleted</option>
                <option value="Resumed">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Abandoned">Abandoned</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea style={{...inputStyle,minHeight:70,resize:'vertical'}} value={form.description}
              onChange={e => set('description', e.target.value)} placeholder="Project description…" />
          </div>

          {/* Progress */}
          <div style={sectionStyle}>Progress &amp; Timeline</div>
          <div>
            <label style={{...labelStyle,display:'flex',alignItems:'center',gap:8}}>
              Completion Progress
              <span style={{background:'#006B3F',color:'#fff',fontSize:11,fontWeight:700,padding:'2px 9px',borderRadius:10}}>
                {form.completionPercentage}%
              </span>
            </label>
            {/* Custom visual range */}
            <div style={{position:'relative',marginBottom:4}}>
              <input type="range" min={0} max={100} step={1}
                value={form.completionPercentage}
                onChange={e => set('completionPercentage', Number(e.target.value))}
                style={{position:'absolute',inset:0,width:'100%',height:28,opacity:0,cursor:'pointer',zIndex:2,margin:0}} />
              <div style={{height:10,background:'#e2e8f0',borderRadius:5,overflow:'hidden',margin:'9px 0'}}>
                <div style={{height:'100%',background:'linear-gradient(90deg,#CE1126,#FCD116,#006B3F)',borderRadius:5,width:`${form.completionPercentage}%`,transition:'width 0.12s ease'}}/>
              </div>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#94a3b8',padding:'0 2px'}}>
              <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
            </div>
          </div>
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Start Date</label>
              <input type="date" style={inputStyle} value={form.projectStartDate}
                onChange={e => set('projectStartDate', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Expected Completion</label>
              <input type="date" style={inputStyle} value={form.expectedCompletionDate}
                onChange={e => set('expectedCompletionDate', e.target.value)} />
            </div>
          </div>

          {/* Financial */}
          <div style={sectionStyle}>Financial Details (GHS)</div>
          <div style={row3Style}>
            {[
              { label:'Total Project Cost',        key:'totalCost' },
              { label:'Amount Paid to Contractor', key:'amountPaid' },
              { label:'Outstanding Balance',       key:'outstandingAmount' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <div style={{display:'flex',border:'1.5px solid #e2e8f0',borderRadius:8,overflow:'hidden'}}>
                  <span style={{padding:'0 9px',background:'#f8fafc',borderRight:'1.5px solid #e2e8f0',fontSize:11,fontWeight:700,color:'#64748b',display:'flex',alignItems:'center'}}>GHS</span>
                  <input type="number" min={0} step={0.01}
                    style={{...inputStyle,border:'none',borderRadius:0,flex:1}}
                    value={form[key]} onChange={e => set(key, e.target.value)}
                    placeholder="0.00" />
                </div>
                {key === 'outstandingAmount' && form.totalCost && form.amountPaid && (
                  <div style={{fontSize:11,color:'#006B3F',marginTop:3,fontWeight:500}}>
                    Suggested: GHS {Math.max(0, Number(form.totalCost) - Number(form.amountPaid))
                      .toLocaleString('en-GH', { minimumFractionDigits:2 })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Location */}
          <div style={sectionStyle}>Location</div>
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>City / Town</label>
              <input style={inputStyle} value={form.location_city}
                onChange={e => set('location_city', e.target.value)} placeholder="e.g. Kumasi" />
            </div>
            <div>
              <label style={labelStyle}>Street Address</label>
              <input style={inputStyle} value={form.location_address}
                onChange={e => set('location_address', e.target.value)} placeholder="e.g. Main Street" />
            </div>
          </div>

          {/* People & Funding */}
          <div style={sectionStyle}>People &amp; Funding</div>
          <div>
            <label style={labelStyle}>Contractor</label>
            <input style={inputStyle} value={form.contractor}
              onChange={e => set('contractor', e.target.value)} placeholder="Contractor name" />
          </div>
          <div>
            <label style={labelStyle}>Source of Funding</label>
            <select style={inputStyle} value={form.fundingSource}
              onChange={e => set('fundingSource', e.target.value)}>
              <option value="">Select funding source</option>
              {FUNDING_SOURCES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          {form.fundingSource === 'Other' && (
            <div>
              <label style={labelStyle}>Specify funding source</label>
              <input style={inputStyle} value={form.otherFundingSources}
                onChange={e => set('otherFundingSources', e.target.value)}
                placeholder="Actual funding source" />
            </div>
          )}

          {/* Image */}
          <div style={sectionStyle}>Project Image</div>
          {imagePreview && (
            <div style={{position:'relative',marginBottom:4}}>
              <img src={imagePreview} alt="Preview"
                style={{width:'100%',maxHeight:100,objectFit:'cover',borderRadius:8,border:'1px solid #e2e8f0',display:'block'}} />
              <button onClick={() => { setImageFile(null); setImagePreview(null); }}
                style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,0.6)',color:'#fff',border:'none',borderRadius:6,padding:'3px 9px',fontSize:11,fontWeight:600,cursor:'pointer'}}>
                ✕ Remove
              </button>
            </div>
          )}
          <label style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:'1.25rem',border:'2px dashed #e2e8f0',borderRadius:12,cursor:'pointer',textAlign:'center',background:'#f8fafc'}}>
            <input type="file" accept="image/*" style={{display:'none'}}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }
              }} />
            <span style={{fontSize:'1.5rem'}}>🖼️</span>
            <span style={{fontSize:12,fontWeight:600,color:'#374151'}}>
              {imageFile ? imageFile.name : 'Click to upload a new image'}
            </span>
            <span style={{fontSize:11,color:'#94a3b8'}}>JPG, PNG — replaces existing image</span>
          </label>
        </div>

        {/* Footer */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:'0.75rem',padding:'1rem 1.5rem',borderTop:'1px solid #f1f5f9',flexShrink:0}}>
          <button onClick={onClose}
            style={{padding:'8px 18px',border:'1.5px solid #e2e8f0',background:'#fff',color:'#64748b',borderRadius:9,fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{padding:'8px 22px',background:saving?'#94a3b8':'#006B3F',color:'#fff',border:'none',borderRadius:9,fontSize:13,fontWeight:600,cursor:saving?'not-allowed':'pointer',fontFamily:'inherit',transition:'background 0.15s'}}>
            {saving ? 'Saving…' : 'Save all changes'}
          </button>
        </div>
      </div>
    </div>
  );
};



const NAV = [
  { id:'dashboard',   label:'Dashboard',   icon:'📊' },
  { id:'issues',      label:'Issues',      icon:'📨' },
  { id:'projects',    label:'Projects',    icon:'🏗️'  },
  { id:'contractors', label:'Contractors', icon:'🏢' },
  { id:'users',       label:'MMDCE Users', icon:'👥' },
  { id:'settings',    label:'Settings',    icon:'⚙️'  },
  { id:'reports',     label:'Citizen Reports', icon:'📣' },
];

const Spinner = ({ size=32 }) => (
  <div style={{display:'flex',justifyContent:'center',padding:'3rem'}}>
    <div style={{width:size,height:size,border:'3px solid #e2e8f0',borderTopColor:'#CE1126',borderRadius:'50%',animation:'ap-spin 0.8s linear infinite'}}/>
  </div>
);

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useContext(AuthContext);

  const [tab,           setTab]           = useState('dashboard');
  const [sidebarOpen,   setSidebarOpen]   = useState(false);

  // issues
  const [issues,        setIssues]        = useState([]);
  const [selIssue,      setSelIssue]      = useState(null);
  const [issueComments, setIssueComments] = useState([]);
  const [replyText,     setReplyText]     = useState('');
  const [replyStatus,   setReplyStatus]   = useState('Replied');
  const [sendingReply,  setSendingReply]  = useState(false);
  const [iFilter,       setIFilter]       = useState({ region:'', district:'', status:'', search:'', sort:'newest' });
  const [loadingIssues, setLoadingIssues] = useState(true);

  // projects
  const [projects,      setProjects]      = useState([]);
  const [projPage,      setProjPage]      = useState(1);
  const [pFilter,       setPFilter]       = useState({ region:'', district:'' });
  const [loadingProj,   setLoadingProj]   = useState(true);

  // users
  const [users,         setUsers]         = useState([]);
  const [showCreate,    setShowCreate]    = useState(false);
  const [uForm,         setUForm]         = useState({ fullName:'', phone:'', username:'', password:'', region:'', district:'' });
  const [creating,      setCreating]      = useState(false);
  const [createErr,     setCreateErr]     = useState('');
  const [loadingUsers,  setLoadingUsers]  = useState(true);

  // settings
  // contractors
  const [contractors,     setContractors]     = useState([]);
  const [loadingCon,      setLoadingCon]      = useState(true);
  const [conFilter,       setConFilter]       = useState({ search:'', category:'', status:'' });
  const [selContractor,   setSelContractor]   = useState(null);   // open profile panel
  const [editProject,     setEditProject]     = useState(null);   // project being edited in modal
  const [profileTab,      setProfileTab]      = useState('overview');
  const [showOnboard,     setShowOnboard]     = useState(false);
  const [onboardStep,     setOnboardStep]     = useState(1);
  const [onboardErr,      setOnboardErr]      = useState('');
  const [onboarding,      setOnboarding]      = useState(false);
  const [onboardForm,     setOnboardForm]     = useState({
    companyName:'', registrationNumber:'', category:'', status:'Active',
    contactName:'', contactPhone:'', contactEmail:'',
    address:'', region:'', district:'', notes:'',
  });
  const [onboardFiles,    setOnboardFiles]    = useState([]);        // [{file, type}]
  // progress upload
  const [progDesc,        setProgDesc]        = useState('');
  const [progDate,        setProgDate]        = useState('');
  const [progFile,        setProgFile]        = useState(null);
  const [savingProg,      setSavingProg]      = useState(false);
  // payment upload
  const [payDesc,         setPayDesc]         = useState('');
  const [payAmount,       setPayAmount]       = useState('');
  const [payDate,         setPayDate]         = useState('');
  const [payStatus,       setPayStatus]       = useState('Pending');
  const [payReceipt,      setPayReceipt]      = useState(null);
  const [payCert,         setPayCert]         = useState(null);
  const [savingPay,       setSavingPay]       = useState(false);
  // doc upload
  const [addDocFiles,     setAddDocFiles]     = useState([]);
  const [savingDocs,      setSavingDocs]      = useState(false);

  // citizen reports
  const [reports,       setReports]       = useState([]);
  const [loadingReports,setLoadingReports]= useState(true);
  const [rFilter,       setRFilter]       = useState({ region:'', district:'', status:'' });
  const [updatingReport,setUpdatingReport]= useState(null);

  const settingsForm_placeholder = null; // keep spacing
  const [settingsForm,  setSettingsForm]  = useState({ username:'', currentPassword:'', newPassword:'', confirmPassword:'' });
  const [savingSettings,setSavingSettings] = useState(false);
  const [settingsMsg,   setSettingsMsg]   = useState({ text:'', type:'' });

  const hdrs = useMemo(() => token ? { Authorization:`Bearer ${token}` } : {}, [token]);

  const fetchIssues = useCallback(async () => {
    setLoadingIssues(true);
    try { const r = await axios.get(apiUrl('/api/forums'), { headers: hdrs }); setIssues(Array.isArray(r.data) ? r.data : []); }
    catch(e) { console.error(e); } finally { setLoadingIssues(false); }
  }, [hdrs]);

  const fetchProjects = useCallback(async () => {
    setLoadingProj(true);
    try { const r = await axios.get(apiUrl('/api/projects'), { headers: hdrs }); setProjects(Array.isArray(r.data) ? r.data : []); }
    catch(e) { console.error(e); } finally { setLoadingProj(false); }
  }, [hdrs]);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try { const r = await axios.get(apiUrl('/api/admin-auth/users'), { headers: hdrs }); setUsers(Array.isArray(r.data) ? r.data : []); }
    catch(e) { console.error(e); } finally { setLoadingUsers(false); }
  }, [hdrs]);

  const fetchContractors = useCallback(async () => {
    setLoadingCon(true);
    try { const r = await axios.get(apiUrl('/api/contractors'), { headers: hdrs }); setContractors(Array.isArray(r.data) ? r.data : []); }
    catch(e) { console.error(e); } finally { setLoadingCon(false); }
  }, [hdrs]);

  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const r = await axios.get(apiUrl('/api/citizen-reports'), { headers: hdrs });
      setReports(Array.isArray(r.data) ? r.data : []);
    } catch(e) { console.error(e); }
    finally { setLoadingReports(false); }
  }, [hdrs]);

  useEffect(() => { fetchIssues(); fetchProjects(); fetchUsers(); fetchContractors(); fetchReports(); }, [fetchIssues, fetchProjects, fetchUsers, fetchContractors, fetchReports]);

  useEffect(() => {
    if (!selIssue) return;
    axios.get(apiUrl(`/api/comments/${selIssue._id}`), { headers: hdrs })
      .then(r => setIssueComments(Array.isArray(r.data) ? r.data : []))
      .catch(() => setIssueComments([]));
  }, [selIssue, hdrs]);

  const handleSendReply = async () => {
    const userId = user?._id || user?.id;
    if (!replyText.trim() || !selIssue || !userId) return;
    setSendingReply(true);
    try {
      const fd = new FormData();
      fd.append('forumId',   selIssue._id);
      fd.append('content',   replyText.trim());
      fd.append('createdBy', userId);
      await axios.post(apiUrl('/api/comments'), fd, {
        headers: { ...hdrs, 'Content-Type':'multipart/form-data' },
      });
      if (replyStatus !== deriveStatus(selIssue)) {
        await axios.put(apiUrl(`/api/forums/${selIssue._id}`), { status: replyStatus }, { headers: hdrs });
        setIssues(prev => prev.map(f => f._id === selIssue._id ? { ...f, status: replyStatus } : f));
        setSelIssue(prev => ({ ...prev, status: replyStatus }));
      }
      setReplyText('');
      const r = await axios.get(apiUrl(`/api/comments/${selIssue._id}`), { headers: hdrs });
      setIssueComments(Array.isArray(r.data) ? r.data : []);
    } catch(e) { alert(e?.response?.data?.error || 'Failed to send reply.'); }
    finally { setSendingReply(false); }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Delete this project permanently?')) return;
    try { await axios.delete(apiUrl(`/api/projects/${id}`), { headers: hdrs }); setProjects(p => p.filter(x => x._id !== id)); }
    catch(e) { alert('Delete failed.'); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault(); setCreateErr(''); setCreating(true);
    try {
      await axios.post(apiUrl('/api/admin-auth/create-user'), uForm, { headers: hdrs });
      setShowCreate(false);
      setUForm({ fullName:'', phone:'', username:'', password:'', region:'', district:'' });
      fetchUsers();
    } catch(err) { setCreateErr(err?.response?.data?.error || 'Failed to create account.'); }
    finally { setCreating(false); }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this MMDCE account?')) return;
    try { await axios.delete(apiUrl(`/api/admin-auth/users/${id}`), { headers: hdrs }); setUsers(u => u.filter(x => x._id !== id)); }
    catch(e) { alert('Failed.'); }
  };

  // ── Contractor handlers ────────────────────────────────────────────────
  const handleOnboardSubmit = async () => {
    if (!onboardForm.companyName || !onboardForm.registrationNumber || !onboardForm.category) {
      setOnboardErr('Company name, registration number and category are required.'); return;
    }
    setOnboarding(true); setOnboardErr('');
    try {
      const fd = new FormData();
      Object.entries(onboardForm).forEach(([k,v]) => { if (v) fd.append(k, v); });
      onboardFiles.forEach(({ file, type }) => {
        fd.append('documents', file);
        fd.append('documentTypes', type || 'other');
      });
      await axios.post(apiUrl('/api/contractors'), fd, {
        headers: { ...hdrs, 'Content-Type': 'multipart/form-data' },
      });
      setShowOnboard(false);
      setOnboardStep(1);
      setOnboardForm({ companyName:'', registrationNumber:'', category:'', status:'Active', contactName:'', contactPhone:'', contactEmail:'', address:'', region:'', district:'', notes:'' });
      setOnboardFiles([]);
      fetchContractors();
    } catch(e) { setOnboardErr(e?.response?.data?.error || 'Failed to onboard contractor.'); }
    finally { setOnboarding(false); }
  };

  const handleDeleteContractor = async (id) => {
    if (!window.confirm('Remove this contractor permanently?')) return;
    try { await axios.delete(apiUrl(`/api/contractors/${id}`), { headers: hdrs }); fetchContractors(); if (selContractor?._id === id) setSelContractor(null); }
    catch(e) { alert('Failed to delete.'); }
  };

  const handleUpdateContractorStatus = async (id, status) => {
    try {
      await axios.put(apiUrl(`/api/contractors/${id}`), { status }, { headers: hdrs });
      fetchContractors();
      if (selContractor?._id === id) setSelContractor(prev => ({ ...prev, status }));
    } catch(e) { alert('Failed to update status.'); }
  };

  const handleAddProgress = async () => {
    if (!progDesc.trim() || !selContractor) return;
    setSavingProg(true);
    try {
      const fd = new FormData();
      fd.append('description', progDesc.trim());
      if (progDate) fd.append('date', progDate);
      if (progFile) fd.append('file', progFile);
      const r = await axios.post(apiUrl(`/api/contractors/${selContractor._id}/progress`), fd, {
        headers: { ...hdrs, 'Content-Type': 'multipart/form-data' },
      });
      setSelContractor(prev => ({ ...prev, workProgress: r.data }));
      setProgDesc(''); setProgDate(''); setProgFile(null);
    } catch(e) { alert(e?.response?.data?.error || 'Failed to add progress.'); }
    finally { setSavingProg(false); }
  };

  const handleAddPayment = async () => {
    if (!payDesc.trim() || !payAmount || !selContractor) return;
    setSavingPay(true);
    try {
      const fd = new FormData();
      fd.append('description', payDesc.trim());
      fd.append('amount', payAmount);
      fd.append('status', payStatus);
      if (payDate) fd.append('date', payDate);
      if (payReceipt)  fd.append('receipt',     payReceipt);
      if (payCert)     fd.append('certificate', payCert);
      const r = await axios.post(apiUrl(`/api/contractors/${selContractor._id}/payments`), fd, {
        headers: { ...hdrs, 'Content-Type': 'multipart/form-data' },
      });
      setSelContractor(prev => ({ ...prev, paymentRecords: r.data }));
      setPayDesc(''); setPayAmount(''); setPayDate(''); setPayStatus('Pending'); setPayReceipt(null); setPayCert(null);
    } catch(e) { alert(e?.response?.data?.error || 'Failed to add payment.'); }
    finally { setSavingPay(false); }
  };

  const handleAddDocs = async () => {
    if (!addDocFiles.length || !selContractor) return;
    setSavingDocs(true);
    try {
      const fd = new FormData();
      addDocFiles.forEach(({ file, type }) => { fd.append('documents', file); fd.append('documentTypes', type || 'other'); });
      const r = await axios.post(apiUrl(`/api/contractors/${selContractor._id}/documents`), fd, {
        headers: { ...hdrs, 'Content-Type': 'multipart/form-data' },
      });
      setSelContractor(prev => ({ ...prev, documents: r.data }));
      setAddDocFiles([]);
    } catch(e) { alert(e?.response?.data?.error || 'Failed to upload documents.'); }
    finally { setSavingDocs(false); }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Remove this document?')) return;
    try {
      await axios.delete(apiUrl(`/api/contractors/${selContractor._id}/documents/${docId}`), { headers: hdrs });
      setSelContractor(prev => ({ ...prev, documents: prev.documents.filter(d => d._id !== docId) }));
    } catch(e) { alert('Failed to remove document.'); }
  };

  const handleLogout = () => { logout(); navigate('/ministry-portal/auth'); };

  const stats = useMemo(() => ({
    totalIssues:   issues.length,
    newIssues:     issues.filter(f => isNew(f.createdAt)).length,
    openIssues:    issues.filter(f => deriveStatus(f) === 'Open').length,
    repliedIssues: issues.filter(f => deriveStatus(f) === 'Replied').length,
    totalProjects: projects.length,
    totalUsers:    users.length,
  }), [issues, projects, users]);

  const filteredIssues = useMemo(() => {
    let list = [...issues];
    if (iFilter.region)   list = list.filter(f => f.region   === iFilter.region);
    if (iFilter.district) list = list.filter(f => f.district === iFilter.district);
    if (iFilter.status)   list = list.filter(f => deriveStatus(f) === iFilter.status);
    if (iFilter.search) { const q = iFilter.search.toLowerCase(); list = list.filter(f => f.title?.toLowerCase().includes(q) || f.district?.toLowerCase().includes(q)); }
    if (iFilter.sort === 'priority') list.sort((a,b) => (PRIORITY_ORDER[parseForumMeta(a).priority]??3) - (PRIORITY_ORDER[parseForumMeta(b).priority]??3));
    else if (iFilter.sort === 'status') list.sort((a,b) => deriveStatus(a).localeCompare(deriveStatus(b)));
    else list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [issues, iFilter]);

  const filteredProjects = useMemo(() => {
    let list = [...projects];
    if (pFilter.region)   list = list.filter(p => p.region   === pFilter.region);
    if (pFilter.district) list = list.filter(p => p.district === pFilter.district);
    return list;
  }, [projects, pFilter]);

  const projTotalPages  = Math.max(1, Math.ceil(filteredProjects.length / PER_PAGE));
  const currentProjects = filteredProjects.slice((projPage-1)*PER_PAGE, projPage*PER_PAGE);

  const filteredContractors = useMemo(() => {
    let list = [...contractors];
    if (conFilter.category) list = list.filter(c => c.category === conFilter.category);
    if (conFilter.status)   list = list.filter(c => c.status   === conFilter.status);
    if (conFilter.search) {
      const q = conFilter.search.toLowerCase();
      list = list.filter(c =>
        c.companyName?.toLowerCase().includes(q) ||
        c.registrationNumber?.toLowerCase().includes(q) ||
        c.contactPerson?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [contractors, conFilter]);

  const ministryReplies = useMemo(() =>
    issueComments.filter(c => c.createdBy?.isAdmin || c.fromMinistry), [issueComments]);

  return (
    <div className="ap-shell">
      {/* ── Sidebar ── */}
      <aside className={`ap-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="ap-sidebar-flag">
          <div className="ap-sidebar-flag-r"/><div className="ap-sidebar-flag-g"/><div className="ap-sidebar-flag-gr"/>
        </div>
        <div className="ap-sidebar-logo">
          <div className="ap-logo-badge">
            <div className="ap-logo-icon">🏛️</div>
            <div>
              <div className="ap-logo-title">Ministry Portal</div>
              <div className="ap-logo-sub">Local Government Admin</div>
            </div>
          </div>
        </div>
        <div className="ap-sidebar-user">
          <div className="ap-sidebar-avatar">{getInitials(user?.fullName || user?.username || '')}</div>
          <div>
            <div className="ap-sidebar-user-name">{user?.fullName || user?.username}</div>
            <div className="ap-sidebar-user-role">Ministry Administrator</div>
          </div>
        </div>
        <nav className="ap-nav">
          <div className="ap-nav-section-label">Navigation</div>
          {NAV.map(item => (
            <button key={item.id} className={`ap-nav-item ${tab === item.id ? 'active' : ''}`}
              onClick={() => { setTab(item.id); setSidebarOpen(false); }}>
              <span className="ap-nav-icon">{item.icon}</span>
              {item.label}
              {item.id === 'issues' && stats.newIssues > 0 && (
                <span className="ap-nav-badge">{stats.newIssues} new</span>
              )}
              {item.id === 'reports' && reports.filter(r => r.status==='Pending').length > 0 && (
                <span className="ap-nav-badge">{reports.filter(r => r.status==='Pending').length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="ap-sidebar-footer">
          <button className="ap-logout-btn" onClick={handleLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      </aside>
      {sidebarOpen && <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:199}} onClick={() => setSidebarOpen(false)}/>}

      {/* ── Main ── */}
      <main className="ap-main">
        <div className="ap-topbar">
          <button className="ap-hamburger" onClick={() => setSidebarOpen(s => !s)} aria-label="Menu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div>
            <div className="ap-topbar-title">
              {tab === 'dashboard'   && 'Dashboard'}
              {tab === 'issues'      && 'District Issues'}
              {tab === 'projects'    && 'Project Management'}
              {tab === 'contractors' && 'Contractors'}
              {tab === 'users'       && 'MMDCE Accounts'}
              {tab === 'settings'    && 'Account Settings'}
            </div>
            <div className="ap-topbar-sub">
              {tab === 'issues'      && `${filteredIssues.length} issues · ${stats.newIssues} new today`}
              {tab === 'projects'    && `${filteredProjects.length} projects`}
              {tab === 'contractors' && `${filteredContractors.length} contractor${filteredContractors.length !== 1 ? 's' : ''}`}
              {tab === 'users'       && `${users.length} registered officials`}
            </div>
          </div>
          <div className="ap-topbar-right">
            <span className="ap-topbar-time">{new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</span>
          </div>
        </div>

        <div className="ap-body">

          {/* ═══════ DASHBOARD ═══════ */}
          {tab === 'dashboard' && (
            <>
              <div className="ap-stats-grid">
                {[
                  { label:'Total Issues',    value: stats.totalIssues,   color:'blue',   icon:'📨' },
                  { label:'New Today',       value: stats.newIssues,     color:'red',    icon:'🔔' },
                  { label:'Open Issues',     value: stats.openIssues,    color:'orange', icon:'⏳' },
                  { label:'Replied',         value: stats.repliedIssues, color:'green',  icon:'✅' },
                  { label:'Total Projects',  value: stats.totalProjects, color:'gold',   icon:'🏗️'  },
                  { label:'MMDCE Officials', value: stats.totalUsers,    color:'blue',   icon:'👥' },
                ].map(s => (
                  <div key={s.label} className={`ap-stat-card ${s.color}`}>
                    <div className="ap-stat-icon">{s.icon}</div>
                    <div className="ap-stat-value">{s.value}</div>
                    <div className="ap-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="ap-card">
                <div className="ap-card-header">
                  <div className="ap-card-title">
                    🔔 Recent Issues
                    {stats.newIssues > 0 && <span className="ap-nav-badge" style={{marginLeft:8}}>{stats.newIssues} new</span>}
                  </div>
                  <button className="ap-create-btn" style={{fontSize:12,padding:'6px 14px'}} onClick={() => setTab('issues')}>View All →</button>
                </div>
                <div>
                  {[...issues].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0,6).map(forum => {
                    const { priority } = parseForumMeta(forum);
                    const status = deriveStatus(forum);
                    return (
                      <div key={forum._id}
                        className="ap-recent-row"
                        onClick={() => { setTab('issues'); setSelIssue(forum); setReplyText(''); setReplyStatus('Replied'); }}>
                        <div className="ap-recent-stripe" style={{background: priority==='Urgent'?'#CE1126':priority==='High'?'#f97316':priority==='Medium'?'#FCD116':'#3b82f6'}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                            {isNew(forum.createdAt) && <span className="ap-new-badge">NEW</span>}
                            <span style={{fontSize:13,fontWeight:600,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{forum.title}</span>
                          </div>
                          <div style={{fontSize:11,color:'#94a3b8'}}>{forum.district} · {timeAgo(forum.createdAt)}</div>
                        </div>
                        <span className={`ap-mini-badge ${STS_CLS[status]||'ap-mini-badge-open'}`}>{status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ═══════ ISSUES ═══════ */}
          {tab === 'issues' && (
            <div className="ap-issues-layout">
              {/* Left — filter + list */}
              <div className="ap-issues-pane">
                <div className="ap-filter-bar">
                  <div className="ap-filter-row">
                    <input className="ap-filter-input" placeholder="Search issues…"
                      value={iFilter.search} onChange={e => setIFilter(p => ({...p, search: e.target.value}))}/>
                    <select className="ap-filter-select" value={iFilter.sort} onChange={e => setIFilter(p => ({...p, sort: e.target.value}))}>
                      <option value="newest">Newest first</option>
                      <option value="priority">By priority</option>
                      <option value="status">By status</option>
                    </select>
                  </div>
                  <div className="ap-filter-row">
                    <select className="ap-filter-select" value={iFilter.region}
                      onChange={e => setIFilter(p => ({...p, region: e.target.value, district:''}))}>
                      <option value="">All Regions</option>
                      {ghanaRegions.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                    </select>
                    <select className="ap-filter-select" value={iFilter.district}
                      onChange={e => setIFilter(p => ({...p, district: e.target.value}))}
                      disabled={!iFilter.region}>
                      <option value="">All Districts</option>
                      {(ghanaRegions.find(r => r.name === iFilter.region)?.districts || []).map(d =>
                        <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select className="ap-filter-select" value={iFilter.status}
                      onChange={e => setIFilter(p => ({...p, status: e.target.value}))}>
                      <option value="">All Statuses</option>
                      {['Open','Under Review','Replied','Resolved'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {loadingIssues ? <Spinner/> : filteredIssues.length === 0 ? (
                  <div className="ap-empty"><p>No issues match your filters.</p></div>
                ) : (
                  <div className="ap-issue-list">
                    {filteredIssues.map(forum => {
                      const { priority } = parseForumMeta(forum);
                      const status = deriveStatus(forum);
                      return (
                        <div key={forum._id}
                          className={`ap-issue-item ${selIssue?._id === forum._id ? 'selected' : ''}`}
                          onClick={() => { setSelIssue(forum); setReplyText(''); setReplyStatus('Replied'); }}>
                          <div className={`ap-issue-item-stripe ${STRIPE_CLS[priority]||'ap-stripe-low'}`}/>
                          <div className="ap-issue-item-inner">
                            <div className="ap-issue-item-top">
                              {isNew(forum.createdAt) && <span className="ap-new-badge">NEW</span>}
                              <span className={`ap-mini-badge ${PRI_CLS[priority]||'ap-mini-badge-low'}`}>{priority}</span>
                              <span className={`ap-mini-badge ${STS_CLS[status]||'ap-mini-badge-open'}`}>{status}</span>
                            </div>
                            <div className="ap-issue-item-title">{forum.title}</div>
                            <div className="ap-issue-item-meta">
                              <span className="ap-issue-item-district">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                {forum.district}
                              </span>
                              <span>{timeAgo(forum.createdAt)}</span>
                              {forum.comments?.length > 0 && <span>💬 {forum.comments.length}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right — detail + reply */}
              <div className="ap-detail-pane">
                {!selIssue ? (
                  <div className="ap-detail-empty">
                    <span className="ap-detail-empty-icon">📬</span>
                    <h3>Select an issue</h3>
                    <p>Click any issue on the left to view details and respond.</p>
                  </div>
                ) : (() => {
                  const { category, priority, description } = parseForumMeta(selIssue);
                  const status = deriveStatus(selIssue);
                  return (
                    <div className="ap-detail-card">
                      <div className={`ap-detail-priority-stripe ${STRIPE_CLS[priority]||'ap-stripe-low'}`}/>
                      <div className="ap-detail-header">
                        <div className="ap-detail-badges">
                          <span className={`ap-mini-badge ${PRI_CLS[priority]||'ap-mini-badge-low'}`}>{priority}</span>
                          <span className={`ap-mini-badge ${STS_CLS[status]||'ap-mini-badge-open'}`}>{status}</span>
                          <span style={{fontSize:10,background:'#f0f9ff',color:'#0369a1',border:'1px solid #bae6fd',padding:'2px 8px',borderRadius:10,fontWeight:600}}>{category}</span>
                          {isNew(selIssue.createdAt) && <span className="ap-new-badge">NEW</span>}
                        </div>
                        <h2 className="ap-detail-title">{selIssue.title}</h2>
                        <div className="ap-detail-meta">
                          <span className="ap-detail-meta-item">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            {timeAgo(selIssue.createdAt)}
                          </span>
                          <span className="ap-detail-meta-item">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            {selIssue.district}, {selIssue.region}
                          </span>
                          <span className="ap-detail-meta-item">
                            👤 {selIssue.createdBy?.username || selIssue.createdBy?.fullName || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      <div className="ap-detail-body">
                        {selIssue.imageUrl && <img src={apiUrl(selIssue.imageUrl)} alt="attachment" className="ap-detail-image"/>}
                        <p className="ap-detail-description">{description}</p>
                      </div>
                      {ministryReplies.length > 0 && (
                        <div className="ap-existing-reply">
                          <div className="ap-existing-reply-label">
                            ✅ Ministry Responses ({ministryReplies.length})
                          </div>
                          {ministryReplies.map((reply, i) => (
                            <div key={reply._id || i} style={{
                              borderTop: i > 0 ? '1px solid #bbf7d0' : 'none',
                              paddingTop: i > 0 ? '0.75rem' : 0,
                              marginTop:  i > 0 ? '0.75rem' : 0,
                            }}>
                              <div style={{fontSize:10,color:'#94a3b8',marginBottom:4}}>
                                Response {i + 1} · {reply.createdAt ? new Date(reply.createdAt).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : ''}
                              </div>
                              <p className="ap-existing-reply-text">{reply.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="ap-reply-form">
                        <div className="ap-reply-label">
                          🏛️ {ministryReplies.length > 0 ? 'Send follow-up response' : 'Send Ministry Response'}
                        </div>
                        <textarea className="ap-reply-textarea"
                          placeholder="Type the official Ministry response to this issue…"
                          value={replyText} onChange={e => setReplyText(e.target.value)}/>
                        <div className="ap-reply-footer">
                          <select className="ap-status-select" value={replyStatus} onChange={e => setReplyStatus(e.target.value)}>
                            <option value="Replied">Mark as Replied</option>
                            <option value="Under Review">Mark as Under Review</option>
                            <option value="Resolved">Mark as Resolved</option>
                            <option value="Open">Keep as Open</option>
                          </select>
                          <button className="ap-send-btn" onClick={handleSendReply} disabled={sendingReply || !replyText.trim()}>
                            {sendingReply ? (
                              <><div style={{width:13,height:13,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'ap-spin 0.8s linear infinite'}}/> Sending…</>
                            ) : (
                              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send Response</>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ═══════ PROJECTS ═══════ */}
          {tab === 'projects' && (
            <div className="ap-card">
              <div className="ap-card-header">
                <div className="ap-card-title">🏗️ All Projects</div>
                <div style={{display:'flex',gap:8}}>
                  <select className="ap-filter-select" value={pFilter.region}
                    onChange={e => { setPFilter(p => ({...p, region: e.target.value, district:''})); setProjPage(1); }}>
                    <option value="">All Regions</option>
                    {ghanaRegions.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                  </select>
                  <select className="ap-filter-select" value={pFilter.district}
                    onChange={e => { setPFilter(p => ({...p, district: e.target.value})); setProjPage(1); }}
                    disabled={!pFilter.region}>
                    <option value="">All Districts</option>
                    {(ghanaRegions.find(r => r.name === pFilter.region)?.districts || []).map(d =>
                      <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              {loadingProj ? <Spinner/> : (
                <div className="ap-projects-table-wrap">
                  <table className="ap-table">
                    <thead>
                      <tr><th>Title</th><th>Type</th><th>Status</th><th>Region / District</th><th>Submitted</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {currentProjects.map(p => (
                        <tr key={p._id}>
                          <td
                            style={{fontWeight:600,color:'#CE1126',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',cursor:'pointer',textDecoration:'underline'}}
                            onClick={() => navigate(`/project/${p._id}`)}
                            title="Click to view project details"
                          >{p.title}</td>
                          <td>{p.type}</td>
                          <td><span className={`ap-mini-badge ${p.status==='Completed'?'ap-mini-badge-replied':p.status==='Abandoned'?'ap-mini-badge-urgent':'ap-mini-badge-open'}`}>{p.status}</span></td>
                          <td style={{fontSize:12,color:'#64748b'}}>{p.region}<br/><span style={{color:'#94a3b8'}}>{p.district}</span></td>
                          <td style={{fontSize:12,color:'#94a3b8',whiteSpace:'nowrap'}}>{new Date(p.createdAt).toLocaleDateString('en-GB')}</td>
                          <td>
                            <div style={{display:'flex',gap:5}}>
                              <button
                                className="ap-action-btn"
                                style={{background:'#eff6ff',color:'#1d4ed8',borderColor:'#bfdbfe'}}
                                onClick={() => setEditProject(p)}
                              >
                                Edit
                              </button>
                              <button className="ap-action-btn" onClick={() => handleDeleteProject(p._id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {projTotalPages > 1 && (
                    <div style={{display:'flex',justifyContent:'center',gap:6,padding:'1rem'}}>
                      {Array.from({length:projTotalPages},(_,i) => (
                        <button key={i} onClick={() => setProjPage(i+1)}
                          style={{width:32,height:32,borderRadius:8,border:'1.5px solid',borderColor:projPage===i+1?'#CE1126':'#e2e8f0',background:projPage===i+1?'#CE1126':'#fff',color:projPage===i+1?'#fff':'#475569',fontWeight:600,cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}}>
                          {i+1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══════ USERS ═══════ */}
          {tab === 'users' && (
            <div className="ap-card">
              <div className="ap-card-header">
                <div className="ap-card-title">👥 MMDCE Official Accounts</div>
                <button className="ap-create-btn" onClick={() => { setShowCreate(true); setCreateErr(''); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Create Account
                </button>
              </div>
              {loadingUsers ? <Spinner/> : users.length === 0 ? (
                <div className="ap-empty"><p>No MMDCE accounts yet. Create the first one.</p></div>
              ) : (
                <div className="ap-projects-table-wrap">
                  <table className="ap-table">
                    <thead>
                      <tr><th>Official</th><th>Username</th><th>Phone</th><th>Region</th><th>District</th><th>Joined</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u._id}>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:9}}>
                              <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#CE1126,#FCD116)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff',flexShrink:0}}>
                                {getInitials(u.fullName||u.username)}
                              </div>
                              <div>
                                <div style={{fontWeight:600,color:'#0f172a',fontSize:13}}>{u.fullName}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{fontSize:12,color:'#64748b'}}>@{u.username}</td>
                          <td style={{fontSize:12,color:'#64748b'}}>{u.phone}</td>
                          <td style={{fontSize:12,color:'#64748b'}}>{u.region}</td>
                          <td style={{fontSize:12,color:'#64748b'}}>{u.district}</td>
                          <td style={{fontSize:12,color:'#94a3b8',whiteSpace:'nowrap'}}>{new Date(u.createdAt).toLocaleDateString('en-GB')}</td>
                          <td>
                            <button className="ap-action-btn" onClick={() => handleDeleteUser(u._id)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══════ CONTRACTORS ═══════ */}
          {tab === 'contractors' && (
            <>
              {/* Header row */}
              <div className="ap-contractors-header">
                <div className="ap-contractors-filters">
                  <input className="ap-filter-input" style={{width:200}}
                    placeholder="Search contractors…"
                    value={conFilter.search}
                    onChange={e => setConFilter(p => ({...p, search: e.target.value}))} />
                  <select className="ap-filter-select" value={conFilter.category}
                    onChange={e => setConFilter(p => ({...p, category: e.target.value}))}>
                    <option value="">All Categories</option>
                    {['Road & Transport','Building & Construction','Water & Sanitation',
                      'Electrical & Power','ICT & Communications','Agriculture','General']
                      .map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select className="ap-filter-select" value={conFilter.status}
                    onChange={e => setConFilter(p => ({...p, status: e.target.value}))}>
                    <option value="">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Blacklisted">Blacklisted</option>
                  </select>
                </div>
                <button className="ap-create-btn" onClick={() => { setShowOnboard(true); setOnboardStep(1); setOnboardErr(''); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Onboard Contractor
                </button>
              </div>

              {loadingCon ? <Spinner/> : filteredContractors.length === 0 ? (
                <div className="ap-empty" style={{background:'#fff',borderRadius:14,border:'1.5px dashed #e2e8f0',padding:'4rem 2rem'}}>
                  <div style={{fontSize:'3rem',marginBottom:'1rem'}}>🏢</div>
                  <p style={{fontWeight:600,color:'#475569',marginBottom:4}}>No contractors yet</p>
                  <p style={{fontSize:12,color:'#94a3b8'}}>Click "Onboard Contractor" to add the first one.</p>
                </div>
              ) : (
                <div className="ap-contractor-grid">
                  {filteredContractors.map(c => {
                    const stripeCls = c.status === 'Active' ? 'ap-contractor-stripe-active'
                      : c.status === 'Suspended' ? 'ap-contractor-stripe-suspended'
                      : 'ap-contractor-stripe-blacklisted';
                    const statusCls = c.status === 'Active' ? 'ap-contractor-status-active'
                      : c.status === 'Suspended' ? 'ap-contractor-status-suspended'
                      : 'ap-contractor-status-blacklisted';
                    return (
                      <div key={c._id} className="ap-contractor-card"
                        onClick={() => { setSelContractor(c); setProfileTab('overview'); }}>
                        <div className={`ap-contractor-card-stripe ${stripeCls}`}/>
                        <div className="ap-contractor-card-body">
                          <div className="ap-contractor-card-top">
                            <div className="ap-contractor-avatar">🏢</div>
                            <div className="ap-contractor-card-info">
                              <div className="ap-contractor-card-name">{c.companyName}</div>
                              <div className="ap-contractor-card-reg">{c.registrationNumber}</div>
                            </div>
                            <span className={`ap-contractor-status ${statusCls}`}>
                              {c.status === 'Active' ? '●' : c.status === 'Suspended' ? '⏸' : '✕'} {c.status}
                            </span>
                          </div>
                          <div className="ap-contractor-card-meta">
                            <span className="ap-contractor-chip">📁 {c.category}</span>
                            {c.district && <span className="ap-contractor-chip">📍 {c.district}</span>}
                            {c.contactPerson?.phone && <span className="ap-contractor-chip">📞 {c.contactPerson.phone}</span>}
                          </div>
                          <div className="ap-contractor-card-footer">
                            <span className="ap-contractor-doc-count">
                              📄 {c.documents?.length || 0} doc{(c.documents?.length||0) !== 1 ? 's' : ''}
                            </span>
                            <span>{c.paymentRecords?.length || 0} payment{(c.paymentRecords?.length||0) !== 1 ? 's' : ''}</span>
                            <span style={{color:'#94a3b8',fontSize:10}}>
                              {new Date(c.onboardedAt||c.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
                            </span>
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
                  <div className="ap-profile-overlay" onClick={() => setSelContractor(null)}/>
                  <div className="ap-profile-panel">
                    {/* Panel header */}
                    <div className="ap-profile-header">
                      <div className="ap-profile-flag">
                        <div className="ap-profile-flag-r"/><div className="ap-profile-flag-g"/><div className="ap-profile-flag-gr"/>
                      </div>
                      <div className="ap-profile-header-inner">
                        <div className="ap-profile-header-avatar">🏢</div>
                        <div className="ap-profile-header-info">
                          <div className="ap-profile-header-name">{selContractor.companyName}</div>
                          <div className="ap-profile-header-reg">{selContractor.registrationNumber}</div>
                          <div className="ap-profile-header-meta">
                            <span className={`ap-contractor-status ${
                              selContractor.status === 'Active' ? 'ap-contractor-status-active'
                                : selContractor.status === 'Suspended' ? 'ap-contractor-status-suspended'
                                : 'ap-contractor-status-blacklisted'}`}>
                              {selContractor.status}
                            </span>
                            <span style={{fontSize:10,color:'rgba(255,255,255,0.45)'}}>{selContractor.category}</span>
                            {selContractor.district && <span style={{fontSize:10,color:'rgba(255,255,255,0.45)'}}>📍 {selContractor.district}</span>}
                          </div>
                        </div>
                        <button className="ap-profile-close" onClick={() => setSelContractor(null)}>×</button>
                      </div>
                    </div>

                    {/* Profile inner tabs */}
                    <div className="ap-profile-tabs">
                      {[
                        { id:'overview',  label:'Overview'  },
                        { id:'documents', label:`Documents (${selContractor.documents?.length||0})` },
                        { id:'progress',  label:`Work Progress (${selContractor.workProgress?.length||0})` },
                        { id:'payments',  label:`Payments (${selContractor.paymentRecords?.length||0})` },
                      ].map(t => (
                        <button key={t.id} className={`ap-profile-tab ${profileTab===t.id?'active':''}`}
                          onClick={() => setProfileTab(t.id)}>
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Profile body */}
                    <div className="ap-profile-body">

                      {/* ── Overview ── */}
                      {profileTab === 'overview' && (
                        <>
                          <div className="ap-info-grid">
                            {[
                              { label:'Company Name',       value: selContractor.companyName },
                              { label:'Registration No.',   value: selContractor.registrationNumber },
                              { label:'Category',           value: selContractor.category },
                              { label:'Region',             value: selContractor.region || '—' },
                              { label:'District',           value: selContractor.district || '—' },
                              { label:'Address',            value: selContractor.address || '—' },
                              { label:'Contact Person',     value: selContractor.contactPerson?.name || '—' },
                              { label:'Contact Phone',      value: selContractor.contactPerson?.phone || '—' },
                              { label:'Contact Email',      value: selContractor.contactPerson?.email || '—' },
                              { label:'Onboarded',          value: new Date(selContractor.onboardedAt||selContractor.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}) },
                            ].map(item => (
                              <div key={item.label} className="ap-info-item">
                                <div className="ap-info-label">{item.label}</div>
                                <div className="ap-info-value">{item.value}</div>
                              </div>
                            ))}
                          </div>
                          {selContractor.notes && (
                            <div style={{background:'#fff',borderRadius:10,border:'1px solid #e2e8f0',padding:'1rem',marginBottom:'1rem'}}>
                              <div className="ap-info-label" style={{marginBottom:6}}>Notes</div>
                              <p style={{fontSize:13,color:'#374151',lineHeight:1.6,whiteSpace:'pre-wrap',margin:0}}>{selContractor.notes}</p>
                            </div>
                          )}
                          <div style={{background:'#fff',borderRadius:10,border:'1px solid #e2e8f0',padding:'1rem'}}>
                            <div className="ap-info-label" style={{marginBottom:8}}>Update Status</div>
                            <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                              {['Active','Suspended','Blacklisted'].map(s => (
                                <button key={s} onClick={() => handleUpdateContractorStatus(selContractor._id, s)}
                                  style={{
                                    padding:'7px 16px', borderRadius:8, border:'1.5px solid', fontWeight:600, fontSize:12, cursor:'pointer',
                                    background: selContractor.status===s ? (s==='Active'?'#006B3F':s==='Suspended'?'#f97316':'#CE1126') : '#fff',
                                    color:      selContractor.status===s ? '#fff' : '#475569',
                                    borderColor: selContractor.status===s ? 'transparent' : '#e2e8f0',
                                    transition: 'all 0.15s',
                                  }}>
                                  {s}
                                </button>
                              ))}
                              <button onClick={() => handleDeleteContractor(selContractor._id)}
                                style={{marginLeft:'auto',padding:'7px 16px',borderRadius:8,border:'1px solid #fecaca',background:'#fff5f5',color:'#CE1126',fontWeight:600,fontSize:12,cursor:'pointer'}}>
                                Remove Contractor
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {/* ── Documents ── */}
                      {profileTab === 'documents' && (
                        <>
                          <div className="ap-section-subheader">
                            <div className="ap-section-subheader-title">Uploaded Documents</div>
                          </div>
                          {(!selContractor.documents || selContractor.documents.length === 0) ? (
                            <div className="ap-empty"><p>No documents uploaded yet.</p></div>
                          ) : (
                            <div className="ap-doc-list" style={{marginBottom:'1.5rem'}}>
                              {selContractor.documents.map(doc => (
                                <div key={doc._id} className="ap-doc-row">
                                  <div className="ap-doc-icon">
                                    {doc.type === 'businessCertificate' ? '📋' : doc.type === 'taxClearance' ? '🧾' : doc.type === 'incorporation' ? '🏛️' : doc.type === 'insurance' ? '🛡️' : '📄'}
                                  </div>
                                  <div className="ap-doc-info">
                                    <div className="ap-doc-name">{doc.name}</div>
                                    <div className="ap-doc-type">{doc.type?.replace(/([A-Z])/g,' $1').trim()}</div>
                                  </div>
                                  <a className="ap-doc-download" href={apiUrl(doc.fileUrl)} target="_blank" rel="noreferrer">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    Download
                                  </a>
                                  <button className="ap-doc-delete" onClick={() => handleDeleteDoc(doc._id)} title="Remove document">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          {/* Add more documents */}
                          <div className="ap-upload-section">
                            <div className="ap-upload-section-title">📎 Upload Additional Documents</div>
                            <div className="ap-upload-form">
                              {addDocFiles.map((item, i) => (
                                <div key={i} style={{display:'flex',gap:8,alignItems:'center'}}>
                                  <div style={{flex:1,fontSize:12,color:'#475569',background:'#f8fafc',borderRadius:8,padding:'7px 10px',border:'1px solid #e2e8f0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                    {item.file.name}
                                  </div>
                                  <select className="ap-filter-select" value={item.type}
                                    onChange={e => setAddDocFiles(prev => prev.map((x,j) => j===i ? {...x, type: e.target.value} : x))}>
                                    <option value="businessCertificate">Business Certificate</option>
                                    <option value="taxClearance">Tax Clearance</option>
                                    <option value="incorporation">Incorporation</option>
                                    <option value="insurance">Insurance</option>
                                    <option value="other">Other</option>
                                  </select>
                                  <button onClick={() => setAddDocFiles(prev => prev.filter((_,j) => j!==i))}
                                    style={{background:'none',border:'none',color:'#CE1126',cursor:'pointer',fontSize:18,lineHeight:1,padding:'4px'}}>×</button>
                                </div>
                              ))}
                              <label className="ap-file-label" style={{cursor:'pointer'}}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                Click to select files (PDF, images)
                                <input type="file" className="ap-file-input" multiple accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={e => {
                                    const newFiles = Array.from(e.target.files).map(f => ({ file: f, type: 'other' }));
                                    setAddDocFiles(prev => [...prev, ...newFiles]);
                                    e.target.value = '';
                                  }}/>
                              </label>
                              {addDocFiles.length > 0 && (
                                <button className="ap-send-btn" disabled={savingDocs} onClick={handleAddDocs}>
                                  {savingDocs ? 'Uploading…' : `Upload ${addDocFiles.length} file${addDocFiles.length!==1?'s':''}`}
                                </button>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* ── Work Progress ── */}
                      {profileTab === 'progress' && (
                        <>
                          <div className="ap-section-subheader">
                            <div className="ap-section-subheader-title">Work Progress Timeline</div>
                          </div>
                          {(!selContractor.workProgress || selContractor.workProgress.length === 0) ? (
                            <div className="ap-empty" style={{marginBottom:'1.5rem'}}><p>No progress entries yet.</p></div>
                          ) : (
                            <div className="ap-progress-timeline" style={{marginBottom:'1.5rem'}}>
                              {[...selContractor.workProgress].reverse().map((entry, i) => (
                                <div key={entry._id || i} className="ap-progress-entry">
                                  <div className="ap-progress-dot">📋</div>
                                  <div className="ap-progress-content">
                                    <p className="ap-progress-desc">{entry.description}</p>
                                    <div className="ap-progress-meta">
                                      <span>📅 {new Date(entry.date||entry.uploadedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span>
                                      {entry.fileUrl && (
                                        <a href={apiUrl(entry.fileUrl)} target="_blank" rel="noreferrer"
                                          style={{color:'#0369a1',fontWeight:600,display:'flex',alignItems:'center',gap:3}}>
                                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                          {entry.fileName || 'Attachment'}
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="ap-upload-section">
                            <div className="ap-upload-section-title">➕ Add Progress Report</div>
                            <div className="ap-upload-form">
                              <textarea className="ap-reply-textarea" style={{minHeight:80}}
                                placeholder="Describe the work progress…"
                                value={progDesc} onChange={e => setProgDesc(e.target.value)}/>
                              <div className="ap-upload-row">
                                <div className="ap-form-group">
                                  <label className="ap-label">Date</label>
                                  <input type="date" className="ap-input" value={progDate} onChange={e => setProgDate(e.target.value)}/>
                                </div>
                                <div className="ap-form-group">
                                  <label className="ap-label">Attachment (optional)</label>
                                  <label className="ap-file-label">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                    {progFile ? progFile.name : 'Choose file…'}
                                    <input type="file" className="ap-file-input" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                      onChange={e => setProgFile(e.target.files[0] || null)}/>
                                  </label>
                                </div>
                              </div>
                              <div style={{display:'flex',justifyContent:'flex-end'}}>
                                <button className="ap-send-btn" disabled={savingProg || !progDesc.trim()} onClick={handleAddProgress}>
                                  {savingProg ? 'Saving…' : 'Add Progress Entry'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* ── Payments ── */}
                      {profileTab === 'payments' && (
                        <>
                          <div className="ap-section-subheader">
                            <div className="ap-section-subheader-title">Payment Records</div>
                          </div>
                          {(!selContractor.paymentRecords || selContractor.paymentRecords.length === 0) ? (
                            <div className="ap-empty" style={{marginBottom:'1.5rem'}}><p>No payment records yet.</p></div>
                          ) : (
                            <div className="ap-payment-list" style={{marginBottom:'1.5rem'}}>
                              {[...selContractor.paymentRecords].reverse().map((rec, i) => (
                                <div key={rec._id || i} className="ap-payment-card">
                                  <div className="ap-payment-card-top">
                                    <div style={{flex:1}}>
                                      <div className="ap-payment-amount">
                                        {rec.currency || 'GHS'} {Number(rec.amount).toLocaleString('en-GH',{minimumFractionDigits:2})}
                                      </div>
                                      <div className="ap-payment-desc">{rec.description}</div>
                                      <div style={{fontSize:11,color:'#94a3b8',marginTop:4}}>
                                        📅 {new Date(rec.date||rec.uploadedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
                                      </div>
                                    </div>
                                    <span className={`ap-mini-badge ${
                                      rec.status==='Paid' ? 'ap-mini-badge-replied'
                                        : rec.status==='Approved' ? 'ap-mini-badge-low'
                                        : rec.status==='Rejected' ? 'ap-mini-badge-urgent'
                                        : 'ap-mini-badge-open'}`}>
                                      {rec.status}
                                    </span>
                                  </div>
                                  {(rec.receiptUrl || rec.certUrl) && (
                                    <div className="ap-payment-card-docs">
                                      {rec.receiptUrl && (
                                        <a className="ap-doc-download" href={apiUrl(rec.receiptUrl)} target="_blank" rel="noreferrer">
                                          🧾 {rec.receiptFileName || 'Receipt'}
                                        </a>
                                      )}
                                      {rec.certUrl && (
                                        <a className="ap-doc-download" href={apiUrl(rec.certUrl)} target="_blank" rel="noreferrer">
                                          📜 {rec.certFileName || 'Certificate'}
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="ap-upload-section">
                            <div className="ap-upload-section-title">💰 Add Payment Record</div>
                            <div className="ap-upload-form">
                              <div className="ap-form-group">
                                <label className="ap-label">Description <span style={{color:'#CE1126'}}>*</span></label>
                                <input className="ap-input" placeholder="e.g. First instalment payment"
                                  value={payDesc} onChange={e => setPayDesc(e.target.value)}/>
                              </div>
                              <div className="ap-upload-row">
                                <div className="ap-form-group">
                                  <label className="ap-label">Amount (GHS) <span style={{color:'#CE1126'}}>*</span></label>
                                  <input className="ap-input" type="number" min="0" step="0.01" placeholder="0.00"
                                    value={payAmount} onChange={e => setPayAmount(e.target.value)}/>
                                </div>
                                <div className="ap-form-group">
                                  <label className="ap-label">Date</label>
                                  <input className="ap-input" type="date" value={payDate} onChange={e => setPayDate(e.target.value)}/>
                                </div>
                              </div>
                              <div className="ap-form-group">
                                <label className="ap-label">Status</label>
                                <select className="ap-select" value={payStatus} onChange={e => setPayStatus(e.target.value)}>
                                  <option value="Pending">Pending</option>
                                  <option value="Approved">Approved</option>
                                  <option value="Paid">Paid</option>
                                  <option value="Rejected">Rejected</option>
                                </select>
                              </div>
                              <div className="ap-upload-row">
                                <div className="ap-form-group">
                                  <label className="ap-label">Receipt</label>
                                  <label className="ap-file-label">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                    {payReceipt ? payReceipt.name : 'Upload receipt…'}
                                    <input type="file" className="ap-file-input" accept=".pdf,.jpg,.jpeg,.png"
                                      onChange={e => setPayReceipt(e.target.files[0] || null)}/>
                                  </label>
                                </div>
                                <div className="ap-form-group">
                                  <label className="ap-label">Certificate of Payment</label>
                                  <label className="ap-file-label">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                    {payCert ? payCert.name : 'Upload certificate…'}
                                    <input type="file" className="ap-file-input" accept=".pdf,.jpg,.jpeg,.png"
                                      onChange={e => setPayCert(e.target.files[0] || null)}/>
                                  </label>
                                </div>
                              </div>
                              <div style={{display:'flex',justifyContent:'flex-end'}}>
                                <button className="ap-send-btn" disabled={savingPay || !payDesc.trim() || !payAmount} onClick={handleAddPayment}>
                                  {savingPay ? 'Saving…' : 'Add Payment Record'}
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
            </>
          )}

          {/* ═══════ SETTINGS ═══════ */}
          {tab === 'settings' && (
            <div style={{maxWidth:540}}>
              <div className="ap-card">
                <div className="ap-card-header">
                  <div className="ap-card-title">⚙️ Account Settings</div>
                </div>
                <div style={{padding:'1.5rem'}}>
                  {/* Current admin info read-only */}
                  <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,padding:'1rem 1.25rem',marginBottom:'1.5rem',display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,#006B3F,#4ade80)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,color:'#fff',flexShrink:0}}>
                      {(user?.fullName||user?.username||'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontWeight:700,color:'#0f172a',fontSize:14}}>{user?.fullName || user?.username}</div>
                      <div style={{fontSize:11,color:'#94a3b8'}}>Ministry Administrator · @{user?.username}</div>
                    </div>
                  </div>

                  {settingsMsg.text && (
                    <div style={{
                      padding:'10px 14px', borderRadius:8, marginBottom:'1.25rem',
                      fontSize:13, fontWeight:500,
                      background: settingsMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${settingsMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                      color: settingsMsg.type === 'success' ? '#166534' : '#991b1b',
                    }}>
                      {settingsMsg.text}
                    </div>
                  )}

                  <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
                    <div className="ap-form-group">
                      <label className="ap-label">New Username</label>
                      <input className="ap-input" placeholder={`Current: @${user?.username}`}
                        value={settingsForm.username}
                        onChange={e => setSettingsForm(p => ({...p, username: e.target.value}))} />
                      <div style={{fontSize:11,color:'#94a3b8',marginTop:3}}>Leave blank to keep current username</div>
                    </div>

                    <div style={{borderTop:'1px solid #f1f5f9',paddingTop:'1rem',marginTop:'0.25rem'}}>
                      <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:'0.875rem'}}>Change Password</div>
                      <div style={{display:'flex',flexDirection:'column',gap:'0.875rem'}}>
                        <div className="ap-form-group">
                          <label className="ap-label">New Password</label>
                          <input className="ap-input" type="password" placeholder="Enter new password"
                            value={settingsForm.newPassword}
                            onChange={e => setSettingsForm(p => ({...p, newPassword: e.target.value}))} />
                        </div>
                        <div className="ap-form-group">
                          <label className="ap-label">Confirm New Password</label>
                          <input className="ap-input" type="password" placeholder="Repeat new password"
                            value={settingsForm.confirmPassword}
                            onChange={e => setSettingsForm(p => ({...p, confirmPassword: e.target.value}))} />
                        </div>
                      </div>
                    </div>

                    <div style={{display:'flex',justifyContent:'flex-end',paddingTop:'0.5rem'}}>
                      <button
                        className="ap-send-btn"
                        disabled={savingSettings}
                        onClick={async () => {
                          const adminId = user?._id || user?.id;
                          if (!adminId) return;
                          if (settingsForm.newPassword && settingsForm.newPassword !== settingsForm.confirmPassword) {
                            setSettingsMsg({ text: 'Passwords do not match.', type: 'error' });
                            return;
                          }
                          if (settingsForm.newPassword && settingsForm.newPassword.length < 6) {
                            setSettingsMsg({ text: 'Password must be at least 6 characters.', type: 'error' });
                            return;
                          }
                          setSavingSettings(true);
                          setSettingsMsg({ text:'', type:'' });
                          try {
                            const payload = {};
                            if (settingsForm.username.trim())   payload.username = settingsForm.username.trim();
                            if (settingsForm.newPassword)       payload.password = settingsForm.newPassword;
                            if (Object.keys(payload).length === 0) {
                              setSettingsMsg({ text: 'No changes to save.', type: 'error' });
                              return;
                            }
                            await axios.put(apiUrl(`/api/auth/${adminId}`), payload, { headers: hdrs });
                            setSettingsMsg({ text: 'Settings saved. Please sign in again for changes to take effect.', type: 'success' });
                            setSettingsForm({ username:'', currentPassword:'', newPassword:'', confirmPassword:'' });
                          } catch(err) {
                            setSettingsMsg({ text: err?.response?.data?.error || 'Failed to save settings.', type: 'error' });
                          } finally {
                            setSavingSettings(false);
                          }
                        }}
                      >
                        {savingSettings ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* ═══════ CITIZEN REPORTS ═══════ */}
          {tab === 'reports' && (
            <div>
              {/* Filter bar */}
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:'1.25rem'}}>
                <select className="ap-filter-select" value={rFilter.region}
                  onChange={e => setRFilter(p=>({...p,region:e.target.value,district:''}))}>
                  <option value="">All Regions</option>
                  {ghanaRegions.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                </select>
                <select className="ap-filter-select" value={rFilter.district}
                  onChange={e => setRFilter(p=>({...p,district:e.target.value}))}
                  disabled={!rFilter.region}>
                  <option value="">All Districts</option>
                  {(ghanaRegions.find(r=>r.name===rFilter.region)?.districts||[]).map(d=>
                    <option key={d} value={d}>{d}</option>)}
                </select>
                <select className="ap-filter-select" value={rFilter.status}
                  onChange={e => setRFilter(p=>({...p,status:e.target.value}))}>
                  <option value="">All Statuses</option>
                  {['Pending','Acknowledged','Escalated','Resolved'].map(s=>
                    <option key={s} value={s}>{s}</option>)}
                </select>
                <span style={{marginLeft:'auto',fontSize:12,color:'#94a3b8',alignSelf:'center'}}>
                  {reports.filter(r=>
                    (!rFilter.region   || r.projectId?.region===rFilter.region) &&
                    (!rFilter.district || r.projectId?.district===rFilter.district) &&
                    (!rFilter.status   || r.status===rFilter.status)
                  ).length} reports
                </span>
              </div>

              {loadingReports ? <Spinner/> : (() => {
                const OBS_CONFIG = {
                  progressing:  {label:'Work progressing well',  color:'#006B3F', bg:'#f0fdf4'},
                  stalled:      {label:'Work has stopped',        color:'#d97706', bg:'#fffbeb'},
                  abandoned:    {label:'Site looks abandoned',     color:'#CE1126', bg:'#fff1f2'},
                  completed:    {label:'Work appears completed',   color:'#1d4ed8', bg:'#eff6ff'},
                  poor_quality: {label:'Quality concerns',         color:'#7c3aed', bg:'#f5f3ff'},
                  other:        {label:'Other concern',            color:'#475569', bg:'#f8fafc'},
                };
                const STATUS_COLORS = {
                  Pending:      {color:'#92400e', bg:'#fef3c7'},
                  Acknowledged: {color:'#1e40af', bg:'#dbeafe'},
                  Escalated:    {color:'#991b1b', bg:'#fee2e2'},
                  Resolved:     {color:'#166534', bg:'#dcfce7'},
                };
                const filtered = reports.filter(r=>
                  (!rFilter.region   || r.projectId?.region===rFilter.region) &&
                  (!rFilter.district || r.projectId?.district===rFilter.district) &&
                  (!rFilter.status   || r.status===rFilter.status)
                );
                if (filtered.length === 0) return (
                  <div className="ap-empty"><p>No citizen reports yet.</p></div>
                );
                return (
                  <div style={{display:'flex',flexDirection:'column',gap:'0.875rem'}}>
                    {filtered.map(r => {
                      const obs = OBS_CONFIG[r.observation] || OBS_CONFIG.other;
                      const sc  = STATUS_COLORS[r.status]   || STATUS_COLORS.Pending;
                      const isNew = Date.now() - new Date(r.submittedAt).getTime() < 24*60*60*1000;
                      return (
                        <div key={r._id} style={{background:'#fff',borderRadius:14,border:'1px solid #e2e8f0',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
                          {/* Top stripe by observation */}
                          <div style={{height:4,background:obs.color}}/>
                          <div style={{padding:'1rem 1.25rem'}}>
                            {/* Header row */}
                            <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:'0.75rem',flexWrap:'wrap'}}>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4,flexWrap:'wrap'}}>
                                  {isNew && <span className="ap-new-badge">NEW</span>}
                                  <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:10,background:obs.bg,color:obs.color}}>
                                    {obs.label}
                                  </span>
                                  <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:10,background:sc.bg,color:sc.color}}>
                                    {r.status}
                                  </span>
                                </div>
                                <div style={{fontSize:14,fontWeight:700,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                  {r.projectId?.title || 'Unknown project'}
                                </div>
                                <div style={{fontSize:11,color:'#94a3b8',marginTop:2,display:'flex',gap:10,flexWrap:'wrap'}}>
                                  <span>📍 {r.projectId?.district || '—'}, {r.projectId?.region || '—'}</span>
                                  <span>🕐 {new Date(r.submittedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span>
                                  <span>📅 Window: {r.reportingPeriod}</span>
                                </div>
                              </div>
                              {r.photoUrl && (
                                <a href={apiUrl(r.photoUrl)} target="_blank" rel="noreferrer" style={{flexShrink:0}}>
                                  <img src={apiUrl(r.photoUrl)} alt="Citizen site observation"
                                    style={{width:72,height:72,objectFit:'cover',borderRadius:8,border:'1px solid #e2e8f0',display:'block'}}/>
                                </a>
                              )}
                            </div>

                            {/* Description */}
                            {r.description && (
                              <p style={{fontSize:13,color:'#374151',lineHeight:1.65,margin:'0 0 0.75rem',background:'#f8fafc',borderRadius:8,padding:'8px 12px',border:'1px solid #f1f5f9'}}>
                                "{r.description}"
                              </p>
                            )}

                            {/* Reporter */}
                            {(r.reporterName || r.reporterPhone) && (
                              <div style={{fontSize:11,color:'#94a3b8',marginBottom:'0.75rem'}}>
                                👤 {r.reporterName || 'Anonymous'}{r.reporterPhone ? ` · ${r.reporterPhone}` : ''}
                              </div>
                            )}

                            {/* Status update controls */}
                            <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center',borderTop:'1px solid #f1f5f9',paddingTop:'0.75rem'}}>
                              <span style={{fontSize:11,fontWeight:600,color:'#64748b',marginRight:4}}>Update status:</span>
                              {['Acknowledged','Escalated','Resolved'].map(s => (
                                <button key={s} disabled={r.status===s || updatingReport===r._id}
                                  onClick={async () => {
                                    setUpdatingReport(r._id);
                                    try {
                                      await axios.put(apiUrl(`/api/citizen-reports/${r._id}/status`), {status:s}, {headers:hdrs});
                                      setReports(prev => prev.map(rr => rr._id===r._id ? {...rr,status:s} : rr));
                                    } catch(e) { alert('Failed to update status.'); }
                                    finally { setUpdatingReport(null); }
                                  }}
                                  style={{padding:'5px 12px',borderRadius:7,border:'1.5px solid #e2e8f0',
                                    color: r.status===s?STATUS_COLORS[s].color:'#475569',
                                    borderColor: r.status===s?STATUS_COLORS[s].color:'#e2e8f0',
                                    background: r.status===s?STATUS_COLORS[s].bg:'#fff',
                                    fontWeight:600,fontSize:11,cursor:r.status===s?'default':'pointer',fontFamily:'inherit',
                                    opacity: r.status===s ? 1 : 0.85,
                                    transition:'all 0.15s'}}>
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

        </div>
      </main>

      {/* ── Create User Modal ── */}
      {showCreate && (
        <div className="ap-modal-overlay" onClick={e => { if(e.target===e.currentTarget) setShowCreate(false); }}>
          <div className="ap-modal">
            <div className="ap-modal-flag">
              <div className="ap-modal-flag-r"/><div className="ap-modal-flag-g"/><div className="ap-modal-flag-gr"/>
            </div>
            <div className="ap-modal-header">
              <div>
                <div className="ap-modal-title">Create MMDCE Account</div>
                <div className="ap-modal-sub">New district official login credentials</div>
              </div>
              <button className="ap-modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <form onSubmit={handleCreateUser} className="ap-modal-body">
              {createErr && (
                <div style={{background:'#fee2e2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#991b1b'}}>
                  {createErr}
                </div>
              )}
              <div className="ap-form-row">
                <div className="ap-form-group">
                  <label className="ap-label">Full Name <span>*</span></label>
                  <input className="ap-input" placeholder="e.g. Kofi Mensah" value={uForm.fullName} onChange={e => setUForm(p=>({...p,fullName:e.target.value}))} required/>
                </div>
                <div className="ap-form-group">
                  <label className="ap-label">Phone <span>*</span></label>
                  <input className="ap-input" placeholder="+233XXXXXXXXX" value={uForm.phone} onChange={e => setUForm(p=>({...p,phone:e.target.value}))} required/>
                </div>
              </div>
              <div className="ap-form-row">
                <div className="ap-form-group">
                  <label className="ap-label">Username <span>*</span></label>
                  <input className="ap-input" placeholder="unique username" value={uForm.username} onChange={e => setUForm(p=>({...p,username:e.target.value}))} required/>
                </div>
                <div className="ap-form-group">
                  <label className="ap-label">Password <span>*</span></label>
                  <input className="ap-input" type="password" placeholder="Min 6 characters" value={uForm.password} onChange={e => setUForm(p=>({...p,password:e.target.value}))} required minLength={6}/>
                </div>
              </div>
              <div className="ap-form-row">
                <div className="ap-form-group">
                  <label className="ap-label">Region <span>*</span></label>
                  <select className="ap-select" value={uForm.region} onChange={e => setUForm(p=>({...p,region:e.target.value,district:''}))} required>
                    <option value="">Select Region</option>
                    {ghanaRegions.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                  </select>
                </div>
                <div className="ap-form-group">
                  <label className="ap-label">District <span>*</span></label>
                  <select className="ap-select" value={uForm.district} onChange={e => setUForm(p=>({...p,district:e.target.value}))} required disabled={!uForm.region}>
                    <option value="">Select District</option>
                    {(ghanaRegions.find(r=>r.name===uForm.region)?.districts||[]).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="ap-modal-footer">
                <button type="button" className="ap-modal-cancel" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="ap-modal-submit" disabled={creating}>
                  {creating ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Edit Project Modal ── */}
      {editProject && (
        <AdminEditProjectModal
          project={editProject}
          hdrs={hdrs}
          ghanaRegions={ghanaRegions}
          apiUrl={apiUrl}
          onClose={() => setEditProject(null)}
          onSaved={(updated) => {
            setProjects(prev => prev.map(p => p._id === updated._id ? updated : p));
            setEditProject(null);
          }}
        />
      )}

      {/* ── Onboard Contractor Modal ── */}
      {showOnboard && (
        <div className="ap-modal-overlay" onClick={e => { if(e.target===e.currentTarget){ setShowOnboard(false); setOnboardStep(1); }}}>
          <div className="ap-modal" style={{maxWidth:600}}>
            <div className="ap-modal-flag">
              <div className="ap-modal-flag-r"/><div className="ap-modal-flag-g"/><div className="ap-modal-flag-gr"/>
            </div>
            <div className="ap-modal-header">
              <div>
                <div className="ap-modal-title">Onboard Contractor</div>
                <div className="ap-modal-sub">
                  Step {onboardStep} of 2 — {onboardStep===1 ? 'Company Details' : 'Documents & Files'}
                </div>
              </div>
              <button className="ap-modal-close" onClick={() => { setShowOnboard(false); setOnboardStep(1); }}>×</button>
            </div>

            {/* Step indicator */}
            <div style={{display:'flex',gap:0,borderBottom:'1px solid #f1f5f9'}}>
              {['Company Details','Documents & Files'].map((label,i) => (
                <div key={i} style={{
                  flex:1, padding:'10px 16px', fontSize:12, fontWeight:600, textAlign:'center',
                  borderBottom: onboardStep===i+1 ? '2px solid #CE1126' : '2px solid transparent',
                  color: onboardStep===i+1 ? '#CE1126' : '#94a3b8',
                  background: onboardStep===i+1 ? '#fff8f8' : 'transparent',
                  transition:'all 0.2s',
                }}>
                  <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:18,height:18,borderRadius:'50%',background:onboardStep===i+1?'#CE1126':'#e2e8f0',color:onboardStep===i+1?'#fff':'#94a3b8',fontSize:10,fontWeight:700,marginRight:6}}>
                    {i+1}
                  </span>
                  {label}
                </div>
              ))}
            </div>

            <div className="ap-modal-body">
              {onboardErr && (
                <div style={{background:'#fee2e2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#991b1b',marginBottom:'0.5rem'}}>
                  {onboardErr}
                </div>
              )}

              {/* ── Step 1: Company Details ── */}
              {onboardStep === 1 && (
                <>
                  <div className="ap-form-row">
                    <div className="ap-form-group">
                      <label className="ap-label">Company Name <span>*</span></label>
                      <input className="ap-input" placeholder="e.g. Accra Build Ltd"
                        value={onboardForm.companyName}
                        onChange={e => setOnboardForm(p=>({...p,companyName:e.target.value}))}/>
                    </div>
                    <div className="ap-form-group">
                      <label className="ap-label">Registration No. <span>*</span></label>
                      <input className="ap-input" placeholder="e.g. BN-2024-00123"
                        value={onboardForm.registrationNumber}
                        onChange={e => setOnboardForm(p=>({...p,registrationNumber:e.target.value}))}/>
                    </div>
                  </div>
                  <div className="ap-form-row">
                    <div className="ap-form-group">
                      <label className="ap-label">Category <span>*</span></label>
                      <select className="ap-select" value={onboardForm.category}
                        onChange={e => setOnboardForm(p=>({...p,category:e.target.value}))}>
                        <option value="">Select category</option>
                        {['Road & Transport','Building & Construction','Water & Sanitation',
                          'Electrical & Power','ICT & Communications','Agriculture','General']
                          .map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="ap-form-group">
                      <label className="ap-label">Status</label>
                      <select className="ap-select" value={onboardForm.status}
                        onChange={e => setOnboardForm(p=>({...p,status:e.target.value}))}>
                        <option value="Active">Active</option>
                        <option value="Suspended">Suspended</option>
                        <option value="Blacklisted">Blacklisted</option>
                      </select>
                    </div>
                  </div>
                  <div className="ap-form-row">
                    <div className="ap-form-group">
                      <label className="ap-label">Contact Person</label>
                      <input className="ap-input" placeholder="Full name"
                        value={onboardForm.contactName}
                        onChange={e => setOnboardForm(p=>({...p,contactName:e.target.value}))}/>
                    </div>
                    <div className="ap-form-group">
                      <label className="ap-label">Contact Phone</label>
                      <input className="ap-input" placeholder="+233XXXXXXXXX"
                        value={onboardForm.contactPhone}
                        onChange={e => setOnboardForm(p=>({...p,contactPhone:e.target.value}))}/>
                    </div>
                  </div>
                  <div className="ap-form-group">
                    <label className="ap-label">Contact Email</label>
                    <input className="ap-input" type="email" placeholder="contractor@email.com"
                      value={onboardForm.contactEmail}
                      onChange={e => setOnboardForm(p=>({...p,contactEmail:e.target.value}))}/>
                  </div>
                  <div className="ap-form-group">
                    <label className="ap-label">Physical Address</label>
                    <input className="ap-input" placeholder="Street / Town"
                      value={onboardForm.address}
                      onChange={e => setOnboardForm(p=>({...p,address:e.target.value}))}/>
                  </div>
                  <div className="ap-form-row">
                    <div className="ap-form-group">
                      <label className="ap-label">Region</label>
                      <select className="ap-select" value={onboardForm.region}
                        onChange={e => setOnboardForm(p=>({...p,region:e.target.value,district:''}))}>
                        <option value="">Select Region</option>
                        {ghanaRegions.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                      </select>
                    </div>
                    <div className="ap-form-group">
                      <label className="ap-label">District</label>
                      <select className="ap-select" value={onboardForm.district}
                        onChange={e => setOnboardForm(p=>({...p,district:e.target.value}))}
                        disabled={!onboardForm.region}>
                        <option value="">Select District</option>
                        {(ghanaRegions.find(r=>r.name===onboardForm.region)?.districts||[]).map(d =>
                          <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="ap-form-group">
                    <label className="ap-label">Notes</label>
                    <textarea className="ap-reply-textarea" style={{minHeight:70}}
                      placeholder="Any additional information about this contractor…"
                      value={onboardForm.notes}
                      onChange={e => setOnboardForm(p=>({...p,notes:e.target.value}))}/>
                  </div>
                  <div className="ap-modal-footer">
                    <button className="ap-modal-cancel" onClick={() => setShowOnboard(false)}>Cancel</button>
                    <button className="ap-modal-submit"
                      disabled={!onboardForm.companyName || !onboardForm.registrationNumber || !onboardForm.category}
                      onClick={() => { setOnboardErr(''); setOnboardStep(2); }}>
                      Next: Upload Documents →
                    </button>
                  </div>
                </>
              )}

              {/* ── Step 2: Documents ── */}
              {onboardStep === 2 && (
                <>
                  <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,padding:'10px 14px',marginBottom:'1rem',fontSize:13,color:'#166534'}}>
                    ✅ Company details saved. Now upload supporting documents (optional — can be added later).
                  </div>

                  {onboardFiles.length > 0 && (
                    <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:'1rem'}}>
                      {onboardFiles.map((item,i) => (
                        <div key={i} style={{display:'flex',gap:8,alignItems:'center',background:'#f8fafc',borderRadius:8,padding:'8px 10px',border:'1px solid #e2e8f0'}}>
                          <span style={{fontSize:16}}>📄</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:600,color:'#374151',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.file.name}</div>
                            <div style={{fontSize:10,color:'#94a3b8'}}>{(item.file.size/1024).toFixed(1)} KB</div>
                          </div>
                          <select className="ap-filter-select" style={{width:160}} value={item.type}
                            onChange={e => setOnboardFiles(prev => prev.map((x,j) => j===i ? {...x,type:e.target.value} : x))}>
                            <option value="businessCertificate">Business Certificate</option>
                            <option value="taxClearance">Tax Clearance</option>
                            <option value="incorporation">Incorporation</option>
                            <option value="insurance">Insurance</option>
                            <option value="other">Other</option>
                          </select>
                          <button onClick={() => setOnboardFiles(prev => prev.filter((_,j) => j!==i))}
                            style={{background:'none',border:'none',color:'#CE1126',cursor:'pointer',fontSize:20,lineHeight:1,padding:'2px 4px',flexShrink:0}}>×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,padding:'2rem',border:'2px dashed #e2e8f0',borderRadius:12,cursor:'pointer',background:'#f8fafc',transition:'border-color 0.2s'}}
                    onMouseEnter={e => e.currentTarget.style.borderColor='#CE1126'}
                    onMouseLeave={e => e.currentTarget.style.borderColor='#e2e8f0'}>
                    <span style={{fontSize:'2rem'}}>📎</span>
                    <span style={{fontSize:13,fontWeight:600,color:'#475569'}}>Click to select documents</span>
                    <span style={{fontSize:11,color:'#94a3b8'}}>PDF, JPG, PNG — Business certificates, tax clearance, incorporation docs</span>
                    <input type="file" style={{display:'none'}} multiple accept=".pdf,.jpg,.jpeg,.png"
                      onChange={e => {
                        const newFiles = Array.from(e.target.files).map(f => ({file:f, type:'businessCertificate'}));
                        setOnboardFiles(prev => [...prev, ...newFiles]);
                        e.target.value = '';
                      }}/>
                  </label>

                  <div className="ap-modal-footer" style={{marginTop:'1rem'}}>
                    <button className="ap-modal-cancel" onClick={() => setOnboardStep(1)}>← Back</button>
                    <button className="ap-modal-submit" disabled={onboarding} onClick={handleOnboardSubmit}>
                      {onboarding ? 'Onboarding…' : `Finish — Onboard Contractor${onboardFiles.length > 0 ? ` (${onboardFiles.length} file${onboardFiles.length!==1?'s':''})` : ''}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;