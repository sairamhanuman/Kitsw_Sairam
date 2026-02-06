// Staff Routes
const express = require('express');
const router = express.Router();

// Create a promise pool for database operations
let promisePool;

// Initialize the router with database pool
function initializeRouter(pool) {
    promisePool = pool;
    return router;
}

// GET all staff
router.get('/', async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            'SELECT * FROM staff_master ORDER BY staff_name'
        );
        
        res.json({
            status: 'success',
            message: 'Staff retrieved successfully',
            data: rows
        });
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch staff',
            error: error.message
        });
    }
});

// GET single staff by ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            'SELECT * FROM staff_master WHERE staff_id = ?',
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Staff not found'
            });
        }
        
        res.json({
            status: 'success',
            message: 'Staff retrieved successfully',
            data: rows[0]
        });
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch staff',
            error: error.message
        });
    }
});

// POST create new staff
router.post('/', async (req, res) => {
    try {
        const { staff_name, email, phone, department, designation, is_active } = req.body;
        
        // Validation
        if (!staff_name) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required field: staff_name'
            });
        }
        
        // Check if email already exists (if provided)
        if (email) {
            const [existing] = await promisePool.query(
                'SELECT staff_id FROM staff_master WHERE email = ?',
                [email]
            );
            
            if (existing.length > 0) {
                return res.status(409).json({
                    status: 'error',
                    message: 'Email already exists'
                });
            }
        }
        
        // Insert new staff
        const [result] = await promisePool.query(
            `INSERT INTO staff_master 
            (staff_name, email, phone, department, designation, is_active) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [staff_name, email || null, phone || null, department || null, designation || null, is_active !== false]
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Staff created successfully',
            data: {
                staff_id: result.insertId,
                staff_name,
                email,
                phone,
                department,
                designation,
                is_active: is_active !== false
            }
        });
    } catch (error) {
        console.error('Error creating staff:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create staff',
            error: error.message
        });
    }
});

// PUT update staff
router.put('/:id', async (req, res) => {
    try {
        const { staff_name, email, phone, department, designation, is_active } = req.body;
        
        // Check if staff exists
        const [existing] = await promisePool.query(
            'SELECT staff_id FROM staff_master WHERE staff_id = ?',
            [req.params.id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Staff not found'
            });
        }
        
        // Check if email is being changed to an existing one
        if (email) {
            const [emailCheck] = await promisePool.query(
                'SELECT staff_id FROM staff_master WHERE email = ? AND staff_id != ?',
                [email, req.params.id]
            );
            
            if (emailCheck.length > 0) {
                return res.status(409).json({
                    status: 'error',
                    message: 'Email already exists'
                });
            }
        }
        
        // Update staff
        await promisePool.query(
            `UPDATE staff_master 
            SET staff_name = ?, email = ?, phone = ?, department = ?, designation = ?, is_active = ?
            WHERE staff_id = ?`,
            [staff_name, email || null, phone || null, department || null, designation || null, is_active !== false, req.params.id]
        );
        
        res.json({
            status: 'success',
            message: 'Staff updated successfully'
        });
    } catch (error) {
        console.error('Error updating staff:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update staff',
            error: error.message
        });
    }
});

// DELETE staff
router.delete('/:id', async (req, res) => {
    try {
        // Check if staff exists
        const [existing] = await promisePool.query(
            'SELECT staff_id, staff_name FROM staff_master WHERE staff_id = ?',
            [req.params.id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Staff not found'
            });
        }
        
        // Delete staff
        await promisePool.query(
            'DELETE FROM staff_master WHERE staff_id = ?',
            [req.params.id]
        );
        
        res.json({
            status: 'success',
            message: `Staff ${existing[0].staff_name} deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting staff:', error);
        
        // Check if error is due to foreign key constraint
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                status: 'error',
                message: 'Cannot delete staff as it is referenced by other records'
            });
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete staff',
            error: error.message
        });
    }
});

module.exports = initializeRouter;
