import React from 'react';
import '../css/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-wave"></div>
      
      <div className="footer-container">
        <div className="footer-section">
          <div className="footer-logo">
            <span className="logo-red">Ghana</span>
            <span className="logo-yellow">Project</span>
            <span className="logo-green">Tracker</span>
          </div>
          <p className="footer-text">
            <i className="fas fa-map-marker-alt footer-icon"></i> 
            Gate360, Garu - U/ER
          </p>
          <div className="footer-social">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-facebook-f"></i></a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-twitter"></i></a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-instagram"></i></a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer"><i className="fab fa-linkedin-in"></i></a>
          </div>
        </div>

        <div className="footer-section">
          <h3 className="footer-heading">Quick Links</h3>
          <ul className="footer-links">
            <li><a href="/"><i className="fas fa-chevron-right"></i> Home</a></li>
            <li><a href="/projects"><i className="fas fa-chevron-right"></i> Projects</a></li>
            <li><a href="/about"><i className="fas fa-chevron-right"></i> About</a></li>
            {/* <li><a href="#"><i className="fas fa-chevron-right"></i> Contact</a></li> */}
          </ul>
        </div>

        <div className="footer-section">
          <h3 className="footer-heading">Contact Us</h3>
          <p className="footer-text">
            <i className="fas fa-phone-alt footer-icon"></i> 
            <a href="tel:+233547963492">+233 547963492</a>
          </p>
          <p className="footer-text">
            <i className="fas fa-envelope footer-icon"></i> 
            <a href="mailto:ghanaprojecttracker@gmail.com">ghanaprojecttracker@gmail.com</a>
          </p>
          
          <div className="footer-credits">
            <p>© 2025 All Rights Reserved</p>
            <p className="footer-author">
              Crafted with <i className="fas fa-heart heart-icon"></i> by 
              <span className="author-name"> Muniru Dreamer</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;