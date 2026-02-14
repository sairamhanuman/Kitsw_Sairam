// Internal Exam Timetable Routes
const express = require('express');
const router = express.Router();

// Create a promise pool for database operations
let promisePool;

// Initialize the router with database pool
function initializeRouter(pool) {
    promisePool = pool;
    return router;
}

// POST generate initial timetable
router.post('/generate', async (req, res) => {
    try {
        const { notification_id } = req.body;
        
        if (!notification_id) {
            return res.status(400).json({
                status: 'error',
                message: 'Notification ID is required'
            });
        }

        // Get notification details
        const [notificationRows] = await promisePool.query(
            'SELECT * FROM exam_notifications WHERE notification_id = ?',
            [notification_id]
        );

        if (notificationRows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Notification not found'
            });
        }

        const notification = notificationRows[0];
        const programmes = JSON.parse(notification.programmes || '[]');
        const batches = JSON.parse(notification.batches || '[]');
        const semesters = JSON.parse(notification.semesters || '[]');
        const regulations = JSON.parse(notification.regulations || '[]');

        // Get subjects for the selected combinations
        const subjects = await getSubjectsForNotification(programmes, batches, semesters, regulations);
        
        // Generate time slots
        const timeSlots = generateTimeSlots(notification.start_date, notification.end_date);
        
        // Return empty timetable and unassigned subjects
        res.json({
            status: 'success',
            message: 'Initial timetable generated successfully',
            data: {
                timetable: [], // Empty initially
                unassigned_subjects: subjects,
                time_slots: timeSlots,
                notification: notification
            }
        });
    } catch (error) {
        console.error('Error generating timetable:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to generate timetable',
            error: error.message
        });
    }
});

// POST save timetable
router.post('/save', async (req, res) => {
    try {
        const { notification_id, timetable } = req.body;
        
        if (!notification_id || !timetable) {
            return res.status(400).json({
                status: 'error',
                message: 'Notification ID and timetable data are required'
            });
        }

        // Clear existing timetable for this notification
        await promisePool.query(
            'DELETE FROM exam_timetable WHERE notification_id = ?',
            [notification_id]
        );

        // Insert new timetable entries
        for (const entry of timetable) {
            await promisePool.query(
                `INSERT INTO exam_timetable 
                 (notification_id, programme, batch, semester, regulation, subject_code, 
                  subject_name, syllabus_code, student_count, exam_date, start_time, end_time, 
                  is_assigned, notes) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    notification_id,
                    entry.programme,
                    entry.batch || '',
                    entry.semester,
                    entry.regulation,
                    entry.subject_code,
                    entry.subject_name,
                    entry.syllabus_code || '',
                    entry.student_count || 0,
                    entry.exam_date,
                    entry.start_time || '09:00:00',
                    entry.end_time || '12:00:00',
                    true,
                    entry.notes || ''
                ]
            );
        }

        res.json({
            status: 'success',
            message: 'Timetable saved successfully',
            data: {
                entries_saved: timetable.length
            }
        });
    } catch (error) {
        console.error('Error saving timetable:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to save timetable',
            error: error.message
        });
    }
});

// GET timetable by notification ID
router.get('/:notification_id', async (req, res) => {
    try {
        const { notification_id } = req.params;
        
        const [rows] = await promisePool.query(
            'SELECT * FROM exam_timetable WHERE notification_id = ? ORDER BY exam_date, start_time',
            [notification_id]
        );
        
        res.json({
            status: 'success',
            message: 'Timetable retrieved successfully',
            data: rows
        });
    } catch (error) {
        console.error('Error fetching timetable:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch timetable',
            error: error.message
        });
    }
});

// Helper function to get subjects for notification
async function getSubjectsForNotification(programmes, batches, semesters, regulations) {
    try {
        // This is a simplified version - you'd need to join multiple tables
        const [rows] = await promisePool.query(`
            SELECT DISTINCT 
                s.subject_code,
                s.subject_name,
                s.syllabus_code,
                p.programme_code as programme,
                COUNT(DISTINCT ssh.student_id) as student_count,
                'III' as semester,
                'URR-18' as regulation
            FROM subject_master s
            LEFT JOIN student_semester_history ssh ON s.subject_code = ssh.subject_code
            LEFT JOIN programme_master p ON s.programme_id = p.programme_id
            WHERE s.is_active = 1
            GROUP BY s.subject_code, s.subject_name, s.syllabus_code, p.programme_code
            LIMIT 20
        `);
        
        return rows.map(row => ({
            subject_id: row.subject_code,
            subject_code: row.subject_code,
            subject_name: row.subject_name,
            syllabus_code: row.syllabus_code,
            programme: row.programme,
            semester: row.semester,
            regulation: row.regulation,
            student_count: row.student_count || 0
        }));
    } catch (error) {
        console.error('Error getting subjects:', error);
        return [];
    }
}

// Helper function to generate time slots
function generateTimeSlots(startDate, endDate) {
    const slots = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        slots.push({
            date: dateStr,
            fn: '09:00-12:00',
            an: '14:00-17:00'
        });
    }
    
    return slots;
}

module.exports = { initializeRouter };
