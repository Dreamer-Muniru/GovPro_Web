import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../css/navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  
  const handleAddProjectClick = () => {
    if (user) {
      navigate('/add-project');
    } else {
      navigate('/login');
    }
    setMobileMenuOpen(false);
  };
  
  const handleCreateForumClick = () => {
    if (user) {
      navigate('/forum-feed');
    } else {
      navigate('/login');
    }
    setMobileMenuOpen(false);
  };


const handleLogout = () => {
  logout(); // clears user context

  setTimeout(() => {
    navigate('/'); // safely redirect after context update
  }, 0);

  setMobileMenuOpen(false);
};



  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="ghana-flag-stripe"></div>
      
      <div className="navbar-content">
        <Link to="/" className="nav-brand" onClick={() => setMobileMenuOpen(false)}>
          <img src="/images/ghana-project-logo.png" alt="Abandoned Ghana" />
        </Link>

        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        <div className={`nav-links ${mobileMenuOpen ? 'active' : ''}`}>
          <Link to="/" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
            Home
          </Link>
          
          <Link to="/about" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
            About
          </Link>
          {/* <Link to="/login" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
            Login
          </Link> */}
          <Link to="/project-insights" className='nav-link' onClick={() => setMobileMenuOpen(false)}>Reports</Link>
         <button onClick={handleCreateForumClick} className="nav-link nav-button-link">
          Create Forum
        </button>



          <button
            onClick={handleAddProjectClick}
            className="nav-button add-project-btn"
          >
            Add Project
          </button>
      
          {user && (
            <Link to="/profile" className="nav-link">
              Profile
            </Link>
          )}

          
        </div>
      </div>
    </nav>
  );
};

export default Navbar;