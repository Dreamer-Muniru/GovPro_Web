import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import '../css/ProjectInsights.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ProjectInsights = () => {
  const [regionData, setRegionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('regions');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/projects/stats');
        setRegionData(res.data);
      } catch (err) {
        console.error('Error fetching region stats', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Extract chart datasets
  const labels = regionData.map((item) => item.region);
  const completedData = regionData.map((item) => item.completed);
  const abandonedData = regionData.map((item) => item.abandoned);
  const uncompletedData = regionData.map((item) => item.uncompleted); // FIXED – was item.pending

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Completed',
        data: completedData,
        backgroundColor: '#2ecc71',
        borderRadius: 4,
        hoverBackgroundColor: '#27ae60',
      },
      {
        label: 'Abandoned',
        data: abandonedData,
        backgroundColor: '#e74c3c',
        borderRadius: 4,
        hoverBackgroundColor: '#c0392b',
      },
      {
        label: 'Uncompleted',
        data: uncompletedData,
        backgroundColor: '#f39c12',
        borderRadius: 4,
        hoverBackgroundColor: '#d35400',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  // Totals for summary
  const totalCompleted = completedData.reduce((a, b) => a + b, 0);
  const totalAbandoned = abandonedData.reduce((a, b) => a + b, 0);
  const totalUncompleted = uncompletedData.reduce((a, b) => a + b, 0);

  return (
    <div className="insights-container">
      <header className="insights-header">
        <h1>Project Insights Dashboard</h1>
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'regions' ? 'active' : ''}`}
            onClick={() => setActiveTab('regions')}
          >
            Regional View
          </button>
          <button
            className={`tab ${activeTab === 'types' ? 'active' : ''}`}
            onClick={() => setActiveTab('types')}
          >
            Project Types
          </button>
        </div>
      </header>

      <div className="summary-cards">
        <div className="card completed">
          <h3>Completed</h3>
          <p>{totalCompleted}</p>
          <small>Projects</small>
        </div>
        <div className="card abandoned">
          <h3>Abandoned</h3>
          <p>{totalAbandoned}</p>
          <small>Projects</small>
        </div>
        <div className="card pending">
          <h3>Uncompleted</h3>
          <p>{totalUncompleted}</p>
          <small>Projects</small>
        </div>
        <div className="card total">
          <h3>Total</h3>
          <p>{totalCompleted + totalAbandoned + totalUncompleted}</p>
          <small>Projects</small>
        </div>
      </div>

      <div className="chart-container">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner" />
            <p>Loading insights data...</p>
          </div>
        ) : (
          <>
            <h2 className="chart-title">Regional Project Status Breakdown</h2>
            <div className="chart-wrapper">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </>
        )}
      </div>

      <div className="data-table">
        <h3>Detailed Regional Data</h3>
        <table>
          <thead>
            <tr>
              <th>Region</th>
              <th>Completed</th>
              <th>Abandoned</th>
              <th>Uncompleted</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {regionData.map((region, index) => (
              <tr key={index}>
                <td>{region.region}</td>
                <td>{region.completed}</td>
                <td>{region.abandoned}</td>
                <td>{region.uncompleted}</td>
                <td>{
                  region.completed +
                  region.abandoned +
                  region.uncompleted
                }</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectInsights;