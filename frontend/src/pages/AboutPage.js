import React from 'react';
import Footer from '../components/Footer';
import '../css/About.css';

export default function AboutPage() {
  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="title-red">About</span>
            <span className="title-yellow">Ghana</span>
            <span className="title-green">Project Tracker</span>
          </h1>
          <p className="hero-subtitle">Transparency • Accountability • Civic Engagement</p>
        </div>
      </section>

      {/* Main Content */}
      <div className="about-container">
        {/* Introduction Section */}
        <section className="about-section">
          <div className="section-header">
            <div className="section-icon">🇬🇭</div>
            <h2 className="section-title">Our Platform</h2>
          </div>
          <div className="section-content">
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
          </div>
        </section>

        {/* Mission Section */}
        <section className="about-section mission-section">
          <div className="section-header">
            <div className="section-icon">🎯</div>
            <h2 className="section-title">Our Mission</h2>
          </div>
          <div className="section-content">
            <p>
              To streamline visibility and engagement around government and community-led projects by:
            </p>
            <ul className="mission-list">
              <li><i className="fas fa-map-marker-alt mission-icon"></i> Providing accurate geospatial data and real-time GPS mapping</li>
              <li><i className="fas fa-images mission-icon"></i> Making project images, status updates, and commentary easily accessible</li>
              <li><i className="fas fa-filter mission-icon"></i> Enabling users to filter and explore projects by type, location, or progress</li>
              <li><i className="fas fa-users mission-icon"></i> Encouraging civic participation and community awareness</li>
            </ul>
            <blockquote className="mission-quote">
              "We aim to bridge the gap between policy and the public by transforming raw data into interactive insight."
            </blockquote>
          </div>
        </section>

        {/* Contact Section */}
        <section className="about-section contact-section">
          <div className="section-header">
            <div className="section-icon">📞</div>
            <h2 className="section-title">Contact Us</h2>
          </div>
          <div className="section-content">
            <div className="contact-cards">
              <div className="contact-card">
                <i className="fas fa-map-marker-alt contact-icon"></i>
                <h3>Location</h3>
                <p>Gate360, Garu - U/ER</p>
              </div>
              <div className="contact-card">
                <i className="fas fa-phone-alt contact-icon"></i>
                <h3>Phone</h3>
                <p><a href="tel:+233547963492">+233 547963492</a></p>
              </div>
              <div className="contact-card">
                <i className="fas fa-envelope contact-icon"></i>
                <h3>Email</h3>
                <p><a href="mailto:ghanaprojecttracker@gmail.com">ghanaprojecttracker@gmail.com</a></p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer Note */}
        <div className="footer-note">
          <p>
            © 2025. Made with <i className="fas fa-heart heart-icon"></i> by 
            <span className="author-name"> Muniru Dreamer</span>.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}