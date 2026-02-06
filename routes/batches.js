// Batch Routes
const express = require('express');
const router = express.Router();

// Create a promise pool for database operations
let promisePool;

// Initialize the router with database pool
function initializeRouter(pool) {
    promisePool = pool;
    return router;
}

// GET all batches
router.get('/', async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            'SELECT * FROM batch_master ORDER BY batch_year DESC'
        );
        
        res.json({
            status: 'success',
            message: 'Batches retrieved successfully',
            data: rows
        });
    } catch (error) {
        console.error('Error fetching batches:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch batches',
            error: error.message
        });
    }
});

// GET single batch by ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            'SELECT * FROM batch_master WHERE batch_id = ?',
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Batch not found'
            });
        }
        
        res.json({
            status: 'success',
            message: 'Batch retrieved successfully',
            data: rows[0]
        });
    } catch (error) {
        console.error('Error fetching batch:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch batch',
            error: error.message
        });
    }
});

// POST create new batch
router.post('/', async (req, res) => {
    try {
        const { batch_year, batch_name, start_date, end_date, description, is_active } = req.body;
        
        // Validation
        if (!batch_year || !batch_name || !start_date) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: batch_year, batch_name, start_date'
            });
        }
        
        // Check if batch year already exists
        const [existing] = await promisePool.query(
            'SELECT batch_id FROM batch_master WHERE batch_year = ?',
            [batch_year]
        );
        
        if (existing.length > 0) {
            return res.status(409).json({
                status: 'error',
                message: 'Batch year already exists'
            });
        }
        
        // Insert new batch
        const [result] = await promisePool.query(
            `INSERT INTO batch_master 
            (batch_year, batch_name, start_date, end_date, description, is_active) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [batch_year, batch_name, start_date, end_date || null, description || null, is_active !== false]
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Batch created successfully',
            data: {
                batch_id: result.insertId,
                batch_year,
                batch_name,
                start_date,
                end_date,
                description,
                is_active: is_active !== false
            }
        });
    } catch (error) {
        console.error('Error creating batch:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create batch',
            error: error.message
        });
    }
});

// PUT update batch
router.put('/:id', async (req, res) => {
    try {
        const { batch_name, start_date, end_date, description, is_active } = req.body;
        
        // Check if batch exists
        const [existing] = await promisePool.query(
            'SELECT batch_id FROM batch_master WHERE batch_id = ?',
            [req.params.id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Batch not found'
            });
        }
        
        // Update batch
        await promisePool.query(
            `UPDATE batch_master 
            SET batch_name = ?, start_date = ?, end_date = ?, description = ?, is_active = ?
            WHERE batch_id = ?`,
            [batch_name, start_date, end_date || null, description || null, is_active !== false, req.params.id]
        );
        
        res.json({
            status: 'success',
            message: 'Batch updated successfully'
        });
    } catch (error) {
        console.error('Error updating batch:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update batch',
            error: error.message
        });
    }
});

// DELETE batch
router.delete('/:id', async (req, res) => {
    try {
        // Check if batch exists
        const [existing] = await promisePool.query(
            'SELECT batch_id, batch_name FROM batch_master WHERE batch_id = ?',
            [req.params.id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Batch not found'
            });
        }
        
        // Delete batch
        await promisePool.query(
            'DELETE FROM batch_master WHERE batch_id = ?',
            [req.params.id]
        );
        
        res.json({
            status: 'success',
            message: `Batch ${existing[0].batch_name} deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting batch:', error);
        
        // Check if error is due to foreign key constraint
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                status: 'error',
                message: 'Cannot delete batch as it is referenced by other records'
            });
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete batch',
            error: error.message
        });
    }
});

module.exports = initializeRouter;
