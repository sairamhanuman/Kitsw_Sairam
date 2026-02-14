-- Enhanced Exam Scheduling System Database Setup
-- Run this script on your Railway database
-- Connect with: mysql -h switchback.proxy.rlwy.net -u root -p --port 25051 --protocol=TCP railway

-- ========================================
-- 1. ENHANCED EXAM SCHEDULE TABLE
-- ========================================

DROP TABLE IF EXISTS exam_schedule_enhanced;

CREATE TABLE exam_schedule_enhanced (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    timetable_id INT NOT NULL,
    subject_id INT NOT NULL,
    exam_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_id INT,
    block_id INT,
    chief_invigilator_id INT,
    supporting_invigilator_ids JSON,
    max_students INT DEFAULT 30,
    special_instructions TEXT,
    equipment_required JSON,
    seating_pattern ENUM('branch_wise', 'section_wise', 'roll_number_wise', 'semester_wise', 'mixed') DEFAULT 'branch_wise',
    status ENUM('Scheduled', 'Confirmed', 'Completed', 'Cancelled') DEFAULT 'Scheduled',
    conflict_status ENUM('No Conflict', 'Room Conflict', 'Faculty Conflict', 'Student Conflict') DEFAULT 'No Conflict',
    auto_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Foreign Keys
    FOREIGN KEY (timetable_id) REFERENCES exam_timetable(timetable_id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subject_master(subject_id) ON DELETE RESTRICT,
    FOREIGN KEY (room_id) REFERENCES room_master(room_id) ON DELETE SET NULL,
    FOREIGN KEY (block_id) REFERENCES block_master(block_id) ON DELETE SET NULL,
    FOREIGN KEY (chief_invigilator_id) REFERENCES staff_master(staff_id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_timetable_subject (timetable_id, subject_id),
    INDEX idx_exam_date_time (exam_date, start_time),
    INDEX idx_room_date (room_id, exam_date),
    INDEX idx_invigilator (chief_invigilator_id, exam_date),
    INDEX idx_status (status),
    INDEX idx_conflict (conflict_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 2. STUDENT ENROLLMENT TABLE
-- ========================================

DROP TABLE IF EXISTS exam_student_enrollment;

CREATE TABLE exam_student_enrollment (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    timetable_id INT NOT NULL,
    subject_id INT NOT NULL,
    branch_id INT NOT NULL,
    semester_id INT NOT NULL,
    student_count INT NOT NULL DEFAULT 0,
    academic_year VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (timetable_id) REFERENCES exam_timetable(timetable_id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subject_master(subject_id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branch_master(branch_id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semester_master(semester_id) ON DELETE CASCADE,
    
    -- Unique Constraint
    UNIQUE KEY unique_enrollment (timetable_id, subject_id, branch_id, semester_id, academic_year),
    
    -- Indexes
    INDEX idx_timetable_subject (timetable_id, subject_id),
    INDEX idx_branch_semester (branch_id, semester_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 3. TIME SLOTS CONFIGURATION
-- ========================================

DROP TABLE IF EXISTS exam_time_slots;

CREATE TABLE exam_time_slots (
    slot_id INT AUTO_INCREMENT PRIMARY KEY,
    slot_name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_type ENUM('FN', 'AN', 'Special') DEFAULT 'FN',
    max_duration_minutes INT DEFAULT 180,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_type_active (slot_type, is_active),
    INDEX idx_time (start_time, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 4. AUTO-GENERATION CONFIGURATION
-- ========================================

DROP TABLE IF EXISTS exam_schedule_config;

CREATE TABLE exam_schedule_config (
    config_id INT AUTO_INCREMENT PRIMARY KEY,
    timetable_id INT NOT NULL,
    generation_mode ENUM('Auto', 'Semi-Auto', 'Manual') DEFAULT 'Semi-Auto',
    time_gap_minutes INT DEFAULT 30,
    lunch_break_start TIME DEFAULT '12:30:00',
    lunch_break_end TIME DEFAULT '13:30:00',
    max_exams_per_day INT DEFAULT 4,
    max_exams_per_session INT DEFAULT 2,
    room_change_time_minutes INT DEFAULT 15,
    consider_student_strength BOOLEAN DEFAULT TRUE,
    avoid_consecutive_exams BOOLEAN DEFAULT TRUE,
    auto_assign_rooms BOOLEAN DEFAULT TRUE,
    auto_assign_invigilators BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Key
    FOREIGN KEY (timetable_id) REFERENCES exam_timetable(timetable_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_timetable (timetable_id),
    INDEX idx_mode (generation_mode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 5. SAMPLE TIME SLOTS DATA
-- ========================================

INSERT INTO exam_time_slots (slot_name, start_time, end_time, slot_type, max_duration_minutes) VALUES
('Morning FN 1', '09:00:00', '11:00:00', 'FN', 120),
('Morning FN 2', '11:30:00', '13:30:00', 'FN', 120),
('Afternoon AN 1', '14:00:00', '16:00:00', 'AN', 120),
('Afternoon AN 2', '16:30:00', '18:30:00', 'AN', 120);

-- ========================================
-- 6. SAMPLE CONFIGURATION DATA
-- ========================================

INSERT INTO exam_schedule_config (
    timetable_id, generation_mode, time_gap_minutes, lunch_break_start, lunch_break_end,
    max_exams_per_day, max_exams_per_session, room_change_time_minutes,
    consider_student_strength, avoid_consecutive_exams, auto_assign_rooms, auto_assign_invigilators
) VALUES (
    1, 'Semi-Auto', 30, '12:30:00', '13:30:00',
    4, 2, 15, TRUE, TRUE, TRUE, TRUE
);

-- ========================================
-- 7. VERIFICATION QUERIES
-- ========================================

SELECT 'Enhanced exam scheduling tables created successfully!' as status;

SELECT COUNT(*) as time_slots_created FROM exam_time_slots;

SELECT COUNT(*) as configs_created FROM exam_schedule_config;

SELECT 'Setup completed! Ready for professional exam scheduling system.' as message;
