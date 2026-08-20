import React from 'react';
import './StatCard.css';

const StatCard = ({ title, value, icon }) => {
  return (
    <div className="stat-card">
      {icon && <span className="icon">{icon}</span>}
      <div className="content">
        <div className="title">{title}</div>
        <div className="value">{value}</div>
      </div>
    </div>
  );
};

export default StatCard;


