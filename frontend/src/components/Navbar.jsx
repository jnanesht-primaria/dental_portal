import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleDropdown = () => setDropdownOpen(prev => !prev);

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">🦷</span>
        <span className="brand-name">Cusp & Crown</span>
      </div>

      <div className="navbar-right" ref={dropdownRef}>
        <div className="user-info">
          <span className="user-role">{user?.role || 'User'}</span>
          <div className="user-avatar" onClick={toggleDropdown}>
            {getInitials(user?.full_name)}
          </div>
        </div>

        {dropdownOpen && (
          <div className="dropdown-menu">
            <div className="dropdown-item">
              <strong>{user?.full_name}</strong>
              <span className="dropdown-email">{user?.email}</span>
            </div>
            <div className="dropdown-divider"></div>
            <div className="dropdown-item" onClick={handleLogout}>
              <span className="logout-icon">🚪</span> Logout
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;