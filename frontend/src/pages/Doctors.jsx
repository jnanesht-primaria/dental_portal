// frontend/src/pages/Doctors.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toArray, errMsg } from '../utils/normalize';
import './Doctors.css';

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [manualHospitals, setManualHospitals] = useState('');

  const [form, setForm] = useState({
    doctor_name: '',
    designation: '',
    phone: '',
    email: '',
    address: '',
    role: '',
    status: 'Active',
    hospital_ids: [],
  });

  useEffect(() => {
    fetchDoctors();
    fetchHospitals();
  }, []);

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/doctors');
      setDoctors(toArray(res.data, 'doctors'));
    } catch (err) {
      console.error('Error fetching doctors:', err);
      setDoctors([]);
      setError(errMsg(err, 'Failed to load doctors'));
    }
  };

  const fetchHospitals = async () => {
    try {
      const res = await api.get('/hospitals?active_only=true');
      setHospitals(toArray(res.data, 'hospitals'));
    } catch (err) {
      console.error('Error fetching hospitals:', err);
      setHospitals([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let finalHospitalIds = [...form.hospital_ids];

      if (manualHospitals.trim() !== '') {
        const hospitalNames = manualHospitals
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s !== '');
        const newlyCreatedIds = [];

        for (const name of hospitalNames) {
          const existing = hospitals.find(
            (h) => (h.hospital_name || '').toLowerCase() === name.toLowerCase()
          );
          if (existing) {
            newlyCreatedIds.push(existing.id);
          } else {
            const res = await api.post('/hospitals', {
              hospital_name: name,
              status: 'Active',
              address: '',
            });
            if (res?.data?.id != null) newlyCreatedIds.push(res.data.id);
          }
        }

        finalHospitalIds = [...new Set([...finalHospitalIds, ...newlyCreatedIds])];
      }

      const payload = { ...form, hospital_ids: finalHospitalIds };

      if (editing) {
        await api.put(`/doctors/${editing}`, payload);
      } else {
        await api.post('/doctors', payload);
      }

      resetForm();
      fetchDoctors();
    } catch (err) {
      alert(errMsg(err, 'Error saving doctor'));
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
      hospital_ids: [],
    });
    setManualHospitals('');
    setEditing(null);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this doctor?')) {
      try {
        await api.delete(`/doctors/${id}`);
        fetchDoctors();
      } catch (err) {
        alert(errMsg(err, 'Failed to delete doctor'));
      }
    }
  };

  const handleEdit = (doctor) => {
    setEditing(doctor.id);
    const safeHospitals = Array.isArray(doctor.hospitals) ? doctor.hospitals : [];
    setForm({
      ...doctor,
      hospital_ids: safeHospitals.map((h) => h.id),
    });
    setManualHospitals(safeHospitals.map((h) => h.name).join(', '));
    setShowForm(true);
  };

  // Defensive: doctors and d.hospitals are guaranteed arrays.
  const filteredDoctors = doctors.filter((d) => {
    const term = searchTerm.toLowerCase();
    const matchesName = (d.doctor_name || '').toLowerCase().includes(term);
    const matchesPhone = String(d.phone || '').includes(term);
    const doctorHospitals = Array.isArray(d.hospitals) ? d.hospitals : [];
    const matchesHospital = doctorHospitals.some((h) =>
      (h.name || '').toLowerCase().includes(term)
    );
    return matchesName || matchesPhone || matchesHospital;
  });

  return (
    <div className="page">
      <h2>Manage Doctors</h2>

      {error && (
        <p className="error-message" style={{ color: '#a0402a', marginTop: 12 }}>
          Error: {error}
        </p>
      )}

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
            hospital_ids: [],
          });
          setManualHospitals('');
        }}
      >
        + Add Doctor
      </button>

      {(showForm || editing) && (
        <form onSubmit={handleSubmit} className="vertical-form">
          <div className="form-header">
            <h3>{editing ? 'Edit Doctor' : 'Add New Doctor'}</h3>
            <button type="button" className="close-btn" onClick={resetForm} aria-label="Close form">×</button>
          </div>
          <input type="text" placeholder="Doctor Name *"
            value={form.doctor_name}
            onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} required />
          <input type="text" placeholder="Designation"
            value={form.designation}
            onChange={(e) => setForm({ ...form, designation: e.target.value })} />
          <input type="text" placeholder="Phone *"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <input type="email" placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input type="text" placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <input type="text" placeholder="Role (e.g. Prosthodontist)"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })} />
          <select value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <div className="form-group" style={{ marginTop: 10 }}>
            <label style={{ fontWeight: 500, display: 'block', marginBottom: 5 }}>
              Hospitals (Manual Entry)
            </label>
            <input
              type="text"
              placeholder="e.g. City Dental Clinic, Smile Care Hospital"
              value={manualHospitals}
              onChange={(e) => setManualHospitals(e.target.value)}
              style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 6 }}
            />
            <small style={{ color: '#8a8577', fontSize: 12, marginTop: 4, display: 'block' }}>
              Enter hospital names separated by commas. New names will be created automatically.
            </small>
          </div>

          <div className="form-actions" style={{ marginTop: 15 }}>
            <button type="submit">{editing ? 'Update' : 'Add'} Doctor</button>
            <button type="button" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      )}

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

      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>Phone</th><th>Status</th><th>Hospitals</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {filteredDoctors.length > 0 ? (
            filteredDoctors.map((d) => {
              const doctorHospitals = Array.isArray(d.hospitals) ? d.hospitals : [];
              return (
                <tr key={d.id}>
                  <td>{d.doctor_name}</td>
                  <td>{d.phone}</td>
                  <td>{d.status}</td>
                  <td>{doctorHospitals.map((h) => h.name).join(', ')}</td>
                  <td>
                    <button onClick={() => handleEdit(d)}>Edit</button>
                    <button onClick={() => handleDelete(d.id)}>Delete</button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center', padding: 30, color: '#8a8577' }}>
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