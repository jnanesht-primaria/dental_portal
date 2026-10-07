// frontend/src/pages/Revenue.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toArray, errMsg } from '../utils/normalize';
import { saveAs } from 'file-saver';
import './Revenue.css';

// ---------------------------------------------------------
// Date helpers
// ---------------------------------------------------------
const formatDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

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
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0]
  );
  const [dateTo, setDateTo] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const [totalAmount, setTotalAmount] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);

  // ---- Balance-carry state ----
  const [previousBalance, setPreviousBalance] = useState('');
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [carryLoading, setCarryLoading] = useState(false);
  const [carrySaving, setCarrySaving] = useState(false);
  const [carryInfo, setCarryInfo] = useState(null); // response from /balance_carry/auto

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
        setDoctors(toArray(res.data, 'doctors'));
      } catch (err) {
        console.error('Error fetching doctors:', err);
        setError('Failed to load doctors.');
      }
    };
    fetchDoctors();
  }, []);

  // ---------------------------------------------------------
  // When doctor changes, refresh hospital list
  // ---------------------------------------------------------
  useEffect(() => {
    const doctor = doctors.find((d) => d.id === parseInt(selectedDoctor));
    if (doctor) {
      setDoctorName(doctor.doctor_name);
      setHospitals(toArray(doctor.hospitals, 'hospitals'));
      setSelectedHospital('');
    } else {
      setHospitals([]);
      setDoctorName('');
    }
  }, [selectedDoctor, doctors]);

  // ---------------------------------------------------------
  // Derive the current month key. Only valid if from/to fall
  // within the same calendar month — otherwise balance-carry
  // is meaningless and we hide the panel.
  // ---------------------------------------------------------
  const sameMonth =
    dateFrom && dateTo && dateFrom.slice(0, 7) === dateTo.slice(0, 7);
  const monthKey = sameMonth ? dateFrom.slice(0, 7) : null;

  // ---------------------------------------------------------
  // Load the current month's balance-carry row whenever
  // doctor / hospital / month changes.
  // ---------------------------------------------------------
  useEffect(() => {
    if (!selectedDoctor || !monthKey) {
      setPreviousBalance('');
      setPaidAmountInput('');
      setCarryInfo(null);
      return;
    }

    let cancelled = false;
    const fetchCarry = async () => {
      setCarryLoading(true);
      try {
        const params = {
          doctor_id: parseInt(selectedDoctor),
          month: monthKey,
        };
        if (selectedHospital) params.hospital_id = parseInt(selectedHospital);

        const res = await api.get('/balance_carry', { params });
        if (cancelled) return;

        setPreviousBalance(String(Number(res.data?.previous_balance ?? 0)));
        setPaidAmountInput(String(Number(res.data?.paid_amount ?? 0)));
        setCarryInfo(null);
      } catch (err) {
        if (!cancelled) {
          console.error('Balance carry fetch failed:', err);
          setPreviousBalance('0');
          setPaidAmountInput('0');
        }
      } finally {
        if (!cancelled) setCarryLoading(false);
      }
    };

    fetchCarry();
    return () => {
      cancelled = true;
    };
  }, [selectedDoctor, selectedHospital, monthKey]);

  // ---------------------------------------------------------
  // Auto-carry: persist this month's values and write
  // remaining → next month's previous_balance.
  // ---------------------------------------------------------
  const runAutoCarry = async (doctorId, hospitalId, month) => {
    setCarrySaving(true);
    try {
      const body = {
        doctor_id: doctorId,
        month,
        previous_balance: previousBalance === '' ? 0 : Number(previousBalance),
        paid_amount: paidAmountInput === '' ? 0 : Number(paidAmountInput),
      };
      if (hospitalId) body.hospital_id = hospitalId;

      const res = await api.post('/balance_carry/auto', body);
      setCarryInfo(res.data);

      // Reflect any server-side normalisation back into inputs
      if (res.data?.previous_balance != null) {
        setPreviousBalance(String(res.data.previous_balance));
      }
      if (res.data?.paid_amount != null) {
        setPaidAmountInput(String(res.data.paid_amount));
      }
    } catch (err) {
      console.error('Auto carry failed:', err);
      setError(errMsg(err, 'Failed to carry forward balance'));
    } finally {
      setCarrySaving(false);
    }
  };

  // ---------------------------------------------------------
  // Filter entries + auto-run carry forward
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
        date_to: dateTo,
      };
      if (selectedHospital) params.hospital_id = parseInt(selectedHospital);

      const res = await api.get('/entries', { params });

      const sortedEntries = toArray(res.data, 'entries', 'items').sort(
        (a, b) =>
          toComparableDate(a.entry_date).localeCompare(
            toComparableDate(b.entry_date)
          )
      );

      setEntries(sortedEntries);

      const total = sortedEntries.reduce(
        (sum, e) => sum + Number(e.amount || 0),
        0
      );
      const paid = sortedEntries.reduce(
        (sum, e) => sum + Number(e.paid_amount || 0),
        0
      );

      setTotalAmount(total);
      setTotalPaid(paid);
      setTotalBalance(total - paid);
      setFiltered(true);

      // ---- Auto-carry forward to next month ----
      if (monthKey) {
        await runAutoCarry(
          doctorId,
          selectedHospital ? parseInt(selectedHospital) : undefined,
          monthKey
        );
      }
    } catch (err) {
      console.error('❌ Error fetching entries:', err);
      setError(errMsg(err, 'Failed to fetch entries'));
      setEntries([]);
      setTotalAmount(0);
      setTotalPaid(0);
      setTotalBalance(0);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // Manual "Save & Carry Forward" button
  // ---------------------------------------------------------
  const handleSaveAndCarry = async () => {
    if (!selectedDoctor || !monthKey) return;
    await runAutoCarry(
      parseInt(selectedDoctor),
      selectedHospital ? parseInt(selectedHospital) : undefined,
      monthKey
    );
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
        date_to: dateTo,
      };
      if (selectedHospital) params.hospital_id = parseInt(selectedHospital);

      const response = await api.post('/reports/excel', params, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(
        blob,
        `Bill_${doctorName || 'Doctor'}_${dateFrom}_to_${dateTo}.xlsx`
      );
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed. Check console.');
    }
  };

  const handlePrint = () => window.print();

  // ---------------------------------------------------------
  // Derived numbers for the carry panel
  // ---------------------------------------------------------
  const prevNum = Number(previousBalance) || 0;
  const paidInputNum = Number(paidAmountInput) || 0;
  const totalDue = totalAmount + prevNum;
  const remainingComputed = Math.max(0, totalDue - paidInputNum);

  return (
    <div className="page">
      <h2>Doctor Bill / Revenue</h2>

      {/* ------------------- FILTERS ------------------- */}
      <div className="filters no-print">
        <label>
          Doctor
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
          >
            <option value="">Select Doctor</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.doctor_name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Hospital
          <select
            value={selectedHospital}
            onChange={(e) => setSelectedHospital(e.target.value)}
            disabled={!selectedDoctor}
          >
            <option value="">All Hospitals</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
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
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>

        <label>
          To Date
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>

        <button onClick={handleFilter} disabled={loading}>
          {loading ? 'Loading...' : 'Filter'}
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

      {error && (
        <p
          className="error-message"
          style={{ color: '#a0402a', marginTop: 12 }}
        >
          Error: {error}
        </p>
      )}

      {/* ------------------- BALANCE CARRY PANEL ------------------- */}
      {selectedDoctor && monthKey && (
        <div
          className="balance-carry-panel no-print"
          style={{
            marginTop: 16,
            padding: 16,
            border: '1px solid #e8e3d6',
            borderRadius: 8,
            background: '#faf8f3',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <h3 style={{ margin: 0 }}>Balance Carry Forward</h3>
            <span style={{ color: '#8a8577', fontSize: 14 }}>
              Month: <strong>{monthKey}</strong>
              {carryLoading && ' (loading…)'}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            <label>
              Previous Balance (₹)
              <input
                type="number"
                step="0.01"
                value={previousBalance}
                onChange={(e) => setPreviousBalance(e.target.value)}
              />
            </label>

            <label>
              Total Amount this month (₹)
              <input type="text" value={totalAmount.toFixed(2)} readOnly />
            </label>

            <label>
              Total Due (₹)
              <input type="text" value={totalDue.toFixed(2)} readOnly />
            </label>

            <label>
              Paid Amount (₹)
              <input
                type="number"
                step="0.01"
                value={paidAmountInput}
                onChange={(e) => setPaidAmountInput(e.target.value)}
              />
            </label>

            <label>
              Remaining (₹)
              <input
                type="text"
                value={remainingComputed.toFixed(2)}
                readOnly
                style={{ fontWeight: 600 }}
              />
            </label>
          </div>

          <div
            style={{
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <button
              onClick={handleSaveAndCarry}
              disabled={carrySaving || carryLoading}
            >
              {carrySaving ? 'Saving…' : 'Save & Carry Forward'}
            </button>

            {carryInfo && (
              <span style={{ color: '#5F8B8F', fontSize: 14 }}>
                Carried ₹{Number(carryInfo.remaining ?? 0).toFixed(2)} →{' '}
                <strong>{carryInfo.next_month || 'next month'}</strong>
                {carryInfo.next_month_skipped_manual &&
                  ' (skipped: next month is a manual override)'}
              </span>
            )}
          </div>
        </div>
      )}

      {selectedDoctor && !monthKey && (
        <p style={{ color: '#a0402a', marginTop: 12 }} className="no-print">
          Balance carry is disabled because the selected date range spans more
          than one month. Pick dates within a single month to enable it.
        </p>
      )}

      {/* ------------------- BILL ------------------- */}
      {filtered && (
        <>
          {entries.length > 0 ? (
            <div className="bill-container" id="bill-content">
              <div className="bill-header">
                <img
                  src="/logo.jpeg"
                  alt="The Dental Art Laboratory"
                  className="bill-logo"
                />
                <h2>THE DENTAL ART LABORATORY</h2>
                <p className="address-line">
                  Kamala Enclave, 3rd Floor, Near By Kanyakha Homes, Kugler
                  Hospital Road, Kothapet, GUNTUR-522001.
                </p>
                <p>
                  <strong>Period:</strong> {formatDate(dateFrom)} to{' '}
                  {formatDate(dateTo)}
                </p>
                <div className="header-meta-row">
                  <div className="meta-left">
                    <strong>Doctor name:</strong>{' '}
                    <span className="bold-value">{doctorName}</span>
                  </div>
                  <div className="meta-right">
                    <strong>Hospital:</strong>{' '}
                    <span className="bold-value">
                      {selectedHospital
                        ? hospitals.find(
                            (h) => h.id === parseInt(selectedHospital)
                          )?.name || 'All'
                        : 'All'}
                    </span>
                  </div>
                </div>
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
                    <th>Paid</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, idx) => {
                    const lines = (e.description || '').split('\n');
                    const paid = Number(e.paid_amount || 0);
                    const balance =
                      e.balance_amount != null
                        ? Number(e.balance_amount)
                        : Number(e.amount || 0) - paid;
                    return (
                      <tr key={e.id}>
                        <td>{idx + 1}</td>
                        <td>{formatDate(e.entry_date)}</td>
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
                        <td>₹{Number(e.amount || 0).toFixed(2)}</td>
                        <td>₹{paid.toFixed(2)}</td>
                        <td>₹{balance.toFixed(2)}</td>
                      </tr>
                    );
                  })}

                  <tr className="total-row">
                    <td
                      colSpan="6"
                      style={{ textAlign: 'right', fontWeight: 'bold' }}
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

                  {/* ---- Balance carry summary rows (inside the printed bill) ---- */}
                  {monthKey && (
                    <>
                      <tr>
                        <td
                          colSpan="7"
                          style={{ textAlign: 'right', fontWeight: 'bold' }}
                        >
                          Previous Balance (₹):
                        </td>
                        <td colSpan="2" style={{ fontWeight: 'bold' }}>
                          ₹{prevNum.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td
                          colSpan="7"
                          style={{ textAlign: 'right', fontWeight: 'bold' }}
                        >
                          Total Due (₹):
                        </td>
                        <td colSpan="2" style={{ fontWeight: 'bold' }}>
                          ₹{totalDue.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td
                          colSpan="7"
                          style={{ textAlign: 'right', fontWeight: 'bold' }}
                        >
                          Paid Amount (₹):
                        </td>
                        <td colSpan="2" style={{ fontWeight: 'bold' }}>
                          ₹{paidInputNum.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td
                          colSpan="7"
                          style={{ textAlign: 'right', fontWeight: 'bold' }}
                        >
                          Remaining Amount (₹):
                        </td>
                        <td colSpan="2" style={{ fontWeight: 'bold' }}>
                          ₹{remainingComputed.toFixed(2)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ marginTop: 20, color: '#8a8577' }}>
              No data found for the selected doctor in this period.
            </p>
          )}
        </>
      )}

      {!filtered && (
        <p style={{ marginTop: 20, color: '#b8b2a2' }}>
          Select a doctor and date range, then click <strong>Filter</strong> to
          view the bill.
        </p>
      )}
    </div>
  );
};

export default Revenue;