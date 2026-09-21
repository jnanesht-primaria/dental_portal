backend/
├── app.py
├── config.py
├── models.py
├── requirements.txt
├── seed.py                 # optional: seed initial data
├── services/
│   ├── __init__.py
│   ├── doctor_service.py
│   ├── hospital_service.py
│   ├── entry_service.py
│   ├── revenue_service.py
│   ├── report_service.py
│   └── dashboard_service.py
├── routes/
│   ├── __init__.py
│   ├── auth.py
│   ├── doctors.py
│   ├── hospitals.py
│   ├── entries.py
│   ├── revenue.py
│   ├── reports.py
│   └── dashboard.py
└── utils/
    ├── __init__.py
    └── jwt_utils.py
frontend/
├── index.html
├── package.json
├── vite.config.js            (or create-react-app)
├── .env
├── public/
│   └── favicon.ico
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── services/
│   │   ├── api.js            (axios instance with interceptors)
│   │   └── auth.js           (login, logout, token helpers)
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Doctors.jsx
│   │   ├── Hospitals.jsx
│   │   ├── AddEntry.jsx
│   │   ├── Revenue.jsx
│   │   ├── Reports.jsx
│   │   └── NotFound.jsx
│   ├── components/
│   │   ├── Layout.jsx        (wrapper with Sidebar + Navbar)
│   │   ├── Sidebar.jsx
│   │   ├── Navbar.jsx
│   │   ├── StatCard.jsx
│   │   ├── ChartCard.jsx
│   │   ├── DoctorSelect.jsx
│   │   ├── HospitalSelect.jsx
│   │   ├── LoadingSpinner.jsx
│   │   └── ErrorAlert.jsx
│   └── utils/
│       └── helpers.js        (date formatting, etc.)
frontend/src/
├── index.css                     # Global reset, body, fonts
├── App.css                       # Main layout (sidebar, main area, etc.)
├── components/
│   ├── Layout.css                (optional, imported in Layout)
│   ├── Sidebar.css
│   ├── Navbar.css
│   ├── StatCard.css
│   └── ChartCard.css
└── pages/
    ├── Login.css
    ├── Dashboard.css
    ├── Doctors.css
    ├── Hospitals.css
    ├── AddEntry.css
    ├── Revenue.css
    └── Reports.css