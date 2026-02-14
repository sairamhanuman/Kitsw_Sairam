-- Create Exam Notification System Tables

USE engineering_college;

-- Main Exam Notifications Table
CREATE TABLE IF NOT EXISTS exam_notifications (
    notification_id VARCHAR(20) PRIMARY KEY,
    notification_title VARCHAR(200) NOT NULL,
    description TEXT,
    programmes JSON COMMENT 'Array of selected programmes',
    batches JSON COMMENT 'Array of selected batches',
    semesters JSON COMMENT 'Array of selected semesters',
    regulations JSON COMMENT 'Array of selected regulations',
    exam_type VARCHAR(20) NOT NULL,
    exam_name_id INT,
    session_id INT,
    month_year_id INT,
    start_date DATE,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    status ENUM('Draft', 'Published', 'Cancelled') DEFAULT 'Draft',
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_notification_id (notification_id),
    INDEX idx_status (status),
    INDEX idx_exam_type (exam_type),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (exam_name_id) REFERENCES exams_naming_master(exam_naming_id),
    FOREIGN KEY (session_id) REFERENCES sessions_master(session_id),
    FOREIGN KEY (month_year_id) REFERENCES month_year_master(month_year_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Generated Exam Timetable Table
CREATE TABLE IF NOT EXISTS exam_timetable (
    timetable_id INT AUTO_INCREMENT PRIMARY KEY,
    notification_id VARCHAR(20) NOT NULL,
    programme VARCHAR(20) NOT NULL,
    batch VARCHAR(20) NOT NULL,
    semester VARCHAR(10) NOT NULL,
    regulation VARCHAR(20) NOT NULL,
    subject_code VARCHAR(20) NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    syllabus_code VARCHAR(20),
    student_count INT DEFAULT 0,
    exam_date DATE,
    start_time TIME,
    end_time TIME,
    room_id INT,
    invigilator_id INT,
    is_assigned BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_notification_id (notification_id),
    INDEX idx_programme (programme),
    INDEX idx_batch (batch),
    INDEX idx_semester (semester),
    INDEX idx_exam_date (exam_date),
    INDEX idx_is_assigned (is_assigned),
    FOREIGN KEY (notification_id) REFERENCES exam_notifications(notification_id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES room_master(room_id),
    FOREIGN KEY (invigilator_id) REFERENCES staff_master(staff_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exam Hall Tickets Table
CREATE TABLE IF NOT EXISTS exam_hall_tickets (
    hall_ticket_id INT AUTO_INCREMENT PRIMARY KEY,
    notification_id VARCHAR(20) NOT NULL,
    timetable_id INT NOT NULL,
    student_id INT NOT NULL,
    registration_number VARCHAR(50),
    seat_number VARCHAR(10),
    room_number VARCHAR(20),
    exam_date DATE,
    start_time TIME,
    end_time TIME,
    subject_name VARCHAR(100),
    subject_code VARCHAR(20),
    programme VARCHAR(20),
    batch VARCHAR(20),
    semester VARCHAR(10),
    qr_code_data TEXT,
    is_printed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notification_id (notification_id),
    INDEX idx_student_id (student_id),
    INDEX idx_registration_number (registration_number),
    UNIQUE KEY unique_student_timetable (notification_id, student_id, timetable_id),
    FOREIGN KEY (notification_id) REFERENCES exam_notifications(notification_id) ON DELETE CASCADE,
    FOREIGN KEY (timetable_id) REFERENCES exam_timetable(timetable_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notification Status Log Table
CREATE TABLE IF NOT EXISTS notification_status_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    notification_id VARCHAR(20) NOT NULL,
    status_from VARCHAR(20),
    status_to VARCHAR(20) NOT NULL,
    changed_by VARCHAR(100),
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notification_id (notification_id),
    INDEX idx_status_to (status_to),
    FOREIGN KEY (notification_id) REFERENCES exam_notifications(notification_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert Sample Notification
INSERT INTO exam_notifications (
    notification_id, notification_title, description, programmes, batches, 
    semesters, regulations, exam_type, exam_name_id, session_id, 
    month_year_id, start_date, end_date, start_time, end_time, status
) VALUES (
    'NOT-2026-001', 
    'Mid-Term Examination 1 - February 2026', 
    'Mid-Term Examination 1 for all branches and semesters',
    '["BTECH"]',
    '["2025-26", "2026-27"]',
    '["I", "II", "III", "IV"]',
    '["URR-18"]',
    'MT1',
    1,
    1,
    1,
    '2026-02-14',
    '2026-02-28',
    '09:00:00',
    '17:00:00',
    'Draft'
) ON DUPLICATE KEY UPDATE notification_title = VALUES(notification_title);
