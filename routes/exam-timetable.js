/**
 * Exam Timetable Management Routes
 * Comprehensive examination timetable and scheduling system
 */

const express = require('express');
const router = express.Router();

module.exports = (pool) => {
    const router = express.Router();

    // =====================================================
    // EXAM TIMETABLE MASTER ROUTES
    // =====================================================

    // GET all exam timetables with filters
    router.get('/', async (req, res) => {
        try {
            // Check if exam_timetable table exists
            const [tableCheck] = await pool.query(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() AND table_name = 'exam_timetable'
            `);

            if (tableCheck[0].count === 0) {
                return res.json({
                    status: 'success',
                    message: 'Exam timetables retrieved successfully',
                    data: [],
                    statistics: { total: 0, published: 0, draft: 0, completed: 0 },
                    total: 0
                });
            }

            const { 
                programme_id, 
                branch_id, 
                semester_id, 
                academic_year, 
                status,
                limit = 50,
                offset = 0 
            } = req.query;

            // Simple query without complex joins first
            let query = `
                SELECT et.*, 
                       es.session_name,
                       met.exam_type_name,
                       pm.programme_name,
                       bm.branch_name,
                       sm.semester_name
                FROM exam_timetable et
                LEFT JOIN exam_session_master es ON et.exam_session_id = es.session_id
                LEFT JOIN mse_exam_type_master met ON et.exam_type_id = met.exam_type_id
                LEFT JOIN programme_master pm ON et.programme_id = pm.programme_id
                LEFT JOIN branch_master bm ON et.branch_id = bm.branch_id
                LEFT JOIN semester_master sm ON et.semester_id = sm.semester_id
                WHERE et.deleted_at IS NULL
            `;

            const params = [];
            
            if (programme_id) {
                query += ` AND et.programme_id = ?`;
                params.push(programme_id);
            }
            if (branch_id) {
                query += ` AND et.branch_id = ?`;
                params.push(branch_id);
            }
            if (semester_id) {
                query += ` AND et.semester_id = ?`;
                params.push(semester_id);
            }
            if (academic_year) {
                query += ` AND et.academic_year = ?`;
                params.push(academic_year);
            }
            if (status) {
                query += ` AND et.status = ?`;
                params.push(status);
            }

            query += ` ORDER BY et.created_at DESC LIMIT ? OFFSET ?`;
            params.push(parseInt(limit), parseInt(offset));

            const [timetables] = await pool.query(query, params);

            // Get statistics
            const [stats] = await pool.query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'Published' THEN 1 ELSE 0 END) as published,
                    SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) as draft,
                    SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
                FROM exam_timetable 
                WHERE deleted_at IS NULL
            `);

            res.json({
                status: 'success',
                message: 'Exam timetables retrieved successfully',
                data: timetables,
                statistics: stats[0],
                total: timetables.length
            });
        } catch (error) {
            console.error('Error fetching exam timetables:', error);
            res.status(500).json({ 
                status: 'error', 
                message: 'Failed to fetch exam timetables',
                error: error.message 
            });
        }
    });

    // GET exam timetable by ID
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            const [timetables] = await pool.query(`
                SELECT et.*, 
                       es.session_name,
                       met.exam_type_name,
                       pm.programme_name,
                       bm.branch_name,
                       sm.semester_name,
                       CONCAT(COALESCE(s.first_name, ''), ' ', COALESCE(s.last_name, '')) as created_by_name
                FROM exam_timetable et
                LEFT JOIN exam_session_master es ON et.exam_session_id = es.session_id
                LEFT JOIN mse_exam_type_master met ON et.exam_type_id = met.exam_type_id
                LEFT JOIN programme_master pm ON et.programme_id = pm.programme_id
                LEFT JOIN branch_master bm ON et.branch_id = bm.branch_id
                LEFT JOIN semester_master sm ON et.semester_id = sm.semester_id
                LEFT JOIN staff_master s ON et.created_by = s.staff_id
                WHERE et.timetable_id = ? AND et.deleted_at IS NULL
            `, [id]);

            if (timetables.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Exam timetable not found'
                });
            }

            // Get exam schedules for this timetable
            const [schedules] = await pool.query(`
                SELECT es.*, 
                       sub.subject_name,
                       sub.subject_code,
                       rm.room_name,
                       rm.room_code,
                       blk.block_name,
                       CONCAT(COALESCE(ci.first_name, ''), ' ', COALESCE(ci.last_name, '')) as chief_invigilator_name
                FROM exam_schedule es
                LEFT JOIN subject_master sub ON es.subject_id = sub.subject_id
                LEFT JOIN room_master rm ON es.room_id = rm.room_id
                LEFT JOIN block_master blk ON es.block_id = blk.block_id
                LEFT JOIN staff_master ci ON es.chief_invigilator_id = ci.staff_id
                WHERE es.timetable_id = ? AND es.deleted_at IS NULL
                ORDER BY es.exam_date, es.start_time
            `, [id]);

            res.json({
                status: 'success',
                message: 'Exam timetable retrieved successfully',
                data: {
                    ...timetables[0],
                    schedules: schedules
                }
            });
        } catch (error) {
            console.error('Error fetching exam timetable:', error);
            res.status(500).json({ 
                status: 'error', 
                message: 'Failed to fetch exam timetable',
                error: error.message 
            });
        }
    });

    // CREATE new exam timetable
    router.post('/', async (req, res) => {
        try {
            console.log('📥 Received timetable data:', req.body);
            
            const {
                exam_session_id,
                exam_name,
                exam_type_id,
                programme_id,
                branch_id,
                semester_id,
                academic_year,
                start_date,
                end_date,
                exam_duration_minutes = 120,
                max_students_per_room = 30,
                seating_pattern = 'branch_wise',
                requires_seating_arrangement = true,
                remarks,
                created_by = 1 // TODO: Get from authenticated user
            } = req.body;

            // Validate required fields
            const requiredFields = ['exam_session_id', 'exam_name', 'exam_type_id', 'programme_id', 
                'branch_id', 'semester_id', 'academic_year', 'start_date', 'end_date'];
            
            const missingFields = requiredFields.filter(field => !req.body[field]);
            if (missingFields.length > 0) {
                console.log('❌ Missing required fields:', missingFields);
                return res.status(400).json({
                    status: 'error',
                    message: `Missing required fields: ${missingFields.join(', ')}`
                });
            }

            // Validate dates
            if (new Date(start_date) > new Date(end_date)) {
                console.log('❌ Invalid date range');
                return res.status(400).json({
                    status: 'error',
                    message: 'Start date cannot be after end date'
                });
            }

            console.log('✅ Validation passed, inserting timetable...');

            const [result] = await pool.query(`
                INSERT INTO exam_timetable (
                    exam_session_id, exam_name, exam_type_id, programme_id, branch_id, 
                    semester_id, academic_year, start_date, end_date, exam_duration_minutes,
                    max_students_per_room, seating_pattern, requires_seating_arrangement,
                    remarks, created_by, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft')
            `, [
                exam_session_id, exam_name, exam_type_id, programme_id, branch_id,
                semester_id, academic_year, start_date, end_date, exam_duration_minutes,
                max_students_per_room, seating_pattern, requires_seating_arrangement,
                remarks, created_by
            ]);

            console.log('✅ Timetable inserted successfully:', result.insertId);

            res.status(201).json({
                status: 'success',
                message: 'Exam timetable created successfully',
                data: {
                    timetable_id: result.insertId,
                    exam_name,
                    status: 'Draft'
                }
            });
        } catch (error) {
            console.error('❌ Error creating exam timetable:', error);
            res.status(500).json({ 
                status: 'error', 
                message: 'Failed to create exam timetable',
                error: error.message 
            });
        }
    });

    // UPDATE exam timetable
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const {
                exam_session_id,
                exam_name,
                exam_type_id,
                programme_id,
                branch_id,
                semester_id,
                academic_year,
                start_date,
                end_date,
                exam_duration_minutes,
                max_students_per_room,
                seating_pattern,
                requires_seating_arrangement,
                remarks
            } = req.body;

            // Check if timetable exists
            const [existing] = await pool.query(
                'SELECT timetable_id FROM exam_timetable WHERE timetable_id = ? AND deleted_at IS NULL',
                [id]
            );

            if (existing.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Exam timetable not found'
                });
            }

            const [result] = await pool.query(`
                UPDATE exam_timetable SET 
                    exam_session_id = ?, exam_name = ?, exam_type_id = ?, programme_id = ?, 
                    branch_id = ?, semester_id = ?, academic_year = ?, start_date = ?, 
                    end_date = ?, exam_duration_minutes = ?, max_students_per_room = ?, 
                    seating_pattern = ?, requires_seating_arrangement = ?, remarks = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE timetable_id = ?
            `, [
                exam_session_id, exam_name, exam_type_id, programme_id, branch_id,
                semester_id, academic_year, start_date, end_date, exam_duration_minutes,
                max_students_per_room, seating_pattern, requires_seating_arrangement,
                remarks, id
            ]);

            res.json({
                status: 'success',
                message: 'Exam timetable updated successfully',
                data: {
                    timetable_id: parseInt(id),
                    affected_rows: result.affectedRows
                }
            });
        } catch (error) {
            console.error('Error updating exam timetable:', error);
            res.status(500).json({ 
                status: 'error', 
                message: 'Failed to update exam timetable',
                error: error.message 
            });
        }
    });

    // DELETE (soft delete) exam timetable
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const [result] = await pool.query(
                'UPDATE exam_timetable SET deleted_at = CURRENT_TIMESTAMP WHERE timetable_id = ?',
                [id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Exam timetable not found'
                });
            }

            res.json({
                status: 'success',
                message: 'Exam timetable deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting exam timetable:', error);
            res.status(500).json({ 
                status: 'error', 
                message: 'Failed to delete exam timetable',
                error: error.message 
            });
        }
    });

    // PUBLISH exam timetable
    router.post('/:id/publish', async (req, res) => {
        try {
            const { id } = req.params;
            const { approved_by = 1 } = req.body; // TODO: Get from authenticated user

            // Check for conflicts before publishing
            const [conflicts] = await pool.query(`
                SELECT COUNT(*) as conflict_count 
                FROM exam_conflicts 
                WHERE resolution_status = 'Pending' 
                AND (
                    (entity1_type = 'Schedule' AND entity1_id IN (
                        SELECT schedule_id FROM exam_schedule WHERE timetable_id = ?
                    )) OR
                    (entity2_type = 'Schedule' AND entity2_id IN (
                        SELECT schedule_id FROM exam_schedule WHERE timetable_id = ?
                    ))
                )
            `, [id, id]);

            if (conflicts[0].conflict_count > 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Cannot publish timetable with unresolved conflicts',
                    conflict_count: conflicts[0].conflict_count
                });
            }

            const [result] = await pool.query(`
                UPDATE exam_timetable SET 
                    status = 'Published', 
                    approved_by = ?, 
                    approved_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE timetable_id = ? AND deleted_at IS NULL
            `, [approved_by, id]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Exam timetable not found'
                });
            }

            res.json({
                status: 'success',
                message: 'Exam timetable published successfully'
            });
        } catch (error) {
            console.error('Error publishing exam timetable:', error);
            res.status(500).json({ 
                status: 'error', 
                message: 'Failed to publish exam timetable',
                error: error.message 
            });
        }
    });

    // =====================================================
    // EXAM SCHEDULE ROUTES
    // =====================================================

    // GET schedules for a timetable
    router.get('/:id/schedules', async (req, res) => {
        try {
            const { id } = req.params;
            
            const [schedules] = await pool.query(`
                SELECT es.*, 
                       sub.subject_name,
                       sub.subject_code,
                       rm.room_name,
                       rm.room_code,
                       blk.block_name,
                       CONCAT(COALESCE(ci.first_name, ''), ' ', COALESCE(ci.last_name, '')) as chief_invigilator_name
                FROM exam_schedule es
                LEFT JOIN subject_master sub ON es.subject_id = sub.subject_id
                LEFT JOIN room_master rm ON es.room_id = rm.room_id
                LEFT JOIN block_master blk ON es.block_id = blk.block_id
                LEFT JOIN staff_master ci ON es.chief_invigilator_id = ci.staff_id
                WHERE es.timetable_id = ? AND es.deleted_at IS NULL
                ORDER BY es.exam_date, es.start_time
            `, [id]);

            res.json({
                status: 'success',
                message: 'Exam schedules retrieved successfully',
                data: schedules
            });
        } catch (error) {
            console.error('Error fetching exam schedules:', error);
            res.status(500).json({ 
                status: 'error', 
                message: 'Failed to fetch exam schedules',
                error: error.message 
            });
        }
    });

    // CREATE new exam schedule
    router.post('/:id/schedules', async (req, res) => {
        try {
            const { id } = req.params;
            const {
                subject_id,
                exam_date,
                start_time,
                end_time,
                room_id,
                block_id,
                chief_invigilator_id,
                supporting_invigilator_ids,
                special_instructions,
                equipment_required
            } = req.body;

            // Validate required fields
            if (!subject_id || !exam_date || !start_time || !end_time) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Missing required fields'
                });
            }

            // Check for conflicts
            const [conflicts] = await pool.query(`
                SELECT COUNT(*) as conflict_count
                FROM exam_schedule 
                WHERE room_id = ? 
                AND exam_date = ? 
                AND ((start_time <= ? AND end_time >= ?))
                AND deleted_at IS NULL
                AND schedule_id != COALESCE(?, 0)
            `, [room_id, exam_date, end_time, start_time, null]);

            if (conflicts[0].conflict_count > 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Room is already booked for this time slot'
                });
            }

            const [result] = await pool.query(`
                INSERT INTO exam_schedule (
                    timetable_id, subject_id, exam_date, start_time, end_time,
                    room_id, block_id, chief_invigilator_id, supporting_invigilator_ids,
                    special_instructions, equipment_required, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled')
            `, [
                id, subject_id, exam_date, start_time, end_time,
                room_id, block_id, chief_invigilator_id, 
                supporting_invigilator_ids ? JSON.stringify(supporting_invigilator_ids) : null,
                special_instructions, equipment_required ? JSON.stringify(equipment_required) : null
            ]);

            res.status(201).json({
                status: 'success',
                message: 'Exam schedule created successfully',
                data: {
                    schedule_id: result.insertId
                }
            });
        } catch (error) {
            console.error('Error creating exam schedule:', error);
            res.status(500).json({ 
                status: 'error', 
                message: 'Failed to create exam schedule',
                error: error.message 
            });
        }
    });

    // =====================================================
    // CONFLICT DETECTION ROUTES
    // =====================================================

    // Detect conflicts for a timetable
    router.get('/:id/conflicts', async (req, res) => {
        try {
            const { id } = req.params;

            // Detect room conflicts
            const [roomConflicts] = await pool.query(`
                SELECT 
                    es1.schedule_id as schedule1_id,
                    es2.schedule_id as schedule2_id,
                    es1.exam_date,
                    es1.start_time as time1_start,
                    es1.end_time as time1_end,
                    es2.start_time as time2_start,
                    es2.end_time as time2_end,
                    rm.room_name,
                    'Room Clash' as conflict_type,
                    CONCAT('Room ', rm.room_name, ' is double booked') as conflict_description
                FROM exam_schedule es1
                JOIN exam_schedule es2 ON es1.room_id = es2.room_id 
                    AND es1.exam_date = es2.exam_date
                    AND es1.schedule_id < es2.schedule_id
                    AND ((es1.start_time <= es2.end_time) AND (es1.end_time >= es2.start_time))
                JOIN room_master rm ON es1.room_id = rm.room_id
                WHERE (es1.timetable_id = ? OR es2.timetable_id = ?)
                AND es1.deleted_at IS NULL AND es2.deleted_at IS NULL
            `, [id, id]);

            // Detect faculty conflicts
            const [facultyConflicts] = await pool.query(`
                SELECT 
                    es1.schedule_id as schedule1_id,
                    es2.schedule_id as schedule2_id,
                    es1.exam_date,
                    es1.start_time as time1_start,
                    es1.end_time as time1_end,
                    es2.start_time as time2_start,
                    es2.end_time as time2_end,
                    CONCAT(s1.first_name, ' ', s1.last_name) as faculty_name,
                    'Faculty Clash' as conflict_type,
                    CONCAT('Faculty ', s1.first_name, ' ', s1.last_name, ' is assigned to multiple exams') as conflict_description
                FROM exam_schedule es1
                JOIN exam_schedule es2 ON es1.chief_invigilator_id = es2.chief_invigilator_id 
                    AND es1.exam_date = es2.exam_date
                    AND es1.schedule_id < es2.schedule_id
                    AND ((es1.start_time <= es2.end_time) AND (es1.end_time >= es2.start_time))
                JOIN staff_master s1 ON es1.chief_invigilator_id = s1.staff_id
                WHERE (es1.timetable_id = ? OR es2.timetable_id = ?)
                AND es1.deleted_at IS NULL AND es2.deleted_at IS NULL
            `, [id, id]);

            const allConflicts = [...roomConflicts, ...facultyConflicts];

            res.json({
                status: 'success',
                message: 'Conflicts detected successfully',
                data: allConflicts,
                conflict_count: allConflicts.length
            });
        } catch (error) {
            console.error('Error detecting conflicts:', error);
            res.status(500).json({ 
                status: 'error', 
                message: 'Failed to detect conflicts',
                error: error.message 
            });
        }
    });

    // =====================================================
    // INVIGILATOR ASSIGNMENT ROUTES
    // =====================================================

    // Auto assign invigilators
    router.post('/:id/auto-assign-invigilators', async (req, res) => {
        try {
            const { id } = req.params;

            // Get all schedules for this timetable
            const [schedules] = await pool.query(`
                SELECT schedule_id, exam_date, start_time, end_time, room_id
                FROM exam_schedule 
                WHERE timetable_id = ? AND deleted_at IS NULL
                AND (chief_invigilator_id IS NULL OR chief_invigilator_id = 0)
            `, [id]);

            let assignments = 0;

            for (const schedule of schedules) {
                // Find available faculty (simplified logic)
                const [availableFaculty] = await pool.query(`
                    SELECT sm.staff_id, sm.first_name, sm.last_name
                    FROM staff_master sm
                    WHERE sm.is_active = 1 
                    AND sm.staff_id NOT IN (
                        SELECT chief_invigilator_id 
                        FROM exam_schedule 
                        WHERE exam_date = ? 
                        AND ((start_time <= ? AND end_time >= ?))
                        AND deleted_at IS NULL
                        AND chief_invigilator_id IS NOT NULL
                    )
                    ORDER BY RAND()
                    LIMIT 1
                `, [schedule.exam_date, schedule.end_time, schedule.start_time]);

                if (availableFaculty.length > 0) {
                    await pool.query(`
                        UPDATE exam_schedule 
                        SET chief_invigilator_id = ? 
                        WHERE schedule_id = ?
                    `, [availableFaculty[0].staff_id, schedule.schedule_id]);

                    assignments++;
                }
            }

            res.json({
                status: 'success',
                message: 'Invigilators assigned successfully',
                data: {
                    assignments_made: assignments,
                    total_schedules: schedules.length
                }
            });
        } catch (error) {
            console.error('Error auto-assigning invigilators:', error);
            res.status(500).json({ 
                status: 'error', 
                message: 'Failed to auto-assign invigilators',
                error: error.message 
            });
        }
    });

    // =====================================================
    // REPORTS ROUTES
    // =====================================================

    // Get timetable statistics
    router.get('/:id/statistics', async (req, res) => {
        try {
            const { id } = req.params;

            const [stats] = await pool.query(`
                SELECT 
                    COUNT(DISTINCT es.schedule_id) as total_exams,
                    COUNT(DISTINCT es.room_id) as rooms_used,
                    COUNT(DISTINCT es.chief_invigilator_id) as invigilators_assigned,
                    MIN(es.exam_date) as start_date,
                    MAX(es.exam_date) as end_date,
                    SUM(TIMESTAMPDIFF(MINUTE, es.start_time, es.end_time)) as total_exam_minutes
                FROM exam_schedule es
                WHERE es.timetable_id = ? AND es.deleted_at IS NULL
            `, [id]);

            const [subjectStats] = await pool.query(`
                SELECT 
                    sub.subject_name,
                    COUNT(es.schedule_id) as exam_count
                FROM exam_schedule es
                JOIN subject_master sub ON es.subject_id = sub.subject_id
                WHERE es.timetable_id = ? AND es.deleted_at IS NULL
                GROUP BY sub.subject_id, sub.subject_name
                ORDER BY exam_count DESC
            `, [id]);

            res.json({
                status: 'success',
                message: 'Statistics retrieved successfully',
                data: {
                    overview: stats[0],
                    subject_breakdown: subjectStats
                }
            });
        } catch (error) {
            console.error('Error fetching statistics:', error);
            res.status(500).json({ 
                status: 'error', 
                message: 'Failed to fetch statistics',
                error: error.message 
            });
        }
    });

    return router;
};
