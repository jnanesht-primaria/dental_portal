import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = ({ children }) => {
  return (
    <div className="layout-container">
      <Sidebar />
      <div className="main-area">
        <Navbar />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;