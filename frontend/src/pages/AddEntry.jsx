// frontend/src/pages/AddEntry.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import './AddEntry.css';

const PER_PAGE = 25;

const AddEntry = () => {
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);

  // ── Filters ──
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ── Pagination ──
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  const emptyForm = {
    entry_type: 'date',
    entry_date: today,
    entry_month: thisMonth,
    doctor_id: '',
    hospital_id: '',
    patient_name: '',
    desc1: '', desc2: '', desc3: '', desc4: '',
    no_of_units: '1',
    rate_per_unit: '',
    paid_amount: '',
    shade_type: '',
    work_type: '',
    manual_amount: '',
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const res = await api.get('/doctors?active_only=true');
      setDoctors(res.data);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    }
  };

  // ── Fetch paginated entries ──
  const fetchRecentEntries = useCallback(async (targetPage = page) => {
    setLoadingEntries(true);
    try {
      const params = {
        paginate: 1,
        page: targetPage,
        per_page: PER_PAGE,
      };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.get('/entries', { params });
      const data = res.data || {};

      if (Array.isArray(data)) {
        // Fallback if backend returns array
        setEntries(data);
        setTotalPages(1);
        setTotalEntries(data.length);
      } else {
        setEntries(data.items || []);
        setTotalPages(data.pagination?.pages || 1);
        setTotalEntries(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error fetching entries:', err);
    } finally {
      setLoadingEntries(false);
    }
  }, [searchTerm, dateFrom, dateTo, page]);

  // Refetch when filters or page change (debounced for search)
  useEffect(() => {
    const t = setTimeout(() => {
      fetchRecentEntries(page);
    }, 300);
    return () => clearTimeout(t);
  }, [page, searchTerm, dateFrom, dateTo, fetchRecentEntries]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, dateFrom, dateTo]);

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

  const handleEntryTypeChange = (newType) => {
    setForm((prev) => ({
      ...prev,
      entry_type: newType,
      ...(newType === 'month'
        ? {
            patient_name: '',
            desc1: '', desc2: '', desc3: '', desc4: '',
            no_of_units: '1',
            rate_per_unit: '',
            shade_type: '',
            work_type: '',
          }
        : {
            manual_amount: '',
          }),
    }));
  };

  const unitsNum = parseInt(form.no_of_units) || 0;
  const rateNum = parseFloat(form.rate_per_unit) || 0;
  const computedAmount = unitsNum * rateNum;

  const amountNum =
    form.entry_type === 'month'
      ? parseFloat(form.manual_amount) || 0
      : computedAmount;

  const paidNum = parseFloat(form.paid_amount) || 0;
  const balanceAmount = amountNum - paidNum;

  const resetForm = () => {
    setForm(emptyForm);
    setHospitals([]);
    setEditingEntryId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.doctor_id || !form.hospital_id) {
      alert('Please select Doctor and Hospital.');
      return;
    }
    if (form.entry_type === 'month' && !form.entry_month) {
      alert('Please select an entry month.');
      return;
    }
    if (form.entry_type === 'date' && !form.entry_date) {
      alert('Please select an entry date.');
      return;
    }

    if (form.entry_type === 'date') {
      if (!form.patient_name) {
        alert('Please enter the Patient Name.');
        return;
      }
      if (unitsNum <= 0) {
        alert('No. of Units must be at least 1.');
        return;
      }
      if (rateNum <= 0) {
        alert('Rate Per Unit must be greater than 0.');
        return;
      }
    } else {
      if (amountNum <= 0) {
        alert('Please enter the monthly Amount.');
        return;
      }
    }

    if (paidNum < 0) {
      alert('Paid amount cannot be negative.');
      return;
    }
    if (paidNum > amountNum) {
      alert('Paid amount cannot exceed the total amount.');
      return;
    }

    const isMonth = form.entry_type === 'month';

    const combinedDescription = isMonth
      ? ''
      : [form.desc1, form.desc2, form.desc3, form.desc4].join('\n');

    const payload = {
      entry_type: form.entry_type,
      entry_date: isMonth ? `${form.entry_month}-01` : form.entry_date,
      entry_month: isMonth ? form.entry_month : null,
      doctor_id: parseInt(form.doctor_id),
      hospital_id: parseInt(form.hospital_id),
      patient_name: isMonth ? 'Monthly' : form.patient_name,
      description: combinedDescription,
      no_of_units: isMonth ? 1 : unitsNum,
      rate_per_unit: isMonth ? amountNum : rateNum,
      shade_type: isMonth ? '' : (form.shade_type || ''),
      work_type: isMonth ? '' : (form.work_type || ''),
      amount: amountNum,
      paid_amount: paidNum,
      balance_amount: balanceAmount,
    };

    try {
      if (editingEntryId) {
        await api.put(`/entries/${editingEntryId}`, payload);
        alert('Entry updated!');
      } else {
        await api.post('/entries', payload);
        alert('Entry saved!');
      }
      resetForm();
      await fetchRecentEntries(page);
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving entry');
    }
  };

  const handleEdit = (entry) => {
    setEditingEntryId(entry.id);

    const descriptionLines = (entry.description || '').split('\n');
    const entryType = entry.entry_type || 'date';
    const entryMonth = entry.entry_month || (entry.entry_date || '').slice(0, 7);

    const units = entry.no_of_units || 1;
    const derivedRate =
      entry.rate_per_unit != null && entry.rate_per_unit !== 0
        ? entry.rate_per_unit
        : (entry.amount || 0) / units;

    setForm({
      entry_type: entryType,
      entry_date: entry.entry_date || today,
      entry_month: entryMonth,
      doctor_id: entry.doctor_id,
      hospital_id: entry.hospital_id,
      patient_name: entryType === 'month' ? '' : (entry.patient_name || ''),
      desc1: descriptionLines[0] || '',
      desc2: descriptionLines[1] || '',
      desc3: descriptionLines[2] || '',
      desc4: descriptionLines[3] || '',
      no_of_units: String(entry.no_of_units ?? 1),
      rate_per_unit: String(derivedRate || ''),
      paid_amount: String(entry.paid_amount ?? 0),
      shade_type: entry.shade_type || '',
      work_type: entry.work_type || '',
      manual_amount: entryType === 'month' ? String(entry.amount ?? '') : '',
    });

    const doctor = doctors.find(d => d.id === entry.doctor_id);
    if (doctor) setHospitals(doctor.hospitals || []);
    setShowForm(true);
  };

  const formatMonth = (ym) => {
    if (!ym || ym.length < 7) return ym || '';
    const [y, m] = ym.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasFilters = searchTerm || dateFrom || dateTo;

  const isMonthMode = form.entry_type === 'month';

  return (
    <div className="page">
      <h2>Add New Dental Entry</h2>

      {!showForm && (
        <button className="add-entry-btn" onClick={() => setShowForm(true)}>
          + Add Entry
        </button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="vertical-form">
          <div className="form-header">
            <h3>{editingEntryId ? 'Edit Entry' : 'Add New Entry'}</h3>
            <button type="button" className="close-btn" onClick={resetForm} aria-label="Close form">×</button>
          </div>

          <label>Entry Period
            <select
              value={form.entry_type}
              onChange={(e) => handleEntryTypeChange(e.target.value)}
            >
              <option value="date">Specific Date</option>
              <option value="month">Month</option>
            </select>
          </label>

          {isMonthMode ? (
            <label>Entry Month
              <input
                type="month"
                value={form.entry_month}
                onChange={(e) => setForm({ ...form, entry_month: e.target.value })}
              />
            </label>
          ) : (
            <label>Entry Date
              <input
                type="date"
                value={form.entry_date}
                onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
              />
            </label>
          )}

          <label>Doctor
            <select value={form.doctor_id} onChange={handleDoctorChange}>
              <option value="">Select Doctor</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.doctor_name}</option>)}
            </select>
          </label>

          <label>Hospital
            <select
              value={form.hospital_id}
              onChange={(e) => setForm({
                ...form,
                hospital_id: e.target.value ? parseInt(e.target.value) : '',
              })}
              disabled={!form.doctor_id}
            >
              <option value="">Select Hospital</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </label>

          {!isMonthMode && (
            <>
              <label>Patient Name
                <input
                  type="text"
                  value={form.patient_name}
                  onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
                />
              </label>

              <div className="desc-container">
                <label className="section-label">Description</label>
                <div className="description-grid">
                  <input type="text" placeholder="Line 1" value={form.desc1} onChange={(e) => setForm({ ...form, desc1: e.target.value })} />
                  <input type="text" placeholder="Line 2" value={form.desc2} onChange={(e) => setForm({ ...form, desc2: e.target.value })} />
                  <input type="text" placeholder="Line 3" value={form.desc3} onChange={(e) => setForm({ ...form, desc3: e.target.value })} />
                  <input type="text" placeholder="Line 4" value={form.desc4} onChange={(e) => setForm({ ...form, desc4: e.target.value })} />
                </div>
              </div>

              <label>No. of Units
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.no_of_units}
                  onChange={(e) => setForm({ ...form, no_of_units: e.target.value })}
                />
              </label>

              <label>Rate Per Unit (₹)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 500"
                  value={form.rate_per_unit}
                  onChange={(e) => setForm({ ...form, rate_per_unit: e.target.value })}
                />
              </label>

              <label>Amount (₹) — auto-calculated
                <input
                  type="text"
                  value={computedAmount.toFixed(2)}
                  readOnly
                  className="balance-readonly"
                />
              </label>
            </>
          )}

          {isMonthMode && (
            <label>Amount (₹) — Monthly Total
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 50000"
                value={form.manual_amount}
                onChange={(e) => setForm({ ...form, manual_amount: e.target.value })}
              />
            </label>
          )}

          <div className="payment-grid">
            <label>Paid Amount (₹)
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.paid_amount}
                onChange={(e) => setForm({ ...form, paid_amount: e.target.value })}
              />
            </label>

            <label>Balance Amount (₹) — auto
              <input
                type="text"
                value={balanceAmount.toFixed(2)}
                readOnly
                className="balance-readonly"
              />
            </label>
          </div>

          {!isMonthMode && (
            <>
              <label>Shade Type
                <input
                  type="text"
                  value={form.shade_type}
                  onChange={(e) => setForm({ ...form, shade_type: e.target.value })}
                />
              </label>

              <label>Work Type
                <input
                  type="text"
                  placeholder="Enter work type manually (e.g. Crown)"
                  value={form.work_type}
                  onChange={(e) => setForm({ ...form, work_type: e.target.value })}
                />
              </label>
            </>
          )}

          <div className="form-actions">
            <button type="submit">{editingEntryId ? 'Update' : 'Save'} Entry</button>
            <button type="button" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      )}

      {/* ── Filters ── */}
      <div className="entries-filters">
        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Search by patient name, doctor name, or entry no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <span className="search-clear" onClick={() => setSearchTerm('')}>×</span>
          )}
        </div>

        <label className="filter-field">
          From Date
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>

        <label className="filter-field">
          To Date
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>

        {hasFilters && (
          <button
            type="button"
            className="clear-filters-btn"
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="recent-entries">
        <div className="entries-header">
          <h3>Recent Entries</h3>
          {!loadingEntries && totalEntries > 0 && (
            <span className="entries-count">
              {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>

        {loadingEntries ? (
          <p>Loading entries...</p>
        ) : entries.length === 0 ? (
          <p>
            {hasFilters
              ? 'No entries match your filters.'
              : 'No entries found. Add your first entry above.'}
          </p>
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Entry No</th>
                  <th>Date / Month</th>
                  <th>Doctor</th>
                  <th>Hospital</th>
                  <th>Patient</th>
                  <th>Units × Rate</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const isMonth = entry.entry_type === 'month';
                  const units = entry.no_of_units ?? 0;
                  const rate = entry.rate_per_unit ?? 0;
                  const periodLabel = isMonth && entry.entry_month
                    ? formatMonth(entry.entry_month)
                    : entry.entry_date;
                  return (
                    <tr key={entry.id}>
                      <td>{entry.entry_no}</td>
                      <td>{periodLabel}</td>
                      <td>{entry.doctor_name}</td>
                      <td>{entry.hospital_name}</td>
                      <td>{isMonth ? '—' : entry.patient_name}</td>
                      <td>{isMonth ? '—' : `${units} × ₹${rate.toFixed(2)}`}</td>
                      <td>₹{(entry.amount ?? 0).toFixed(2)}</td>
                      <td>₹{(entry.paid_amount ?? 0).toFixed(2)}</td>
                      <td>₹{(entry.balance_amount ?? ((entry.amount ?? 0) - (entry.paid_amount ?? 0))).toFixed(2)}</td>
                      <td>
                        <button onClick={() => handleEdit(entry)}>Edit</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  « First
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                >
                  ‹ Prev
                </button>

                <span className="page-info">
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                >
                  Next ›
                </button>
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                >
                  Last »
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AddEntry;