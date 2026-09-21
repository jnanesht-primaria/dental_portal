import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Dashboard.css';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import {
  Users, Hospital, Calendar, DollarSign, PlusCircle, UserPlus, Building,
  FileText, Printer, Bell
} from 'lucide-react';

const COLORS = ['#1F3A3D', '#E8B87A', '#5F8B8F', '#B0774A', '#8A8577'];

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!stats) return <div className="error">Could not load stats</div>;

  const trendData = stats.monthly_trend.map(item => ({
    ...item,
    month: item.month.toString().padStart(2, '0')
  }));

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="subtitle">Real‑time overview of your dental laboratory</p>
      </div>

      {/* Stats Cards – only real data */}
      <div className="stats-grid">
        <StatCard icon={<Users size={22} />} title="Total Doctors" value={stats.total_doctors} color="#1F3A3D" />
        <StatCard icon={<Hospital size={22} />} title="Total Hospitals" value={stats.total_hospitals} color="#5F8B8F" />
        <StatCard icon={<Calendar size={22} />} title="Today's Cases" value={stats.today_cases} color="#E8B87A" />
        <StatCard icon={<DollarSign size={22} />} title="Monthly Revenue" value={`₹${stats.monthly_revenue.toFixed(2)}`} color="#B0774A" />
      </div>

      {/* Charts */}
      <div className="charts-row">
        <div className="chart-box large">
          <h3>Monthly Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1F3A3D" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#1F3A3D" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e3d6" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${value}`} />
              <Tooltip formatter={(value) => [`₹${value.toFixed(2)}`, 'Revenue']} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#1F3A3D" fill="url(#revenueGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-box">
          <h3>Work Type Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={stats.work_type_distribution}
                dataKey="count"
                nameKey="work_type"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {stats.work_type_distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Lists */}
      <div className="top-grid">
        <div className="chart-box">
          <h3>🏆 Top Doctors (by revenue)</h3>
          <ul>
            {stats.top_doctors.length > 0 ? (
              stats.top_doctors.map((d, i) => (
                <li key={i}>
                  <span className="rank">{i + 1}</span>
                  <span className="name">{d.name}</span>
                  <span className="amount">₹{d.revenue.toFixed(2)}</span>
                </li>
              ))
            ) : (
              <li className="empty">No data this month</li>
            )}
          </ul>
        </div>
        <div className="chart-box">
          <h3>🏥 Top Hospitals</h3>
          <ul>
            {stats.top_hospitals.length > 0 ? (
              stats.top_hospitals.map((h, i) => (
                <li key={i}>
                  <span className="rank">{i + 1}</span>
                  <span className="name">{h.name}</span>
                  <span className="amount">₹{h.revenue.toFixed(2)}</span>
                </li>
              ))
            ) : (
              <li className="empty">No data this month</li>
            )}
          </ul>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-grid">
          <ActionButton icon={<PlusCircle size={22} />} label="Add Entry" onClick={() => navigate('/entries/new')} color="#1F3A3D" />
          <ActionButton icon={<UserPlus size={22} />} label="Add Doctor" onClick={() => navigate('/doctors')} color="#5F8B8F" />
          <ActionButton icon={<Building size={22} />} label="Add Hospital" onClick={() => navigate('/hospitals')} color="#B0774A" />
          <ActionButton icon={<FileText size={22} />} label="Generate Bill" onClick={() => navigate('/revenue')} color="#E8B87A" />
          <ActionButton icon={<Printer size={22} />} label="Print Daily Report" onClick={() => window.print()} color="#2E7D32" />
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, color }) => (
  <div className="stat-card" style={{ borderLeftColor: color }}>
    <div className="icon" style={{ background: `${color}15`, color }}>{icon}</div>
    <div className="content">
      <div className="title">{title}</div>
      <div className="value">{value}</div>
    </div>
  </div>
);

const ActionButton = ({ icon, label, onClick, color }) => (
  <button className="action-btn" onClick={onClick} style={{ backgroundColor: color }}>
    {icon}
    <span>{label}</span>
  </button>
);

export default Dashboard;

