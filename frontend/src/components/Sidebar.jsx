import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Building, UserPlus, PlusCircle, BarChart3, FileSpreadsheet, LogOut, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const { logout } = useAuth();

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <span>🦷</span> Cusp & Crown
        <button className="sidebar-close-btn" onClick={onClose}>
          <X size={22} />
        </button>
      </div>
      <nav>
        <NavLink to="/" className="sidebar-link" onClick={onClose}><Home size={20} /> Dashboard</NavLink>
        {/* <NavLink to="/hospitals" className="sidebar-link" onClick={onClose}><Building size={20} /> Hospitals</NavLink> */}
        <NavLink to="/doctors" className="sidebar-link" onClick={onClose}><UserPlus size={20} /> Doctors</NavLink>
        <NavLink to="/entries/new" className="sidebar-link" onClick={onClose}><PlusCircle size={20} /> Add Entry</NavLink>
        <NavLink to="/revenue" className="sidebar-link" onClick={onClose}><BarChart3 size={20} /> Revenue</NavLink>
        <NavLink to="/reports" className="sidebar-link" onClick={onClose}><FileSpreadsheet size={20} /> Reports</NavLink>
      </nav>
      <button onClick={logout} className="sidebar-logout"><LogOut size={20} /> Sign Out</button>
    </aside>
  );
};

export default Sidebar;