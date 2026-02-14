// Internal Exam Notifications Routes
const express = require('express');
const router = express.Router();

// Create a promise pool for database operations
let promisePool;

// Initialize the router with database pool
function initializeRouter(pool) {
    promisePool = pool;
    return router;
}

// GET all notifications
router.get('/', async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            `SELECT notification_id, notification_title, description, programmes, batches, semesters, 
                    regulations, exam_type, exam_name_id, session_id, month_year_id, 
                    start_date, end_date, start_time, end_time, status, created_by, 
                    created_at, updated_at
             FROM exam_notifications 
             ORDER BY created_at DESC`
        );
        
        // Parse JSON fields
        const notifications = rows.map(notification => ({
            ...notification,
            programmes: JSON.parse(notification.programmes || '[]'),
            batches: JSON.parse(notification.batches || '[]'),
            semesters: JSON.parse(notification.semesters || '[]'),
            regulations: JSON.parse(notification.regulations || '[]')
        }));
        
        res.json({
            status: 'success',
            message: 'Notifications retrieved successfully',
            data: notifications
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch notifications',
            error: error.message
        });
    }
});

// GET single notification by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await promisePool.query(
            `SELECT notification_id, notification_title, description, programmes, batches, semesters, 
                    regulations, exam_type, exam_name_id, session_id, month_year_id, 
                    start_date, end_date, start_time, end_time, status, created_by, 
                    created_at, updated_at
             FROM exam_notifications 
             WHERE notification_id = ?`,
            [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Notification not found'
            });
        }
        
        const notification = rows[0];
        notification.programmes = JSON.parse(notification.programmes || '[]');
        notification.batches = JSON.parse(notification.batches || '[]');
        notification.semesters = JSON.parse(notification.semesters || '[]');
        notification.regulations = JSON.parse(notification.regulations || '[]');
        
        res.json({
            status: 'success',
            message: 'Notification retrieved successfully',
            data: notification
        });
    } catch (error) {
        console.error('Error fetching notification:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch notification',
            error: error.message
        });
    }
});

// POST new notification
router.post('/', async (req, res) => {
    try {
        console.log('=== POST NOTIFICATION START ===');
        console.log('Request body:', req.body);
        
        const {
            notification_id,
            notification_title,
            description,
            programmes,
            batches,
            semesters,
            regulations,
            exam_type,
            exam_name_id,
            session_id,
            month_year_id,
            start_date,
            end_date,
            start_time,
            end_time,
            status = 'Draft',
            created_by
        } = req.body;

        console.log('Extracted data:', {
            notification_id,
            notification_title,
            exam_type,
            exam_name_id,
            session_id,
            month_year_id,
            start_date,
            end_date
        });

        // Validation
        if (!notification_id || !notification_title || !exam_type || !exam_name_id || 
            !session_id || !month_year_id || !start_date || !end_date) {
            console.log('❌ Validation failed - missing required fields');
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields'
            });
        }

        console.log('✅ Validation passed');

        // Check if notification ID already exists
        console.log('🔍 Checking for existing notification ID:', notification_id);
        const [existingNotification] = await promisePool.query(
            'SELECT notification_id FROM exam_notifications WHERE notification_id = ?',
            [notification_id]
        );
        
        if (existingNotification.length > 0) {
            console.log('❌ Notification ID already exists');
            return res.status(400).json({
                status: 'error',
                message: 'Notification ID already exists'
            });
        }

        console.log('✅ Notification ID is unique');

        // Insert new notification
        console.log('💾 Inserting notification...');
        const [result] = await promisePool.query(
            `INSERT INTO exam_notifications 
             (notification_id, notification_title, description, programmes, batches, semesters, 
              regulations, exam_type, exam_name_id, session_id, month_year_id, 
              start_date, end_date, start_time, end_time, status, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                notification_id,
                notification_title,
                description,
                programmes,
                batches,
                semesters,
                regulations,
                exam_type,
                exam_name_id,
                session_id,
                month_year_id,
                start_date,
                end_date,
                start_time,
                end_time,
                status,
                created_by
            ]
        );

        console.log('✅ Insert successful, result:', result);

        // Log status change
        console.log('📝 Logging status change...');
        await promisePool.query(
            'INSERT INTO notification_status_log (notification_id, status_to, changed_by, change_reason) VALUES (?, ?, ?, ?)',
            [notification_id, status, created_by, 'Notification created']
        );

        console.log('🎉 Notification created successfully!');
        res.status(201).json({
            status: 'success',
            message: 'Notification created successfully',
            data: {
                notification_id,
                notification_title,
                status
            }
        });
        
    } catch (error) {
        console.error('=== POST NOTIFICATION ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('SQL:', error.sql);
        console.error('Full error:', error);
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to create notification',
            error: error.message
        });
    }
});

// PUT update notification
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            notification_title,
            description,
            programmes,
            batches,
            semesters,
            regulations,
            exam_type,
            exam_name_id,
            session_id,
            month_year_id,
            start_date,
            end_date,
            start_time,
            end_time,
            status,
            changed_by
        } = req.body;

        // Check if notification exists
        const [existingNotification] = await promisePool.query(
            'SELECT status FROM exam_notifications WHERE notification_id = ?',
            [id]
        );

        if (existingNotification.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Notification not found'
            });
        }

        const oldStatus = existingNotification[0].status;

        // Update notification
        const updateFields = [];
        const updateValues = [];

        if (notification_title !== undefined) {
            updateFields.push('notification_title = ?');
            updateValues.push(notification_title);
        }
        if (description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(description);
        }
        if (programmes !== undefined) {
            updateFields.push('programmes = ?');
            updateValues.push(programmes);
        }
        if (batches !== undefined) {
            updateFields.push('batches = ?');
            updateValues.push(batches);
        }
        if (semesters !== undefined) {
            updateFields.push('semesters = ?');
            updateValues.push(semesters);
        }
        if (regulations !== undefined) {
            updateFields.push('regulations = ?');
            updateValues.push(regulations);
        }
        if (exam_type !== undefined) {
            updateFields.push('exam_type = ?');
            updateValues.push(exam_type);
        }
        if (exam_name_id !== undefined) {
            updateFields.push('exam_name_id = ?');
            updateValues.push(exam_name_id);
        }
        if (session_id !== undefined) {
            updateFields.push('session_id = ?');
            updateValues.push(session_id);
        }
        if (month_year_id !== undefined) {
            updateFields.push('month_year_id = ?');
            updateValues.push(month_year_id);
        }
        if (start_date !== undefined) {
            updateFields.push('start_date = ?');
            updateValues.push(start_date);
        }
        if (end_date !== undefined) {
            updateFields.push('end_date = ?');
            updateValues.push(end_date);
        }
        if (start_time !== undefined) {
            updateFields.push('start_time = ?');
            updateValues.push(start_time);
        }
        if (end_time !== undefined) {
            updateFields.push('end_time = ?');
            updateValues.push(end_time);
        }
        if (status !== undefined) {
            updateFields.push('status = ?');
            updateValues.push(status);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No fields to update'
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(id);

        await promisePool.query(
            `UPDATE exam_notifications SET ${updateFields.join(', ')} WHERE notification_id = ?`,
            updateValues
        );

        // Log status change if status changed
        if (status && status !== oldStatus) {
            await promisePool.query(
                'INSERT INTO notification_status_log (notification_id, status_from, status_to, changed_by, change_reason) VALUES (?, ?, ?, ?)',
                [id, oldStatus, status, changed_by, 'Status updated']
            );
        }

        res.json({
            status: 'success',
            message: 'Notification updated successfully'
        });
    } catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update notification',
            error: error.message
        });
    }
});

// DELETE notification (soft delete by changing status to Cancelled)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { changed_by } = req.body;

        // Check if notification exists
        const [existingNotification] = await promisePool.query(
            'SELECT status FROM exam_notifications WHERE notification_id = ?',
            [id]
        );

        if (existingNotification.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Notification not found'
            });
        }

        const oldStatus = existingNotification[0].status;

        // Soft delete by changing status to Cancelled
        await promisePool.query(
            'UPDATE exam_notifications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE notification_id = ?',
            ['Cancelled', id]
        );

        // Log status change
        await promisePool.query(
            'INSERT INTO notification_status_log (notification_id, status_from, status_to, changed_by, change_reason) VALUES (?, ?, ?, ?)',
            [id, oldStatus, 'Cancelled', changed_by, 'Notification cancelled']
        );

        res.json({
            status: 'success',
            message: 'Notification cancelled successfully'
        });
    } catch (error) {
        console.error('Error cancelling notification:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to cancel notification',
            error: error.message
        });
    }
});

// GET notification statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const [stats] = await promisePool.query(`
            SELECT 
                COUNT(*) as total_notifications,
                SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) as draft_count,
                SUM(CASE WHEN status = 'Published' THEN 1 ELSE 0 END) as published_count,
                SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_count,
                COUNT(DISTINCT exam_type) as exam_types_count
            FROM exam_notifications
        `);

        const [recentNotifications] = await promisePool.query(`
            SELECT notification_id, notification_title, status, created_at
            FROM exam_notifications 
            ORDER BY created_at DESC 
            LIMIT 5
        `);

        res.json({
            status: 'success',
            message: 'Statistics retrieved successfully',
            data: {
                overview: stats[0],
                recent_notifications: recentNotifications
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

module.exports = { initializeRouter };
