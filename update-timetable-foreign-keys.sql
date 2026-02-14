-- Update exam_timetable foreign key to match existing exam_session_master table
-- This fixes the foreign key reference from exam_session_id to session_id

-- Drop existing foreign key if it exists (will fail if doesn't exist, that's okay)
ALTER TABLE exam_timetable DROP FOREIGN KEY IF EXISTS exam_timetable_ibfk_1;

-- Add correct foreign key reference
ALTER TABLE exam_timetable 
ADD CONSTRAINT fk_exam_timetable_session 
FOREIGN KEY (exam_session_id) REFERENCES exam_session_master(session_id) ON DELETE CASCADE;

-- Do the same for exam_schedule table
ALTER TABLE exam_schedule DROP FOREIGN KEY IF EXISTS exam_schedule_ibfk_1;

ALTER TABLE exam_schedule 
ADD CONSTRAINT fk_exam_schedule_timetable 
FOREIGN KEY (timetable_id) REFERENCES exam_timetable(timetable_id) ON DELETE CASCADE;

SELECT 'Foreign keys updated successfully!' as message;
