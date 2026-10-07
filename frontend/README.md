CREATE TABLE `balance_carry` (
  `id` int NOT NULL AUTO_INCREMENT,
  `doctor_id` int NOT NULL,
  `hospital_id` int DEFAULT NULL,
  `month` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `previous_balance` decimal(10,2) NOT NULL,
  `paid_amount` decimal(10,2) NOT NULL,
  `is_manual_override` tinyint(1) NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_balance_carry` (`doctor_id`,`hospital_id`,`month`),
  KEY `ix_balance_carry_hospital_id` (`hospital_id`),
  KEY `ix_balance_carry_doctor_id` (`doctor_id`),
  KEY `ix_balance_carry_month` (`month`),
  CONSTRAINT `balance_carry_ibfk_1` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `balance_carry_ibfk_2` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`) ON DELETE SET NULL
);

CREATE TABLE `dental_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entry_no` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entry_date` date NOT NULL DEFAULT (curdate()),
  `entry_type` enum('date','month') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'date',
  `entry_month` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `doctor_id` int NOT NULL,
  `hospital_id` int NOT NULL,
  `patient_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `no_of_units` int DEFAULT '1',
  `rate_per_unit` decimal(10,2) NOT NULL DEFAULT '0.00',
  `shade_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `work_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `paid_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `balance_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `entry_no` (`entry_no`),
  KEY `created_by` (`created_by`),
  KEY `idx_entries_date` (`entry_date`),
  KEY `idx_entries_doctor` (`doctor_id`),
  KEY `idx_entries_hospital` (`hospital_id`),
  CONSTRAINT `dental_entries_ibfk_1` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `dental_entries_ibfk_2` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `dental_entries_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE `doctor_hospital` (
  `doctor_id` int NOT NULL,
  `hospital_id` int NOT NULL,
  PRIMARY KEY (`doctor_id`,`hospital_id`),
  KEY `hospital_id` (`hospital_id`),
  CONSTRAINT `doctor_hospital_ibfk_1` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `doctor_hospital_ibfk_2` FOREIGN KEY (`hospital_id`) REFERENCES `hospitals` (`id`) ON DELETE CASCADE
);

CREATE TABLE `doctors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `doctor_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `designation` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('Active','Inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE `hospitals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hospital_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_person` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('Active','Inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'Active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hospital_name` (`hospital_name`)
);

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','technician','front_desk') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'technician',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
);