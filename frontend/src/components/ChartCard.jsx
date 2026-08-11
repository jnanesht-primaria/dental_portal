import React from 'react';
import './ChartCard.css';   // optional styles

const ChartCard = ({ title, children }) => {
  return (
    <div className="chart-card">
      {title && <h3>{title}</h3>}
      <div className="chart-content">
        {children}
      </div>
    </div>
  );
};

export default ChartCard;