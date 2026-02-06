// Exam Session Routes
const express = require('express');
const router = express.Router();

// Create a promise pool for database operations
let promisePool;

// Initialize the router with database pool
function initializeRouter(pool) {
    promisePool = pool;
    return router;
}

// GET all exam sessions
router.get('/', async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            'SELECT * FROM exam_session_master ORDER BY exam_date DESC'
        );
        
        res.json({
            status: 'success',
            message: 'Exam sessions retrieved successfully',
            data: rows
        });
    } catch (error) {
        console.error('Error fetching exam sessions:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch exam sessions',
            error: error.message
        });
    }
});

// GET single exam session by ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            'SELECT * FROM exam_session_master WHERE session_id = ?',
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Exam session not found'
            });
        }
        
        res.json({
            status: 'success',
            message: 'Exam session retrieved successfully',
            data: rows[0]
        });
    } catch (error) {
        console.error('Error fetching exam session:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch exam session',
            error: error.message
        });
    }
});

// POST create new exam session
router.post('/', async (req, res) => {
    try {
        // Debug logging - consider removing in production or using environment-based logging
        console.log('Received exam session data:', req.body);
        
        const { session_name, exam_date, session_type, start_time, end_time, is_active } = req.body;
        
        // Validation
        if (!session_name || !exam_date) {
            console.error('Validation failed:', { session_name, exam_date });
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: session_name, exam_date'
            });
        }
        
        // Combine timings if provided
        let timings = null;
        if (start_time && end_time) {
            timings = `${start_time} - ${end_time}`;
        }
        
        // Insert new exam session
        const [result] = await promisePool.query(
            `INSERT INTO exam_session_master 
            (session_name, exam_date, session_type, timings, is_active) 
            VALUES (?, ?, ?, ?, ?)`,
            [session_name, exam_date, session_type || null, timings, is_active !== false]
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Exam session created successfully',
            data: {
                session_id: result.insertId,
                session_name,
                exam_date,
                session_type,
                timings,
                is_active: is_active !== false
            }
        });
    } catch (error) {
        console.error('Error creating exam session:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create exam session',
            error: error.message
        });
    }
});

// PUT update exam session
router.put('/:id', async (req, res) => {
    try {
        const { session_name, exam_date, session_type, start_time, end_time, is_active } = req.body;
        
        // Check if exam session exists
        const [existing] = await promisePool.query(
            'SELECT session_id FROM exam_session_master WHERE session_id = ?',
            [req.params.id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Exam session not found'
            });
        }
        
        // Combine timings if provided
        let timings = null;
        if (start_time && end_time) {
            timings = `${start_time} - ${end_time}`;
        }
        
        // Update exam session
        await promisePool.query(
            `UPDATE exam_session_master 
            SET session_name = ?, exam_date = ?, session_type = ?, timings = ?, is_active = ?
            WHERE session_id = ?`,
            [session_name, exam_date, session_type || null, timings, is_active !== false, req.params.id]
        );
        
        res.json({
            status: 'success',
            message: 'Exam session updated successfully'
        });
    } catch (error) {
        console.error('Error updating exam session:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update exam session',
            error: error.message
        });
    }
});

// DELETE exam session
router.delete('/:id', async (req, res) => {
    try {
        // Check if exam session exists
        const [existing] = await promisePool.query(
            'SELECT session_id, session_name FROM exam_session_master WHERE session_id = ?',
            [req.params.id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Exam session not found'
            });
        }
        
        // Delete exam session
        await promisePool.query(
            'DELETE FROM exam_session_master WHERE session_id = ?',
            [req.params.id]
        );
        
        res.json({
            status: 'success',
            message: `Exam session ${existing[0].session_name} deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting exam session:', error);
        
        // Check if error is due to foreign key constraint
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                status: 'error',
                message: 'Cannot delete exam session as it is referenced by other records'
            });
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete exam session',
            error: error.message
        });
    }
});

module.exports = initializeRouter;
