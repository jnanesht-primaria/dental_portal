import React from 'react';
import { useNavigate } from 'react-router-dom'; // <-- Changed import
import { Home, Building, UserPlus, PlusCircle, BarChart3, FileSpreadsheet, LogOut, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const { logout } = useAuth();
  const navigate = useNavigate(); // <-- Hook to handle navigation

  // Helper function to navigate and close the sidebar
  const handleNavigation = (path) => {
    navigate(path);
    onClose(); // Close the sidebar after clicking
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <img src="/logo.jpeg" alt="The Dental Art Laboratory" className="brand-logo" />
        <span className="brand-text">
          The Dental Art Laboratory
          {/* <span className="brand-subtitle">Dental Lab Suite</span> */}
        </span>
        <button className="sidebar-close-btn" onClick={onClose}>
          <X size={22} />
        </button>
      </div>

      <nav>
        {/* Replaced NavLink with buttons */}
        <button className="sidebar-link" onClick={() => handleNavigation('/')}>
          <span className="link-icon"><Home size={19} /></span>
          <span className="link-label">Dashboard</span>
        </button>

        <button className="sidebar-link" onClick={() => handleNavigation('/doctors')}>
          <span className="link-icon"><UserPlus size={19} /></span>
          <span className="link-label">Doctors</span>
        </button>

        <button className="sidebar-link" onClick={() => handleNavigation('/entries/new')}>
          <span className="link-icon"><PlusCircle size={19} /></span>
          <span className="link-label">Add Entry</span>
        </button>

        <button className="sidebar-link" onClick={() => handleNavigation('/revenue')}>
          <span className="link-icon"><BarChart3 size={19} /></span>
          <span className="link-label">Revenue</span>
        </button>

        <button className="sidebar-link" onClick={() => handleNavigation('/reports')}>
          <span className="link-icon"><FileSpreadsheet size={19} /></span>
          <span className="link-label">Reports</span>
        </button>
      </nav>

      {/* Logout is already a button, just kept it as is */}
      <button onClick={logout} className="sidebar-logout">
        <span className="link-icon"><LogOut size={19} /></span>
        <span className="link-label">Sign Out</span>
      </button>
    </aside>
  );
};

export default Sidebar;


