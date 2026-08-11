import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Doctors.css';

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    doctor_name: '',
    designation: '',
    phone: '',
    email: '',
    address: '',
    role: '',
    status: 'Active',
    hospital_ids: []
  });

  useEffect(() => {
    fetchDoctors();
    fetchHospitals();
  }, []);

  const fetchDoctors = async () => {
    const res = await api.get('/api/doctors');
    setDoctors(res.data);
  };

  const fetchHospitals = async () => {
    const res = await api.get('/api/hospitals?active_only=true');
    setHospitals(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/api/doctors/${editing}`, form);
      } else {
        await api.post('/api/doctors', form);
      }
      resetForm();
      fetchDoctors();
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
    setEditing(null);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this doctor?')) {
      await api.delete(`/api/doctors/${id}`);
      fetchDoctors();
    }
  };

  const handleHospitalToggle = (hospitalId) => {
    setForm(prev => {
      const ids = prev.hospital_ids.includes(hospitalId)
        ? prev.hospital_ids.filter(id => id !== hospitalId)
        : [...prev.hospital_ids, hospitalId];
      return { ...prev, hospital_ids: ids };
    });
  };

  const handleEdit = (doctor) => {
    setEditing(doctor.id);
    setForm({
      ...doctor,
      hospital_ids: doctor.hospitals.map(h => h.id)
    });
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

          {/* Hospital checkboxes */}
          <div className="hospital-checkbox-group">
            <span className="label">Hospitals</span>
            <div className="checkbox-grid">
              {hospitals.map(h => (
                <label key={h.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    value={h.id}
                    checked={form.hospital_ids.includes(h.id)}
                    onChange={() => handleHospitalToggle(h.id)}
                  />
                  {h.hospital_name}
                </label>
              ))}
            </div>
          </div>

          <div className="form-actions">
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