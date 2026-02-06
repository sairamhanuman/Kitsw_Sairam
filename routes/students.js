// Student Routes - Comprehensive Implementation
const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');

// Create a promise pool for database operations
let promisePool;

// Initialize the router with database pool
function initializeRouter(pool) {
    promisePool = pool;
    return router;
}

// GET all students with filters and statistics
router.get('/', async (req, res) => {
    try {
        const { 
            programme_id, 
            branch_id, 
            batch_id, 
            semester_id, 
            section_id, 
            student_status,
            gender,
            search 
        } = req.query;
        
        let query = `
            SELECT s.*, 
                   p.programme_name, p.programme_code,
                   b.branch_name, b.branch_code,
                   bat.batch_name, 
                   sem.semester_name,
                   r.regulation_name, 
                   sec.section_name
            FROM student_master s
            LEFT JOIN programme_master p ON s.programme_id = p.programme_id
            LEFT JOIN branch_master b ON s.branch_id = b.branch_id
            LEFT JOIN batch_master bat ON s.batch_id = bat.batch_id
            LEFT JOIN semester_master sem ON s.semester_id = sem.semester_id
            LEFT JOIN regulation_master r ON s.regulation_id = r.regulation_id
            LEFT JOIN section_master sec ON s.section_id = sec.section_id
            WHERE s.is_active = 1
        `;
        
        const params = [];
        
        // Apply filters
        if (programme_id) {
            query += ' AND s.programme_id = ?';
            params.push(programme_id);
        }
        
        if (branch_id) {
            query += ' AND s.branch_id = ?';
            params.push(branch_id);
        }
        
        if (batch_id) {
            query += ' AND s.batch_id = ?';
            params.push(batch_id);
        }
        
        if (semester_id) {
            query += ' AND s.semester_id = ?';
            params.push(semester_id);
        }
        
        if (section_id) {
            query += ' AND s.section_id = ?';
            params.push(section_id);
        }
        
        if (student_status) {
            query += ' AND s.student_status = ?';
            params.push(student_status);
        }
        
        if (gender) {
            query += ' AND s.gender = ?';
            params.push(gender);
        }
        
        if (search) {
            query += ' AND (s.full_name LIKE ? OR s.admission_number LIKE ? OR s.roll_number LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        query += ' ORDER BY s.admission_number';
        
        const [students] = await promisePool.query(query, params);
        
        // Calculate statistics
        const statistics = {
            total: students.length,
            boys: students.filter(s => s.gender === 'Male').length,
            girls: students.filter(s => s.gender === 'Female').length,
            in_roll: students.filter(s => s.student_status === 'In Roll').length,
            detained: students.filter(s => s.student_status === 'Detained').length,
            left_out: students.filter(s => s.student_status === 'Left out').length
        };
        
        res.json({
            status: 'success',
            message: 'Students retrieved successfully',
            data: {
                students: students,
                statistics: statistics
            }
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
                    p.programme_name, p.programme_code,
                    b.branch_name, b.branch_code,
                    bat.batch_name, 
                    sem.semester_name,
                    r.regulation_name, 
                    sec.section_name
             FROM student_master s
             LEFT JOIN programme_master p ON s.programme_id = p.programme_id
             LEFT JOIN branch_master b ON s.branch_id = b.branch_id
             LEFT JOIN batch_master bat ON s.batch_id = bat.batch_id
             LEFT JOIN semester_master sem ON s.semester_id = sem.semester_id
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
            admission_number,
            ht_number,
            roll_number,
            full_name,
            programme_id,
            branch_id,
            batch_id,
            semester_id,
            section_id,
            regulation_id,
            date_of_birth,
            gender,
            father_name,
            mother_name,
            aadhaar_number,
            caste_category,
            student_mobile,
            parent_mobile,
            email,
            admission_date,
            completion_year,
            date_of_leaving,
            discontinue_date,
            student_status,
            is_detainee,
            is_transitory,
            is_handicapped,
            is_lateral,
            join_curriculum,
            is_locked
        } = req.body;
        
        // Validation
        if (!admission_number || !full_name || !gender) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: admission_number, full_name, gender'
            });
        }
        
        if (!programme_id || !branch_id || !batch_id) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: programme_id, branch_id, batch_id'
            });
        }
        
        // Validate mobile numbers (10 digits)
        if (student_mobile && !/^\d{10}$/.test(student_mobile)) {
            return res.status(400).json({
                status: 'error',
                message: 'Student mobile must be 10 digits'
            });
        }
        
        if (parent_mobile && !/^\d{10}$/.test(parent_mobile)) {
            return res.status(400).json({
                status: 'error',
                message: 'Parent mobile must be 10 digits'
            });
        }
        
        // Validate Aadhaar (12 digits)
        if (aadhaar_number && !/^\d{12}$/.test(aadhaar_number)) {
            return res.status(400).json({
                status: 'error',
                message: 'Aadhaar number must be 12 digits'
            });
        }
        
        // Validate email format
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid email format'
            });
        }
        
        // Check if admission number already exists
        const [existing] = await promisePool.query(
            'SELECT student_id FROM student_master WHERE admission_number = ?',
            [admission_number]
        );
        
        if (existing.length > 0) {
            return res.status(409).json({
                status: 'error',
                message: 'Admission number already exists'
            });
        }
        
        // Insert new student
        const [result] = await promisePool.query(
            `INSERT INTO student_master 
            (admission_number, ht_number, roll_number, full_name, 
             programme_id, branch_id, batch_id, semester_id, section_id, regulation_id,
             date_of_birth, gender, father_name, mother_name, aadhaar_number, caste_category,
             student_mobile, parent_mobile, email, admission_date, completion_year,
             date_of_leaving, discontinue_date, student_status,
             is_detainee, is_transitory, is_handicapped, is_lateral, join_curriculum, is_locked) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                admission_number,
                ht_number || null,
                roll_number || null,
                full_name,
                programme_id,
                branch_id,
                batch_id,
                semester_id || null,
                section_id || null,
                regulation_id || null,
                date_of_birth || null,
                gender,
                father_name || null,
                mother_name || null,
                aadhaar_number || null,
                caste_category || null,
                student_mobile || null,
                parent_mobile || null,
                email || null,
                admission_date || null,
                completion_year || null,
                date_of_leaving || null,
                discontinue_date || null,
                student_status || 'In Roll',
                is_detainee || false,
                is_transitory || false,
                is_handicapped || false,
                is_lateral || false,
                join_curriculum || false,
                is_locked || false
            ]
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Student created successfully',
            data: {
                student_id: result.insertId,
                admission_number,
                full_name
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
            admission_number,
            ht_number,
            roll_number,
            full_name,
            programme_id,
            branch_id,
            batch_id,
            semester_id,
            section_id,
            regulation_id,
            date_of_birth,
            gender,
            father_name,
            mother_name,
            aadhaar_number,
            caste_category,
            student_mobile,
            parent_mobile,
            email,
            admission_date,
            completion_year,
            date_of_leaving,
            discontinue_date,
            student_status,
            is_detainee,
            is_transitory,
            is_handicapped,
            is_lateral,
            join_curriculum,
            is_locked
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
        
        // Validate mobile numbers (10 digits)
        if (student_mobile && !/^\d{10}$/.test(student_mobile)) {
            return res.status(400).json({
                status: 'error',
                message: 'Student mobile must be 10 digits'
            });
        }
        
        if (parent_mobile && !/^\d{10}$/.test(parent_mobile)) {
            return res.status(400).json({
                status: 'error',
                message: 'Parent mobile must be 10 digits'
            });
        }
        
        // Validate Aadhaar (12 digits)
        if (aadhaar_number && !/^\d{12}$/.test(aadhaar_number)) {
            return res.status(400).json({
                status: 'error',
                message: 'Aadhaar number must be 12 digits'
            });
        }
        
        // Validate email format
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid email format'
            });
        }
        
        // Check if admission number already exists for another student
        if (admission_number) {
            const [existingAdmission] = await promisePool.query(
                'SELECT student_id FROM student_master WHERE admission_number = ? AND student_id != ?',
                [admission_number, req.params.id]
            );
            
            if (existingAdmission.length > 0) {
                return res.status(409).json({
                    status: 'error',
                    message: 'Admission number already exists'
                });
            }
        }
        
        // Update student
        await promisePool.query(
            `UPDATE student_master 
            SET admission_number = COALESCE(?, admission_number),
                ht_number = ?,
                roll_number = ?,
                full_name = COALESCE(?, full_name),
                programme_id = COALESCE(?, programme_id),
                branch_id = COALESCE(?, branch_id),
                batch_id = COALESCE(?, batch_id),
                semester_id = ?,
                section_id = ?,
                regulation_id = ?,
                date_of_birth = ?,
                gender = COALESCE(?, gender),
                father_name = ?,
                mother_name = ?,
                aadhaar_number = ?,
                caste_category = ?,
                student_mobile = ?,
                parent_mobile = ?,
                email = ?,
                admission_date = ?,
                completion_year = ?,
                date_of_leaving = ?,
                discontinue_date = ?,
                student_status = COALESCE(?, student_status),
                is_detainee = COALESCE(?, is_detainee),
                is_transitory = COALESCE(?, is_transitory),
                is_handicapped = COALESCE(?, is_handicapped),
                is_lateral = COALESCE(?, is_lateral),
                join_curriculum = COALESCE(?, join_curriculum),
                is_locked = COALESCE(?, is_locked)
            WHERE student_id = ?`,
            [
                admission_number,
                ht_number || null,
                roll_number || null,
                full_name,
                programme_id,
                branch_id,
                batch_id,
                semester_id || null,
                section_id || null,
                regulation_id || null,
                date_of_birth || null,
                gender,
                father_name || null,
                mother_name || null,
                aadhaar_number || null,
                caste_category || null,
                student_mobile || null,
                parent_mobile || null,
                email || null,
                admission_date || null,
                completion_year || null,
                date_of_leaving || null,
                discontinue_date || null,
                student_status,
                is_detainee,
                is_transitory,
                is_handicapped,
                is_lateral,
                join_curriculum,
                is_locked,
                req.params.id
            ]
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

// DELETE student (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if student exists and is active
        const [existing] = await promisePool.query(
            'SELECT * FROM student_master WHERE student_id = ? AND is_active = 1',
            [id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Student not found or already deleted'
            });
        }
        
        // Soft delete: Set is_active = 0 and deleted_at = NOW()
        await promisePool.query(
            'UPDATE student_master SET is_active = 0, deleted_at = NOW() WHERE student_id = ?',
            [id]
        );
        
        res.json({
            status: 'success',
            message: 'Student deleted successfully (can be restored)'
        });
    } catch (error) {
        console.error('Error soft deleting student:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete student',
            error: error.message
        });
    }
});

// POST restore deleted student
router.post('/:id/restore', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if student exists and is deleted
        const [existing] = await promisePool.query(
            'SELECT * FROM student_master WHERE student_id = ? AND is_active = 0',
            [id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Student not found or not deleted'
            });
        }
        
        // Restore: Set is_active = 1 and deleted_at = NULL
        await promisePool.query(
            'UPDATE student_master SET is_active = 1, deleted_at = NULL WHERE student_id = ?',
            [id]
        );
        
        res.json({
            status: 'success',
            message: 'Student restored successfully'
        });
    } catch (error) {
        console.error('Error restoring student:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to restore student',
            error: error.message
        });
    }
});

// POST bulk lock students by batch
router.post('/bulk-lock', async (req, res) => {
    try {
        const { batch_id } = req.body;
        
        if (!batch_id) {
            return res.status(400).json({
                status: 'error',
                message: 'batch_id is required'
            });
        }
        
        // Lock all students in the batch
        const [result] = await promisePool.query(
            'UPDATE student_master SET is_locked = 1 WHERE batch_id = ? AND is_active = 1',
            [batch_id]
        );
        
        res.json({
            status: 'success',
            message: `Locked ${result.affectedRows} students in the batch`
        });
    } catch (error) {
        console.error('Error bulk locking students:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to bulk lock students',
            error: error.message
        });
    }
});

// GET export students to Excel
router.get('/export/excel', async (req, res) => {
    try {
        // Get all active students with full details
        const [students] = await promisePool.query(`
            SELECT s.*, 
                   p.programme_name, p.programme_code,
                   b.branch_name, b.branch_code,
                   bat.batch_name, 
                   sem.semester_name,
                   r.regulation_name, 
                   sec.section_name
            FROM student_master s
            LEFT JOIN programme_master p ON s.programme_id = p.programme_id
            LEFT JOIN branch_master b ON s.branch_id = b.branch_id
            LEFT JOIN batch_master bat ON s.batch_id = bat.batch_id
            LEFT JOIN semester_master sem ON s.semester_id = sem.semester_id
            LEFT JOIN regulation_master r ON s.regulation_id = r.regulation_id
            LEFT JOIN section_master sec ON s.section_id = sec.section_id
            WHERE s.is_active = 1
            ORDER BY s.admission_number
        `);
        
        // Create workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Students');
        
        // Define columns
        worksheet.columns = [
            { header: 'Admission Number', key: 'admission_number', width: 15 },
            { header: 'HT Number', key: 'ht_number', width: 15 },
            { header: 'Roll Number', key: 'roll_number', width: 15 },
            { header: 'Full Name', key: 'full_name', width: 30 },
            { header: 'Programme', key: 'programme_name', width: 20 },
            { header: 'Branch', key: 'branch_name', width: 30 },
            { header: 'Batch', key: 'batch_name', width: 15 },
            { header: 'Semester', key: 'semester_name', width: 15 },
            { header: 'Section', key: 'section_name', width: 10 },
            { header: 'Regulation', key: 'regulation_name', width: 15 },
            { header: 'DOB', key: 'date_of_birth', width: 12 },
            { header: 'Gender', key: 'gender', width: 10 },
            { header: 'Father Name', key: 'father_name', width: 25 },
            { header: 'Mother Name', key: 'mother_name', width: 25 },
            { header: 'Aadhaar Number', key: 'aadhaar_number', width: 15 },
            { header: 'Caste Category', key: 'caste_category', width: 15 },
            { header: 'Student Mobile', key: 'student_mobile', width: 15 },
            { header: 'Parent Mobile', key: 'parent_mobile', width: 15 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Admission Date', key: 'admission_date', width: 15 },
            { header: 'Completion Year', key: 'completion_year', width: 15 },
            { header: 'Student Status', key: 'student_status', width: 15 },
            { header: 'Detainee', key: 'is_detainee', width: 10 },
            { header: 'Lateral', key: 'is_lateral', width: 10 },
            { header: 'Handicapped', key: 'is_handicapped', width: 12 },
            { header: 'Transitory', key: 'is_transitory', width: 10 }
        ];
        
        // Add data
        students.forEach(student => {
            worksheet.addRow({
                ...student,
                date_of_birth: student.date_of_birth ? new Date(student.date_of_birth).toISOString().split('T')[0] : '',
                admission_date: student.admission_date ? new Date(student.admission_date).toISOString().split('T')[0] : '',
                is_detainee: student.is_detainee ? 'Yes' : 'No',
                is_lateral: student.is_lateral ? 'Yes' : 'No',
                is_handicapped: student.is_handicapped ? 'Yes' : 'No',
                is_transitory: student.is_transitory ? 'Yes' : 'No'
            });
        });
        
        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
        };
        
        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx');
        
        // Write to response
        await workbook.xlsx.write(res);
        res.end();
        
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to export to Excel',
            error: error.message
        });
    }
});

// POST import students from Excel
router.post('/import/excel', async (req, res) => {
    try {
        // This would require file upload middleware
        // For now, returning a placeholder
        res.status(501).json({
            status: 'info',
            message: 'Excel import functionality - to be implemented with file upload'
        });
    } catch (error) {
        console.error('Error importing from Excel:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to import from Excel',
            error: error.message
        });
    }
});

module.exports = initializeRouter;
