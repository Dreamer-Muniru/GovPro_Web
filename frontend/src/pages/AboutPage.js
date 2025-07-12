import React from 'react';
import Footer from '../components/Footer';

export default function AboutPage() {
  return (
    <div>
       <div className="about-container">
      <h1>About Ghana Project Tracker</h1>
      <p>
        <strong>Ghana Project Tracker</strong> is a civic-oriented web platform dedicated to enhancing transparency,
        accessibility, and accountability in development projects across Ghana. It empowers citizens,
        community leaders, and stakeholders to view, engage with, and monitor ongoing and completed
        public initiatives using dynamic geolocation mapping and project-based visuals.
      </p>
      <p>
        Built with modern web technologies and driven by a user-centric approach, the platform fosters awareness,
        encourages feedback, and simplifies the discovery of development efforts in every region and district.
      </p>

      <h2>Our Mission</h2>
      <p>
        To streamline visibility and engagement around government and community-led projects by:
      </p>
      <ul>
        <li>Providing accurate geospatial data and real-time GPS mapping</li>
        <li>Making project images, status updates, and commentary easily accessible</li>
        <li>Enabling users to filter and explore projects by type, location, or progress</li>
        <li>Encouraging civic participation and community awareness</li>
      </ul>
      <p>
        We aim to bridge the gap between policy and the public by transforming raw data into interactive insight.
      </p>

      <h2>Contact Us</h2>
      <p><strong>Location:</strong> Gate360, Garu - U/ER</p>
      <p><strong>Phone:</strong> <a href="tel:+233547963492">+233 547963492</a></p>
      <p><strong>Email:</strong> <a href="mailto:ghanaprojecttracker@gmail.com">ghanaprojecttracker@gmail.com</a></p>

      <p className="footer-note">
        © 2025. Made with ❤️ by <span className="author-name">Muniru Dreamer</span>.
      </p>
    </div>

      <Footer />
    </div>
  );
}
