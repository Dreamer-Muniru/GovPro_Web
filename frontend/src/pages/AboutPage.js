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
            <span className="title-yellow">Abandoned</span>
            <span className="title-green">Ghana</span>
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
              <strong>Ghana Project Tracker</strong> is a civic technology platform dedicated to transparency, accessibility,
               and accountability in public development across Ghana. We empower citizens, journalists, and community leaders 
               to monitor and engage with government and community-led projects using dynamic geolocation mapping, 
               visual storytelling, and now — interactive civic forums.

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
              To bridge the gap between policy and the public by transforming raw infrastructure data into interactive insight and dialogue.
            </p>
            <ul className="mission-list">
              <li> 🗺️ Geospatial Mapping: Real-time GPS tracking of projects across all regions and districts</li>
              <li> 📸 Visual Documentation: Photos, status updates, and project metadata at your fingertips  </li>
              <li> 🔍 Smart Filtering: Explore by region, district, project type, or completion status  </li>
              <li> 🗣️ Community Forums: Discuss local projects, share updates, and hold stakeholders accountable  </li>
              <li> 📣 Civic Engagement: Submit new projects, comment on existing ones, and amplify community voices</li>
            </ul>
            <blockquote className="mission-quote">
              <h3>Why Issues Forums Matter</h3>
              Our newly launched Community Forums give every Ghanaian a voice in the development conversation. Whether you're tracking a 
              stalled school project, celebrating a completed clinic, or raising concerns about transparency — issues forums let you speak,
               connect, and act.
            </blockquote>
            <blockquote className="mission-quote">
              "We don’t just visualize development. We democratize it."
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
                <p><a href="tel:+233240527043">+233 240527043</a></p>
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
      
      </div>

      <Footer />
    </div>
  );
}