import { BrowserRouter as Router, Routes, Navigate, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import AddProjectForm from './components/AddProjectForm';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProjectDetail from './pages/ProjectDetail';
import AdminPanel from './pages/AdminPanel';
import EditProject from './pages/EditProject';
import { AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import AdminLogin from './pages/AdminLogin'
import { ToastContainer } from 'react-toastify';
import ProjectInsights from './pages/ProjectInsights';

function App() {
  const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  return user?.isAdmin ? children : <Navigate to="/admin-login" />;
};

  return (
    <Router>
      <Navbar />
       <ToastContainer /> 
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/add-project" element={<AddProjectForm />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
        <Route path="/edit/:id" element={<EditProject />} />
        <Route path="/project-insights" element={<ProjectInsights />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        {/* Admin routes */}
        <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>}/>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

      </Routes>
    </Router>
  );
}

export default App
