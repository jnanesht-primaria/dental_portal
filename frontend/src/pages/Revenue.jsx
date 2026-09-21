// frontend/src/pages/Revenue.jsx

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Revenue.css';
import { saveAs } from 'file-saver';


// ---------------------------------------------------------
// Format date: YYYY-MM-DD → DD/MM/YYYY
// ---------------------------------------------------------
const formatDate = (dateString) => {
  if (!dateString) return '';

  const [year, month, day] = dateString.split('-');

  return `${day}/${month}/${year}`;
};


// ---------------------------------------------------------
// Normalize any date string to a sortable "YYYY-MM-DD".
// Handles "YYYY-MM-DD" (already sortable) as well as
// "DD/MM/YYYY" or "DD-MM-YYYY" in case the API ever sends
// a display-formatted date. Using `new Date(...)` for
// sorting is unreliable across formats/browsers, which is
// what was causing entries to appear newest-first instead
// of oldest-first (e.g. "19 → 01" instead of "01 → 19").
// ---------------------------------------------------------
const toComparableDate = (dateStr) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3 && parts[2].length === 4) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return dateStr;
};


const Revenue = () => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('');
  const [hospitals, setHospitals] = useState([]);

  const [dateFrom, setDateFrom] = useState(
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    ).toISOString().split('T')[0]
  );

  const [dateTo, setDateTo] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const [totalAmount, setTotalAmount] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);

  const [doctorName, setDoctorName] = useState('');
  const [error, setError] = useState(null);
  const [filtered, setFiltered] = useState(false);


  // ---------------------------------------------------------
  // Load doctors
  // ---------------------------------------------------------
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await api.get('/doctors?active_only=true');
        setDoctors(res.data);
      } catch (err) {
        console.error('Error fetching doctors:', err);
        setError('Failed to load doctors.');
      }
    };

    fetchDoctors();
  }, []);


  // ---------------------------------------------------------
  // When doctor changes, update hospitals
  // ---------------------------------------------------------
  useEffect(() => {
    const doctor = doctors.find(
      d => d.id === parseInt(selectedDoctor)
    );

    if (doctor) {
      setDoctorName(doctor.doctor_name);
      setHospitals(doctor.hospitals || []);
      setSelectedHospital('');
    } else {
      setHospitals([]);
      setDoctorName('');
    }
  }, [selectedDoctor, doctors]);


  // ---------------------------------------------------------
  // Filter entries
  // ---------------------------------------------------------
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

      const params = {
        doctor_id: doctorId,
        date_from: dateFrom,
        date_to: dateTo
      };

      if (selectedHospital) {
        params.hospital_id = parseInt(selectedHospital);
      }

      console.log('🔍 Sending params:', params);

      const res = await api.get('/entries', { params });

      console.log('📥 Response data:', res.data);


      if (!Array.isArray(res.data)) {
        throw new Error('Unexpected response format');
      }


      // -----------------------------------------------------
      // Sort entries by date: oldest → newest (1 → 30 order)
      // Sorted on the normalized "YYYY-MM-DD" string rather
      // than `new Date(...)`, which was producing an
      // unreliable/reversed order.
      // -----------------------------------------------------
      const sortedEntries = [...res.data].sort((a, b) => {
        const dateA = toComparableDate(a.entry_date);
        const dateB = toComparableDate(b.entry_date);
        return dateA.localeCompare(dateB);
      });


      // Store sorted entries
      setEntries(sortedEntries);


      // -----------------------------------------------------
      // Calculate totals using sorted data
      // -----------------------------------------------------
      const total = sortedEntries.reduce(
        (sum, e) => sum + Number(e.amount || 0),
        0
      );

      const paid = sortedEntries.reduce(
        (sum, e) => sum + Number(e.paid_amount || 0),
        0
      );

      const balance = total - paid;


      setTotalAmount(total);
      setTotalPaid(paid);
      setTotalBalance(balance);

      setFiltered(true);

    } catch (err) {

      console.error('❌ Error fetching entries:', err);

      setError(
        err.response?.data?.error ||
        err.message ||
        'Failed to fetch entries'
      );

      setEntries([]);
      setTotalAmount(0);
      setTotalPaid(0);
      setTotalBalance(0);

    } finally {

      setLoading(false);

    }
  };


  // ---------------------------------------------------------
  // Export Excel
  // ---------------------------------------------------------
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

      const response = await api.post(
        '/reports/excel',
        params,
        {
          responseType: 'blob'
        }
      );

      const blob = new Blob(
        [response.data],
        {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      );

      saveAs(
        blob,
        `Bill_${doctorName || 'Doctor'}_${dateFrom}_to_${dateTo}.xlsx`
      );

    } catch (err) {

      console.error('Export error:', err);
      alert('Export failed. Check console.');

    }
  };


  // ---------------------------------------------------------
  // Print
  // ---------------------------------------------------------
  const handlePrint = () => {
    window.print();
  };


  return (

    <div className="page">

      <h2>Doctor Bill / Revenue</h2>


      {/* ---------------------------------------------------
          FILTERS
      --------------------------------------------------- */}

      <div className="filters no-print">

        <label>

          Doctor

          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
          >

            <option value="">
              Select Doctor
            </option>

            {doctors.map(d => (

              <option
                key={d.id}
                value={d.id}
              >
                {d.doctor_name}
              </option>

            ))}

          </select>

        </label>


        <label>

          Hospital

          <select
            value={selectedHospital}
            onChange={(e) =>
              setSelectedHospital(e.target.value)
            }
            disabled={!selectedDoctor}
          >

            <option value="">
              All Hospitals
            </option>

            {hospitals.map(h => (

              <option
                key={h.id}
                value={h.id}
              >
                {h.name}
              </option>

            ))}

          </select>

        </label>


        <label>

          From Date

          <input
            type="date"
            value={dateFrom}
            onChange={(e) =>
              setDateFrom(e.target.value)
            }
          />

        </label>


        <label>

          To Date

          <input
            type="date"
            value={dateTo}
            onChange={(e) =>
              setDateTo(e.target.value)
            }
          />

        </label>


        <button
          onClick={handleFilter}
          disabled={loading}
        >

          {loading
            ? 'Loading...'
            : 'Filter'
          }

        </button>


        <button
          onClick={exportExcel}
          disabled={entries.length === 0 || loading}
        >
          Export Excel
        </button>


        <button
          onClick={handlePrint}
          disabled={entries.length === 0 || loading}
        >
          Print Bill
        </button>

      </div>


      {/* ---------------------------------------------------
          ERROR
      --------------------------------------------------- */}

      {error && (

        <p
          className="error-message"
          style={{
            color: '#a0402a',
            marginTop: '12px'
          }}
        >
          Error: {error}
        </p>

      )}


      {/* ---------------------------------------------------
          BILL
      --------------------------------------------------- */}

      {filtered && (

        <>

          {entries.length > 0 ? (

            <div
              className="bill-container"
              id="bill-content"
            >

              <div className="bill-header">

                {/* Logo */}

                <img
                  src="/logo.jpeg"
                  alt="The Dental Art Laboratory"
                  className="bill-logo"
                />


                <h2>
                  THE DENTAL ART LABORATORY
                </h2>


                <p className="address-line">
                  Kamala Enclave, 3rd Floor, Near By Kanyakha Homes,
                  Kugler Hospital Road, Kothapet, GUNTUR-522001.
                </p>


                <p>
                  <strong>
                    Period:
                  </strong>{' '}
                  {formatDate(dateFrom)}
                  {' '}to{' '}
                  {formatDate(dateTo)}
                </p>


                {/* Doctor + Hospital */}

                <div className="header-meta-row">

                  <div className="meta-left">

                    <strong>
                      Doctor name:
                    </strong>{' '}

                    <span className="bold-value">
                      {doctorName}
                    </span>

                  </div>


                  <div className="meta-right">

                    <strong>
                      Hospital:
                    </strong>{' '}

                    <span className="bold-value">

                      {selectedHospital
                        ? hospitals.find(
                            h =>
                              h.id ===
                              parseInt(selectedHospital)
                          )?.name || 'All'
                        : 'All'
                      }

                    </span>

                  </div>

                </div>


                <div className="header-separator"></div>

              </div>


              {/* ------------------------------------------------
                  BILL TABLE
              ------------------------------------------------ */}

              <table className="bill-table">

                <thead>

                  <tr>

                    <th>
                      No.
                    </th>

                    <th>
                      Date
                    </th>

                    <th>
                      Description
                    </th>

                    <th>
                      Units
                    </th>

                    <th>
                      Work Type
                    </th>

                    <th>
                      Patient
                    </th>

                    <th>
                      Amount
                    </th>

                    <th>
                      Paid
                    </th>

                    <th>
                      Balance
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {entries.map((e, idx) => {

                    const lines =
                      (e.description || '')
                        .split('\n');

                    const paid =
                      Number(e.paid_amount || 0);

                    const balance =
                      e.balance_amount != null
                        ? Number(e.balance_amount)
                        : Number(e.amount || 0) - paid;


                    return (

                      <tr key={e.id}>

                        <td>
                          {idx + 1}
                        </td>


                        {/* DATE: DD/MM/YYYY */}

                        <td>
                          {formatDate(e.entry_date)}
                        </td>


                        <td>

                          <div className="desc-grid">

                            <div className="desc-cell">
                              {lines[0] || ''}
                            </div>

                            <div className="desc-cell">
                              {lines[1] || ''}
                            </div>

                            <div className="desc-cell">
                              {lines[2] || ''}
                            </div>

                            <div className="desc-cell">
                              {lines[3] || ''}
                            </div>

                          </div>

                        </td>


                        <td>
                          {e.no_of_units}
                        </td>


                        <td>
                          {e.work_type}
                        </td>


                        <td>
                          {e.patient_name}
                        </td>


                        <td>
                          ₹{Number(e.amount || 0).toFixed(2)}
                        </td>


                        <td>
                          ₹{paid.toFixed(2)}
                        </td>


                        <td>
                          ₹{balance.toFixed(2)}
                        </td>

                      </tr>

                    );

                  })}


                  {/* TOTAL */}

                  <tr className="total-row">

                    <td
                      colSpan="6"
                      style={{
                        textAlign: 'right',
                        fontWeight: 'bold'
                      }}
                    >
                      TOTAL
                    </td>


                    <td style={{ fontWeight: 'bold' }}>
                      ₹{totalAmount.toFixed(2)}
                    </td>


                    <td style={{ fontWeight: 'bold' }}>
                      ₹{totalPaid.toFixed(2)}
                    </td>


                    <td style={{ fontWeight: 'bold' }}>
                      ₹{totalBalance.toFixed(2)}
                    </td>

                  </tr>

                </tbody>

              </table>

            </div>

          ) : (

            <p
              style={{
                marginTop: '20px',
                color: '#8a8577'
              }}
            >
              No data found for the selected doctor in this period.
            </p>

          )}

        </>

      )}


      {/* ---------------------------------------------------
          INITIAL MESSAGE
      --------------------------------------------------- */}

      {!filtered && (

        <p
          style={{
            marginTop: '20px',
            color: '#b8b2a2'
          }}
        >

          Select a doctor and date range,
          then click <strong>Filter</strong> to view the bill.

        </p>

      )}

    </div>

  );

};


export default Revenue;