// Programme Routes
const express = require('express');
const router = express.Router();

// Create a promise pool for database operations
let promisePool;

// Initialize the router with database pool
function initializeRouter(pool) {
    promisePool = pool;
    return router;
}

// GET all programmes
router.get('/', async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            'SELECT * FROM programme_master ORDER BY programme_code'
        );
        
        res.json({
            status: 'success',
            message: 'Programmes retrieved successfully',
            data: rows
        });
    } catch (error) {
        console.error('Error fetching programmes:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch programmes',
            error: error.message
        });
    }
});

// GET single programme by ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            'SELECT * FROM programme_master WHERE programme_id = ?',
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Programme not found'
            });
        }
        
        res.json({
            status: 'success',
            message: 'Programme retrieved successfully',
            data: rows[0]
        });
    } catch (error) {
        console.error('Error fetching programme:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch programme',
            error: error.message
        });
    }
});

// POST create new programme
router.post('/', async (req, res) => {
    try {
        const { programme_code, programme_name, programme_type, duration_years, description, is_active } = req.body;
        
        // Validation
        if (!programme_code || !programme_name || !programme_type || !duration_years) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: programme_code, programme_name, programme_type, duration_years'
            });
        }
        
        // Check if programme code already exists
        const [existing] = await promisePool.query(
            'SELECT programme_id FROM programme_master WHERE programme_code = ?',
            [programme_code]
        );
        
        if (existing.length > 0) {
            return res.status(409).json({
                status: 'error',
                message: 'Programme code already exists'
            });
        }
        
        // Insert new programme
        const [result] = await promisePool.query(
            `INSERT INTO programme_master 
            (programme_code, programme_name, programme_type, duration_years, description, is_active) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [programme_code, programme_name, programme_type, duration_years, description || null, is_active !== false]
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Programme created successfully',
            data: {
                programme_id: result.insertId,
                programme_code,
                programme_name,
                programme_type,
                duration_years,
                description,
                is_active: is_active !== false
            }
        });
    } catch (error) {
        console.error('Error creating programme:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create programme',
            error: error.message
        });
    }
});

// PUT update programme
router.put('/:id', async (req, res) => {
    try {
        const { programme_name, programme_type, duration_years, description, is_active } = req.body;
        
        // Check if programme exists
        const [existing] = await promisePool.query(
            'SELECT programme_id FROM programme_master WHERE programme_id = ?',
            [req.params.id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Programme not found'
            });
        }
        
        // Update programme
        await promisePool.query(
            `UPDATE programme_master 
            SET programme_name = ?, programme_type = ?, duration_years = ?, 
                description = ?, is_active = ?
            WHERE programme_id = ?`,
            [programme_name, programme_type, duration_years, description || null, is_active !== false, req.params.id]
        );
        
        res.json({
            status: 'success',
            message: 'Programme updated successfully'
        });
    } catch (error) {
        console.error('Error updating programme:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update programme',
            error: error.message
        });
    }
});

// DELETE programme
router.delete('/:id', async (req, res) => {
    try {
        // Check if programme exists
        const [existing] = await promisePool.query(
            'SELECT programme_id, programme_code FROM programme_master WHERE programme_id = ?',
            [req.params.id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Programme not found'
            });
        }
        
        // Delete programme
        await promisePool.query(
            'DELETE FROM programme_master WHERE programme_id = ?',
            [req.params.id]
        );
        
        res.json({
            status: 'success',
            message: `Programme ${existing[0].programme_code} deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting programme:', error);
        
        // Check if error is due to foreign key constraint
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                status: 'error',
                message: 'Cannot delete programme as it is referenced by other records'
            });
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete programme',
            error: error.message
        });
    }
});

module.exports = initializeRouter;
