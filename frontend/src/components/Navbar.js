import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../css/navbar.css';

// Install lucide-react: npm install lucide-react
import { Home, FileText, MessageSquare, PlusCircle, User } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const handleAddProjectClick = () => {
    if (user) {
      navigate('/add-project');
    } else {
      navigate('/login');
    }
  };
  
  const handleCreateForumClick = () => {
    if (user) {
      navigate('/forum-feed');
    } else {
      navigate('/login');
    }
  };

  return (
    <nav className="navbar">
      <div className="ghana-flag-stripe"></div>
      
      <div className="navbar-content">
        {/* Logo */}
        <Link to="/" className="nav-brand">
          <img src="/images/ghana-project-logo.png" alt="Abandoned Ghana" />
        </Link>

        {/* Profile Link - Only visible on mobile at top right */}
        {user && (
          <Link to="/profile" className="profile-top-mobile">
            <User className="nav-icon" size={32} data-type="profile" />
          </Link>
        )}

        {/* Main Navigation Links */}
        <div className="nav-links">
          <Link to="/" className="nav-link">
            <Home className="nav-icon" size={28} />
            <span className="nav-text">Home</span>
          </Link>
          
          <Link to="/project-insights" className='nav-link'>
            <FileText className="nav-icon" size={28} />
            <span className="nav-text">Reports</span>
          </Link>

          <button onClick={handleCreateForumClick} className="nav-link nav-button-link">
            <MessageSquare className="nav-icon" size={28} />
            <span className="nav-text">Issues Forum</span>
          </button>

          <button
            onClick={handleAddProjectClick}
            className="nav-link add-project-btn"
          >
            <PlusCircle className="nav-icon" size={28} />
            <span className="nav-text">Add Project</span>
          </button>

          {/* Profile Link - Hidden on mobile (shown at top) */}
          {user && (
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