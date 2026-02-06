-- Engineering College Database Schema

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS engineering_college;
USE engineering_college;

-- Programme Master Table
CREATE TABLE IF NOT EXISTS programme_master (
    programme_id INT AUTO_INCREMENT PRIMARY KEY,
    programme_code VARCHAR(20) NOT NULL UNIQUE,
    programme_name VARCHAR(100) NOT NULL,
    programme_type VARCHAR(50) NOT NULL COMMENT 'e.g., UG, PG, Ph.D.',
    duration_years DECIMAL(3,1) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_programme_code (programme_code),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample data
INSERT INTO programme_master (programme_code, programme_name, programme_type, duration_years, description) VALUES
('BTECH', 'Bachelor of Technology', 'UG', 4.0, 'Four-year undergraduate engineering program'),
('MTECH', 'Master of Technology', 'PG', 2.0, 'Two-year postgraduate engineering program'),
('PHD', 'Doctor of Philosophy', 'Ph.D.', 3.0, 'Doctoral research program in engineering'),
('MBA', 'Master of Business Administration', 'PG', 2.0, 'Two-year management program')
ON DUPLICATE KEY UPDATE programme_name = VALUES(programme_name);
