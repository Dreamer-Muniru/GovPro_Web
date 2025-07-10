// components/Footer.js
import React from 'react';
import '../css/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p><strong>Location:</strong> Gate360, Garu - U/ER</p>
        <p>© 2025. Made with ❤️ by <span className="footer-author">Muniru Dreamer</span>.</p>
        <p>
          <strong>Contact us:</strong> <br />
          Phone: <a href="tel:+233547963492">+233 547963492</a> <br />
          Email: <a href="mailto:ghanaprojecttracker@gmail.com">ghanaprojecttracker@gmail.com</a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
