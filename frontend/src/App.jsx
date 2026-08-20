// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Doctors from './pages/Doctors';
import Hospitals from './pages/Hospitals';
import AddEntry from './pages/AddEntry';
import Revenue from './pages/Revenue';
import Reports from './pages/Reports';
import Layout from './components/Layout';
import './App.css';

// Protected route: redirect to login if not authenticated
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/doctors" element={
            <ProtectedRoute>
              <Layout><Doctors /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/hospitals" element={
            <ProtectedRoute>
              <Layout><Hospitals /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/entries/new" element={
            <ProtectedRoute>
              <Layout><AddEntry /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/revenue" element={
            <ProtectedRoute>
              <Layout><Revenue /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <Layout><Reports /></Layout>
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;


