// // PetitionActionButton.js
// // Add this component to your project detail pages

// import React, { useState, useEffect, useContext } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { AuthContext } from '../context/AuthContext';
// import { FileSignature, Users, TrendingUp } from 'lucide-react';
// import '../css/petition-action-button.css';

// const PetitionActionButton = ({ projectId, projectName }) => {
//   const navigate = useNavigate();
//   const { user } = useContext(AuthContext);
//   const [petition, setPetition] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [hasSigned, setHasSigned] = useState(false);

//   useEffect(() => {
//     checkPetitionStatus();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [projectId, user]);

//   const checkPetitionStatus = async () => {
//     try {
//       const response = await fetch(`/api/petitions/project/${projectId}`);
//       if (response.ok) {
//         const data = await response.json();
//         setPetition(data);

//         // Check if user has signed
//         if (user) {
//           const hasSignedRes = await fetch(
//             `/api/petitions/${data._id}/has-signed`,
//             { headers: { Authorization: `Bearer ${user.token}` } }
//           );
//           const { hasSigned: signed } = await hasSignedRes.json();
//           setHasSigned(signed);
//         }
//       }
//       setLoading(false);
//     } catch (error) {
//       console.error('Error checking petition:', error);
//       setLoading(false);
//     }
//   };

//   const handlePetitionClick = () => {
//     if (!user) {
//       navigate('/login');
//       return;
//     }
    
//     // Navigate to petition page
//     navigate(`/project/${projectId}/petition`);
//   };

//   const getProgressPercentage = () => {
//     if (!petition) return 0;
//     return Math.min(
//       ((petition.signatures.length / petition.targetSignatures) * 100),
//       100
//     ).toFixed(0);
//   };

//   if (loading) {
//     return null;
//   }

//   return (
//     <div className="petition-action-container">
//       {!petition ? (
//         // No petition exists - show "Start Petition" button
//         <div className="petition-cta-card">
//           <div className="petition-cta-header">
//             <FileSignature size={32} />
//             <h3>Demand Accountability</h3>
//           </div>
//           <p>Start a petition to demand the completion of this abandoned project</p>
//           <button 
//             className="btn-start-petition"
//             onClick={handlePetitionClick}
//           >
//             <FileSignature size={20} />
//             Start a Petition
//           </button>
//         </div>
//       ) : (
//         // Petition exists - show status and sign button
//         <div className="petition-status-card">
//           <div className="petition-status-header">
//             <div className="petition-icon-badge">
//               <FileSignature size={24} />
//             </div>
//             <div>
//               <h3>Active Petition</h3>
//               <p className="petition-title-mini">{petition.title}</p>
//             </div>
//           </div>

//           <div className="petition-mini-stats">
//             <div className="mini-stat">
//               <Users size={20} />
//               <div>
//                 <strong>{petition.signatures.length.toLocaleString()}</strong>
//                 <span>signed</span>
//               </div>
//             </div>
//             <div className="mini-stat">
//               <TrendingUp size={20} />
//               <div>
//                 <strong>{getProgressPercentage()}%</strong>
//                 <span>of goal</span>
//               </div>
//             </div>
//           </div>

//           <div className="mini-progress-bar">
//             <div 
//               className="mini-progress-fill"
//               style={{ width: `${getProgressPercentage()}%` }}
//             ></div>
//           </div>

//           {hasSigned ? (
//             <button 
//               className="btn-view-petition"
//               onClick={handlePetitionClick}
//             >
//               View Petition & Share
//             </button>
//           ) : (
//             <button 
//               className="btn-sign-petition-mini"
//               onClick={handlePetitionClick}
//             >
//               Sign This Petition
//             </button>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// export default PetitionActionButton;