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

  const [filterMode, setFilterMode] = useState('range');

  const [dateFrom, setDateFrom] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [doctorName, setDoctorName] = useState('');
  const [error, setError] = useState(null);
  const [filtered, setFiltered] = useState(false);

  // ── Balance state (loaded from DB, editable, saved on button click) ──
  const [previousBalance, setPreviousBalance] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [savedPrev, setSavedPrev] = useState(0);
  const [savedPaid, setSavedPaid] = useState(0);
  const [isManualOverride, setIsManualOverride] = useState(false);

  // Separate saving/message state for each field
  const [savingPrev, setSavingPrev] = useState(false);
  const [savingPaid, setSavingPaid] = useState(false);
  const [prevMsg, setPrevMsg] = useState(null);
  const [paidMsg, setPaidMsg] = useState(null);

  // ── Auto-carry info ──
  const [autoCarriedTo, setAutoCarriedTo] = useState(null);
  const [autoCarrySkipped, setAutoCarrySkipped] = useState(false);

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

  useEffect(() => {
    const doctor = doctors.find(d => d.id === parseInt(selectedDoctor));
    if (doctor) {
      setDoctorName(doctor.doctor_name);
      setHospitals(doctor.hospitals || []);
      setSelectedHospital('');
    } else {
      setHospitals([]);
      setDoctorName('');
    }
  }, [selectedDoctor, doctors]);

  const buildFilterParams = () => {
    const params = { doctor_id: parseInt(selectedDoctor) };
    if (selectedHospital) params.hospital_id = parseInt(selectedHospital);
    if (filterMode === 'month') {
      params.month = selectedMonth;
    } else {
      params.date_from = dateFrom;
      params.date_to = dateTo;
    }
    params.entry_type = 'date';
    return params;
  };

  const carryMonth =
    filterMode === 'month'
      ? selectedMonth
      : (dateFrom ? dateFrom.slice(0, 7) : '');

  // ── Filter ──
  const handleFilter = async () => {
    if (!selectedDoctor) {
      alert('Please select a doctor.');
      return;
    }
    if (filterMode === 'range' && (!dateFrom || !dateTo)) {
      alert('Please select both From Date and To Date.');
      return;
    }
    if (filterMode === 'month' && !selectedMonth) {
      alert('Please select a month.');
      return;
    }

    setLoading(true);
    setError(null);
    setFiltered(false);
    setPrevMsg(null);
    setPaidMsg(null);
    setAutoCarriedTo(null);
    setAutoCarrySkipped(false);

    try {
      const params = buildFilterParams();
      const res = await api.get('/entries', { params });
      if (!Array.isArray(res.data)) throw new Error('Unexpected response format');

      const dateOnly = res.data.filter((e) => (e.entry_type || 'date') === 'date');
      setEntries(dateOnly);

      const total = dateOnly.reduce((sum, e) => sum + e.amount, 0);
      setTotalAmount(total);
      setFiltered(true);

      // Load balance + paid from DB for this month
      let loadedPrev = 0;
      let loadedPaid = 0;
      let loadedManual = false;

      if (carryMonth) {
        try {
          const bcParams = {
            doctor_id: parseInt(selectedDoctor),
            month: carryMonth,
          };
          if (selectedHospital) bcParams.hospital_id = parseInt(selectedHospital);
          const bcRes = await api.get('/balance_carry', { params: bcParams });
          loadedPrev = Number(bcRes.data?.previous_balance) || 0;
          loadedPaid = Number(bcRes.data?.paid_amount) || 0;
          loadedManual = !!bcRes.data?.is_manual_override;
        } catch (bcErr) {
          console.warn('Failed to load balance:', bcErr);
        }
      }

      setSavedPrev(loadedPrev);
      setSavedPaid(loadedPaid);
      setPreviousBalance(loadedPrev ? String(loadedPrev) : '');
      setPaidAmount(loadedPaid ? String(loadedPaid) : '');
      setIsManualOverride(loadedManual);

      // Auto-carry-forward for month mode (no manual save needed here)
      if (filterMode === 'month' && carryMonth) {
        await runAutoCarry(loadedPrev, loadedPaid);
      }
    } catch (err) {
      console.error('❌ Error fetching entries:', err);
      setError(err.message || 'Failed to fetch entries');
      setEntries([]);
      setTotalAmount(0);
      setSavedPrev(0);
      setSavedPaid(0);
      setPreviousBalance('');
      setPaidAmount('');
      setIsManualOverride(false);
    } finally {
      setLoading(false);
    }
  };

  // ── Auto-carry: just reads DB values, no user input required ──
  const runAutoCarry = async (prevValue, paidValue) => {
    if (!selectedDoctor || !carryMonth) return;
    try {
      const body = {
        doctor_id: parseInt(selectedDoctor),
        month: carryMonth,
        previous_balance: Number(prevValue) || 0,
        paid_amount: Number(paidValue) || 0,
      };
      if (selectedHospital) body.hospital_id = parseInt(selectedHospital);

      const autoRes = await api.post('/balance_carry/auto', body);
      const d = autoRes.data || {};

      if (d.current_month_is_manual_override) {
        setIsManualOverride(true);
      }

      if (d.next_month && d.next_month_previous_balance != null) {
        setAutoCarriedTo({
          month: d.next_month,
          amount: Number(d.next_month_previous_balance) || 0,
        });
      } else if (d.next_month_skipped_manual) {
        setAutoCarrySkipped(true);
      }
    } catch (e) {
      console.warn('Auto-carry failed:', e);
    }
  };

  // ── Save Previous Balance ──
  const handleSavePrev = async () => {
    if (!selectedDoctor || !carryMonth) return;

    const prevNum = parseFloat(previousBalance) || 0;
    setSavingPrev(true);
    setPrevMsg(null);
    try {
      const body = {
        doctor_id: parseInt(selectedDoctor),
        month: carryMonth,
        previous_balance: prevNum,
      };
      if (selectedHospital) body.hospital_id = parseInt(selectedHospital);

      await api.post('/balance_carry', body);
      setSavedPrev(prevNum);
      setIsManualOverride(true);
      setPrevMsg({ type: 'ok', text: 'Saved' });
      setTimeout(() => setPrevMsg(null), 2500);

      // Re-run auto-carry so next month picks up the new remaining
      await runAutoCarry(prevNum, parseFloat(paidAmount) || 0);
    } catch (err) {
      setPrevMsg({
        type: 'err',
        text: err.response?.data?.error || 'Save failed',
      });
    } finally {
      setSavingPrev(false);
    }
  };

  // ── Save Paid Amount ──
  const handleSavePaid = async () => {
    if (!selectedDoctor || !carryMonth) return;

    const paidNum = parseFloat(paidAmount) || 0;
    setSavingPaid(true);
    setPaidMsg(null);
    try {
      const body = {
        doctor_id: parseInt(selectedDoctor),
        month: carryMonth,
        paid_amount: paidNum,
      };
      if (selectedHospital) body.hospital_id = parseInt(selectedHospital);

      await api.post('/balance_carry', body);
      setSavedPaid(paidNum);
      setPaidMsg({ type: 'ok', text: 'Saved' });
      setTimeout(() => setPaidMsg(null), 2500);

      // Re-run auto-carry so next month picks up the new remaining
      await runAutoCarry(parseFloat(previousBalance) || 0, paidNum);
    } catch (err) {
      setPaidMsg({
        type: 'err',
        text: err.response?.data?.error || 'Save failed',
      });
    } finally {
      setSavingPaid(false);
    }
  };

  const currentPrevNum = parseFloat(previousBalance) || 0;
  const currentPaidNum = parseFloat(paidAmount) || 0;
  const prevUnsaved = currentPrevNum !== savedPrev;
  const paidUnsaved = currentPaidNum !== savedPaid;

  // ── Live computed values ──
  const totalDue = totalAmount + currentPrevNum;
  const remainingAmount = totalDue - currentPaidNum;

  const exportExcel = async () => {
    if (!filtered || entries.length === 0) {
      alert('Please click Filter first to load data.');
      return;
    }
    try {
      const params = buildFilterParams();
      const response = await api.post('/reports/excel', params, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const periodLabel =
        filterMode === 'month' ? selectedMonth : `${dateFrom}_to_${dateTo}`;
      saveAs(blob, `Bill_${doctorName || 'Doctor'}_${periodLabel}.xlsx`);
    } catch (err) {
      console.error('Export error:', err);
      let msg = 'Export failed.';
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try { msg = JSON.parse(text).error || msg; } catch {}
      } else if (err.response?.data?.error) {
        msg = err.response.data.error;
      }
      alert(msg);
    }
  };

  const handlePrint = () => window.print();

  const periodLabel =
    filterMode === 'month'
      ? (() => {
          const [y, m] = selectedMonth.split('-');
          const d = new Date(parseInt(y), parseInt(m) - 1, 1);
          return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        })()
      : `${dateFrom} to ${dateTo}`;

  const formatMonthLabel = (ym) => {
    if (!ym || ym.length < 7) return ym;
    const [y, m] = ym.split('-');
    return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
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
          <select
            value={selectedHospital}
            onChange={(e) => setSelectedHospital(e.target.value)}
            disabled={!selectedDoctor}
          >
            <option value="">All Hospitals</option>
            {hospitals.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </label>

        <label>
          Filter By
          <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)}>
            <option value="range">Date Range</option>
            <option value="month">Month</option>
          </select>
        </label>

        {filterMode === 'range' ? (
          <>
            <label>
              From Date
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </label>
            <label>
              To Date
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </label>
          </>
        ) : (
          <label>
            Month
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </label>
        )}

        <button onClick={handleFilter} disabled={loading}>
          {loading ? 'Loading...' : 'Filter'}
        </button>
        <button
          onClick={exportExcel}
          disabled={!filtered || entries.length === 0 || loading}
        >
          Export Excel
        </button>
        <button onClick={handlePrint} disabled={entries.length === 0 || loading}>
          Print Bill
        </button>
      </div>

      {error && (
        <p className="error-message" style={{ color: '#a0402a', marginTop: '12px' }}>
          Error: {error}
        </p>
      )}

      {filtered && (
        <>
          {entries.length > 0 ? (
            <div className="bill-container" id="bill-content">
              <div className="bill-header">
                <img src="/logo.jpeg" alt="The Dental Art Laboratory" className="bill-logo" />
                <h2>THE DENTAL ART LABORATORY</h2>
                <p className="address-line">
                  Kamala Enclave, 3rd Floor, Near By Kanyakha Homes, Kugler Hospital Road,
                  Kothapet, GUNTUR-522001.
                </p>
                <p><strong>Period:</strong> {periodLabel}</p>

                <div className="header-meta-row">
                  <div className="meta-left">
                    <strong>Doctor name:</strong> <span className="bold-value">{doctorName}</span>
                  </div>
                  <div className="meta-right">
                    <strong>Hospital:</strong>{' '}
                    <span className="bold-value">
                      {selectedHospital
                        ? hospitals.find(h => h.id === parseInt(selectedHospital))?.name || 'All'
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
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, idx) => {
                    const lines = (e.description || '').split('\n');
                    return (
                      <tr key={e.id}>
                        <td>{idx + 1}</td>
                        <td>{e.entry_date}</td>
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
                    <td colSpan="6" style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      TOTAL AMOUNT
                    </td>
                    <td style={{ fontWeight: 'bold' }}>₹{totalAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              {/* ── Balance block ── */}
              <div className="carry-section">
                {/* Previous Balance */}
                <div className="carry-row">
                  <label htmlFor="prev-balance">Previous Balance (₹):</label>
                  <input
                    id="prev-balance"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={previousBalance}
                    onChange={(e) => setPreviousBalance(e.target.value)}
                    className="carry-input"
                    disabled={savingPrev}
                  />
                  <button
                    type="button"
                    className="carry-save-btn"
                    onClick={handleSavePrev}
                    disabled={savingPrev || !prevUnsaved}
                    title={!prevUnsaved ? 'No changes to save' : 'Save Previous Balance'}
                  >
                    {savingPrev ? 'Saving...' : 'Save'}
                  </button>

                  {prevMsg && (
                    <span className={prevMsg.type === 'ok' ? 'carry-hint ok' : 'carry-hint err'}>
                      {prevMsg.text}
                    </span>
                  )}
                  {!prevMsg && prevUnsaved && !savingPrev && (
                    <span className="carry-hint warn">Unsaved changes</span>
                  )}
                  {!prevMsg && !prevUnsaved && isManualOverride && (
                    <span className="carry-hint manual">Manual</span>
                  )}
                  {!prevMsg && !prevUnsaved && !isManualOverride && savedPrev !== 0 && (
                    <span className="carry-hint auto">Auto-carried from last month</span>
                  )}
                </div>

                {/* Total Due (auto) */}
                <div className="carry-row">
                  <span>Total Due:</span>
                  <strong className="total-due-amount">
                    ₹{totalDue.toFixed(2)}
                  </strong>
                  <span className="carry-subtext">(Total Amount + Previous Balance)</span>
                </div>

                {/* Paid Amount */}
                <div className="carry-row">
                  <label htmlFor="paid-amount">Paid Amount (₹):</label>
                  <input
                    id="paid-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="carry-input"
                    disabled={savingPaid}
                  />
                  <button
                    type="button"
                    className="carry-save-btn"
                    onClick={handleSavePaid}
                    disabled={savingPaid || !paidUnsaved}
                    title={!paidUnsaved ? 'No changes to save' : 'Save Paid Amount'}
                  >
                    {savingPaid ? 'Saving...' : 'Save'}
                  </button>

                  {paidMsg && (
                    <span className={paidMsg.type === 'ok' ? 'carry-hint ok' : 'carry-hint err'}>
                      {paidMsg.text}
                    </span>
                  )}
                  {!paidMsg && paidUnsaved && !savingPaid && (
                    <span className="carry-hint warn">Unsaved changes</span>
                  )}
                </div>

                {/* Remaining */}
                <div className="carry-row remaining-row">
                  <span>Remaining Amount:</span>
                  <strong
                    className={
                      remainingAmount > 0
                        ? 'remaining-amount'
                        : 'remaining-amount settled'
                    }
                  >
                    ₹{remainingAmount.toFixed(2)}
                  </strong>
                </div>

                {autoCarriedTo && autoCarriedTo.amount > 0 && (
                  <div className="auto-carry-note">
                    → <strong>₹{autoCarriedTo.amount.toFixed(2)}</strong> will carry into{' '}
                    <strong>{formatMonthLabel(autoCarriedTo.month)}</strong> as the
                    Previous Balance.
                  </div>
                )}
                {autoCarriedTo && autoCarriedTo.amount === 0 && (
                  <div className="auto-carry-note completed">
                    ✓ Fully settled. Nothing carries into{' '}
                    <strong>{formatMonthLabel(autoCarriedTo.month)}</strong>.
                  </div>
                )}
                {autoCarrySkipped && (
                  <div className="auto-carry-note skipped">
                    ℹ {formatMonthLabel(autoCarriedTo?.month) || 'Next month'} has a manual
                    Previous Balance — auto-carry skipped.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p style={{ marginTop: '20px', color: '#8a8577' }}>
              No specific-date entries found for the selected doctor in this period.
            </p>
          )}
        </>
      )}

      {!filtered && (
        <p style={{ marginTop: '20px', color: '#b8b2a2' }}>
          Select a doctor, choose <strong>Date Range</strong> or <strong>Month</strong>,
          then click <strong>Filter</strong> to view the bill.
        </p>
      )}
    </div>
  );
};

export default Revenue;