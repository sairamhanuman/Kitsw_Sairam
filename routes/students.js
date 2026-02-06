// Student Routes
const express = require('express');
const router = express.Router();

// Create a promise pool for database operations
let promisePool;

// Initialize the router with database pool
function initializeRouter(pool) {
    promisePool = pool;
    return router;
}

// GET all students
router.get('/', async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            `SELECT s.*, 
                    p.programme_name, 
                    b.branch_name, 
                    bat.batch_name, 
                    r.regulation_name, 
                    sec.section_name
             FROM student_master s
             LEFT JOIN programme_master p ON s.programme_id = p.programme_id
             LEFT JOIN branch_master b ON s.branch_id = b.branch_id
             LEFT JOIN batch_master bat ON s.batch_id = bat.batch_id
             LEFT JOIN regulation_master r ON s.regulation_id = r.regulation_id
             LEFT JOIN section_master sec ON s.section_id = sec.section_id
             ORDER BY s.roll_number`
        );
        
        res.json({
            status: 'success',
            message: 'Students retrieved successfully',
            data: rows
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch students',
            error: error.message
        });
    }
});

// GET single student by ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            `SELECT s.*, 
                    p.programme_name, 
                    b.branch_name, 
                    bat.batch_name, 
                    r.regulation_name, 
                    sec.section_name
             FROM student_master s
             LEFT JOIN programme_master p ON s.programme_id = p.programme_id
             LEFT JOIN branch_master b ON s.branch_id = b.branch_id
             LEFT JOIN batch_master bat ON s.batch_id = bat.batch_id
             LEFT JOIN regulation_master r ON s.regulation_id = r.regulation_id
             LEFT JOIN section_master sec ON s.section_id = sec.section_id
             WHERE s.student_id = ?`,
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Student not found'
            });
        }
        
        res.json({
            status: 'success',
            message: 'Student retrieved successfully',
            data: rows[0]
        });
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch student',
            error: error.message
        });
    }
});

// POST create new student
router.post('/', async (req, res) => {
    try {
        const { 
            roll_number, first_name, last_name, email, phone, date_of_birth,
            admission_year, programme_id, branch_id, batch_id, regulation_id, 
            section_id, current_semester, address, is_active 
        } = req.body;
        
        // Validation
        if (!roll_number || !first_name || !last_name || !admission_year || 
            !programme_id || !branch_id || !batch_id || !regulation_id || !section_id) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: roll_number, first_name, last_name, admission_year, programme_id, branch_id, batch_id, regulation_id, section_id'
            });
        }
        
        // Check if roll number already exists
        const [existing] = await promisePool.query(
            'SELECT student_id FROM student_master WHERE roll_number = ?',
            [roll_number]
        );
        
        if (existing.length > 0) {
            return res.status(409).json({
                status: 'error',
                message: 'Roll number already exists'
            });
        }
        
        // Check if email already exists (if provided)
        if (email) {
            const [existingEmail] = await promisePool.query(
                'SELECT student_id FROM student_master WHERE email = ?',
                [email]
            );
            
            if (existingEmail.length > 0) {
                return res.status(409).json({
                    status: 'error',
                    message: 'Email already exists'
                });
            }
        }
        
        // Verify foreign key references
        const [programme] = await promisePool.query(
            'SELECT programme_id FROM programme_master WHERE programme_id = ?',
            [programme_id]
        );
        
        if (programme.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid programme_id'
            });
        }
        
        const [branch] = await promisePool.query(
            'SELECT branch_id FROM branch_master WHERE branch_id = ?',
            [branch_id]
        );
        
        if (branch.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid branch_id'
            });
        }
        
        const [batch] = await promisePool.query(
            'SELECT batch_id FROM batch_master WHERE batch_id = ?',
            [batch_id]
        );
        
        if (batch.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid batch_id'
            });
        }
        
        const [regulation] = await promisePool.query(
            'SELECT regulation_id FROM regulation_master WHERE regulation_id = ?',
            [regulation_id]
        );
        
        if (regulation.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid regulation_id'
            });
        }
        
        const [section] = await promisePool.query(
            'SELECT section_id FROM section_master WHERE section_id = ?',
            [section_id]
        );
        
        if (section.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid section_id'
            });
        }
        
        // Insert new student
        const [result] = await promisePool.query(
            `INSERT INTO student_master 
            (roll_number, first_name, last_name, email, phone, date_of_birth, 
             admission_year, programme_id, branch_id, batch_id, regulation_id, 
             section_id, current_semester, address, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [roll_number, first_name, last_name, email || null, phone || null, 
             date_of_birth || null, admission_year, programme_id, branch_id, 
             batch_id, regulation_id, section_id, current_semester || 1, 
             address || null, is_active !== false]
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Student created successfully',
            data: {
                student_id: result.insertId,
                roll_number,
                first_name,
                last_name,
                email,
                phone,
                date_of_birth,
                admission_year,
                programme_id,
                branch_id,
                batch_id,
                regulation_id,
                section_id,
                current_semester: current_semester || 1,
                address,
                is_active: is_active !== false
            }
        });
    } catch (error) {
        console.error('Error creating student:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create student',
            error: error.message
        });
    }
});

// PUT update student
router.put('/:id', async (req, res) => {
    try {
        const { 
            first_name, last_name, email, phone, date_of_birth,
            programme_id, branch_id, batch_id, regulation_id, 
            section_id, current_semester, address, is_active 
        } = req.body;
        
        // Check if student exists
        const [existing] = await promisePool.query(
            'SELECT student_id FROM student_master WHERE student_id = ?',
            [req.params.id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Student not found'
            });
        }
        
        // Check if email already exists for another student (if provided)
        if (email) {
            const [existingEmail] = await promisePool.query(
                'SELECT student_id FROM student_master WHERE email = ? AND student_id != ?',
                [email, req.params.id]
            );
            
            if (existingEmail.length > 0) {
                return res.status(409).json({
                    status: 'error',
                    message: 'Email already exists'
                });
            }
        }
        
        // Verify foreign key references if provided
        if (programme_id) {
            const [programme] = await promisePool.query(
                'SELECT programme_id FROM programme_master WHERE programme_id = ?',
                [programme_id]
            );
            
            if (programme.length === 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid programme_id'
                });
            }
        }
        
        if (branch_id) {
            const [branch] = await promisePool.query(
                'SELECT branch_id FROM branch_master WHERE branch_id = ?',
                [branch_id]
            );
            
            if (branch.length === 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid branch_id'
                });
            }
        }
        
        if (batch_id) {
            const [batch] = await promisePool.query(
                'SELECT batch_id FROM batch_master WHERE batch_id = ?',
                [batch_id]
            );
            
            if (batch.length === 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid batch_id'
                });
            }
        }
        
        if (regulation_id) {
            const [regulation] = await promisePool.query(
                'SELECT regulation_id FROM regulation_master WHERE regulation_id = ?',
                [regulation_id]
            );
            
            if (regulation.length === 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid regulation_id'
                });
            }
        }
        
        if (section_id) {
            const [section] = await promisePool.query(
                'SELECT section_id FROM section_master WHERE section_id = ?',
                [section_id]
            );
            
            if (section.length === 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid section_id'
                });
            }
        }
        
        // Update student
        await promisePool.query(
            `UPDATE student_master 
            SET first_name = ?, last_name = ?, email = ?, phone = ?, date_of_birth = ?,
                programme_id = ?, branch_id = ?, batch_id = ?, regulation_id = ?, 
                section_id = ?, current_semester = ?, address = ?, is_active = ?
            WHERE student_id = ?`,
            [first_name, last_name, email || null, phone || null, date_of_birth || null,
             programme_id, branch_id, batch_id, regulation_id, section_id, 
             current_semester || 1, address || null, is_active !== false, req.params.id]
        );
        
        res.json({
            status: 'success',
            message: 'Student updated successfully'
        });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update student',
            error: error.message
        });
    }
});

// DELETE student
router.delete('/:id', async (req, res) => {
    try {
        // Check if student exists
        const [existing] = await promisePool.query(
            'SELECT student_id, roll_number FROM student_master WHERE student_id = ?',
            [req.params.id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Student not found'
            });
        }
        
        // Delete student
        await promisePool.query(
            'DELETE FROM student_master WHERE student_id = ?',
            [req.params.id]
        );
        
        res.json({
            status: 'success',
            message: `Student ${existing[0].roll_number} deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting student:', error);
        
        // Check if error is due to foreign key constraint
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                status: 'error',
                message: 'Cannot delete student as it is referenced by other records'
            });
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete student',
            error: error.message
        });
    }
});

module.exports = initializeRouter;
