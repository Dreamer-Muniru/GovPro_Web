import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../css/navbar.css';
import { Home, FileText, MessageSquare, PlusCircle, User } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const handleAddProjectClick = () => {
    if (user) { navigate('/add-project'); } else { navigate('/login'); }
  };

  const handleCreateForumClick = () => {
    if (user) { navigate('/forum-feed'); } else { navigate('/login'); }
  };

  return (
    <nav className="navbar">
      <div className="ghana-flag-stripe"></div>

      <div className="navbar-content">
        {/* Logo */}
        <Link to="/" className="nav-brand">
          <img src="/images/logo.png" alt="Ghana Project Tracker" />
        </Link>

        {/* Mobile profile icon — hidden for admin */}
        {user && !user?.isAdmin && (
          <Link to="/profile" className="profile-top-mobile">
            <User className="nav-icon" size={32} data-type="profile" />
          </Link>
        )}

        {/* Main nav links */}
        <div className="nav-links">
          <Link to="/" className="nav-link">
            <Home className="nav-icon" size={28} />
            <span className="nav-text">Home</span>
          </Link>

          <Link to="/project-insights" className="nav-link">
            <FileText className="nav-icon" size={28} />
            <span className="nav-text">Reports</span>
          </Link>

          {/* Issues Forum — hidden for admin */}
          {!user?.isAdmin && (
            <button onClick={handleCreateForumClick} className="nav-link nav-button-link">
              <MessageSquare className="nav-icon" size={28} />
              <span className="nav-text">Issues Forum</span>
            </button>
          )}

          <button onClick={handleAddProjectClick} className="nav-link add-project-btn">
            <PlusCircle className="nav-icon" size={28} />
            <span className="nav-text">Add Project</span>
          </button>

          {/* Profile — hidden for admin (admin has own settings inside portal) */}
          {user && !user?.isAdmin && (
            <Link to="/profile" className="nav-link">
              <User className="nav-icon" size={28} data-type="profile" />
              <span className="nav-text">Profile</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;