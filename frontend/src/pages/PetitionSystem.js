// import React, { useState, useContext, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import { AuthContext } from '../context/AuthContext';
// import { Share2, Users, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
// import '../css/petition.css';

// const PetitionSystem = () => {
//   const { projectId } = useParams();
//   const navigate = useNavigate();
//   const { user } = useContext(AuthContext);
  
//   const [project, setProject] = useState(null);
//   const [petition, setPetition] = useState(null);
//   const [hasSigned, setHasSigned] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [showShareMenu, setShowShareMenu] = useState(false);
//   const [signingInProgress, setSigningInProgress] = useState(false);

//   useEffect(() => {
//     fetchProjectAndPetition();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [projectId]);

//   const fetchProjectAndPetition = async () => {
//     try {
//       // Fetch project details
//       const projectRes = await fetch(`/api/projects/${projectId}`);
//       const projectData = await projectRes.json();
//       setProject(projectData);

//       // Fetch petition if exists
//       const petitionRes = await fetch(`/api/petitions/project/${projectId}`);
//       if (petitionRes.ok) {
//         const petitionData = await petitionRes.json();
//         setPetition(petitionData);
        
//         // Check if user has signed
//         if (user) {
//           const hasSignedRes = await fetch(
//             `/api/petitions/${petitionData._id}/has-signed`,
//             { headers: { Authorization: `Bearer ${user.token}` } }
//           );
//           const { hasSigned } = await hasSignedRes.json();
//           setHasSigned(hasSigned);
//         }
//       }
//       setLoading(false);
//     } catch (error) {
//       console.error('Error fetching data:', error);
//       setLoading(false);
//     }
//   };

//   const createPetition = async () => {
//     if (!user) {
//       navigate('/login');
//       return;
//     }

//     try {
//       const response = await fetch('/api/petitions/create', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${user.token}`
//         },
//         body: JSON.stringify({
//           projectId: project._id,
//           title: `Complete ${project.name}`,
//           description: `We, the undersigned citizens of Ghana, call for the immediate completion of ${project.name} in ${project.location}. This project has been abandoned and represents a significant waste of public resources. We demand accountability and action.`,
//           targetSignatures: 1000
//         })
//       });

//       if (response.ok) {
//         const newPetition = await response.json();
//         setPetition(newPetition);
//         setHasSigned(true);
//       }
//     } catch (error) {
//       console.error('Error creating petition:', error);
//     }
//   };

//   const signPetition = async () => {
//     if (!user) {
//       navigate('/login');
//       return;
//     }

//     setSigningInProgress(true);
//     try {
//       const response = await fetch(`/api/petitions/${petition._id}/sign`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${user.token}`
//         },
//         body: JSON.stringify({
//           name: user.name,
//           email: user.email,
//           location: user.location || ''
//         })
//       });

//       if (response.ok) {
//         setHasSigned(true);
//         fetchProjectAndPetition(); // Refresh data
//       }
//     } catch (error) {
//       console.error('Error signing petition:', error);
//     } finally {
//       setSigningInProgress(false);
//     }
//   };

//   const generateAdvocacyMessage = (platform) => {
//     const projectName = project?.name || 'abandoned project';
//     const location = project?.location || 'Ghana';
//     const signatureCount = petition?.signatures?.length || 0;
//     const url = `https://abandonedghana.org/petition/${petition?._id}`;

//     const messages = {
//       twitter: `🚨 ${signatureCount} citizens demand completion of ${projectName} in ${location}! Join us in holding our leaders accountable. #CompleteNotStart #AbandonedGhana #Accountability\n\n${url}`,
      
//       facebook: `🇬🇭 SIGN THE PETITION!\n\n${signatureCount} Ghanaians are demanding the completion of ${projectName} in ${location}.\n\nThis abandoned project is a waste of our tax money and denies our communities vital infrastructure.\n\n✊ Join us in demanding accountability!\n🖊️ Sign the petition: ${url}\n\n#CompleteNotStart #AbandonedGhana #GhanaAccountability`,
      
//       whatsapp: `🇬🇭 *PETITION ALERT*\n\n${signatureCount} people have signed!\n\nWe're demanding completion of *${projectName}* in ${location}.\n\nOur tax money should not be wasted on abandoned projects!\n\n👉 Sign here: ${url}\n\n_Share to spread awareness!_`,
      
//       linkedin: `${signatureCount} concerned citizens are demanding accountability for ${projectName} in ${location}.\n\nAbandoned government projects represent:\n• Wasted public funds\n• Broken promises to communities\n• Economic opportunity losses\n• Erosion of public trust\n\nJoin us in demanding completion, not just commencement.\n\nSign the petition: ${url}\n\n#PublicAccountability #GoodGovernance #Ghana`
//     };

//     return messages[platform];
//   };

//   const shareOnPlatform = (platform) => {
//     const message = generateAdvocacyMessage(platform);
//     const url = `https://abandonedghana.org/petition/${petition._id}`;
    
//     let shareUrl;
//     switch (platform) {
//       case 'twitter':
//         shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
//         break;
//       case 'facebook':
//         shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(message)}`;
//         break;
//       case 'whatsapp':
//         shareUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
//         break;
//       case 'linkedin':
//         shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
//         break;
//       default:
//         return;
//     }
    
//     window.open(shareUrl, '_blank', 'width=600,height=400');
//     setShowShareMenu(false);
//   };

//   const copyToClipboard = () => {
//     const message = generateAdvocacyMessage('whatsapp');
//     navigator.clipboard.writeText(message);
//     alert('Advocacy message copied! Paste it anywhere to share.');
//     setShowShareMenu(false);
//   };

//   const getProgressPercentage = () => {
//     if (!petition) return 0;
//     const target = petition.targetSignatures || 1000;
//     const current = petition.signatures?.length || 0;
//     return Math.min((current / target) * 100, 100);
//   };

//   if (loading) {
//     return <div className="petition-loading">Loading petition...</div>;
//   }

//   if (!project) {
//     return <div className="petition-error">Project not found</div>;
//   }

//   return (
//     <div className="petition-container">
//       <div className="petition-header">
//         <h1>Petition to Complete Project</h1>
//         <p className="project-name">{project.name}</p>
//         <p className="project-location">📍 {project.location}</p>
//       </div>

//       {!petition ? (
//         <div className="no-petition">
//           <AlertCircle size={48} />
//           <h2>No Active Petition</h2>
//           <p>Be the first to start a petition for this abandoned project!</p>
//           <button className="btn-create-petition" onClick={createPetition}>
//             Start Petition
//           </button>
//         </div>
//       ) : (
//         <div className="petition-content">
//           {/* Progress Section */}
//           <div className="petition-progress">
//             <div className="progress-stats">
//               <div className="stat">
//                 <Users size={24} />
//                 <div>
//                   <h3>{petition.signatures?.length || 0}</h3>
//                   <p>Signatures</p>
//                 </div>
//               </div>
//               <div className="stat">
//                 <TrendingUp size={24} />
//                 <div>
//                   <h3>{petition.targetSignatures || 1000}</h3>
//                   <p>Goal</p>
//                 </div>
//               </div>
//             </div>
            
//             <div className="progress-bar-container">
//               <div 
//                 className="progress-bar-fill" 
//                 style={{ width: `${getProgressPercentage()}%` }}
//               ></div>
//             </div>
//             <p className="progress-text">
//               {getProgressPercentage().toFixed(1)}% of goal reached
//             </p>
//           </div>

//           {/* Petition Description */}
//           <div className="petition-description">
//             <h2>Why This Matters</h2>
//             <p>{petition.description}</p>
            
//             <div className="petition-demands">
//               <h3>Our Demands:</h3>
//               <ul>
//                 <li>Immediate investigation into why this project was abandoned</li>
//                 <li>Public disclosure of funds allocated and spent</li>
//                 <li>Timeline for project completion</li>
//                 <li>Accountability for responsible officials</li>
//               </ul>
//             </div>
//           </div>

//           {/* Action Buttons */}
//           <div className="petition-actions">
//             {!hasSigned ? (
//               <button 
//                 className="btn-sign-petition" 
//                 onClick={signPetition}
//                 disabled={signingInProgress}
//               >
//                 {signingInProgress ? 'Signing...' : 'Sign This Petition'}
//               </button>
//             ) : (
//               <div className="signed-confirmation">
//                 <CheckCircle size={24} />
//                 <span>You've signed this petition!</span>
//               </div>
//             )}

//             <div className="share-section">
//               <button 
//                 className="btn-share"
//                 onClick={() => setShowShareMenu(!showShareMenu)}
//               >
//                 <Share2 size={20} />
//                 Share Petition
//               </button>

//               {showShareMenu && (
//                 <div className="share-menu">
//                   <button onClick={() => shareOnPlatform('whatsapp')}>
//                     Share on WhatsApp
//                   </button>
//                   <button onClick={() => shareOnPlatform('facebook')}>
//                     Share on Facebook
//                   </button>
//                   <button onClick={() => shareOnPlatform('twitter')}>
//                     Share on Twitter
//                   </button>
//                   <button onClick={() => shareOnPlatform('linkedin')}>
//                     Share on LinkedIn
//                   </button>
//                   <button onClick={copyToClipboard}>
//                     Copy Message
//                   </button>
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Recent Signatures */}
//           <div className="recent-signatures">
//             <h3>Recent Signatures</h3>
//             <div className="signatures-list">
//               {petition.signatures?.slice(-10).reverse().map((sig, index) => (
//                 <div key={index} className="signature-item">
//                   <div className="signature-avatar">
//                     {sig.name.charAt(0).toUpperCase()}
//                   </div>
//                   <div className="signature-info">
//                     <p className="signature-name">{sig.name}</p>
//                     <p className="signature-location">{sig.location || 'Ghana'}</p>
//                   </div>
//                   <p className="signature-date">
//                     {new Date(sig.signedAt).toLocaleDateString()}
//                   </p>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default PetitionSystem;