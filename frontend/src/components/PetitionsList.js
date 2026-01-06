// import React, { useState, useEffect } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { TrendingUp, Users, MapPin, Clock, Filter, Search, PlusCircle } from 'lucide-react';
// import '../css/petitions-list.css';

// const PetitionsList = () => {
//   const navigate = useNavigate();
//   const [petitions, setPetitions] = useState([]);
//   const [filteredPetitions, setFilteredPetitions] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [sortBy, setSortBy] = useState('recent');
//   const [filterStatus, setFilterStatus] = useState('all');

//   useEffect(() => {
//     fetchPetitions();
//   }, []);

//   useEffect(() => {
//     filterAndSortPetitions();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [searchTerm, sortBy, filterStatus, petitions]);

//   const fetchPetitions = async () => {
//     try {
//       const response = await fetch('/api/petitions');
//       const data = await response.json();
//       setPetitions(data);
//       setLoading(false);
//     } catch (error) {
//       console.error('Error fetching petitions:', error);
//       setLoading(false);
//     }
//   };

//   const filterAndSortPetitions = () => {
//     let filtered = [...petitions];

//     // Apply search filter
//     if (searchTerm) {
//       filtered = filtered.filter(petition =>
//         petition.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         petition.project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         petition.project?.location.toLowerCase().includes(searchTerm.toLowerCase())
//       );
//     }

//     // Apply status filter
//     if (filterStatus !== 'all') {
//       filtered = filtered.filter(petition => petition.status === filterStatus);
//     }

//     // Apply sorting
//     filtered.sort((a, b) => {
//       switch (sortBy) {
//         case 'signatures':
//           return b.signatures.length - a.signatures.length;
//         case 'progress':
//           const progressA = (a.signatures.length / a.targetSignatures) * 100;
//           const progressB = (b.signatures.length / b.targetSignatures) * 100;
//           return progressB - progressA;
//         case 'recent':
//         default:
//           return new Date(b.createdAt) - new Date(a.createdAt);
//       }
//     });

//     setFilteredPetitions(filtered);
//   };

//   const getProgressPercentage = (petition) => {
//     return Math.min(
//       ((petition.signatures.length / petition.targetSignatures) * 100).toFixed(1),
//       100
//     );
//   };

//   const getStatusBadge = (status) => {
//     const badges = {
//       active: { text: 'Active', color: '#10b981' },
//       completed: { text: 'Target Reached', color: '#FCD116' },
//       successful: { text: 'Successful', color: '#006B3F' },
//       archived: { text: 'Archived', color: '#6b7280' }
//     };
//     return badges[status] || badges.active;
//   };

//   if (loading) {
//     return <div className="petitions-loading">Loading petitions...</div>;
//   }

//   return (
//     <div className="petitions-list-container">
//       <div className="petitions-header">
//         <div className="header-content">
//           <h1>Active Petitions</h1>
//           <p>Join thousands of Ghanaians demanding accountability for abandoned projects</p>
//           <button 
//             className="btn-create-new-petition"
//             onClick={() => navigate('/')}
//           >
//             <PlusCircle size={20} />
//             Browse Projects to Start a Petition
//           </button>
//         </div>
        
//         <div className="petitions-stats">
//           <div className="stat-card">
//             <Users size={32} />
//             <div>
//               <h3>{petitions.reduce((sum, p) => sum + p.signatures.length, 0).toLocaleString()}</h3>
//               <p>Total Signatures</p>
//             </div>
//           </div>
//           <div className="stat-card">
//             <TrendingUp size={32} />
//             <div>
//               <h3>{petitions.filter(p => p.status === 'active').length}</h3>
//               <p>Active Petitions</p>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Filters and Search */}
//       <div className="petitions-controls">
//         <div className="search-bar">
//           <Search size={20} />
//           <input
//             type="text"
//             placeholder="Search petitions by name, location..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//           />
//         </div>

//         <div className="filters">
//           <div className="filter-group">
//             <Filter size={16} />
//             <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
//               <option value="recent">Most Recent</option>
//               <option value="signatures">Most Signatures</option>
//               <option value="progress">Closest to Goal</option>
//             </select>
//           </div>

//           <div className="filter-group">
//             <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
//               <option value="all">All Status</option>
//               <option value="active">Active</option>
//               <option value="completed">Target Reached</option>
//               <option value="successful">Successful</option>
//             </select>
//           </div>
//         </div>
//       </div>

//       {/* Petitions Grid */}
//       <div className="petitions-grid">
//         {filteredPetitions.length === 0 ? (
//           <div className="no-petitions">
//             <p>No petitions found matching your criteria.</p>
//           </div>
//         ) : (
//           filteredPetitions.map((petition) => {
//             const statusBadge = getStatusBadge(petition.status);
//             const progress = getProgressPercentage(petition);

//             return (
//               <Link
//                 key={petition._id}
//                 to={`/petition/${petition._id}`}
//                 className="petition-card"
//               >
//                 <div className="petition-card-header">
//                   <span 
//                     className="status-badge"
//                     style={{ backgroundColor: statusBadge.color }}
//                   >
//                     {statusBadge.text}
//                   </span>
//                   <span className="petition-date">
//                     <Clock size={14} />
//                     {new Date(petition.createdAt).toLocaleDateString()}
//                   </span>
//                 </div>

//                 <h3 className="petition-title">{petition.title}</h3>
                
//                 <div className="project-info">
//                   <p className="project-name">{petition.project?.name}</p>
//                   <p className="project-location">
//                     <MapPin size={14} />
//                     {petition.project?.location}
//                   </p>
//                 </div>

//                 <p className="petition-excerpt">
//                   {petition.description.slice(0, 120)}...
//                 </p>

//                 <div className="petition-progress">
//                   <div className="progress-header">
//                     <span className="signatures-count">
//                       <Users size={16} />
//                       {petition.signatures.length.toLocaleString()} signed
//                     </span>
//                     <span className="progress-percentage">{progress}%</span>
//                   </div>
//                   <div className="progress-bar">
//                     <div 
//                       className="progress-fill"
//                       style={{ width: `${progress}%` }}
//                     />
//                   </div>
//                   <p className="progress-target">
//                     Goal: {petition.targetSignatures.toLocaleString()} signatures
//                   </p>
//                 </div>

//                 <button className="btn-view-petition">
//                   View & Sign Petition
//                 </button>
//               </Link>
//             );
//           })
//         )}
//       </div>
//     </div>
//   );
// };

// export default PetitionsList;