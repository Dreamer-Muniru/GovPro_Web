import React from 'react';
import '../css/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3 className="footer-heading">Location</h3>
          <p className="footer-text">
            <i className="fas fa-map-marker-alt footer-icon"></i> 
            Gate360, Garu - U/ER
          </p>
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
        </div>

        <div className="footer-section">
          <h3 className="footer-heading">Credits</h3>
          <p className="footer-text">
            © 2025 Ghana Project Tracker
          </p>
          <p className="footer-author">
            Made with <i className="fas fa-heart heart-icon"></i> by Muniru Dreamer
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;