-- =====================================================
-- EXAM TIMETABLE SYSTEM INITIALIZATION
-- =====================================================
-- Run this script to initialize the exam timetable system

-- Create exam timetable tables
SOURCE db/create_exam_timetable_tables.sql;

-- Create exam student registrations table (for future use)
CREATE TABLE IF NOT EXISTS exam_student_registrations (
    registration_id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT NOT NULL,
    student_id INT NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Registered', 'Absent', 'Present', 'Completed') DEFAULT 'Registered',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (schedule_id) REFERENCES exam_schedule(schedule_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student_master(student_id) ON DELETE CASCADE,
    
    INDEX idx_schedule_student (schedule_id, student_id),
    INDEX idx_student (student_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Enable the trigger now that the table exists
DELIMITER //

CREATE TRIGGER update_allocated_students
AFTER INSERT ON exam_student_registrations
FOR EACH ROW
BEGIN
    UPDATE exam_schedule 
    SET total_students = (
        SELECT COUNT(*) 
        FROM exam_student_registrations 
        WHERE schedule_id = NEW.schedule_id
    )
    WHERE schedule_id = NEW.schedule_id;
END//

DELIMITER ;

-- Insert sample exam timetable settings if not exists
INSERT IGNORE INTO exam_timetable_settings (setting_key, setting_value, setting_type, description) VALUES
('timetable.default_exam_duration', '120', 'NUMBER', 'Default exam duration in minutes'),
('timetable.max_students_per_room', '30', 'NUMBER', 'Maximum students allowed per examination room'),
('timetable.break_between_exams', '30', 'NUMBER', 'Break time between exams in minutes'),
('timetable.max_exams_per_day', '2', 'NUMBER', 'Maximum exams allowed per day per student'),
('timetable.auto_assign_invigilators', 'true', 'BOOLEAN', 'Automatically assign invigilators based on availability'),
('timetable.require_hod_approval', 'true', 'BOOLEAN', 'Require HOD approval for timetable publication'),
('timetable.conflict_check_enabled', 'true', 'BOOLEAN', 'Enable automatic conflict detection'),
('timetable.notification_days_before', '7', 'NUMBER', 'Days before exam to send notifications'),
('timetable.seating_gap_minutes', '15', 'NUMBER', 'Gap between students in seating arrangement'),
('timetable.working_hours_start', '09:00', 'STRING', 'Standard working hours start time'),
('timetable.working_hours_end', '17:00', 'STRING', 'Standard working hours end time'),
('timetable.lunch_break_start', '13:00', 'STRING', 'Lunch break start time'),
('timetable.lunch_break_end', '14:00', 'STRING', 'Lunch break end time'),
('timetable.weekend_exams', 'false', 'BOOLEAN', 'Allow exams on weekends'),
('timetable.holiday_check', 'true', 'BOOLEAN', 'Check for holidays while scheduling');

-- Create sample exam session if not exists
INSERT IGNORE INTO exam_session_master (exam_session_name, description, is_active) VALUES
('MSE - Mid Semester Examination', 'Regular Mid Semester Examinations', 1),
('ESE - End Semester Examination', 'End Semester Examinations', 1),
('Supplementary Examination', 'Supplementary/Backlog Examinations', 0);

-- Create sample MSE exam types if not exists
INSERT IGNORE INTO mse_exam_type_master (exam_type_name, description, is_active) VALUES
('MSE - I', 'First Mid Semester Examination', 1),
('MSE - II', 'Second Mid Semester Examination', 1),
('Lab Examination', 'Practical Laboratory Examination', 1),
('Internal Assessment', 'Internal Assessment Tests', 1);

SELECT 'Exam Timetable System Initialized Successfully!' as message;
