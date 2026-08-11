import { BrowserRouter as Router, Routes, Navigate, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
// import HomePage from './pages/HomePage';
import AddProjectForm from './components/AddProjectForm';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProjectDetail from './pages/ProjectDetail';
import AdminPanel from './pages/AdminPanel';
import EditProject from './pages/EditProject';
import { AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import AdminLogin from './pages/AdminLogin';
import { ToastContainer } from 'react-toastify';
// import ProjectInsights from './pages/ProjectInsights';
import CreateForum from './pages/CreateForum';
import ForumDetail from './pages/ForumDetail';
// import ForumFeed from './components/ForumFeed';
// import ProfilePage from './pages/ProfilePage';
import CitizenReportPage from './pages/CitizenReportPage';
import OfflineSyncBanner from './components/OfflineSyncBanner';
import { useOfflineSync } from './utils/useOfflineSync';

const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  // Redirect to the new hidden admin login URL
  return user?.isAdmin ? children : <Navigate to="/ministry-portal/auth" />;
};

function App() {
  const { isOnline, pending, syncing, syncNow } = useOfflineSync();

  return (
    <Router>
      <AppShell
        isOnline={isOnline} pending={pending}
        syncing={syncing} syncNow={syncNow}
      />
    </Router>
  );
}

// Separate component so useLocation can be called inside <Router>
function AppShell({ isOnline, pending, syncing, syncNow }) {
  const location = useLocation();
  const isCitizenPage = location.pathname.startsWith('/citizen/');

  return (
    <>
      {!isCitizenPage && <Navbar />}
      {!isCitizenPage && (
        <OfflineSyncBanner
          isOnline={isOnline}
          pending={pending}
          syncing={syncing}
          syncNow={syncNow}
        />
      )}
      <ToastContainer position="top-right" />

      <Routes>
        {/* ── Public routes ── */}
        {/* <Route path="/"                   element={<HomePage />} /> */}
        <Route path="/add-project"        element={<AddProjectForm />} />
        <Route path="/project/:id"        element={<ProjectDetail />} />
        <Route path="/edit/:id"           element={<EditProject />} />
        {/* <Route path="/project-insights"   element={<ProjectInsights />} /> */}
        <Route path="/about"              element={<AboutPage />} />
        <Route path="/create-forum"       element={<CreateForum />} />
        <Route path="/forums/:id"         element={<ForumDetail />} />
        {/* <Route path="/forum-feed"         element={<ForumFeed />} /> */}
        {/* <Route path="/profile"            element={<ProfilePage />} /> */}
        <Route path="/login"              element={<LoginPage />} />
        <Route path="/register"           element={<RegisterPage />} />

        {/* ── Citizen reporting — fully public, no login ── */}
        <Route path="/citizen/report/:id" element={<CitizenReportPage />} />

        {/* ── Admin routes — obfuscated URL ── */}
        {/* Old /admin-login and /admin redirect to new paths so bookmarks don't 404 */}
        <Route path="/admin-login"        element={<Navigate to="/ministry-portal/auth" replace />} />
        <Route path="/admin"              element={<Navigate to="/ministry-portal/auth" replace />} />

        {/* New hidden admin paths */}
        <Route path="/ministry-portal/auth"   element={<AdminLogin />} />
        <Route path="/ministry-portal"
          element={<ProtectedRoute><AdminPanel /></ProtectedRoute>}
        />
      </Routes>
    </>
  );
}

export default App;