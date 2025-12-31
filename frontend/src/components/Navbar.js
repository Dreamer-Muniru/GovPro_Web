import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../css/navbar.css';

// Install lucide-react: npm install lucide-react
import { Home, FileText, MessageSquare, PlusCircle, Info, User } from 'lucide-react';

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
        <Link to="/" className="nav-brand">
          <img src="/images/ghana-project-logo.png" alt="Abandoned Ghana" />
        </Link>

        <div className="nav-links">
          <Link to="/" className="nav-link">
            <Home className="nav-icon" size={24} />
            <span className="nav-text">Home</span>
          </Link>
          
          <Link to="/project-insights" className='nav-link'>
            <FileText className="nav-icon" size={24} />
            <span className="nav-text">Reports</span>
          </Link>

          <button onClick={handleCreateForumClick} className="nav-link nav-button-link">
            <MessageSquare className="nav-icon" size={24} />
            <span className="nav-text">Issues Forum</span>
          </button>

          <button
            onClick={handleAddProjectClick}
            className="nav-link add-project-btn"
          >
            <PlusCircle className="nav-icon" size={24} />
            <span className="nav-text">Add Project</span>
          </button>
            
          <Link to="/about" className="nav-link">
            <Info className="nav-icon" size={24} />
            <span className="nav-text">About</span>
          </Link>

          {user && (
            <Link to="/profile" className="nav-link">
              <User className="nav-icon" size={24} />
              <span className="nav-text">Profile</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;