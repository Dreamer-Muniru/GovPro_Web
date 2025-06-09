// src/App.js or src/index.js (whichever wraps your root component)
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AddProjectForm from './components/AddProjectForm';
import ProjectDetail from './pages/ProjectDetail';


function App() {
  return (
   <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/add-project" element={<AddProjectForm />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
