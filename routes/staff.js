// Staff Routes - Comprehensive Implementation
const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Create a promise pool for database operations
let promisePool;

// Initialize the router with database pool
function initializeRouter(pool) {
    promisePool = pool;
    return router;
}

// Helper function to parse DD/MM/YYYY to YYYY-MM-DD
function parseDateDDMMYYYY(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.trim().split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Helper function to parse Yes/No to boolean
function parseYesNo(value) {
    if (!value) return false;
    return value.trim().toLowerCase() === 'yes' ? true : false;
}

// Helper to convert empty strings and undefined to null
const toNull = (value) => {
    if (value === undefined || value === null || value === '') {
        return null;
    }
    if (typeof value === 'string') {
        return value.trim();
    }
    return value;
};

// Helper to convert to boolean 0/1
const toBool = (value) => {
    if (value === true || value === 1 || value === '1' || value === 'true') {
        return 1;
    }
    return 0;
};

// GET all staff with filters and statistics
router.get('/', async (req, res) => {
    try {
        const { 
            department_id, 
            designation, 
            employment_status,
            search 
        } = req.query;
        
        let query = `
            SELECT s.*, 
                   d.branch_name as dept_name, d.branch_id as department_id
            FROM staff_master s
            LEFT JOIN branch_master d ON s.department_id = d.branch_id AND d.is_active = 1
            WHERE s.is_active = 1
        `;
        
        const params = [];
        
        // Apply filters
        if (department_id) {
            query += ' AND s.department_id = ?';
            params.push(department_id);
        }
        
        if (designation) {
            query += ' AND s.designation = ?';
            params.push(designation);
        }
        
        if (employment_status) {
            query += ' AND s.employment_status = ?';
            params.push(employment_status);
        }
        
        if (search) {
            query += ' AND (s.full_name LIKE ? OR s.employee_id LIKE ? OR s.email LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        query += ' ORDER BY s.employee_id';
        
        const [staff] = await promisePool.query(query, params);
        
        // Teaching designations
        const teachingDesignations = ['Principal', 'Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Lab Assistant'];
        
        // Calculate statistics
        const statistics = {
            total: staff.length,
            teaching: staff.filter(s => teachingDesignations.includes(s.designation)).length,
            non_teaching: staff.filter(s => !teachingDesignations.includes(s.designation)).length,
            active: staff.filter(s => s.employment_status === 'Active').length,
            on_leave: staff.filter(s => s.employment_status === 'On Leave').length,
            retired: staff.filter(s => s.employment_status === 'Retired').length
        };
        
        res.json({
            status: 'success',
            message: 'Staff retrieved successfully',
            data: {
                staff: staff,
                statistics: statistics
            }
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

// GET /api/staff/next-employee-id - Auto-generate next employee ID (MUST BE BEFORE /:id ROUTE)
router.get('/next-employee-id', async (req, res) => {
    try {
        console.log('=== GENERATE NEXT EMPLOYEE ID ===');
        
        // Get the latest employee ID
        const [rows] = await promisePool.query(
            `SELECT employee_id FROM staff_master 
             WHERE employee_id LIKE 'S%' 
             ORDER BY employee_id DESC 
             LIMIT 1`
        );
        
        let nextId;
        if (rows.length === 0) {
            // No staff yet, start with S1001
            nextId = 'S1001';
        } else {
            const lastId = rows[0].employee_id;
            // Extract number from S1001 -> 1001
            const numPart = parseInt(lastId.substring(1));
            // Increment and format
            nextId = 'S' + (numPart + 1);
        }
        
        console.log('Next Employee ID:', nextId);
        
        res.json({
            status: 'success',
            message: 'Next employee ID generated',
            data: { employee_id: nextId }
        });
        
    } catch (error) {
        console.error('=== NEXT EMPLOYEE ID ERROR ===');
        console.error('Error:', error);
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to generate next employee ID',
            error: error.message
        });
    }
});

// GET /api/staff/sample-excel - Generate sample Excel template (MUST BE BEFORE /:id ROUTE)
router.get('/sample-excel', async (req, res) => {
    try {
        console.log('=== GENERATE SAMPLE EXCEL TEMPLATE ===');
        
        // Build CSV content
        let csv = '';
        
        // Header Section (Rows 1-3)
        csv += `Staff Import Template\n`;
        csv += `Generated: ${new Date().toISOString()}\n`;
        csv += '\n'; // Empty line
        
        // Column Headers (Row 4)
        const headers = [
            'Employee ID',
            'Title Prefix (Mr/Mrs/Ms/Dr)',
            'Full Name',
            'Department',
            'Designation',
            'Date of Birth (DD/MM/YYYY)',
            'Gender (Male/Female/Other)',
            'Qualification',
            'Years of Experience',
            'Mobile Number',
            'Email',
            'Date of Joining (DD/MM/YYYY)',
            'Emergency Contact',
            'Address',
            'Bank Name',
            'Bank Account Number',
            'Bank IFSC Code',
            'PAN Number',
            'Aadhaar Number',
            'UAN Number',
            'Basic Salary',
            'Employment Status (Active/On Leave/Retired)',
            'Is HOD (Yes/No)',
            'Is Class Coordinator (Yes/No)',
            'Is Exam Invigilator (Yes/No)'
        ];
        csv += headers.join(',') + '\n';
        
        // Sample Data (Row 5)
        const sampleRow = [
            'S1001',
            'Dr',
            'RAMANUJAN',
            'CSE',
            'Professor',
            '15/01/1980',
            'Male',
            'Ph.D in Computer Science',
            '15',
            '9000000000',
            'ramanujan@college.edu',
            '01/07/2010',
            '9000000001',
            '123, Main Street, City - 500001',
            'State Bank of India',
            '12345678901234',
            'SBIN0001234',
            'ABCDE1234F',
            '123456789012',
            'UAN123456789',
            '75000',
            'Active',
            'Yes',
            'Yes',
            'No'
        ];
        csv += sampleRow.map(val => `"${val}"`).join(',') + '\n';
        
        // Add one more sample row
        const sampleRow2 = [
            'S1002',
            'Mrs',
            'ARYABHATA',
            'CSE',
            'Assistant Professor',
            '20/05/1985',
            'Female',
            'M.Tech in CSE',
            '8',
            '9000000002',
            'aryabhata@college.edu',
            '15/08/2015',
            '9000000003',
            '456, Second Street, City - 500002',
            'HDFC Bank',
            '98765432109876',
            'HDFC0001234',
            'FGHIJ5678K',
            '987654321098',
            'UAN987654321',
            '55000',
            'Active',
            'No',
            'Yes',
            'Yes'
        ];
        csv += sampleRow2.map(val => `"${val}"`).join(',') + '\n';
        
        console.log('Sample Excel template generated successfully');
        
        // Set headers for file download
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=staff_import_template_${Date.now()}.csv`);
        res.send(csv);
        
    } catch (error) {
        console.error('=== SAMPLE EXCEL GENERATION ERROR ===');
        console.error('Error:', error);
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to generate sample Excel template',
            error: error.message
        });
    }
});

// GET single staff by ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await promisePool.query(
            `SELECT s.*, 
                    d.branch_name as dept_name
             FROM staff_master s
             LEFT JOIN branch_master d ON s.department_id = d.branch_id AND d.is_active = 1
             WHERE s.staff_id = ?`,
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
        const { 
            employee_id,
            title_prefix,
            full_name,
            department_id,
            designation,
            date_of_birth,
            gender,
            qualification,
            years_of_experience,
            mobile_number,
            email,
            date_of_joining,
            emergency_contact,
            address,
            bank_name,
            bank_account_number,
            bank_ifsc_code,
            pan_number,
            aadhaar_number,
            uan_number,
            basic_salary,
            employment_status,
            is_hod,
            is_class_coordinator,
            is_exam_invigilator,
            is_locked
        } = req.body;
        
        // Validation
        if (!employee_id || !full_name) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: employee_id, full_name'
            });
        }
        
        if (!department_id || !designation) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: department_id, designation'
            });
        }
        
        // Validate mobile number (10 digits)
        if (mobile_number && !/^\d{10}$/.test(mobile_number)) {
            return res.status(400).json({
                status: 'error',
                message: 'Mobile number must be 10 digits'
            });
        }
        
        // Validate emergency contact (10 digits)
        if (emergency_contact && !/^\d{10}$/.test(emergency_contact)) {
            return res.status(400).json({
                status: 'error',
                message: 'Emergency contact must be 10 digits'
            });
        }
        
        // Validate Aadhaar (12 digits)
        if (aadhaar_number && !/^\d{12}$/.test(aadhaar_number)) {
            return res.status(400).json({
                status: 'error',
                message: 'Aadhaar number must be 12 digits'
            });
        }
        
        // Validate PAN (format: ABCDE1234F)
        if (pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan_number)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid PAN format (should be ABCDE1234F)'
            });
        }
        
        // Validate IFSC (11 characters)
        if (bank_ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank_ifsc_code)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid IFSC code format (should be 11 characters)'
            });
        }
        
        // Validate email format
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid email format'
            });
        }
        
        // Check if employee ID already exists
        const [existing] = await promisePool.query(
            'SELECT staff_id FROM staff_master WHERE employee_id = ?',
            [employee_id]
        );
        
        if (existing.length > 0) {
            return res.status(409).json({
                status: 'error',
                message: 'Employee ID already exists'
            });
        }
        
        // Insert new staff
        const [result] = await promisePool.query(
            `INSERT INTO staff_master 
            (employee_id, title_prefix, full_name, department_id, designation,
             date_of_birth, gender, qualification, years_of_experience,
             mobile_number, email, date_of_joining, emergency_contact, address,
             bank_name, bank_account_number, bank_ifsc_code, pan_number, aadhaar_number, uan_number,
             basic_salary, employment_status, is_hod, is_class_coordinator, is_exam_invigilator, is_locked) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                employee_id,
                title_prefix || null,
                full_name,
                department_id,
                designation,
                date_of_birth || null,
                gender || null,
                qualification || null,
                years_of_experience || null,
                mobile_number || null,
                email || null,
                date_of_joining || null,
                emergency_contact || null,
                address || null,
                bank_name || null,
                bank_account_number || null,
                bank_ifsc_code || null,
                pan_number || null,
                aadhaar_number || null,
                uan_number || null,
                basic_salary || null,
                employment_status || 'Active',
                is_hod || false,
                is_class_coordinator || false,
                is_exam_invigilator || false,
                is_locked || false
            ]
        );
        
        res.status(201).json({
            status: 'success',
            message: 'Staff created successfully',
            data: {
                staff_id: result.insertId,
                employee_id,
                full_name
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
    let connection;
    
    try {
        connection = await promisePool.getConnection();
        const staffId = req.params.id;
        
        console.log('='.repeat(80));
        console.log('=== UPDATE STAFF REQUEST ===');
        console.log('='.repeat(80));
        console.log('Staff ID:', staffId);
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
        
        // Validate staff exists
        const [existing] = await connection.query(
            'SELECT staff_id, employee_id FROM staff_master WHERE staff_id = ? AND is_active = 1',
            [staffId]
        );
        
        if (existing.length === 0) {
            console.error('❌ Staff not found:', staffId);
            connection.release();
            return res.status(404).json({
                status: 'error',
                message: 'Staff not found',
                error: `No active staff with ID ${staffId}`
            });
        }
        
        console.log('✅ Staff exists:', existing[0].employee_id);
        
        // Extract all fields
        const {
            employee_id,
            title_prefix,
            full_name,
            department_id,
            designation,
            date_of_birth,
            gender,
            qualification,
            years_of_experience,
            mobile_number,
            email,
            date_of_joining,
            emergency_contact,
            address,
            bank_name,
            bank_account_number,
            bank_ifsc_code,
            pan_number,
            aadhaar_number,
            uan_number,
            basic_salary,
            employment_status,
            is_hod,
            is_class_coordinator,
            is_exam_invigilator,
            is_locked
        } = req.body;
        
        // Validate required fields
        if (!employee_id || employee_id.trim() === '') {
            console.error('❌ Validation: employee_id required');
            connection.release();
            return res.status(400).json({
                status: 'error',
                message: 'Employee ID is required',
                error: 'employee_id cannot be empty'
            });
        }
        
        if (!full_name || full_name.trim() === '') {
            console.error('❌ Validation: full_name required');
            connection.release();
            return res.status(400).json({
                status: 'error',
                message: 'Full Name is required',
                error: 'full_name cannot be empty'
            });
        }
        
        // Validate mobile number (10 digits)
        if (mobile_number && mobile_number.trim() !== '' && !/^\d{10}$/.test(mobile_number)) {
            console.error('❌ Validation: invalid mobile number');
            connection.release();
            return res.status(400).json({
                status: 'error',
                message: 'Mobile number must be 10 digits'
            });
        }
        
        // Validate emergency contact (10 digits)
        if (emergency_contact && emergency_contact.trim() !== '' && !/^\d{10}$/.test(emergency_contact)) {
            console.error('❌ Validation: invalid emergency contact');
            connection.release();
            return res.status(400).json({
                status: 'error',
                message: 'Emergency contact must be 10 digits'
            });
        }
        
        // Validate Aadhaar (12 digits)
        if (aadhaar_number && aadhaar_number.trim() !== '' && !/^\d{12}$/.test(aadhaar_number)) {
            console.error('❌ Validation: invalid aadhaar number');
            connection.release();
            return res.status(400).json({
                status: 'error',
                message: 'Aadhaar number must be 12 digits'
            });
        }
        
        // Validate PAN format
        if (pan_number && pan_number.trim() !== '' && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan_number)) {
            console.error('❌ Validation: invalid PAN format');
            connection.release();
            return res.status(400).json({
                status: 'error',
                message: 'Invalid PAN format (should be ABCDE1234F)'
            });
        }
        
        // Validate IFSC code
        if (bank_ifsc_code && bank_ifsc_code.trim() !== '' && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bank_ifsc_code)) {
            console.error('❌ Validation: invalid IFSC code');
            connection.release();
            return res.status(400).json({
                status: 'error',
                message: 'Invalid IFSC code format (should be 11 characters)'
            });
        }
        
        // Validate email format
        if (email && email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            console.error('❌ Validation: invalid email');
            connection.release();
            return res.status(400).json({
                status: 'error',
                message: 'Invalid email format'
            });
        }
        
        // Prepare update values
        const updateValues = [
            employee_id.trim(),
            toNull(title_prefix),
            full_name.trim(),
            toNull(department_id),
            toNull(designation),
            toNull(date_of_birth),
            toNull(gender),
            toNull(qualification),
            toNull(years_of_experience),
            toNull(mobile_number),
            toNull(email),
            toNull(date_of_joining),
            toNull(emergency_contact),
            toNull(address),
            toNull(bank_name),
            toNull(bank_account_number),
            toNull(bank_ifsc_code),
            toNull(pan_number),
            toNull(aadhaar_number),
            toNull(uan_number),
            toNull(basic_salary),
            employment_status || 'Active',
            toBool(is_hod),
            toBool(is_class_coordinator),
            toBool(is_exam_invigilator),
            toBool(is_locked),
            staffId
        ];
        
        console.log('Update values:', updateValues);
        
        // Execute UPDATE query
        const updateSQL = `
            UPDATE staff_master 
            SET 
                employee_id = ?,
                title_prefix = ?,
                full_name = ?,
                department_id = ?,
                designation = ?,
                date_of_birth = ?,
                gender = ?,
                qualification = ?,
                years_of_experience = ?,
                mobile_number = ?,
                email = ?,
                date_of_joining = ?,
                emergency_contact = ?,
                address = ?,
                bank_name = ?,
                bank_account_number = ?,
                bank_ifsc_code = ?,
                pan_number = ?,
                aadhaar_number = ?,
                uan_number = ?,
                basic_salary = ?,
                employment_status = ?,
                is_hod = ?,
                is_class_coordinator = ?,
                is_exam_invigilator = ?,
                is_locked = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE staff_id = ? AND is_active = 1
        `;
        
        console.log('Executing UPDATE query...');
        
        const [result] = await connection.query(updateSQL, updateValues);
        
        console.log('Update result:', {
            affectedRows: result.affectedRows,
            changedRows: result.changedRows,
            warningCount: result.warningCount
        });
        
        connection.release();
        
        if (result.affectedRows === 0) {
            console.warn('⚠️ No rows affected - staff may not exist or no changes');
            return res.status(404).json({
                status: 'error',
                message: 'Staff not found or no changes made',
                error: 'No rows were affected by the update'
            });
        }
        
        console.log('✅ Staff updated successfully');
        console.log('='.repeat(80));
        
        res.json({
            status: 'success',
            message: 'Staff updated successfully',
            data: {
                staff_id: staffId,
                affected_rows: result.affectedRows,
                changed_rows: result.changedRows
            }
        });
        
    } catch (error) {
        if (connection) {
            connection.release();
        }
        
        console.error('='.repeat(80));
        console.error('=== UPDATE STAFF ERROR ===');
        console.error('='.repeat(80));
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error errno:', error.errno);
        console.error('Error sqlState:', error.sqlState);
        console.error('Error sqlMessage:', error.sqlMessage);
        console.error('Error sql:', error.sql);
        console.error('Stack trace:', error.stack);
        console.error('='.repeat(80));
        
        // Return detailed error to frontend
        res.status(500).json({
            status: 'error',
            message: 'Failed to update staff',
            error: error.sqlMessage || error.message || 'Unknown database error',
            errorCode: error.code,
            errorErrno: error.errno,
            errorSqlState: error.sqlState
        });
    }
});

// DELETE staff (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if staff exists and is active
        const [existing] = await promisePool.query(
            'SELECT * FROM staff_master WHERE staff_id = ? AND is_active = 1',
            [id]
        );
        
        if (existing.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Staff not found or already deleted'
            });
        }
        
        // Soft delete: Set is_active = 0 and deleted_at = NOW()
        await promisePool.query(
            'UPDATE staff_master SET is_active = 0, deleted_at = NOW() WHERE staff_id = ?',
            [id]
        );
        
        res.json({
            status: 'success',
            message: 'Staff deleted successfully (can be restored)'
        });
    } catch (error) {
        console.error('Error soft deleting staff:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete staff',
            error: error.message
        });
    }
});

// Configure multer for single photo upload
const photoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/staff');
        // Use mkdirSync with recursive option to ensure directory exists
        // The recursive option makes this operation idempotent
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const staffId = req.params.id;
        const ext = path.extname(file.originalname);
        const filename = `${staffId}_${Date.now()}${ext}`;
        cb(null, filename);
    }
});

const uploadPhoto = multer({
    storage: photoStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.jpg', '.jpeg', '.png'].includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, JPEG, and PNG files are allowed'));
        }
    }
});

// POST /api/staff/:id/upload-photo - Upload single photo
router.post('/:id/upload-photo', uploadPhoto.single('photo'), async (req, res) => {
    try {
        const staffId = req.params.id;
        
        console.log('=== UPLOAD PHOTO ===');
        console.log('Staff ID:', staffId);
        console.log('File:', req.file);
        
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No photo file uploaded'
            });
        }
        
        // Get old photo URL to delete old file
        const [staff] = await promisePool.query(
            'SELECT photo_url FROM staff_master WHERE staff_id = ?',
            [staffId]
        );
        
        if (staff.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Staff not found'
            });
        }
        
        const oldPhotoUrl = staff[0]?.photo_url;
        
        // Update photo_url in database
        const photoUrl = `/uploads/staff/${req.file.filename}`;
        await promisePool.query(
            'UPDATE staff_master SET photo_url = ? WHERE staff_id = ?',
            [photoUrl, staffId]
        );
        
        // Delete old photo file if exists
        // Fire-and-forget cleanup: New photo is already uploaded and DB updated
        // Old photo deletion is best-effort cleanup, doesn't block response
        if (oldPhotoUrl) {
            const oldPhotoPath = path.join(__dirname, '..', oldPhotoUrl);
            fs.promises.unlink(oldPhotoPath)
                .then(() => console.log('Deleted old photo:', oldPhotoPath))
                .catch(err => {
                    if (err.code !== 'ENOENT') {
                        console.error('Error deleting old photo:', err);
                    }
                });
        }
        
        console.log('Photo uploaded successfully:', photoUrl);
        
        res.json({
            status: 'success',
            message: 'Photo uploaded successfully',
            data: { photo_url: photoUrl }
        });
        
    } catch (error) {
        console.error('=== UPLOAD PHOTO ERROR ===');
        console.error('Error:', error);
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to upload photo',
            error: error.message
        });
    }
});

// DELETE /api/staff/:id/remove-photo - Remove staff photo
router.delete('/:id/remove-photo', async (req, res) => {
    try {
        const staffId = req.params.id;
        
        console.log('=== REMOVE PHOTO ===');
        console.log('Staff ID:', staffId);
        
        // Get current photo URL
        const [staff] = await promisePool.query(
            'SELECT photo_url FROM staff_master WHERE staff_id = ? AND is_active = 1',
            [staffId]
        );
        
        if (staff.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Staff not found'
            });
        }
        
        const photoUrl = staff[0].photo_url;
        
        // Clear photo_url in database
        await promisePool.query(
            'UPDATE staff_master SET photo_url = NULL WHERE staff_id = ?',
            [staffId]
        );
        
        // Delete physical file if exists
        // Await deletion for remove operation as it's the primary action
        if (photoUrl) {
            const photoPath = path.join(__dirname, '..', photoUrl);
            try {
                await fs.promises.unlink(photoPath);
                console.log('Deleted photo file:', photoPath);
            } catch (err) {
                // Only log error if it's not "file not found"
                if (err.code !== 'ENOENT') {
                    console.error('Error deleting photo file:', err);
                    // Don't fail the request if file deletion fails
                    // Database is already updated
                }
            }
        }
        
        console.log('Photo removed successfully');
        
        res.json({
            status: 'success',
            message: 'Photo removed successfully'
        });
        
    } catch (error) {
        console.error('=== REMOVE PHOTO ERROR ===');
        console.error('Error:', error);
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to remove photo',
            error: error.message
        });
    }
});

// GET export staff to Excel
router.get('/export/excel', async (req, res) => {
    try {
        console.log('=== EXCEL EXPORT REQUEST ===');
        
        // Build query with filters
        const { department_id, designation, employment_status, search } = req.query;
        
        let query = `
            SELECT 
                s.staff_id,
                s.employee_id,
                s.title_prefix,
                s.full_name,
                s.date_of_birth,
                s.gender,
                s.qualification,
                s.years_of_experience,
                s.mobile_number,
                s.email,
                s.date_of_joining,
                s.emergency_contact,
                s.address,
                s.designation,
                s.bank_name,
                s.bank_account_number,
                s.bank_ifsc_code,
                s.pan_number,
                s.aadhaar_number,
                s.uan_number,
                s.basic_salary,
                s.employment_status,
                COALESCE(d.branch_name, '-') as dept_name,
                s.is_hod,
                s.is_class_coordinator,
                s.is_exam_invigilator
            FROM staff_master s
            LEFT JOIN branch_master d ON s.department_id = d.branch_id AND d.is_active = 1
            WHERE s.is_active = 1
        `;
        
        const params = [];
        
        // Apply filters
        if (department_id) {
            query += ' AND s.department_id = ?';
            params.push(department_id);
        }
        if (designation) {
            query += ' AND s.designation = ?';
            params.push(designation);
        }
        if (employment_status) {
            query += ' AND s.employment_status = ?';
            params.push(employment_status);
        }
        if (search) {
            query += ' AND (s.full_name LIKE ? OR s.employee_id LIKE ? OR s.email LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        query += ' ORDER BY s.employee_id';
        
        console.log('Export query:', query);
        console.log('Export params:', params);
        
        const [staff] = await promisePool.query(query, params);
        
        console.log(`Found ${staff.length} staff to export`);
        
        if (staff.length === 0) {
            return res.json({
                status: 'success',
                message: 'No staff found to export',
                data: []
            });
        }
        
        // Create workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Staff');
        
        // Define columns
        worksheet.columns = [
            { header: 'Employee ID', key: 'employee_id', width: 15 },
            { header: 'Title', key: 'title_prefix', width: 10 },
            { header: 'Full Name', key: 'full_name', width: 30 },
            { header: 'Department', key: 'dept_name', width: 20 },
            { header: 'Designation', key: 'designation', width: 25 },
            { header: 'Date of Birth', key: 'date_of_birth', width: 15 },
            { header: 'Gender', key: 'gender', width: 10 },
            { header: 'Qualification', key: 'qualification', width: 30 },
            { header: 'Experience (Years)', key: 'years_of_experience', width: 15 },
            { header: 'Mobile Number', key: 'mobile_number', width: 15 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Date of Joining', key: 'date_of_joining', width: 15 },
            { header: 'Emergency Contact', key: 'emergency_contact', width: 15 },
            { header: 'Address', key: 'address', width: 40 },
            { header: 'Bank Name', key: 'bank_name', width: 20 },
            { header: 'Account Number', key: 'bank_account_number', width: 20 },
            { header: 'IFSC Code', key: 'bank_ifsc_code', width: 15 },
            { header: 'PAN Number', key: 'pan_number', width: 15 },
            { header: 'Aadhaar Number', key: 'aadhaar_number', width: 15 },
            { header: 'UAN Number', key: 'uan_number', width: 15 },
            { header: 'Basic Salary', key: 'basic_salary', width: 15 },
            { header: 'Employment Status', key: 'employment_status', width: 15 },
            { header: 'HOD', key: 'is_hod', width: 10 },
            { header: 'Class Coordinator', key: 'is_class_coordinator', width: 15 },
            { header: 'Exam Invigilator', key: 'is_exam_invigilator', width: 15 }
        ];
        
        // Add data
        staff.forEach(s => {
            worksheet.addRow({
                ...s,
                date_of_birth: s.date_of_birth ? new Date(s.date_of_birth).toISOString().split('T')[0] : '',
                date_of_joining: s.date_of_joining ? new Date(s.date_of_joining).toISOString().split('T')[0] : '',
                is_hod: s.is_hod ? 'Yes' : 'No',
                is_class_coordinator: s.is_class_coordinator ? 'Yes' : 'No',
                is_exam_invigilator: s.is_exam_invigilator ? 'Yes' : 'No'
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
        res.setHeader('Content-Disposition', `attachment; filename=staff_${Date.now()}.xlsx`);
        
        // Write to response
        await workbook.xlsx.write(res);
        res.end();
        
    } catch (error) {
        console.error('=== EXCEL EXPORT ERROR ===');
        console.error('Error:', error);
        console.error('Error code:', error.code);
        console.error('SQL Message:', error.sqlMessage);
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to export to Excel',
            error: error.message,
            sqlMessage: error.sqlMessage
        });
    }
});

// Configure multer for Excel upload
const uploadExcel = multer({
    dest: 'uploads/temp/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.csv' || ext === '.xlsx' || ext === '.xls') {
            cb(null, true);
        } else {
            cb(new Error('Only CSV and Excel files are allowed'));
        }
    }
});

// POST import staff from Excel
router.post('/import/excel', uploadExcel.single('file'), async (req, res) => {
    try {
        console.log('=== EXCEL IMPORT REQUEST ===');
        
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No file uploaded'
            });
        }
        
        const filePath = req.file.path;
        const staffList = [];
        const errors = [];
        let lineNumber = 0;
        let isHeaderFound = false;
        
        // Read file and manually parse to skip first 4 rows
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n');
        
        let headers = [];
        
        for (let i = 0; i < lines.length; i++) {
            lineNumber = i + 1;
            const line = lines[i].trim();
            
            // Skip empty lines
            if (!line) continue;
            
            // Find the header row (row 4) - it starts with "Employee ID"
            if (line.startsWith('Employee ID') || line.startsWith('"Employee ID"')) {
                headers = line.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                isHeaderFound = true;
                continue;
            }
            
            // Skip rows before header
            if (!isHeaderFound) {
                continue;
            }
            
            // Parse data rows
            try {
                // Simple CSV parsing - handle quoted values
                const values = [];
                let current = '';
                let inQuotes = false;
                
                for (let char of line) {
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        values.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                values.push(current.trim());
                
                // Create row object
                const row = {};
                headers.forEach((header, idx) => {
                    row[header] = values[idx] || '';
                });
                
                // Validate and parse row
                const staff = {
                    employee_id: row['Employee ID']?.trim(),
                    title_prefix: row['Title Prefix (Mr/Mrs/Ms/Dr)']?.trim() || null,
                    full_name: row['Full Name']?.trim(),
                    department: row['Department']?.trim() || null,
                    designation: row['Designation']?.trim(),
                    date_of_birth: parseDateDDMMYYYY(row['Date of Birth (DD/MM/YYYY)']),
                    gender: row['Gender (Male/Female/Other)']?.trim() || null,
                    qualification: row['Qualification']?.trim() || null,
                    years_of_experience: row['Years of Experience']?.trim() || null,
                    mobile_number: row['Mobile Number']?.trim() || null,
                    email: row['Email']?.trim() || null,
                    date_of_joining: parseDateDDMMYYYY(row['Date of Joining (DD/MM/YYYY)']),
                    emergency_contact: row['Emergency Contact']?.trim() || null,
                    address: row['Address']?.trim() || null,
                    bank_name: row['Bank Name']?.trim() || null,
                    bank_account_number: row['Bank Account Number']?.trim() || null,
                    bank_ifsc_code: row['Bank IFSC Code']?.trim() || null,
                    pan_number: row['PAN Number']?.trim() || null,
                    aadhaar_number: row['Aadhaar Number']?.trim() || null,
                    uan_number: row['UAN Number']?.trim() || null,
                    basic_salary: row['Basic Salary']?.trim() || null,
                    employment_status: row['Employment Status (Active/On Leave/Retired)']?.trim() || 'Active',
                    is_hod: parseYesNo(row['Is HOD (Yes/No)']),
                    is_class_coordinator: parseYesNo(row['Is Class Coordinator (Yes/No)']),
                    is_exam_invigilator: parseYesNo(row['Is Exam Invigilator (Yes/No)']),
                    department: row['Department Code']?.trim() || null
                };
                
                // Validate required fields
                if (!staff.employee_id) {
                    errors.push({
                        row: lineNumber,
                        error: 'Employee ID is required'
                    });
                    continue;
                }
                
                if (!staff.full_name) {
                    errors.push({
                        row: lineNumber,
                        employee_id: staff.employee_id,
                        error: 'Full Name is required'
                    });
                    continue;
                }
                
                if (!staff.designation) {
                    errors.push({
                        row: lineNumber,
                        employee_id: staff.employee_id,
                        error: 'Designation is required'
                    });
                    continue;
                }
                
                // Validate mobile number
                if (staff.mobile_number && !/^\d{10}$/.test(staff.mobile_number)) {
                    errors.push({
                        row: lineNumber,
                        employee_id: staff.employee_id,
                        error: 'Mobile number must be 10 digits'
                    });
                    continue;
                }
                
                // Validate emergency contact
                if (staff.emergency_contact && !/^\d{10}$/.test(staff.emergency_contact)) {
                    errors.push({
                        row: lineNumber,
                        employee_id: staff.employee_id,
                        error: 'Emergency contact must be 10 digits'
                    });
                    continue;
                }
                
                // Validate aadhaar
                if (staff.aadhaar_number && !/^\d{12}$/.test(staff.aadhaar_number)) {
                    errors.push({
                        row: lineNumber,
                        employee_id: staff.employee_id,
                        error: 'Aadhaar number must be 12 digits'
                    });
                    continue;
                }
                
                // Validate PAN
                if (staff.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(staff.pan_number)) {
                    errors.push({
                        row: lineNumber,
                        employee_id: staff.employee_id,
                        error: 'Invalid PAN format (should be ABCDE1234F)'
                    });
                    continue;
                }
                
                // Validate IFSC
                if (staff.bank_ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(staff.bank_ifsc_code)) {
                    errors.push({
                        row: lineNumber,
                        employee_id: staff.employee_id,
                        error: 'Invalid IFSC code format'
                    });
                    continue;
                }
                
                // Validate email
                if (staff.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(staff.email)) {
                    errors.push({
                        row: lineNumber,
                        employee_id: staff.employee_id,
                        error: 'Invalid email format'
                    });
                    continue;
                }
                
                // Validate employment status
                if (staff.employment_status && !['Active', 'On Leave', 'Retired'].includes(staff.employment_status)) {
                    errors.push({
                        row: lineNumber,
                        employee_id: staff.employee_id,
                        error: 'Employment Status must be Active, On Leave, or Retired'
                    });
                    continue;
                }
                
                staffList.push({ ...staff, lineNumber });
                
            } catch (error) {
                errors.push({
                    row: lineNumber,
                    error: error.message
                });
            }
        }
        
        console.log(`Parsed ${staffList.length} valid staff, ${errors.length} errors`);
        
        // Bulk insert staff
        let importedCount = 0;
        
        for (const staff of staffList) {
            try {
                // Lookup department_id from department code
                let departmentId = null;
                if (staff.department) {
                    const [deptResult] = await promisePool.query(
                        'SELECT branch_id FROM branch_master WHERE branch_code = ? AND is_active = 1',
                        [staff.department]
                    );
                    departmentId = deptResult.length > 0 ? deptResult[0].branch_id : null;
                }
                
                // Check if employee ID already exists
                const [existing] = await promisePool.query(
                    'SELECT staff_id FROM staff_master WHERE employee_id = ?',
                    [staff.employee_id]
                );
                
                if (existing.length > 0) {
                    errors.push({
                        row: staff.lineNumber,
                        employee_id: staff.employee_id,
                        error: 'Duplicate employee ID'
                    });
                    continue;
                }
                
                // Insert staff
                await promisePool.query(
                    `INSERT INTO staff_master 
                    (employee_id, title_prefix, full_name, department_id, designation,
                     date_of_birth, gender, qualification, years_of_experience,
                     mobile_number, email, date_of_joining, emergency_contact, address,
                     bank_name, bank_account_number, bank_ifsc_code, pan_number, aadhaar_number, uan_number,
                     basic_salary, employment_status, is_hod, is_class_coordinator, is_exam_invigilator, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                    [
                        staff.employee_id, staff.title_prefix, staff.full_name,
                        departmentId, staff.designation, staff.date_of_birth,
                        staff.gender, staff.qualification, staff.years_of_experience,
                        staff.mobile_number, staff.email, staff.date_of_joining,
                        staff.emergency_contact, staff.address, staff.bank_name,
                        staff.bank_account_number, staff.bank_ifsc_code, staff.pan_number,
                        staff.aadhaar_number, staff.uan_number, staff.basic_salary,
                        staff.employment_status, staff.is_hod, staff.is_class_coordinator,
                        staff.is_exam_invigilator
                    ]
                );
                
                importedCount++;
                
            } catch (error) {
                errors.push({
                    row: staff.lineNumber,
                    employee_id: staff.employee_id,
                    error: error.message
                });
            }
        }
        
        // Clean up uploaded file
        fs.unlinkSync(filePath);
        
        res.json({
            status: 'success',
            message: 'Import completed',
            data: {
                total: staffList.length,
                imported: importedCount,
                failed: errors.length,
                errors: errors
            }
        });
        
    } catch (error) {
        console.error('=== EXCEL IMPORT ERROR ===');
        console.error('Error:', error);
        
        // Clean up file if it exists
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.error('Failed to cleanup temp file:', cleanupError);
            }
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to import Excel file',
            error: error.message
        });
    }
});

// Configure multer for ZIP upload
const uploadZip = multer({
    dest: 'uploads/temp/',
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.zip') {
            cb(null, true);
        } else {
            cb(new Error('Only ZIP files are allowed'));
        }
    }
});

// POST bulk import photos from ZIP
router.post('/import/photos', uploadZip.single('file'), async (req, res) => {
    try {
        console.log('=== PHOTO IMPORT REQUEST ===');
        
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No file uploaded'
            });
        }
        
        const zipPath = req.file.path;
        const zip = new AdmZip(zipPath);
        const zipEntries = zip.getEntries();
        
        const results = {
            total: 0,
            uploaded: 0,
            failed: 0,
            errors: []
        };
        
        // Ensure uploads directory exists
        const uploadsDir = path.join(__dirname, '../uploads/staff');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        for (const entry of zipEntries) {
            if (entry.isDirectory) continue;
            
            const filename = entry.entryName;
            const ext = path.extname(filename).toLowerCase();
            
            // Check if valid image
            if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
                continue;
            }
            
            results.total++;
            
            try {
                // Extract filename without extension
                const basename = path.basename(filename, ext);
                
                // Try to find staff by employee ID
                const [staff] = await promisePool.query(
                    'SELECT staff_id, employee_id FROM staff_master WHERE employee_id = ? AND is_active = 1',
                    [basename]
                );
                
                if (staff.length === 0) {
                    results.failed++;
                    results.errors.push({
                        filename: filename,
                        error: 'Staff not found'
                    });
                    continue;
                }
                
                const staffMember = staff[0];
                
                // Check file size (max 5MB)
                const fileData = entry.getData();
                if (fileData.length > 5 * 1024 * 1024) {
                    results.failed++;
                    results.errors.push({
                        filename: filename,
                        error: 'File size exceeds 5MB limit'
                    });
                    continue;
                }
                
                // Extract and save photo
                const newFilename = `${staffMember.staff_id}_${Date.now()}${ext}`;
                const photoPath = path.join(uploadsDir, newFilename);
                
                fs.writeFileSync(photoPath, fileData);
                
                // Update photo_url in database
                const photoUrl = `/uploads/staff/${newFilename}`;
                await promisePool.query(
                    'UPDATE staff_master SET photo_url = ? WHERE staff_id = ?',
                    [photoUrl, staffMember.staff_id]
                );
                
                results.uploaded++;
                console.log(`✅ Uploaded photo for ${staffMember.employee_id}`);
                
            } catch (error) {
                results.failed++;
                results.errors.push({
                    filename: filename,
                    error: error.message
                });
            }
        }
        
        // Clean up ZIP file
        try {
            fs.unlinkSync(zipPath);
        } catch (cleanupError) {
            console.error('Failed to cleanup ZIP file:', cleanupError);
        }
        
        console.log(`Photo import completed: ${results.uploaded}/${results.total} successful`);
        
        res.json({
            status: 'success',
            message: 'Photo import completed',
            data: results
        });
        
    } catch (error) {
        console.error('=== PHOTO IMPORT ERROR ===');
        console.error('Error:', error);
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to import photos',
            error: error.message
        });
    }
});

module.exports = initializeRouter;
