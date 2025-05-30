// src/App.js or src/index.js (whichever wraps your root component)
import React from 'react';
import { ProjectProvider } from './context/ProjectContext';
import HomePage from './pages/HomePage'; // your homepage component

function App() {
  return (
    <ProjectProvider>
        <HomePage />
    </ProjectProvider>
  );
}

export default App;
