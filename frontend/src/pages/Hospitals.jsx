// frontend/src/pages/Hospitals.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toArray, errMsg } from '../utils/normalize';
import './Hospitals.css';

const Hospitals = () => {
  const [hospitals, setHospitals] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    hospital_name: '',
    contact_person: '',
    phone: '',
    address: '',
    status: 'Active',
  });

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      const res = await api.get('/hospitals');
      setHospitals(toArray(res.data, 'hospitals'));
    } catch (err) {
      console.error(err);
      setHospitals([]);
      setError(errMsg(err, 'Failed to load hospitals'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/hospitals/${editing}`, form);
      } else {
        await api.post('/hospitals', form);
      }
      resetForm();
      fetchHospitals();
    } catch (err) {
      alert(errMsg(err, 'Error saving hospital'));
    }
  };

  const resetForm = () => {
    setForm({ hospital_name: '', contact_person: '', phone: '', address: '', status: 'Active' });
    setEditing(null);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this hospital?')) {
      try {
        await api.delete(`/hospitals/${id}`);
        fetchHospitals();
      } catch (err) {
        alert(errMsg(err, 'Failed to delete hospital'));
      }
    }
  };

  const handleEdit = (hospital) => {
    setEditing(hospital.id);
    setForm({ ...hospital });
    setShowForm(true);
  };

  // Defensive: hospitals is guaranteed an array.
  const filteredHospitals = hospitals.filter((h) => {
    const term = searchTerm.toLowerCase();
    return (
      (h.hospital_name || '').toLowerCase().includes(term) ||
      (h.contact_person && h.contact_person.toLowerCase().includes(term)) ||
      String(h.phone || '').includes(term)
    );
  });

  return (
    <div className="page">
      <h2>Manage Hospitals</h2>

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
          setForm({ hospital_name: '', contact_person: '', phone: '', address: '', status: 'Active' });
        }}
      >
        + Add Hospital
      </button>

      {(showForm || editing) && (
        <form onSubmit={handleSubmit} className="vertical-form">
          <div className="form-header">
            <h3>{editing ? 'Edit Hospital' : 'Add New Hospital'}</h3>
            <button type="button" className="close-btn" onClick={resetForm} aria-label="Close form">×</button>
          </div>
          <input type="text" placeholder="Hospital Name *"
            value={form.hospital_name}
            onChange={(e) => setForm({ ...form, hospital_name: e.target.value })} required />
          <input type="text" placeholder="Contact Person"
            value={form.contact_person}
            onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          <input type="text" placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input type="text" placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <select value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <div className="form-actions">
            <button type="submit">{editing ? 'Update' : 'Add'} Hospital</button>
            <button type="button" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      )}

      <div className="search-section">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search hospitals by name, contact, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <span className="search-clear" onClick={() => setSearchTerm('')}>×</span>
        )}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th><th>Contact</th><th>Phone</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredHospitals.length > 0 ? (
            filteredHospitals.map((h) => (
              <tr key={h.id}>
                <td>{h.hospital_name}</td>
                <td>{h.contact_person}</td>
                <td>{h.phone}</td>
                <td>{h.status}</td>
                <td>
                  <button onClick={() => handleEdit(h)}>Edit</button>
                  <button onClick={() => handleDelete(h.id)}>Delete</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center', padding: 30, color: '#8a8577' }}>
                {searchTerm ? 'No hospitals match your search.' : 'No hospitals registered yet.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Hospitals;