// Enhanced Exam Scheduling API Routes
// Professional exam scheduling with auto-generation and conflict detection

const express = require('express');
const router = express.Router();

// Create a promise pool for database operations
let promisePool;

// Initialize the router with database pool
function initializeRouter(pool) {
    promisePool = pool;
    return router;
}

// =====================================================
// TIME SLOTS MANAGEMENT
// =====================================================

// GET all time slots
router.get('/time-slots', async (req, res) => {
    try {
        const [timeSlots] = await promisePool.query(`
            SELECT slot_id, slot_name, start_time, end_time, 
                   slot_type, max_duration_minutes, is_active
            FROM exam_time_slots 
            WHERE is_active = 1 
            ORDER BY slot_type, start_time
        `);

        res.json({
            status: 'success',
            message: 'Time slots retrieved successfully',
            data: timeSlots
        });
    } catch (error) {
        console.error('Error fetching time slots:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch time slots',
            error: error.message 
        });
    }
});

// =====================================================
// AUTO-GENERATION ENGINE
// =====================================================

// POST auto-generate schedule
router.post('/auto-generate', async (req, res) => {
    try {
        console.log('🚀 Starting auto-generation...');
        
        const {
            timetable_id,
            exam_session_id,
            branch_id,
            semester_id,
            academic_year,
            generation_mode = 'Semi-Auto',
            time_gap_minutes = 30,
            max_exams_per_day = 4,
            max_exams_per_session = 2,
            consider_student_strength = true,
            avoid_consecutive_exams = true,
            auto_assign_rooms = true,
            auto_assign_invigilators = true
        } = req.body;

        // Validate required fields
        if (!timetable_id || !branch_id || !semester_id || !academic_year) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: timetable_id, branch_id, semester_id, academic_year'
            });
        }

        console.log('📋 Generation parameters:', { timetable_id, branch_id, semester_id, academic_year });

        // Step 1: Get subjects for this branch/semester
        const [subjects] = await promisePool.query(`
            SELECT s.subject_id, s.subject_name, s.subject_code, s.credit_points
            FROM subject_master s
            WHERE s.branch_id = ? AND s.semester_id = ? 
            AND s.is_active = 1
            ORDER BY s.subject_name
        `, [branch_id, semester_id]);

        if (subjects.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No subjects found for this branch and semester'
            });
        }

        console.log(`📚 Found ${subjects.length} subjects`);

        // Step 2: Get available time slots
        const [timeSlots] = await promisePool.query(`
            SELECT * FROM exam_time_slots 
            WHERE is_active = 1 
            ORDER BY start_time
        `);

        // Step 3: Get available rooms
        const [rooms] = await promisePool.query(`
            SELECT r.room_id, r.room_name, r.capacity, r.block_id, b.block_name
            FROM room_master r
            LEFT JOIN block_master b ON r.block_id = b.block_id
            WHERE r.is_active = 1
            ORDER BY b.block_name, r.room_name
        `);

        // Step 4: Get student enrollment (with fallback)
        let enrollmentMap = {};
        try {
            const [enrollments] = await promisePool.query(`
                SELECT subject_id, student_count
                FROM exam_student_enrollment 
                WHERE timetable_id = ? AND branch_id = ? AND semester_id = ? AND academic_year = ?
            `, [timetable_id, branch_id, semester_id, academic_year]);

            // Create enrollment map
            enrollments.forEach(enrollment => {
                enrollmentMap[enrollment.subject_id] = enrollment.student_count;
            });
            console.log(`📊 Found ${enrollments.length} enrollment records`);
        } catch (error) {
            console.warn('⚠️ exam_student_enrollment table not found, using default student count');
            // Use default student count if enrollment table doesn't exist
            subjects.forEach(subject => {
                enrollmentMap[subject.subject_id] = 30; // Default to 30 students
            });
        }

        // Step 5: Generate schedule matrix
        const generatedSchedules = [];
        let currentDate = new Date();
        let sessionCounter = 0;
        let dailyExamCount = 0;

        for (const subject of subjects) {
            const studentCount = enrollmentMap[subject.subject_id] || 30;
            const suitableRooms = rooms.filter(room => room.capacity >= studentCount);
            
            if (suitableRooms.length === 0) {
                console.warn(`⚠️ No suitable room for ${subject.subject_name} (${studentCount} students)`);
                continue;
            }

            // Find next available time slot
            const timeSlot = timeSlots[sessionCounter % timeSlots.length];
            const room = suitableRooms[0]; // Simple assignment - can be enhanced

            const schedule = {
                timetable_id,
                subject_id: subject.subject_id,
                exam_date: currentDate.toISOString().split('T')[0],
                start_time: timeSlot.start_time,
                end_time: timeSlot.end_time,
                room_id: room.room_id,
                block_id: room.block_id,
                max_students: studentCount,
                seating_pattern: 'branch_wise',
                status: 'Scheduled',
                conflict_status: 'No Conflict',
                auto_generated: true
            };

            generatedSchedules.push(schedule);

            // Update counters
            sessionCounter++;
            dailyExamCount++;
            
            // Move to next day if daily limit reached
            if (dailyExamCount >= max_exams_per_day) {
                currentDate.setDate(currentDate.getDate() + 1);
                dailyExamCount = 0;
            }
        }

        console.log(`📅 Generated ${generatedSchedules.length} exam schedules`);

        // Step 6: Save generated schedules
        if (generatedSchedules.length > 0) {
            // Clear existing auto-generated schedules for this timetable
            await promisePool.query(`
                DELETE FROM exam_schedule_enhanced 
                WHERE timetable_id = ? AND auto_generated = 1
            `, [timetable_id]);

            // Insert new schedules
            const insertPromises = generatedSchedules.map(schedule => 
                promisePool.query(`
                    INSERT INTO exam_schedule_enhanced (
                        timetable_id, subject_id, exam_date, start_time, end_time,
                        room_id, block_id, max_students, seating_pattern, status,
                        conflict_status, auto_generated
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    schedule.timetable_id, schedule.subject_id, schedule.exam_date,
                    schedule.start_time, schedule.end_time, schedule.room_id,
                    schedule.block_id, schedule.max_students, schedule.seating_pattern,
                    schedule.status, schedule.conflict_status, schedule.auto_generated
                ])
            );

            await Promise.all(insertPromises);

            // Save configuration
            await promisePool.query(`
                INSERT INTO exam_schedule_config (
                    timetable_id, generation_mode, time_gap_minutes, max_exams_per_day,
                    max_exams_per_session, consider_student_strength,
                    avoid_consecutive_exams, auto_assign_rooms, auto_assign_invigilators
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                SET generation_mode = VALUES(generation_mode),
                    time_gap_minutes = VALUES(time_gap_minutes),
                    max_exams_per_day = VALUES(max_exams_per_day),
                    max_exams_per_session = VALUES(max_exams_per_session),
                    consider_student_strength = VALUES(consider_student_strength),
                    avoid_consecutive_exams = VALUES(avoid_consecutive_exams),
                    auto_assign_rooms = VALUES(auto_assign_rooms),
                    auto_assign_invigilators = VALUES(auto_assign_invigilators)
            `, [
                timetable_id, generation_mode, time_gap_minutes, max_exams_per_day,
                max_exams_per_session, consider_student_strength, avoid_consecutive_exams,
                auto_assign_rooms, auto_assign_invigilators
            ]);

            console.log('✅ Auto-generation completed successfully');
        }

        res.json({
            status: 'success',
            message: 'Exam schedule auto-generated successfully',
            data: {
                generated_schedules: generatedSchedules.length,
                subjects_processed: subjects.length,
                time_slots_used: timeSlots.length,
                rooms_available: rooms.length
            }
        });

    } catch (error) {
        console.error('❌ Auto-generation failed:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to auto-generate exam schedule',
            error: error.message 
        });
    }
});

// =====================================================
// CONFLICT DETECTION ENGINE
// =====================================================

// POST detect conflicts
router.post('/detect-conflicts', async (req, res) => {
    try {
        const { timetable_id } = req.body;

        if (!timetable_id) {
            return res.status(400).json({
                status: 'error',
                message: 'Timetable ID is required'
            });
        }

        // Check room conflicts
        const [roomConflicts] = await promisePool.query(`
            SELECT 
                es1.schedule_id as schedule1_id,
                es2.schedule_id as schedule2_id,
                es1.exam_date,
                es1.start_time as time1_start,
                es1.end_time as time1_end,
                es2.start_time as time2_start,
                es2.end_time as time2_end,
                r.room_name,
                CONCAT('Room ', r.room_name, ' is double booked') as conflict_description,
                'Room Conflict' as conflict_type,
                'High' as priority
            FROM exam_schedule_enhanced es1
            JOIN exam_schedule_enhanced es2 ON es1.room_id = es2.room_id 
                AND es1.exam_date = es2.exam_date 
                AND es1.schedule_id != es2.schedule_id
            JOIN room_master r ON es1.room_id = r.room_id
            WHERE es1.timetable_id = ? 
                AND es1.deleted_at IS NULL 
                AND es2.deleted_at IS NULL
                AND (
                    (es1.start_time <= es2.end_time AND es1.end_time >= es2.start_time)
                )
            ORDER BY es1.exam_date, es1.start_time
        `, [timetable_id]);

        // Check faculty conflicts
        const [facultyConflicts] = await promisePool.query(`
            SELECT 
                es1.schedule_id as schedule1_id,
                es2.schedule_id as schedule2_id,
                es1.exam_date,
                es1.start_time as time1_start,
                es1.end_time as time1_end,
                es2.start_time as time2_start,
                es2.end_time as time2_end,
                CONCAT(s1.first_name, ' ', s1.last_name) as faculty1_name,
                CONCAT(s2.first_name, ' ', s2.last_name) as faculty2_name,
                CONCAT('Faculty ', s1.first_name, ' ', s1.last_name, ' is double booked') as conflict_description,
                'Faculty Conflict' as conflict_type,
                'High' as priority
            FROM exam_schedule_enhanced es1
            JOIN exam_schedule_enhanced es2 ON es1.chief_invigilator_id = es2.chief_invigilator_id 
                AND es1.exam_date = es2.exam_date 
                AND es1.schedule_id != es2.schedule_id
            JOIN staff_master s1 ON es1.chief_invigilator_id = s1.staff_id
            JOIN staff_master s2 ON es2.chief_invigilator_id = s2.staff_id
            WHERE es1.timetable_id = ? 
                AND es1.deleted_at IS NULL 
                AND es2.deleted_at IS NULL
                AND (
                    (es1.start_time <= es2.end_time AND es1.end_time >= es2.start_time)
                )
            ORDER BY es1.exam_date, es1.start_time
        `, [timetable_id]);

        // Check student conflicts (same branch/semester multiple exams same day)
        const [studentConflicts] = await promisePool.query(`
            SELECT 
                es1.schedule_id as schedule1_id,
                es2.schedule_id as schedule2_id,
                es1.exam_date,
                b1.branch_name,
                s1.semester_name,
                CONCAT('Students from ', b1.branch_name, ' ', s1.semester_name, ' have multiple exams') as conflict_description,
                'Student Conflict' as conflict_type,
                'Medium' as priority
            FROM exam_schedule_enhanced es1
            JOIN exam_schedule_enhanced es2 ON es1.exam_date = es2.exam_date 
                AND es1.branch_id = es2.branch_id 
                AND es1.semester_id = es2.semester_id 
                AND es1.schedule_id != es2.schedule_id
            JOIN branch_master b1 ON es1.branch_id = b1.branch_id
            JOIN semester_master s1 ON es1.semester_id = s1.semester_id
            WHERE es1.timetable_id = ? 
                AND es1.deleted_at IS NULL 
                AND es2.deleted_at IS NULL
            ORDER BY es1.exam_date, es1.start_time
        `, [timetable_id]);

        const allConflicts = [
            ...roomConflicts.map(c => ({...c, detected_at: new Date()})),
            ...facultyConflicts.map(c => ({...c, detected_at: new Date()})),
            ...studentConflicts.map(c => ({...c, detected_at: new Date()}))
        ];

        console.log(`⚠️ Detected ${allConflicts.length} conflicts`);

        res.json({
            status: 'success',
            message: 'Conflict detection completed',
            data: {
                total_conflicts: allConflicts.length,
                room_conflicts: roomConflicts.length,
                faculty_conflicts: facultyConflicts.length,
                student_conflicts: studentConflicts.length,
                conflicts: allConflicts
            }
        });

    } catch (error) {
        console.error('❌ Conflict detection failed:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to detect conflicts',
            error: error.message 
        });
    }
});

// =====================================================
// ENHANCED SCHEDULE CRUD
// =====================================================

// GET enhanced schedules for a timetable
router.get('/enhanced/:timetable_id', async (req, res) => {
    try {
        const { timetable_id } = req.params;

        const [schedules] = await promisePool.query(`
            SELECT ese.*, 
                   s.subject_name, s.subject_code,
                   r.room_name, r.room_code, r.capacity,
                   b.block_name,
                   CONCAT(st.first_name, ' ', st.last_name) as chief_invigilator_name,
                   st.designation, st.department
            FROM exam_schedule_enhanced ese
            LEFT JOIN subject_master s ON ese.subject_id = s.subject_id
            LEFT JOIN room_master r ON ese.room_id = r.room_id
            LEFT JOIN block_master b ON ese.block_id = b.block_id
            LEFT JOIN staff_master st ON ese.chief_invigilator_id = st.staff_id
            WHERE ese.timetable_id = ? AND ese.deleted_at IS NULL
            ORDER BY ese.exam_date, ese.start_time
        `, [timetable_id]);

        res.json({
            status: 'success',
            message: 'Enhanced schedules retrieved successfully',
            data: schedules
        });

    } catch (error) {
        console.error('❌ Error fetching enhanced schedules:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch enhanced schedules',
            error: error.message 
        });
    }
});

// POST create enhanced schedule
router.post('/enhanced', async (req, res) => {
    try {
        const {
            timetable_id,
            subject_id,
            exam_date,
            start_time,
            end_time,
            room_id,
            block_id,
            chief_invigilator_id,
            supporting_invigilator_ids,
            max_students,
            special_instructions,
            equipment_required,
            seating_pattern = 'branch_wise'
        } = req.body;

        // Validate required fields
        if (!timetable_id || !subject_id || !exam_date || !start_time || !end_time) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: timetable_id, subject_id, exam_date, start_time, end_time'
            });
        }

        // Check for conflicts before saving
        const [conflicts] = await promisePool.query(`
            SELECT COUNT(*) as conflict_count
            FROM exam_schedule_enhanced 
            WHERE room_id = ? 
                AND exam_date = ? 
                AND ((start_time <= ? AND end_time >= ?))
                AND deleted_at IS NULL
                AND schedule_id != COALESCE(?, 0)
            `, [room_id, exam_date, end_time, start_time, null]);

        if (conflicts[0].conflict_count > 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Room is already booked for this time slot',
                conflict_type: 'Room Conflict'
            });
        }

        const [result] = await promisePool.query(`
            INSERT INTO exam_schedule_enhanced (
                timetable_id, subject_id, exam_date, start_time, end_time,
                room_id, block_id, chief_invigilator_id, supporting_invigilator_ids,
                max_students, special_instructions, equipment_required, seating_pattern,
                status, conflict_status, auto_generated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled', 'No Conflict', FALSE)
        `, [
            timetable_id, subject_id, exam_date, start_time, end_time,
            room_id, block_id, chief_invigilator_id,
            supporting_invigilator_ids ? JSON.stringify(supporting_invigilator_ids) : null,
            max_students, special_instructions,
            equipment_required ? JSON.stringify(equipment_required) : null, seating_pattern
        ]);

        res.status(201).json({
            status: 'success',
            message: 'Enhanced exam schedule created successfully',
            data: {
                schedule_id: result.insertId,
                timetable_id,
                subject_id,
                exam_date,
                start_time,
                end_time
            }
        });

    } catch (error) {
        console.error('❌ Error creating enhanced schedule:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to create enhanced exam schedule',
            error: error.message 
        });
    }
});

// PUT update enhanced schedule (drag-and-drop support)
router.put('/enhanced/:schedule_id', async (req, res) => {
    try {
        const { schedule_id } = req.params;
        const {
            exam_date,
            start_time,
            end_time,
            room_id,
            block_id,
            chief_invigilator_id,
            max_students,
            special_instructions,
            equipment_required,
            seating_pattern
        } = req.body;

        // Check for conflicts before updating
        const [conflicts] = await promisePool.query(`
            SELECT COUNT(*) as conflict_count
            FROM exam_schedule_enhanced 
            WHERE room_id = ? 
                AND exam_date = ? 
                AND ((start_time <= ? AND end_time >= ?))
                AND deleted_at IS NULL
                AND schedule_id != ?
            `, [room_id, exam_date, end_time, start_time, schedule_id]);

        if (conflicts[0].conflict_count > 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Room is already booked for this time slot',
                conflict_type: 'Room Conflict'
            });
        }

        await promisePool.query(`
            UPDATE exam_schedule_enhanced 
            SET exam_date = ?, start_time = ?, end_time = ?,
                room_id = ?, block_id = ?, chief_invigilator_id = ?,
                max_students = ?, special_instructions = ?, equipment_required = ?,
                seating_pattern = ?, updated_at = CURRENT_TIMESTAMP
            WHERE schedule_id = ?
        `, [
            exam_date, start_time, end_time, room_id, block_id, chief_invigilator_id,
            max_students, special_instructions,
            equipment_required ? JSON.stringify(equipment_required) : null, seating_pattern, schedule_id
        ]);

        res.json({
            status: 'success',
            message: 'Enhanced exam schedule updated successfully',
            data: { schedule_id, exam_date, start_time, end_time }
        });

    } catch (error) {
        console.error('❌ Error updating enhanced schedule:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to update enhanced exam schedule',
            error: error.message 
        });
    }
});

// DELETE enhanced schedule
router.delete('/enhanced/:schedule_id', async (req, res) => {
    try {
        const { schedule_id } = req.params;

        await promisePool.query(`
            UPDATE exam_schedule_enhanced 
            SET deleted_at = CURRENT_TIMESTAMP 
            WHERE schedule_id = ?
        `, [schedule_id]);

        res.json({
            status: 'success',
            message: 'Enhanced exam schedule deleted successfully'
        });

    } catch (error) {
        console.error('❌ Error deleting enhanced schedule:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to delete enhanced exam schedule',
            error: error.message 
        });
    }
});

module.exports = { initializeRouter };
