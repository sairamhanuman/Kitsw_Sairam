/**
 * MSE Exam Type Management Routes
 * Handles Mid-Semester Examination types and configuration
 */

const express = require('express');

module.exports = (pool) => {
    const router = express.Router();

    // =====================================================
    // MSE EXAM TYPE MASTER ROUTES
    // =====================================================

    // GET all MSE exam types
    router.get('/', async (req, res) => {
        try {
            const [examTypes] = await pool.query(
                `SELECT exam_type_id, exam_type_code, exam_type_name, exam_category, 
                        description, max_marks, duration_minutes, is_active, 
                        requires_invigilator, allows_multiple_sections, gap_required_minutes,
                        created_at, updated_at
                 FROM mse_exam_type_master 
                 WHERE deleted_at IS NULL 
                 ORDER BY exam_category, exam_type_code`
            );
            
            res.json({
                status: 'success',
                message: 'MSE exam types retrieved successfully',
                data: examTypes
            });
        } catch (error) {
            console.error('Error fetching MSE exam types:', error);
            res.status(500).json({ 
                status: 'error', 
                message: 'Failed to fetch MSE exam types',
                error: error.message 
            });
        }
    });

    // GET MSE exam type by ID
    router.get('/:id', async (req, res) => {
        try {
            const [examTypes] = await pool.query(
                `SELECT exam_type_id, exam_type_code, exam_type_name, exam_category, 
                        description, max_marks, duration_minutes, is_active, 
                        requires_invigilator, allows_multiple_sections, gap_required_minutes,
                        created_at, updated_at
                 FROM mse_exam_type_master 
                 WHERE exam_type_id = ? AND deleted_at IS NULL`,
                [req.params.id]
            );
            
            if (examTypes.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'MSE exam type not found'
                });
            }
            
            res.json({
                status: 'success',
                message: 'MSE exam type retrieved successfully',
                data: examTypes[0]
            });
        } catch (error) {
            console.error('Error fetching MSE exam type:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to fetch MSE exam type',
                error: error.message
            });
        }
    });

    // POST create new MSE exam type
    router.post('/', async (req, res) => {
        try {
            console.log('=== MSE EXAM TYPE CREATE REQUEST ===');
            console.log('Request body:', req.body);
            
            const { 
                exam_type_code, exam_type_name, exam_category, description, 
                max_marks, duration_minutes, requires_invigilator, 
                allows_multiple_sections, gap_required_minutes, is_active 
            } = req.body;
            
            // Validation
            if (!exam_type_code || !exam_type_name || !exam_category) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Missing required fields: exam_type_code, exam_type_name, exam_category'
                });
            }
            
            // Insert new MSE exam type
            console.log('Inserting MSE exam type...');
            const [result] = await pool.query(
                `INSERT INTO mse_exam_type_master 
                (exam_type_code, exam_type_name, exam_category, description, 
                 max_marks, duration_minutes, requires_invigilator, 
                 allows_multiple_sections, gap_required_minutes, is_active) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    exam_type_code, 
                    exam_type_name, 
                    exam_category, 
                    description || null, 
                    max_marks || 50, 
                    duration_minutes || 120,
                    requires_invigilator !== false, 
                    allows_multiple_sections || false, 
                    gap_required_minutes || 0,
                    is_active !== false
                ]
            );
            
            console.log('MSE exam type created successfully:', result.insertId);
            
            res.status(201).json({
                status: 'success',
                message: 'MSE exam type created successfully',
                data: {
                    exam_type_id: result.insertId,
                    exam_type_code,
                    exam_type_name,
                    exam_category,
                    description,
                    max_marks: max_marks || 50,
                    duration_minutes: duration_minutes || 120,
                    requires_invigilator: requires_invigilator !== false,
                    allows_multiple_sections: allows_multiple_sections || false,
                    gap_required_minutes: gap_required_minutes || 0,
                    is_active: is_active !== false
                }
            });
        } catch (error) {
            console.error('=== MSE EXAM TYPE CREATE ERROR ===');
            console.error('Error:', error);
            
            let errorMessage = 'Failed to create MSE exam type';
            if (error.code === 'ER_NO_SUCH_TABLE') {
                errorMessage = 'Database table not found. Please run MSE table creation script.';
            } else if (error.code === 'ER_BAD_FIELD_ERROR') {
                errorMessage = 'Database column mismatch';
            } else if (error.code === 'ER_DUP_ENTRY') {
                errorMessage = 'Exam type code already exists';
            }
            
            res.status(500).json({
                status: 'error',
                message: errorMessage,
                error: error.message
            });
        }
    });

    // PUT update MSE exam type
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { 
                exam_type_code, exam_type_name, exam_category, description, 
                max_marks, duration_minutes, requires_invigilator, 
                allows_multiple_sections, gap_required_minutes, is_active 
            } = req.body;
            
            // Check if MSE exam type exists
            const [existing] = await pool.query(
                'SELECT * FROM mse_exam_type_master WHERE exam_type_id = ? AND deleted_at IS NULL',
                [id]
            );
            
            if (existing.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'MSE exam type not found'
                });
            }
            
            // Update MSE exam type
            await pool.query(
                `UPDATE mse_exam_type_master 
                 SET exam_type_code = ?, exam_type_name = ?, exam_category = ?, 
                     description = ?, max_marks = ?, duration_minutes = ?, 
                     requires_invigilator = ?, allows_multiple_sections = ?, 
                     gap_required_minutes = ?, is_active = ?
                 WHERE exam_type_id = ?`,
                [
                    exam_type_code || existing[0].exam_type_code,
                    exam_type_name || existing[0].exam_type_name,
                    exam_category || existing[0].exam_category,
                    description !== undefined ? description : existing[0].description,
                    max_marks !== undefined ? max_marks : existing[0].max_marks,
                    duration_minutes !== undefined ? duration_minutes : existing[0].duration_minutes,
                    requires_invigilator !== undefined ? requires_invigilator : existing[0].requires_invigilator,
                    allows_multiple_sections !== undefined ? allows_multiple_sections : existing[0].allows_multiple_sections,
                    gap_required_minutes !== undefined ? gap_required_minutes : existing[0].gap_required_minutes,
                    is_active !== undefined ? is_active : existing[0].is_active,
                    id
                ]
            );
            
            res.json({
                status: 'success',
                message: 'MSE exam type updated successfully',
                data: {
                    exam_type_id: id,
                    exam_type_code,
                    exam_type_name,
                    exam_category,
                    description,
                    max_marks,
                    duration_minutes,
                    requires_invigilator,
                    allows_multiple_sections,
                    gap_required_minutes,
                    is_active
                }
            });
        } catch (error) {
            console.error('Error updating MSE exam type:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to update MSE exam type',
                error: error.message
            });
        }
    });

    // DELETE MSE exam type (soft delete)
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            // Check if MSE exam type exists and is active
            const [existing] = await pool.query(
                'SELECT * FROM mse_exam_type_master WHERE exam_type_id = ? AND deleted_at IS NULL',
                [id]
            );
            
            if (existing.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'MSE exam type not found or already deleted'
                });
            }
            
            // Soft delete: Set deleted_at = NOW()
            await pool.query(
                'UPDATE mse_exam_type_master SET deleted_at = NOW() WHERE exam_type_id = ?',
                [id]
            );
            
            console.log(`MSE exam type ${id} soft deleted successfully`);
            
            res.json({
                status: 'success',
                message: 'MSE exam type deleted successfully (can be restored)'
            });
        } catch (error) {
            console.error('Error soft deleting MSE exam type:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to delete MSE exam type',
                error: error.message
            });
        }
    });

    // =====================================================
    // MSE CONFIGURATION ROUTES
    // =====================================================

    // GET all MSE configurations
    router.get('/config/all', async (req, res) => {
        try {
            const [configs] = await pool.query(
                'SELECT config_key, config_value, config_type, description, is_active FROM mse_configuration WHERE is_active = 1'
            );
            
            res.json({
                status: 'success',
                message: 'MSE configurations retrieved successfully',
                data: configs
            });
        } catch (error) {
            console.error('Error fetching MSE configurations:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to fetch MSE configurations',
                error: error.message
            });
        }
    });

    // PUT update MSE configuration
    router.put('/config/:key', async (req, res) => {
        try {
            const { key } = req.params;
            const { config_value } = req.body;
            
            await pool.query(
                'UPDATE mse_configuration SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = ?',
                [config_value, key]
            );
            
            res.json({
                status: 'success',
                message: 'MSE configuration updated successfully'
            });
        } catch (error) {
            console.error('Error updating MSE configuration:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to update MSE configuration',
                error: error.message
            });
        }
    });

    return router;
};
