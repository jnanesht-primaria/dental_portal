// frontend/src/pages/Revenue.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Revenue.css';
import { saveAs } from 'file-saver';

const Revenue = () => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [doctorName, setDoctorName] = useState('');
  const [error, setError] = useState(null);
  const [filtered, setFiltered] = useState(false);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await api.get('/api/doctors?active_only=true');
        setDoctors(res.data);
      } catch (err) {
        console.error('Error fetching doctors:', err);
        setError('Failed to load doctors.');
      }
    };
    fetchDoctors();
  }, []);

  // When doctor changes, update hospitals list and reset hospital selection
  useEffect(() => {
    const doctor = doctors.find(d => d.id === parseInt(selectedDoctor));
    if (doctor) {
      setDoctorName(doctor.doctor_name);
      setHospitals(doctor.hospitals || []);
      setSelectedHospital(''); // reset hospital filter
    } else {
      setHospitals([]);
      setDoctorName('');
    }
  }, [selectedDoctor, doctors]);

  const handleFilter = async () => {
    if (!selectedDoctor || !dateFrom || !dateTo) {
      alert('Please select doctor and date range.');
      return;
    }

    setLoading(true);
    setError(null);
    setFiltered(false);
    try {
      const doctorId = parseInt(selectedDoctor);
      const params = { doctor_id: doctorId, date_from: dateFrom, date_to: dateTo };
      if (selectedHospital) {
        params.hospital_id = parseInt(selectedHospital);
      }
      console.log('🔍 Sending params:', params);

      const res = await api.get('/api/entries', { params });
      console.log('📥 Response data:', res.data);

      if (!Array.isArray(res.data)) {
        throw new Error('Unexpected response format');
      }

      setEntries(res.data);
      const total = res.data.reduce((sum, e) => sum + e.amount, 0);
      setTotalAmount(total);
      setFiltered(true);
    } catch (err) {
      console.error('❌ Error fetching entries:', err);
      setError(err.message || 'Failed to fetch entries');
      setEntries([]);
      setTotalAmount(0);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = async () => {
    if (!selectedDoctor || !dateFrom || !dateTo) {
      alert('Please select doctor and date range.');
      return;
    }
    try {
      const params = {
        doctor_id: parseInt(selectedDoctor),
        date_from: dateFrom,
        date_to: dateTo
      };
      if (selectedHospital) {
        params.hospital_id = parseInt(selectedHospital);
      }
      const response = await api.post('/api/reports/excel', params, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Bill_${doctorName || 'Doctor'}_${dateFrom}_to_${dateTo}.xlsx`);
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed. Check console.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page">
      <h2>Doctor Bill / Revenue</h2>

      <div className="filters no-print">
        <label>
          Doctor
          <select value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}>
            <option value="">Select Doctor</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.doctor_name}</option>
            ))}
          </select>
        </label>

        <label>
          Hospital
          <select value={selectedHospital} onChange={(e) => setSelectedHospital(e.target.value)} disabled={!selectedDoctor}>
            <option value="">All Hospitals</option>
            {hospitals.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </label>

        <label>
          From Date
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          To Date
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>

        <button onClick={handleFilter} disabled={loading}>
          {loading ? 'Loading...' : 'Filter'}
        </button>
        <button onClick={exportExcel} disabled={entries.length === 0 || loading}>
          Export Excel
        </button>
        <button onClick={handlePrint} disabled={entries.length === 0 || loading}>
          Print Bill
        </button>
      </div>

      {error && <p className="error-message" style={{ color: '#a0402a', marginTop: '12px' }}>Error: {error}</p>}

      {filtered && (
        <>
          {entries.length > 0 ? (
            <div className="bill-container" id="bill-content">
              <div className="bill-header">
                <h2>THE DENTAL ART LABORATORY</h2>
                <p className="address-line">Kamala Enclave, 3rd Floor, Near By Kanyakha Homes, Kugler Hospital Road, Kothapet, GUNTUR-522001.</p>
                
                {/* Centered elements */}
                <p><strong>Hospital:</strong> {selectedHospital ? hospitals.find(h => h.id === parseInt(selectedHospital))?.name || 'All' : 'All'}</p>
                <p><strong>Period:</strong> {dateFrom} to {dateTo}</p>
                
                {/* Left-aligned Doctor Name */}
                <p className="doctor-name-line-left"><strong>Doctor name:</strong> {doctorName}</p>
                
                {/* Thick Separator Line */}
                <div className="header-separator"></div>
              </div>

              <table className="bill-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Units</th>
                    <th>Work Type</th>
                    <th>Patient</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, idx) => {
                    // Split the description by newline into 4 parts
                    const lines = (e.description || '').split('\n');
                    return (
                      <tr key={e.id}>
                        <td>{idx + 1}</td>
                        <td>{e.entry_date}</td>
                        
                        {/* 2x2 Description Grid */}
                        <td>
                          <div className="desc-grid">
                            <div className="desc-cell">{lines[0] || ''}</div>
                            <div className="desc-cell">{lines[1] || ''}</div>
                            <div className="desc-cell">{lines[2] || ''}</div>
                            <div className="desc-cell">{lines[3] || ''}</div>
                          </div>
                        </td>

                        <td>{e.no_of_units}</td>
                        <td>{e.work_type}</td>
                        <td>{e.patient_name}</td>
                        <td>₹{e.amount.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  <tr className="total-row">
                    <td colSpan="6" style={{ textAlign: 'right', fontWeight: 'bold' }}>TOTAL</td>
                    <td style={{ fontWeight: 'bold' }}>₹{totalAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ marginTop: '20px', color: '#8a8577' }}>
              No data found for the selected doctor in this period.
            </p>
          )}
        </>
      )}

      {!filtered && (
        <p style={{ marginTop: '20px', color: '#b8b2a2' }}>
          Select a doctor and date range, then click <strong>Filter</strong> to view the bill.
        </p>
      )}
    </div>
  );
};

export default Revenue;