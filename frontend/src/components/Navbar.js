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

  const handleLogout = () => {
    logout();
    navigate('/'); // Redirect to homepage after logout
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
          <img src="/images/ghana-project-logo.png" alt="Ghana Project Tracker" />
          Ghana Project Tracker
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

          <button 
            onClick={handleAddProjectClick}
            className="nav-button add-project-btn"
          >
            Add Project
          </button>

          {user && (
            <>
              <span className="user-greeting">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                {user.username}
              </span>
              <button 
                onClick={handleLogout}
                className="nav-button logout-btn"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;