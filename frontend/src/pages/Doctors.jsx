// frontend/src/pages/Doctors.jsx

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Doctors.css';

const Doctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [manualHospitals, setManualHospitals] = useState('');

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

  // =========================
  // FETCH DOCTORS
  // =========================
  const fetchDoctors = async () => {
    try {
      const res = await api.get('/doctors');
      setDoctors(res.data || []);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    }
  };

  // =========================
  // FETCH HOSPITALS
  // =========================
  const fetchHospitals = async () => {
    try {
      const res = await api.get('/hospitals?active_only=true');
      setHospitals(res.data || []);
    } catch (err) {
      console.error('Error fetching hospitals:', err);
    }
  };

  // =========================
  // SAVE / UPDATE DOCTOR
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Always get latest hospitals
      let currentHospitals = hospitals;

      try {
        const hospitalRes = await api.get(
          '/hospitals?active_only=true'
        );

        currentHospitals = hospitalRes.data || [];
        setHospitals(currentHospitals);
      } catch (hospitalErr) {
        console.warn(
          'Could not refresh hospitals:',
          hospitalErr
        );
      }

      /*
       * IMPORTANT:
       *
       * Do NOT start with form.hospital_ids when editing.
       *
       * Previously:
       *
       * let finalHospitalIds = [...form.hospital_ids]
       *
       * This caused:
       *
       * AKK + ANNA
       *
       * instead of:
       *
       * ANNA
       *
       * Now the hospital IDs are rebuilt from the
       * current hospital names entered by the user.
       */

      let finalHospitalIds = [];

      // =========================
      // PROCESS HOSPITAL NAMES
      // =========================
      if (manualHospitals.trim() !== '') {
        const hospitalNames = manualHospitals
          .split(',')
          .map((name) => name.trim())
          .filter((name) => name !== '');

        const hospitalIds = [];

        for (const name of hospitalNames) {
          // Find existing hospital
          const existing = currentHospitals.find((h) => {
            const existingName =
              h.hospital_name ||
              h.name ||
              '';

            return (
              existingName.trim().toLowerCase() ===
              name.trim().toLowerCase()
            );
          });

          if (existing) {
            // Existing hospital - use its ID
            hospitalIds.push(existing.id);
          } else {
            // Hospital doesn't exist - create it
            try {
              const res = await api.post('/hospitals', {
                hospital_name: name,
                status: 'Active',
                address: ''
              });

              if (res.data?.id) {
                hospitalIds.push(res.data.id);

                // Add newly created hospital to current list
                currentHospitals = [
                  ...currentHospitals,
                  res.data
                ];
              }
            } catch (hospitalCreateErr) {
              const errorMessage =
                hospitalCreateErr.response?.data?.error ||
                hospitalCreateErr.response?.data?.message ||
                hospitalCreateErr.message ||
                '';

              console.warn(
                'Hospital creation error:',
                errorMessage
              );

              // If duplicate, refresh hospitals and find it
              if (
                errorMessage
                  .toLowerCase()
                  .includes('duplicate') ||
                errorMessage
                  .toLowerCase()
                  .includes('already exists')
              ) {
                const refreshedRes =
                  await api.get(
                    '/hospitals?active_only=true'
                  );

                const refreshedHospitals =
                  refreshedRes.data || [];

                currentHospitals =
                  refreshedHospitals;

                setHospitals(
                  refreshedHospitals
                );

                const duplicateHospital =
                  refreshedHospitals.find((h) => {
                    const existingName =
                      h.hospital_name ||
                      h.name ||
                      '';

                    return (
                      existingName
                        .trim()
                        .toLowerCase() ===
                      name.trim().toLowerCase()
                    );
                  });

                if (duplicateHospital) {
                  hospitalIds.push(
                    duplicateHospital.id
                  );
                } else {
                  throw hospitalCreateErr;
                }
              } else {
                throw hospitalCreateErr;
              }
            }
          }
        }

        // Remove duplicate IDs
        finalHospitalIds = [
          ...new Set(hospitalIds)
        ];
      } else {
        /*
         * If hospital field is empty,
         * remove all hospital relationships.
         */
        finalHospitalIds = [];
      }

      // =========================
      // FINAL PAYLOAD
      // =========================
      const payload = {
        doctor_name: form.doctor_name,
        designation: form.designation,
        phone: form.phone,
        email: form.email,
        address: form.address,
        role: form.role,
        status: form.status,

        // IMPORTANT:
        // This now contains ONLY the hospitals
        // currently entered in the form.
        hospital_ids: finalHospitalIds
      };

      console.log(
        'Saving doctor with payload:',
        payload
      );

      // =========================
      // UPDATE
      // =========================
      if (editing) {
        await api.put(
          `/doctors/${editing}`,
          payload
        );

        alert(
          'Doctor updated successfully'
        );
      }

      // =========================
      // ADD
      // =========================
      else {
        await api.post(
          '/doctors',
          payload
        );

        alert(
          'Doctor added successfully'
        );
      }

      // Reset form
      resetForm();

      // Refresh data
      await fetchDoctors();
      await fetchHospitals();

    } catch (err) {
      console.error(
        'Error saving doctor:',
        err
      );

      console.error(
        'Server response:',
        err.response?.data
      );

      alert(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Error saving doctor'
      );
    }
  };

  // =========================
  // RESET FORM
  // =========================
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

    setManualHospitals('');
    setEditing(null);
    setShowForm(false);
  };

  // =========================
  // DELETE DOCTOR
  // =========================
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this doctor?')) {
      return;
    }

    try {
      await api.delete(`/doctors/${id}`);

      await fetchDoctors();

      alert('Doctor deleted successfully');

    } catch (err) {
      console.error(
        'Error deleting doctor:',
        err
      );

      alert(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Error deleting doctor'
      );
    }
  };

  // =========================
  // EDIT DOCTOR
  // =========================
  const handleEdit = (doctor) => {
    setEditing(doctor.id);

    /*
     * Do not keep old hospital IDs here.
     *
     * The hospital field itself becomes the
     * source of truth during editing.
     */
    setForm({
      doctor_name:
        doctor.doctor_name || '',

      designation:
        doctor.designation || '',

      phone:
        doctor.phone || '',

      email:
        doctor.email || '',

      address:
        doctor.address || '',

      role:
        doctor.role || '',

      status:
        doctor.status || 'Active',

      hospital_ids: []
    });

    /*
     * Show the current hospitals in the input.
     *
     * Example:
     *
     * AKK
     *
     * User changes it to:
     *
     * ANNA
     *
     * On update only ANNA will be submitted.
     */
    setManualHospitals(
      (doctor.hospitals || [])
        .map(
          (h) =>
            h.hospital_name ||
            h.name ||
            ''
        )
        .filter(Boolean)
        .join(', ')
    );

    setShowForm(true);
  };

  // =========================
  // FILTER DOCTORS
  // =========================
  const filteredDoctors =
    doctors.filter((d) => {
      const term =
        searchTerm.toLowerCase();

      const matchesName =
        (d.doctor_name || '')
          .toLowerCase()
          .includes(term);

      const matchesPhone =
        (d.phone || '')
          .toLowerCase()
          .includes(term);

      const matchesHospital =
        (d.hospitals || []).some(
          (h) =>
            (
              h.hospital_name ||
              h.name ||
              ''
            )
              .toLowerCase()
              .includes(term)
        );

      return (
        matchesName ||
        matchesPhone ||
        matchesHospital
      );
    });

  return (
    <div className="page">

      <h2>Manage Doctors</h2>

      {/* =========================
          ADD DOCTOR
      ========================= */}
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

          setManualHospitals('');
        }}
      >
        + Add Doctor
      </button>

      {/* =========================
          DOCTOR FORM
      ========================= */}
      {(showForm || editing) && (
        <form
          onSubmit={handleSubmit}
          className="vertical-form"
        >
          <div className="form-header">

            <h3>
              {editing
                ? 'Edit Doctor'
                : 'Add New Doctor'}
            </h3>

            <button
              type="button"
              className="close-btn"
              onClick={resetForm}
              aria-label="Close form"
            >
              ×
            </button>

          </div>

          <input
            type="text"
            placeholder="Doctor Name *"
            value={form.doctor_name}
            onChange={(e) =>
              setForm({
                ...form,
                doctor_name:
                  e.target.value
              })
            }
            required
          />

          <input
            type="text"
            placeholder="Designation"
            value={form.designation}
            onChange={(e) =>
              setForm({
                ...form,
                designation:
                  e.target.value
              })
            }
          />

          <input
            type="text"
            placeholder="Phone *"
            value={form.phone}
            onChange={(e) =>
              setForm({
                ...form,
                phone:
                  e.target.value
              })
            }
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) =>
              setForm({
                ...form,
                email:
                  e.target.value
              })
            }
          />

          <input
            type="text"
            placeholder="Address"
            value={form.address}
            onChange={(e) =>
              setForm({
                ...form,
                address:
                  e.target.value
              })
            }
          />

          <input
            type="text"
            placeholder="Role (e.g. Prosthodontist)"
            value={form.role}
            onChange={(e) =>
              setForm({
                ...form,
                role:
                  e.target.value
              })
            }
          />

          <select
            value={form.status}
            onChange={(e) =>
              setForm({
                ...form,
                status:
                  e.target.value
              })
            }
          >
            <option value="Active">
              Active
            </option>

            <option value="Inactive">
              Inactive
            </option>
          </select>

          {/* =========================
              HOSPITALS
          ========================= */}
          <div
            className="form-group"
            style={{
              marginTop: '10px'
            }}
          >

            <label
              style={{
                fontWeight: 500,
                display: 'block',
                marginBottom: '5px'
              }}
            >
              Hospitals
            </label>

            <input
              type="text"
              placeholder="e.g. City Dental Clinic, Smile Care Hospital"
              value={manualHospitals}
              onChange={(e) =>
                setManualHospitals(
                  e.target.value
                )
              }
              style={{
                width: '100%',
                padding: '10px',
                border:
                  '1px solid #ddd',
                borderRadius: '6px'
              }}
            />

            <small
              style={{
                color: '#8a8577',
                fontSize: '12px',
                marginTop: '4px',
                display: 'block'
              }}
            >
              Enter hospital names separated
              by commas. When editing, the
              hospitals entered here will
              replace the doctor's existing
              hospitals.
            </small>

          </div>

          {/* =========================
              FORM ACTIONS
          ========================= */}
          <div
            className="form-actions"
            style={{
              marginTop: '15px'
            }}
          >

            <button type="submit">
              {editing
                ? 'Update'
                : 'Add'} Doctor
            </button>

            <button
              type="button"
              onClick={resetForm}
            >
              Cancel
            </button>

          </div>

        </form>
      )}

      {/* =========================
          SEARCH
      ========================= */}
      <div className="search-section">

        <input
          type="text"
          className="search-input"
          placeholder="🔍 Search doctors by name, phone, or hospital..."
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(
              e.target.value
            )
          }
        />

        {searchTerm && (
          <span
            className="search-clear"
            onClick={() =>
              setSearchTerm('')
            }
          >
            ×
          </span>
        )}

      </div>

      {/* =========================
          DOCTORS TABLE
      ========================= */}
      <table className="data-table">

        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Hospitals</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>

          {filteredDoctors.length > 0 ? (

            filteredDoctors.map((d) => (

              <tr key={d.id}>

                <td>
                  {d.doctor_name}
                </td>

                <td>
                  {d.phone}
                </td>

                <td>
                  {d.status}
                </td>

                <td>
                  {(d.hospitals || [])
                    .map(
                      (h) =>
                        h.hospital_name ||
                        h.name ||
                        ''
                    )
                    .filter(Boolean)
                    .join(', ')}
                </td>

                <td>

                  <button
                    onClick={() =>
                      handleEdit(d)
                    }
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      handleDelete(d.id)
                    }
                  >
                    Delete
                  </button>

                </td>

              </tr>

            ))

          ) : (

            <tr>

              <td
                colSpan="5"
                style={{
                  textAlign: 'center',
                  padding: '30px',
                  color: '#8a8577'
                }}
              >
                {searchTerm
                  ? 'No doctors match your search.'
                  : 'No doctors registered yet.'}
              </td>

            </tr>

          )}

        </tbody>

      </table>

    </div>
  );
};

export default Doctors;