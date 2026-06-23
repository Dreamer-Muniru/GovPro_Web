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

const NAV = [
  { id:'dashboard', label:'Dashboard',   icon:'📊' },
  { id:'issues',    label:'Issues',      icon:'📨' },
  { id:'projects',  label:'Projects',    icon:'🏗️'  },
  { id:'users',     label:'MMDCE Users', icon:'👥' },
  { id:'settings',  label:'Settings',    icon:'⚙️'  },
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

  useEffect(() => { fetchIssues(); fetchProjects(); fetchUsers(); }, [fetchIssues, fetchProjects, fetchUsers]);

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
              {tab === 'dashboard' && 'Dashboard'}
              {tab === 'issues'    && 'District Issues'}
              {tab === 'projects'  && 'Project Management'}
              {tab === 'users'     && 'MMDCE Accounts'}
              {tab === 'settings'  && 'Account Settings'}
            </div>
            <div className="ap-topbar-sub">
              {tab === 'issues'   && `${filteredIssues.length} issues · ${stats.newIssues} new today`}
              {tab === 'projects' && `${filteredProjects.length} projects`}
              {tab === 'users'    && `${users.length} registered officials`}
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
                                onClick={() => navigate(`/edit/${p._id}`)}
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
    </div>
  );
};

export default AdminPanel;