-- ============================================================
-- DRHire – MySQL 8+ Database Schema
-- Run once to create all tables.
-- Execute: mysql -u root -p drhire < schema.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ── Database ──────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS drhire
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE drhire;

-- ── users ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            INT UNSIGNED     AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255)     NOT NULL UNIQUE,
    password_hash VARCHAR(255)     NOT NULL,
    role          ENUM('admin','doctor','hospital','staff') NOT NULL,
    status        ENUM('active','suspended','pending') NOT NULL DEFAULT 'pending',
    created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role   (role),
    INDEX idx_users_status (status)
) ENGINE=InnoDB;

-- ── doctor_profiles ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctor_profiles (
    id                INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    user_id           INT UNSIGNED  NOT NULL UNIQUE,
    full_name         VARCHAR(255)  NOT NULL,
    phone             VARCHAR(30)   NOT NULL DEFAULT '',
    specialization    VARCHAR(150)  NOT NULL DEFAULT '',
    qualification     VARCHAR(150)  NOT NULL DEFAULT '',
    experience_years  TINYINT UNSIGNED NOT NULL DEFAULT 0,
    license_no        VARCHAR(100)  NOT NULL DEFAULT '',
    clinic_address    VARCHAR(500)  NOT NULL DEFAULT '',
    city              VARCHAR(100)  NOT NULL DEFAULT '',
    state             VARCHAR(100)  NOT NULL DEFAULT '',
    bio               TEXT,
    is_available      TINYINT(1)    NOT NULL DEFAULT 1,
    rating            DECIMAL(3,2)  NOT NULL DEFAULT 0.00,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_dp_specialization (specialization),
    INDEX idx_dp_city           (city),
    INDEX idx_dp_available      (is_available)
) ENGINE=InnoDB;

-- ── hospital_profiles ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital_profiles (
    id               INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    user_id          INT UNSIGNED  NOT NULL UNIQUE,
    hospital_name    VARCHAR(255)  NOT NULL,
    contact_email    VARCHAR(255)  NOT NULL DEFAULT '',
    contact_phone    VARCHAR(30)   NOT NULL DEFAULT '',
    address          VARCHAR(500)  NOT NULL DEFAULT '',
    city             VARCHAR(100)  NOT NULL DEFAULT '',
    state            VARCHAR(100)  NOT NULL DEFAULT '',
    registration_no  VARCHAR(100)  NOT NULL DEFAULT '',
    bed_count        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    type             VARCHAR(100)  NOT NULL DEFAULT '',
    about            TEXT,
    website          VARCHAR(255)  NOT NULL DEFAULT '',
    created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_hp_city (city)
) ENGINE=InnoDB;

-- ── staff_profiles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_profiles (
    id           INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    user_id      INT UNSIGNED  NOT NULL UNIQUE,
    full_name    VARCHAR(255)  NOT NULL,
    phone        VARCHAR(30)   NOT NULL DEFAULT '',
    organization VARCHAR(255)  NOT NULL DEFAULT '',
    address      VARCHAR(500)  NOT NULL DEFAULT '',
    city         VARCHAR(100)  NOT NULL DEFAULT '',
    state        VARCHAR(100)  NOT NULL DEFAULT '',
    bio          TEXT,
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── jobs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
    id               INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
    hospital_id      INT UNSIGNED   NOT NULL,
    title            VARCHAR(255)   NOT NULL,
    specialization   VARCHAR(150)   NOT NULL DEFAULT '',
    type             ENUM('Full-Time','Part-Time','Contract','Locum') NOT NULL DEFAULT 'Full-Time',
    experience       VARCHAR(100)   NOT NULL DEFAULT '',
    qualification    VARCHAR(255)   NOT NULL DEFAULT '',
    salary           VARCHAR(100)   NOT NULL DEFAULT '',
    location         VARCHAR(255)   NOT NULL DEFAULT '',
    description      TEXT,
    requirements     JSON,
    benefits         JSON,
    status           ENUM('active','closed','draft') NOT NULL DEFAULT 'draft',
    badge_type       VARCHAR(50)    NOT NULL DEFAULT 'badge-new',
    badge_label      VARCHAR(50)    NOT NULL DEFAULT 'New',
    created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_jobs_hospital     (hospital_id),
    INDEX idx_jobs_status       (status),
    INDEX idx_jobs_spec         (specialization),
    INDEX idx_jobs_created      (created_at)
) ENGINE=InnoDB;

-- ── job_applications ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_applications (
    id            INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    job_id        INT UNSIGNED  NOT NULL,
    applicant_id  INT UNSIGNED  NOT NULL,
    cover_letter  TEXT,
    resume_file_id INT UNSIGNED DEFAULT NULL,
    status        ENUM('new','reviewed','shortlisted','rejected','interview','hired') NOT NULL DEFAULT 'new',
    applied_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_application (job_id, applicant_id),
    FOREIGN KEY (job_id)       REFERENCES jobs(id)  ON DELETE CASCADE,
    FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_ja_job       (job_id),
    INDEX idx_ja_applicant (applicant_id),
    INDEX idx_ja_status    (status)
) ENGINE=InnoDB;

-- ── appointments ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
    id                INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    doctor_id         INT UNSIGNED    NOT NULL,
    patient_id        INT UNSIGNED    NOT NULL,
    patient_name      VARCHAR(255)    NOT NULL,
    patient_phone     VARCHAR(30)     NOT NULL DEFAULT '',
    patient_address   VARCHAR(500)    NOT NULL DEFAULT '',
    patient_age       TINYINT UNSIGNED NOT NULL DEFAULT 0,
    patient_gender    ENUM('Male','Female','Other') NOT NULL DEFAULT 'Other',
    reason            VARCHAR(500)    NOT NULL DEFAULT '',
    notes             TEXT,
    appointment_date  DATE            NOT NULL,
    appointment_time  TIME            NOT NULL,
    status            ENUM('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
    created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id)  REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_appt_doctor      (doctor_id),
    INDEX idx_appt_patient     (patient_id),
    INDEX idx_appt_date        (appointment_date),
    INDEX idx_appt_status      (status),
    UNIQUE KEY uq_appt_slot    (doctor_id, appointment_date, appointment_time)
) ENGINE=InnoDB;

-- ── doctor_availability ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctor_availability (
    id           INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    doctor_id    INT UNSIGNED  NOT NULL,
    day_of_week  TINYINT UNSIGNED NOT NULL COMMENT '0=Sunday,1=Monday,...,6=Saturday',
    start_time   TIME          NOT NULL,
    end_time     TIME          NOT NULL,
    is_active    TINYINT(1)    NOT NULL DEFAULT 1,
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_avail (doctor_id, day_of_week, start_time),
    INDEX idx_avail_doctor (doctor_id)
) ENGINE=InnoDB;

-- ── files ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS files (
    id                INT UNSIGNED   AUTO_INCREMENT PRIMARY KEY,
    user_id           INT UNSIGNED   NOT NULL,
    category          ENUM('profile_photo','resume','hospital_logo','document') NOT NULL,
    original_filename VARCHAR(255)   NOT NULL,
    storage_key       VARCHAR(500)   NOT NULL UNIQUE,
    mime_type         VARCHAR(100)   NOT NULL,
    file_size         INT UNSIGNED   NOT NULL DEFAULT 0,
    created_at        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_files_user     (user_id),
    INDEX idx_files_category (category)
) ENGINE=InnoDB;

-- ── notifications ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id         INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED  NOT NULL,
    title      VARCHAR(255)  NOT NULL,
    message    TEXT          NOT NULL,
    type       VARCHAR(50)   NOT NULL DEFAULT 'info',
    is_read    TINYINT(1)    NOT NULL DEFAULT 0,
    created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notif_user    (user_id),
    INDEX idx_notif_unread  (user_id, is_read)
) ENGINE=InnoDB;

-- ── user_settings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
    id         INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED  NOT NULL,
    `key`      VARCHAR(100)  NOT NULL,
    `value`    TEXT          NOT NULL,
    updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_setting (user_id, `key`),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_settings_user (user_id)
) ENGINE=InnoDB;

-- ── contact_submissions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_submissions (
    id             INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(255)  NOT NULL,
    email          VARCHAR(255)  NOT NULL,
    phone          VARCHAR(30)   NOT NULL DEFAULT '',
    role           VARCHAR(50)   NOT NULL DEFAULT '',
    specialization VARCHAR(150)  NOT NULL DEFAULT '',
    message        TEXT          NOT NULL,
    created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_contact_email (email)
) ENGINE=InnoDB;

-- ── audit_logs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id          INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED  DEFAULT NULL,
    action      VARCHAR(100)  NOT NULL,
    entity_type VARCHAR(100)  NOT NULL DEFAULT '',
    entity_id   INT UNSIGNED  DEFAULT NULL,
    ip_address  VARCHAR(45)   NOT NULL DEFAULT '',
    user_agent  VARCHAR(500)  NOT NULL DEFAULT '',
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_user    (user_id),
    INDEX idx_audit_action  (action),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;

-- ── password_resets ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
    id         INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED  NOT NULL,
    token_hash VARCHAR(255)  NOT NULL UNIQUE,
    expires_at DATETIME      NOT NULL,
    used       TINYINT(1)    NOT NULL DEFAULT 0,
    created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_pr_token   (token_hash),
    INDEX idx_pr_user    (user_id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
