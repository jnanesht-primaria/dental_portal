// frontend/src/pages/Reports.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { saveAs } from 'file-saver';
import './Reports.css'; 

const Reports = () => {
  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [doctorId, setDoctorId] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [entries, setEntries] = useState([]);
  const [filtered, setFiltered] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [error, setError] = useState(null);

  // Load doctors & hospitals
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dRes, hRes] = await Promise.all([
          api.get('/api/doctors?active_only=true'),
          api.get('/api/hospitals?active_only=true')
        ]);
        setDoctors(dRes.data);
        setHospitals(hRes.data);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load doctors/hospitals.');
      }
    };
    fetchData();
  }, []);

  const handleFilter = async () => {
    if (!dateFrom || !dateTo) {
      alert('Please select date range.');
      return;
    }

    setLoading(true);
    setError(null);
    setFiltered(false);
    try {
      const params = {
        date_from: dateFrom,
        date_to: dateTo
      };
      if (doctorId) params.doctor_id = parseInt(doctorId);
      if (hospitalId) params.hospital_id = parseInt(hospitalId);

      console.log('🔍 Report params:', params);

      const res = await api.get('/api/entries', { params });
      console.log('📥 Report data:', res.data);

      if (!Array.isArray(res.data)) {
        throw new Error('Unexpected response format');
      }

      setEntries(res.data);
      const total = res.data.reduce((sum, e) => sum + e.amount, 0);
      setTotalAmount(total);
      setFiltered(true);
    } catch (err) {
      console.error('❌ Error fetching report:', err);
      setError(err.message || 'Failed to fetch report');
      setEntries([]);
      setTotalAmount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!dateFrom || !dateTo) {
      alert('Please select date range.');
      return;
    }
    setExporting(true);
    try {
      const params = {
        date_from: dateFrom,
        date_to: dateTo
      };
      if (doctorId) params.doctor_id = parseInt(doctorId);
      if (hospitalId) params.hospital_id = parseInt(hospitalId);

      const response = await api.post('/api/reports/excel', params, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Report_${dateFrom}_to_${dateTo}.xlsx`);
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed. Check console.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getDoctorName = (id) => {
    const doc = doctors.find(d => d.id === id);
    return doc ? doc.doctor_name : 'Unknown';
  };

  const getHospitalName = (id) => {
    const hosp = hospitals.find(h => h.id === id);
    return hosp ? hosp.hospital_name : 'Unknown';
  };

  return (
    <div className="page">
      <h2>Reports</h2>

      <div className="filters no-print">
        <label>
          From Date
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          To Date
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        <label>
          Doctor
          <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            <option value="">All Doctors</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.doctor_name}</option>
            ))}
          </select>
        </label>
        <label>
          Hospital
          <select value={hospitalId} onChange={(e) => setHospitalId(e.target.value)}>
            <option value="">All Hospitals</option>
            {hospitals.map(h => (
              <option key={h.id} value={h.id}>{h.hospital_name}</option>
            ))}
          </select>
        </label>
        <button onClick={handleFilter} disabled={loading}>
          {loading ? 'Loading...' : 'Filter'}
        </button>
        <button onClick={handleExportExcel} disabled={entries.length === 0 || exporting}>
          {exporting ? 'Exporting...' : 'Export Excel'}
        </button>
        <button onClick={handlePrint} disabled={entries.length === 0}>
          Print Report
        </button>
      </div>

      {error && <p className="error-message" style={{ color: '#a0402a', marginTop: '12px' }}>Error: {error}</p>}

      {filtered && (
        <>
          {entries.length > 0 ? (
            <div className="bill-container" id="bill-content">
              <div className="bill-header">
                <h2>THE DENTAL ART LABORATORY</h2>
                <p>Kamala Enclave, 3rd Floor, Near By Kanyakha Homes, Kugler Hospital Road, Kothapet, GUNTUR-522001.</p>
                <p><strong>Period:</strong> {dateFrom} to {dateTo}</p>
                {doctorId && <p><strong>Doctor:</strong> {getDoctorName(parseInt(doctorId))}</p>}
                {hospitalId && <p><strong>Hospital:</strong> {getHospitalName(parseInt(hospitalId))}</p>}
              </div>

              <table className="bill-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Date</th>
                    <th>Doctor</th>
                    <th>Hospital</th>
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
                        <td>{e.doctor_name}</td>
                        <td>{e.hospital_name}</td>
                        
                        {/* NEW 2x2 Description Grid */}
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
                    <td colSpan="8" style={{ textAlign: 'right', fontWeight: 'bold' }}>TOTAL</td>
                    <td style={{ fontWeight: 'bold' }}>₹{totalAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ marginTop: '20px', color: '#8a8577' }}>
              No data found for the selected filters.
            </p>
          )}
        </>
      )}

      {!filtered && (
        <p style={{ marginTop: '20px', color: '#b8b2a2' }}>
          Select a date range and click <strong>Filter</strong> to generate the report.
        </p>
      )}
    </div>
  );
};

export default Reports;