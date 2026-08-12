// frontend/src/pages/AddEntry.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './AddEntry.css';

const AddEntry = () => {
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State includes 4 description lines, manual work_type, and manual no_of_units
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    doctor_id: '',
    hospital_id: '',
    patient_name: '',
    desc1: '',
    desc2: '',
    desc3: '',
    desc4: '',
    no_of_units: '1',
    shade_type: '',
    work_type: '',
    amount: ''
  });

  useEffect(() => {
    fetchDoctors();
    fetchRecentEntries();
  }, []);

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/api/doctors?active_only=true');
      setDoctors(res.data);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    }
  };

  const fetchRecentEntries = async () => {
    setLoadingEntries(true);
    try {
      const res = await api.get('/api/entries?limit=50');
      setEntries(res.data);
    } catch (err) {
      console.error('Error fetching entries:', err);
    } finally {
      setLoadingEntries(false);
    }
  };

  const handleDoctorChange = (e) => {
    const val = e.target.value;
    const doctorId = val ? parseInt(val) : '';
    setForm({ ...form, doctor_id: doctorId, hospital_id: '' });
    if (doctorId) {
      const doctor = doctors.find(d => d.id === doctorId);
      setHospitals(doctor ? doctor.hospitals : []);
    } else {
      setHospitals([]);
    }
  };

  const resetForm = () => {
    setForm({
      entry_date: new Date().toISOString().split('T')[0],
      doctor_id: '',
      hospital_id: '',
      patient_name: '',
      desc1: '', desc2: '', desc3: '', desc4: '',
      no_of_units: '1',
      shade_type: '',
      work_type: '',
      amount: ''
    });
    setHospitals([]);
    setEditingEntryId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.doctor_id || !form.hospital_id || !form.patient_name || !form.amount) {
      alert('Please fill all required fields: Doctor, Hospital, Patient Name, and Amount.');
      return;
    }

    const amountValue = parseFloat(form.amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      alert('Please enter a valid positive amount.');
      return;
    }

    // --- CHANGED HERE: Removed the .filter() to preserve empty lines exactly ---
    const combinedDescription = [form.desc1, form.desc2, form.desc3, form.desc4].join('\n');

    const payload = {
      entry_date: form.entry_date,
      doctor_id: parseInt(form.doctor_id),
      hospital_id: parseInt(form.hospital_id),
      patient_name: form.patient_name,
      description: combinedDescription,
      no_of_units: parseInt(form.no_of_units) || 1, 
      shade_type: form.shade_type || '',
      work_type: form.work_type || '', 
      amount: amountValue
    };

    try {
      if (editingEntryId) {
        await api.put(`/api/entries/${editingEntryId}`, payload);
        alert('Entry updated!');
      } else {
        await api.post('/api/entries', payload);
        alert('Entry saved!');
      }
      resetForm();
      await fetchRecentEntries();
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving entry');
    }
  };

  // --- THIS HANDLES THE EDIT CLICK AND POPULATES THE FIELDS ---
  const handleEdit = (entry) => {
    setEditingEntryId(entry.id);
    
    // Split the existing description into 4 separate lines for the 2x2 grid
    const descriptionLines = (entry.description || '').split('\n');

    setForm({
      entry_date: entry.entry_date,
      doctor_id: entry.doctor_id,
      hospital_id: entry.hospital_id,
      patient_name: entry.patient_name,
      desc1: descriptionLines[0] || '',
      desc2: descriptionLines[1] || '',
      desc3: descriptionLines[2] || '',
      desc4: descriptionLines[3] || '',
      no_of_units: entry.no_of_units.toString(), // Populates the manual Unit field
      shade_type: entry.shade_type || '',
      work_type: entry.work_type || '', // Populates the manual Work Type field
      amount: entry.amount.toString()
    });

    // Load hospitals for the selected doctor so the dropdown works correctly
    const doctor = doctors.find(d => d.id === entry.doctor_id);
    if (doctor) {
      setHospitals(doctor.hospitals || []);
    }
    setShowForm(true);
  };

  const filteredEntries = entries.filter(entry => {
    const term = searchTerm.toLowerCase();
    return (
      entry.entry_no.toLowerCase().includes(term) ||
      entry.patient_name.toLowerCase().includes(term) ||
      entry.doctor_name.toLowerCase().includes(term) ||
      entry.hospital_name.toLowerCase().includes(term) ||
      (entry.work_type && entry.work_type.toLowerCase().includes(term))
    );
  });

  return (
    <div className="page">
      <h2>Add New Dental Entry</h2>

      {!showForm && (
        <button className="add-entry-btn" onClick={() => setShowForm(true)}>
          + Add Entry
        </button>
      )}

      {/* Entry Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="vertical-form">
          <div className="form-header">
            <h3>{editingEntryId ? 'Edit Entry' : 'Add New Entry'}</h3>
            <button type="button" className="close-btn" onClick={resetForm} aria-label="Close form">×</button>
          </div>

          <label>Entry Date
            <input type="date" value={form.entry_date} onChange={(e) => setForm({...form, entry_date: e.target.value})} />
          </label>

          <label>Doctor
            <select value={form.doctor_id} onChange={handleDoctorChange}>
              <option value="">Select Doctor</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.doctor_name}</option>)}
            </select>
          </label>

          <label>Hospital
            <select value={form.hospital_id} onChange={(e) => setForm({...form, hospital_id: e.target.value ? parseInt(e.target.value) : ''})} disabled={!form.doctor_id}>
              <option value="">Select Hospital</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </label>

          <label>Patient Name
            <input type="text" value={form.patient_name} onChange={(e) => setForm({...form, patient_name: e.target.value})} required />
          </label>

          {/* 2x2 Grid for Description */}
          <div className="desc-container">
            <label className="section-label">Description</label>
            <div className="description-grid">
              <input type="text" placeholder="Line 1" value={form.desc1} onChange={(e) => setForm({...form, desc1: e.target.value})} />
              <input type="text" placeholder="Line 2" value={form.desc2} onChange={(e) => setForm({...form, desc2: e.target.value})} />
              <input type="text" placeholder="Line 3" value={form.desc3} onChange={(e) => setForm({...form, desc3: e.target.value})} />
              <input type="text" placeholder="Line 4" value={form.desc4} onChange={(e) => setForm({...form, desc4: e.target.value})} />
            </div>
          </div>

          {/* Manual No. of Units */}
          <label>No. of Units
            <input type="text" placeholder="Enter units (e.g. 2)" value={form.no_of_units} onChange={(e) => setForm({...form, no_of_units: e.target.value})} />
          </label>

          <label>Shade Type
            <input type="text" value={form.shade_type} onChange={(e) => setForm({...form, shade_type: e.target.value})} />
          </label>

          {/* Manual Work Type */}
          <label>Work Type
            <input type="text" placeholder="Enter work type manually (e.g. Crown)" value={form.work_type} onChange={(e) => setForm({...form, work_type: e.target.value})} />
          </label>

          <label>Amount (₹)
            <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} required />
          </label>

          <div className="form-actions">
            <button type="submit">{editingEntryId ? 'Update' : 'Save'} Entry</button>
            <button type="button" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="search-section">
        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search entries by patient, doctor, hospital, or work type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <span className="search-clear" onClick={() => setSearchTerm('')}>×</span>
        )}
      </div>

      <div className="recent-entries">
        <h3>Recent Entries</h3>
        {loadingEntries ? (
          <p>Loading entries...</p>
        ) : filteredEntries.length === 0 ? (
          <p>{searchTerm ? 'No entries match your search.' : 'No entries found. Add your first entry above.'}</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Entry No</th>
                <th>Date</th>
                <th>Doctor</th>
                <th>Hospital</th>
                <th>Patient</th>
                <th>Work Type</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.entry_no}</td>
                  <td>{entry.entry_date}</td>
                  <td>{entry.doctor_name}</td>
                  <td>{entry.hospital_name}</td>
                  <td>{entry.patient_name}</td>
                  <td>{entry.work_type}</td>
                  <td>₹{entry.amount.toFixed(2)}</td>
                  <td>
                    <button onClick={() => handleEdit(entry)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AddEntry;