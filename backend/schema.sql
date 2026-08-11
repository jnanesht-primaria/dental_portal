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
