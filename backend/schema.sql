-- Dental Laboratory - login database schema
-- Run this once against your MySQL server:
--   mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS dental_lab
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE dental_lab;

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(120) NOT NULL,
  role          ENUM('admin', 'technician', 'front_desk') NOT NULL DEFAULT 'technician',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Demo / seed account for local testing only.
-- Username: admin
-- Email:    admin@dentallab.local
-- Password: Lab@Demo123
-- (password_hash below was generated with werkzeug.security.generate_password_hash)
INSERT INTO users (username, email, password_hash, full_name, role)
VALUES (
  'admin',
  'admin@dentallab.local',
  'scrypt:32768:8:1$jim9BrpepaUa8FaU$15c77528915f1270af245197040a08fc2df67ee5b93c13d896dc1e0fb1ca88c124622065a644f6c192eacd59f1736463896c60ae614622a280de1a29bb89e8e8',
  'Lab Administrator',
  'admin'
)
ON DUPLICATE KEY UPDATE username = username;

-- This account exists only so you can log in during development.
-- Delete or replace it (see backend/create_user.py) before deploying anywhere real.
select * from users;
CREATE TABLE IF NOT EXISTS doctors (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  doctor_name   VARCHAR(100) NOT NULL,
  designation   VARCHAR(100),
  phone         VARCHAR(20)  NOT NULL,
  email         VARCHAR(120),
  address       VARCHAR(200),
  role          VARCHAR(100),            -- e.g., Prosthodontist
  status        ENUM('Active', 'Inactive') DEFAULT 'Active',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. Hospitals master table
-- ============================================================
CREATE TABLE IF NOT EXISTS hospitals (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  hospital_name   VARCHAR(150) NOT NULL UNIQUE,
  contact_person  VARCHAR(100),
  phone           VARCHAR(20),
  address         VARCHAR(200),
  status          ENUM('Active', 'Inactive') DEFAULT 'Active',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. Many-to-many mapping between doctors and hospitals
-- ============================================================
CREATE TABLE IF NOT EXISTS doctor_hospital (
  doctor_id   INT NOT NULL,
  hospital_id INT NOT NULL,
  PRIMARY KEY (doctor_id, hospital_id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- ============================================================
-- 5. Dental entries (daily work records)
-- ============================================================
CREATE TABLE IF NOT EXISTS dental_entries (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  entry_no      VARCHAR(20) NOT NULL UNIQUE,   -- e.g., ENTRY-20260811-001
  entry_date    DATE NOT NULL DEFAULT (CURRENT_DATE),
  doctor_id     INT NOT NULL,
  hospital_id   INT NOT NULL,
  patient_name  VARCHAR(100) NOT NULL,
  description   TEXT,
  no_of_units   INT DEFAULT 1,
  shade_type    VARCHAR(20),
  work_type     VARCHAR(50),
  amount        DECIMAL(10,2) NOT NULL,
  created_by    INT,     -- user id (receptionist)
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- (Optional) Indexes for faster queries
-- ============================================================
CREATE INDEX idx_entries_date ON dental_entries(entry_date);
CREATE INDEX idx_entries_doctor ON dental_entries(doctor_id);
CREATE INDEX idx_entries_hospital ON dental_entries(hospital_id);

-- ============================================================
-- 6. Seed data for demonstration
-- ============================================================
INSERT INTO doctors (doctor_name, designation, phone, email, address, role, status)
VALUES (
  'Dr. Kishore',
  'Prosthodontist',
  '9876543210',
  'kishore@clinic.com',
  'Guntur',
  'Prosthodontist',
  'Active'
)
ON DUPLICATE KEY UPDATE doctor_name = doctor_name;   -- (no unique, but prevents duplicate if you add unique later)

INSERT INTO hospitals (hospital_name, contact_person, phone, address, status)
VALUES (
  'Primaria1',
  'Dr. Rao',
  '9876543211',
  'Guntur',
  'Active'
)
ON DUPLICATE KEY UPDATE hospital_name = hospital_name;

-- Link the doctor to the hospital
INSERT IGNORE INTO doctor_hospital (doctor_id, hospital_id)
VALUES (1, 1);   -- assuming IDs are 1 after insert

-- Add a sample entry
INSERT INTO dental_entries (
  entry_no, entry_date, doctor_id, hospital_id,
  patient_name, description, no_of_units, shade_type, work_type, amount, created_by
) VALUES (
  'ENTRY-20260811-001',
  CURDATE(),
  1,   -- Dr. Kishore
  1,   -- Primaria1
  'Jnanesh',
  'Zirconia Crown',
  2,
  'A2',
  'Crown',
  1000.00,
  (SELECT id FROM users WHERE username = 'admin')
);

-- ============================================================
-- Verify data
-- ============================================================
SELECT 'Users:' AS '';
SELECT * FROM users;

SELECT 'Doctors:' AS '';
SELECT * FROM doctors;

SELECT 'Hospitals:' AS '';
SELECT * FROM hospitals;

SELECT 'Doctor-Hospital mapping:' AS '';
SELECT d.doctor_name, h.hospital_name
FROM doctors d
JOIN doctor_hospital dh ON d.id = dh.doctor_id
JOIN hospitals h ON h.id = dh.hospital_id;

SELECT 'Dental entries:' AS '';
SELECT * FROM dental_entries;
SELECT * FROM dental_entries WHERE entry_no = 'ENTRY-20260811-001';
SELECT id, doctor_name FROM doctors;
SELECT * FROM dental_entries 
WHERE doctor_id = 1 
AND DATE(entry_date) >= '2026-08-01' 
AND DATE(entry_date) <= '2026-08-11' 
ORDER BY entry_date DESC;
