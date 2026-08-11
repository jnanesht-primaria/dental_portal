import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Building, UserPlus, PlusCircle, BarChart3, FileSpreadsheet, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const { logout } = useAuth();
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span>🦷</span> Cusp & Crown
      </div>
      <nav>
        <NavLink to="/" className="sidebar-link"><Home size={20} /> Dashboard</NavLink>
        <NavLink to="/hospitals" className="sidebar-link"><Building size={20} /> Hospitals</NavLink>
        <NavLink to="/doctors" className="sidebar-link"><UserPlus size={20} /> Doctors</NavLink>
        <NavLink to="/entries/new" className="sidebar-link"><PlusCircle size={20} /> Add Entry</NavLink>
        <NavLink to="/revenue" className="sidebar-link"><BarChart3 size={20} /> Revenue</NavLink>
        <NavLink to="/reports" className="sidebar-link"><FileSpreadsheet size={20} /> Reports</NavLink>
      </nav>
      <button onClick={logout} className="sidebar-logout"><LogOut size={20} /> Sign Out</button>
    </aside>
  );
};

export default Sidebar;