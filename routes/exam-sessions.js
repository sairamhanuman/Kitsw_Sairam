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
        console.log('=== EXAM SESSION CREATE REQUEST ===');
        console.log('Raw request body:', JSON.stringify(req.body, null, 2));
        console.log('Content-Type:', req.headers['content-type']);
        
        const { session_name, exam_date, session_type, start_time, end_time, is_active } = req.body;
        
        console.log('Parsed values:', {
            session_name,
            exam_date,
            session_type,
            start_time,
            end_time,
            is_active
        });
        
        // Validation
        if (!session_name || !exam_date) {
            console.error('Validation failed - missing required fields');
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: session_name, exam_date',
                received: { session_name, exam_date }
            });
        }
        
        // Combine timings if provided
        let timings = null;
        if (start_time && end_time) {
            timings = `${start_time} - ${end_time}`;
            console.log('Combined timings:', timings);
        }
        
        // Insert new exam session
        console.log('Attempting to insert exam session...');
        const insertQuery = `INSERT INTO exam_session_master 
            (session_name, exam_date, session_type, timings, is_active) 
            VALUES (?, ?, ?, ?, ?)`;
        const insertValues = [
            session_name, 
            exam_date, 
            session_type || null, 
            timings, 
            is_active !== false
        ];
        
        console.log('Insert query:', insertQuery);
        console.log('Insert values:', insertValues);
        
        const [result] = await promisePool.query(insertQuery, insertValues);
        
        console.log('Insert successful! Result:', result);
        
        const responseData = {
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
        };
        
        console.log('Sending success response:', responseData);
        res.status(201).json(responseData);
        
    } catch (error) {
        console.error('=== EXAM SESSION CREATE ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error errno:', error.errno);
        console.error('Error sqlMessage:', error.sqlMessage);
        console.error('Error sql:', error.sql);
        console.error('Full error:', error);
        
        // Parse specific error types
        let errorMessage = 'Failed to create exam session';
        let statusCode = 500;
        
        if (error.code === 'ER_DUP_ENTRY') {
            errorMessage = 'An exam session with this information already exists';
            statusCode = 409;
        } else if (error.code === 'ER_NO_SUCH_TABLE') {
            errorMessage = 'Database table not found. Please contact administrator.';
            statusCode = 500;
        } else if (error.code === 'ER_BAD_FIELD_ERROR') {
            errorMessage = 'Database column mismatch. Please contact administrator.';
            statusCode = 500;
        }
        
        // Return response - include SQL details only in development
        const errorResponse = {
            status: 'error',
            message: errorMessage,
            error: error.message
        };
        
        // Only include SQL details in development for debugging
        if (process.env.NODE_ENV === 'development') {
            errorResponse.errorCode = error.code;
            errorResponse.sqlMessage = error.sqlMessage;
        }
        
        res.status(statusCode).json(errorResponse);
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
