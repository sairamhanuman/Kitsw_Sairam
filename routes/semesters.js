// Semester Routes
const express = require('express');
const router = express.Router();

// Create a promise pool for database operations
let promisePool;

// Initialize the router with database pool
function initializeRouter(pool) {
    promisePool = pool;
    return router;
}

// GET all semesters
router.get('/', async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            'SELECT * FROM semester_master ORDER BY semester_number'
        );
        
        res.json({
            status: 'success',
            message: 'Semesters retrieved successfully',
            data: rows
        });
    } catch (error) {
        console.error('Error fetching semesters:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch semesters',
            error: error.message
        });
    }
});

// GET single semester by ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            'SELECT * FROM semester_master WHERE semester_id = ?',
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Semester not found'
            });
        }
        
        res.json({
            status: 'success',
            message: 'Semester retrieved successfully',
            data: rows[0]
        });
    } catch (error) {
        console.error('Error fetching semester:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch semester',
            error: error.message
        });
    }
});

// POST create new semester
router.post('/', async (req, res) => {
    try {
        // Debug logging - consider removing in production or using environment-based logging
        console.log('Received semester data:', req.body);
        
        const { semester_number, semester_name, description, is_active } = req.body;
        
        // Validation
        if (!semester_number || !semester_name) {
            console.error('Validation failed:', { semester_number, semester_name });
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: semester_number, semester_name'
            });
        }
        
        // Check if semester number already exists
        const [existing] = await promisePool.query(
            'SELECT semester_id FROM semester_master WHERE semester_number = ?',
            [semester_number]
        );
        
        if (existing.length > 0) {
            return res.status(409).json({
                status: 'error',
                message: 'Semester number already exists'
            });
        }
        
        // Insert new semester
        const [result] = await promisePool.query(
            `INSERT INTO semester_master 
            (semester_number, semester_name, description, is_active) 
            VALUES (?, ?, ?, ?)`,
            [semester_number, semester_name, description || null, is_active !== false]
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Semester created successfully',
            data: {
                semester_id: result.insertId,
                semester_number,
                semester_name,
                description,
                is_active: is_active !== false
            }
        });
    } catch (error) {
        console.error('Error creating semester:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create semester',
            error: error.message
        });
    }
});

// PUT update semester
router.put('/:id', async (req, res) => {
    try {
        const { semester_name, description, is_active } = req.body;
        
        // Check if semester exists
        const [existing] = await promisePool.query(
            'SELECT semester_id FROM semester_master WHERE semester_id = ?',
            [req.params.id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Semester not found'
            });
        }
        
        // Update semester
        await promisePool.query(
            `UPDATE semester_master 
            SET semester_name = ?, description = ?, is_active = ?
            WHERE semester_id = ?`,
            [semester_name, description || null, is_active !== false, req.params.id]
        );
        
        res.json({
            status: 'success',
            message: 'Semester updated successfully'
        });
    } catch (error) {
        console.error('Error updating semester:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update semester',
            error: error.message
        });
    }
});

// DELETE semester
router.delete('/:id', async (req, res) => {
    try {
        // Check if semester exists
        const [existing] = await promisePool.query(
            'SELECT semester_id, semester_name FROM semester_master WHERE semester_id = ?',
            [req.params.id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Semester not found'
            });
        }
        
        // Delete semester
        await promisePool.query(
            'DELETE FROM semester_master WHERE semester_id = ?',
            [req.params.id]
        );
        
        res.json({
            status: 'success',
            message: `Semester ${existing[0].semester_name} deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting semester:', error);
        
        // Check if error is due to foreign key constraint
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                status: 'error',
                message: 'Cannot delete semester as it is referenced by other records'
            });
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete semester',
            error: error.message
        });
    }
});

module.exports = initializeRouter;
