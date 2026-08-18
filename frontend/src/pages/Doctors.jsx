// frontend/src/pages/Doctors.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Doctors.css';

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // NEW: State for manual hospital input
  const [manualHospitals, setManualHospitals] = useState('');

  const [form, setForm] = useState({
    doctor_name: '',
    designation: '',
    phone: '',
    email: '',
    address: '',
    role: '',
    status: 'Active',
    hospital_ids: [] // Kept for backend compatibility
  });

  useEffect(() => {
    fetchDoctors();
    fetchHospitals();
  }, []);

  const fetchDoctors = async () => {
    const res = await api.get('/doctors');
    setDoctors(res.data);
  };

  const fetchHospitals = async () => {
    const res = await api.get('/hospitals?active_only=true');
    setHospitals(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let finalHospitalIds = [...form.hospital_ids];
      
      // 1. Process manually entered hospital names
      if (manualHospitals.trim() !== '') {
        // Split by comma, trim spaces, and ignore empty entries
        const hospitalNames = manualHospitals.split(',').map(s => s.trim()).filter(s => s !== '');
        const newlyCreatedIds = [];

        for (const name of hospitalNames) {
          // Check if it exists in the currently loaded hospitals list
          const existing = hospitals.find(h => h.hospital_name.toLowerCase() === name.toLowerCase());
          if (existing) {
            newlyCreatedIds.push(existing.id);
          } else {
            // If not found, auto-create the hospital
            const res = await api.post('/hospitals', { 
              hospital_name: name, 
              status: 'Active', 
              address: '' 
            });
            newlyCreatedIds.push(res.data.id);
          }
        }
        
        // Merge existing IDs with new IDs and remove duplicates
        finalHospitalIds = [...new Set([...finalHospitalIds, ...newlyCreatedIds])];
      }

      // 2. Submit the doctor data
      const payload = { ...form, hospital_ids: finalHospitalIds };

      if (editing) {
        await api.put(`/api/doctors/${editing}`, payload);
      } else {
        await api.post('/doctors', payload);
      }

      resetForm();
      fetchDoctors(); // Refresh the list
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving doctor');
    }
  };

  const resetForm = () => {
    setForm({
      doctor_name: '',
      designation: '',
      phone: '',
      email: '',
      address: '',
      role: '',
      status: 'Active',
      hospital_ids: []
    });
    setManualHospitals(''); // Reset manual input
    setEditing(null);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this doctor?')) {
      await api.delete(`/api/doctors/${id}`);
      fetchDoctors();
    }
  };

  const handleEdit = (doctor) => {
    setEditing(doctor.id);
    setForm({
      ...doctor,
      hospital_ids: doctor.hospitals.map(h => h.id)
    });
    // Convert existing hospital list into a comma-separated string for the manual input
    setManualHospitals(doctor.hospitals.map(h => h.hospital_name).join(', '));
    setShowForm(true);
  };

  // Filter doctors based on search term
  const filteredDoctors = doctors.filter(d => {
    const term = searchTerm.toLowerCase();
    const matchesName = d.doctor_name.toLowerCase().includes(term);
    const matchesPhone = d.phone.includes(term);
    const matchesHospital = d.hospitals.some(h => h.name.toLowerCase().includes(term));
    return matchesName || matchesPhone || matchesHospital;
  });

  return (
    <div className="page">
      <h2>Manage Doctors</h2>

      {/* Add Doctor Button - always visible */}
      <button
        className="add-doctor-btn"
        onClick={() => {
          setShowForm(true);
          setEditing(null);
          setForm({
            doctor_name: '',
            designation: '',
            phone: '',
            email: '',
            address: '',
            role: '',
            status: 'Active',
            hospital_ids: []
          });
          setManualHospitals(''); // Clear manual input
        }}
      >
        + Add Doctor
      </button>

      {/* Doctor Form - visible when adding or editing */}
      {(showForm || editing) && (
        <form onSubmit={handleSubmit} className="vertical-form">
          <div className="form-header">
            <h3>{editing ? 'Edit Doctor' : 'Add New Doctor'}</h3>
            <button type="button" className="close-btn" onClick={resetForm} aria-label="Close form">×</button>
          </div>
          <input
            type="text"
            placeholder="Doctor Name *"
            value={form.doctor_name}
            onChange={(e) => setForm({ ...form, doctor_name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Designation"
            value={form.designation}
            onChange={(e) => setForm({ ...form, designation: e.target.value })}
          />
          <input
            type="text"
            placeholder="Phone *"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="text"
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <input
            type="text"
            placeholder="Role (e.g. Prosthodontist)"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          />
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {/* REPLACED: Manual Hospital Input Field */}
          <div className="form-group" style={{ marginTop: '10px' }}>
            <label style={{ fontWeight: 500, display: 'block', marginBottom: '5px' }}>Hospitals (Manual Entry)</label>
            <input
              type="text"
              placeholder="e.g. City Dental Clinic, Smile Care Hospital"
              value={manualHospitals}
              onChange={(e) => setManualHospitals(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
            />
            <small style={{ color: '#8a8577', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Enter hospital names separated by commas. New names will be created automatically.
            </small>
          </div>

          <div className="form-actions" style={{ marginTop: '15px' }}>
            <button type="submit">{editing ? 'Update' : 'Add'} Doctor</button>
            <button type="button" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="search-section">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search doctors by name, phone, or hospital..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <span className="search-clear" onClick={() => setSearchTerm('')}>×</span>
        )}
      </div>

      {/* Doctors Table - always visible */}
      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>Phone</th><th>Status</th><th>Hospitals</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {filteredDoctors.length > 0 ? (
            filteredDoctors.map(d => (
              <tr key={d.id}>
                <td>{d.doctor_name}</td>
                <td>{d.phone}</td>
                <td>{d.status}</td>
                <td>{d.hospitals.map(h => h.name).join(', ')}</td>
                <td>
                  <button onClick={() => handleEdit(d)}>Edit</button>
                  <button onClick={() => handleDelete(d.id)}>Delete</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#8a8577' }}>
                {searchTerm ? 'No doctors match your search.' : 'No doctors registered yet.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Doctors;

