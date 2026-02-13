// ========================================
// PROFESSIONAL STUDENT MANAGEMENT ROUTES
// routes/student-management-professional-routes.js
// ========================================

const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

let promisePool;

function initializeRouter(pool) {
    promisePool = pool;
    return router;
}

// ========================================
// TAB 1: IMPORT INITIAL DATABASE
// ========================================

// Generate Excel Template for Initial Import
router.get('/import-initial/generate-template', async (req, res) => {
    try {
        const { programme_id, batch_id, branch_id, regulation_id } = req.query;
        
        console.log('Generating initial import template:', { programme_id, batch_id, branch_id, regulation_id });
        
        // Fetch metadata for template
        let programmeName = 'B.Tech';
        let batchName = '2025-2026';
        let branchName = 'CSE';
        let regulationName = 'R18';
        
        if (programme_id) {
            const [programmes] = await promisePool.query(
                'SELECT programme_code FROM programme_master WHERE programme_id = ?', [programme_id]
            );
            if (programmes.length > 0) programmeName = programmes[0].programme_code;
        }
        
        if (batch_id) {
            const [batches] = await promisePool.query(
                'SELECT batch_name FROM batch_master WHERE batch_id = ?', [batch_id]
            );
            if (batches.length > 0) batchName = batches[0].batch_name;
        }
        
        if (branch_id) {
            const [branches] = await promisePool.query(
                'SELECT branch_code FROM branch_master WHERE branch_id = ?', [branch_id]
            );
            if (branches.length > 0) branchName = branches[0].branch_code;
        }
        
        if (regulation_id) {
            const [regulations] = await promisePool.query(
                'SELECT regulation_name FROM regulation_master WHERE regulation_id = ?', [regulation_id]
            );
            if (regulations.length > 0) regulationName = regulations[0].regulation_name;
        }
        
        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Student Data');
        
        // Metadata section (rows 1-5)
        worksheet.getCell('A1').value = 'Batch:';
        worksheet.getCell('B1').value = batchName;
        worksheet.getCell('A2').value = 'Programme:';
        worksheet.getCell('B2').value = programmeName;
        worksheet.getCell('A3').value = 'Branch:';
        worksheet.getCell('B3').value = branchName;
        worksheet.getCell('A4').value = 'Regulation:';
        worksheet.getCell('B4').value = regulationName;
        worksheet.getCell('A5').value = 'Semester:';
        worksheet.getCell('B5').value = 'I (First Semester)';
        
        // Style metadata
        for (let i = 1; i <= 5; i++) {
            worksheet.getCell(`A${i}`).font = { bold: true };
            worksheet.getCell(`B${i}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE7E6E6' }
            };
        }
        
        // Row 6 is empty
        
        // Headers (row 7)
        const headers = [
            'Admission Number*',
            'HT Number',
            'Roll Number*',
            'Full Name*',
            'Date of Birth (YYYY-MM-DD)*',
            'Gender (Male/Female/Other)*',
            'Father Name*',
            'Mother Name*',
            'Aadhaar Number (12 digits)',
            'Caste Category',
            'Student Mobile',
            'Parent Mobile*',
            'Email',
            'Section'
        ];
        
        worksheet.getRow(7).values = headers;
        
        // Style headers
        const headerRow = worksheet.getRow(7);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        
        // Set column widths
        worksheet.columns = [
            { width: 20 }, { width: 15 }, { width: 15 }, { width: 30 },
            { width: 20 }, { width: 15 }, { width: 25 }, { width: 25 },
            { width: 20 }, { width: 15 }, { width: 15 }, { width: 15 },
            { width: 30 }, { width: 15 }
        ];
        
        // Add sample row (row 8)
        worksheet.getRow(8).values = [
            'B25CSE001',
            'HT123456',
            'B25AI001',
            'Sample Student Name',
            '2005-06-15',
            'Male',
            'Father Name',
            'Mother Name',
            '123456789012',
            'OC',
            '9876543210',
            '9876543211',
            'student@example.com',
            'A'
        ];
        
        // Send file
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Student_Initial_Import_${batchName}_${branchName}.xlsx"`);
        
        await workbook.xlsx.write(res);
        res.end();
        
    } catch (error) {
        console.error('Error generating template:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to generate template',
            error: error.message
        });
    }
});

// Import Initial Database from Excel
router.post('/import-initial/upload', upload.single('file'), async (req, res) => {
    try {
        const { programme_id, batch_id, branch_id, regulation_id, section_id } = req.body;
        
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No file uploaded'
            });
        }
        
        console.log('Importing initial database:', {
            file: req.file.originalname,
            programme_id, batch_id, branch_id, regulation_id
        });
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);
        const worksheet = workbook.getWorksheet('Student Data');
        
        const students = [];
        const errors = [];
        
        // Read data starting from row 8 (after metadata and headers)
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber < 8) return; // Skip metadata and headers
            
            const values = row.values;
            if (!values[1]) return; // Skip empty rows
            
            try {
                const student = {
                    admission_number: values[1],
                    ht_number: values[2] || null,
                    roll_number: values[3],
                    full_name: values[4],
                    date_of_birth: values[5],
                    gender: values[6],
                    father_name: values[7],
                    mother_name: values[8],
                    aadhaar_number: values[9] || null,
                    caste_category: values[10] || null,
                    student_mobile: values[11] || null,
                    parent_mobile: values[12],
                    email: values[13] || null,
                    section: values[14] || 'A'
                };
                
                // Validation
                if (!student.admission_number || !student.roll_number || !student.full_name) {
                    throw new Error('Missing required fields');
                }
                
                students.push(student);
            } catch (error) {
                errors.push({
                    row: rowNumber,
                    error: error.message
                });
            }
        });
        
        // Start transaction
        const connection = await promisePool.getConnection();
        await connection.beginTransaction();
        
        try {
            let imported = 0;
            let skipped = 0;
            
            // Get section_id if section name provided
            let actualSectionId = section_id;
            if (!actualSectionId && students.length > 0) {
                const [sections] = await connection.query(
                    'SELECT section_id FROM section_master WHERE section_name = ? AND is_active = 1 LIMIT 1',
                    [students[0].section]
                );
                if (sections.length > 0) {
                    actualSectionId = sections[0].section_id;
                }
            }
            
            // Get academic year from batch
            const [batches] = await connection.query(
                'SELECT batch_name FROM batch_master WHERE batch_id = ?',
                [batch_id]
            );
            const academicYear = batches.length > 0 ? batches[0].batch_name : new Date().getFullYear() + '-' + (new Date().getFullYear() + 1);
            
            for (const student of students) {
                // Check if student already exists
                const [existing] = await connection.query(
                    'SELECT student_id FROM student_master WHERE admission_number = ?',
                    [student.admission_number]
                );
                
                if (existing.length > 0) {
                    skipped++;
                    errors.push({
                        admission_number: student.admission_number,
                        error: 'Student already exists'
                    });
                    continue;
                }
                
                // Insert into student_master
                const [result] = await connection.query(
                    `INSERT INTO student_master (
                        admission_number, ht_number, roll_number, full_name,
                        date_of_birth, gender, father_name, mother_name,
                        aadhaar_number, caste_category, student_mobile, parent_mobile, email,
                        programme_id, branch_id, batch_id, section_id,
                        joining_regulation_id, current_regulation_id,
                        admission_date, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 1)`,
                    [
                        student.admission_number, student.ht_number, student.roll_number, student.full_name,
                        student.date_of_birth, student.gender, student.father_name, student.mother_name,
                        student.aadhaar_number, student.caste_category, student.student_mobile, 
                        student.parent_mobile, student.email,
                        programme_id, branch_id, batch_id, actualSectionId,
                        regulation_id, regulation_id
                    ]
                );
                
                const studentId = result.insertId;
                
                // Insert into student_semester_history (Semester I)
                await connection.query(
                    `INSERT INTO student_semester_history (
                        student_id, academic_year, semester_id,
                        programme_id, branch_id, batch_id, regulation_id, section_id,
                        roll_number, student_status, status_date,
                        is_promoted, created_by
                    ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, 'In Roll', CURDATE(), 0, 'system')`,
                    [
                        studentId, academicYear,
                        programme_id, branch_id, batch_id, regulation_id, actualSectionId,
                        student.roll_number
                    ]
                );
                
                imported++;
            }
            
            await connection.commit();
            
            // Delete uploaded file
            fs.unlinkSync(req.file.path);
            
            res.json({
                status: 'success',
                message: `Import completed: ${imported} students imported, ${skipped} skipped`,
                data: {
                    imported,
                    skipped,
                    total: students.length,
                    errors
                }
            });
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('Error importing initial database:', error);
        
        // Clean up file
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to import database',
            error: error.message
        });
    }
});

// ========================================
// TAB 2: IMPORT PHOTOS
// ========================================

router.post('/import-photos/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No file uploaded'
            });
        }
        
        console.log('Importing photos from ZIP:', req.file.originalname);
        
        // Extract ZIP
        const zip = new AdmZip(req.file.path);
        const zipEntries = zip.getEntries();
        
        let uploaded = 0;
        let failed = 0;
        const uploadErrors = [];
        
        // Create photos directory
        const photosDir = path.join(__dirname, '../public/uploads/photos');
        if (!fs.existsSync(photosDir)) {
            fs.mkdirSync(photosDir, { recursive: true });
        }
        
        for (const entry of zipEntries) {
            if (entry.isDirectory) continue;
            
            const filename = path.basename(entry.entryName);
            const ext = path.extname(filename).toLowerCase();
            
            // Only process image files
            if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
                continue;
            }
            
            try {
                // Extract roll number from filename (e.g., B25AI001.jpg -> B25AI001)
                const rollNumber = path.parse(filename).name;
                
                // Find student by roll number
                const [students] = await promisePool.query(
                    'SELECT student_id FROM student_master WHERE roll_number = ? AND is_active = 1',
                    [rollNumber]
                );
                
                if (students.length === 0) {
                    uploadErrors.push({
                        filename,
                        error: 'Student not found with roll number: ' + rollNumber
                    });
                    failed++;
                    continue;
                }
                
                // Save photo
                const photoPath = path.join(photosDir, filename);
                fs.writeFileSync(photoPath, entry.getData());
                
                // Update student_master with photo URL
                await promisePool.query(
                    'UPDATE student_master SET photo_url = ? WHERE student_id = ?',
                    [`/uploads/photos/${filename}`, students[0].student_id]
                );
                
                uploaded++;
                
            } catch (error) {
                console.error('Error processing photo:', filename, error);
                uploadErrors.push({
                    filename,
                    error: error.message
                });
                failed++;
            }
        }
        
        // Clean up ZIP file
        fs.unlinkSync(req.file.path);
        
        res.json({
            status: 'success',
            message: `Photo import completed: ${uploaded} photos uploaded, ${failed} failed`,
            data: {
                uploaded,
                failed,
                total: zipEntries.filter(e => !e.isDirectory).length,
                errors: uploadErrors
            }
        });
        
    } catch (error) {
        console.error('Error importing photos:', error);
        
        // Clean up file
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Failed to import photos',
            error: error.message
        });
    }
});
// TAB 3: STUDENT MANAGEMENT (VIEW)
// ========================================

router.get('/students', async (req, res) => {
    try {
        const { 
            programme_id, 
            batch_id, 
            branch_id, 
            semester_id, 
            section_id,
            student_status,
            search 
        } = req.query;
        
        let query = `
            SELECT 
                sm.student_id,
                sm.admission_number,
                sm.roll_number,
                sm.full_name,
                sm.date_of_birth,
                sm.gender,
                sm.father_name,
                sm.mother_name,
                sm.student_mobile,
                sm.parent_mobile,
                sm.email,
                sm.photo_url,
                ssh.semester_id,
                ssh.student_status,
                ssh.academic_year,
                ssh.semester_history_id,
                p.programme_name,
                p.programme_code,
                br.branch_name,
                br.branch_code,
                b.batch_name,
                r.regulation_name,
                sec.section_name
            FROM student_master sm
            INNER JOIN student_semester_history ssh ON sm.student_id = ssh.student_id
            LEFT JOIN programme_master p ON ssh.programme_id = p.programme_id
            LEFT JOIN branch_master br ON ssh.branch_id = br.branch_id
            LEFT JOIN batch_master b ON ssh.batch_id = b.batch_id
            LEFT JOIN regulation_master r ON ssh.regulation_id = r.regulation_id
            LEFT JOIN section_master sec ON ssh.section_id = sec.section_id
            WHERE sm.is_active = 1
        `;
        
        const params = [];
        
        // Filters on semester_history
        if (programme_id) {
            query += ' AND ssh.programme_id = ?';
            params.push(programme_id);
        }
        
        if (batch_id) {
            query += ' AND ssh.batch_id = ?';
            params.push(batch_id);
        }
        
        if (branch_id) {
            query += ' AND ssh.branch_id = ?';
            params.push(branch_id);
        }
        
        if (semester_id) {
            query += ' AND ssh.semester_id = ?';
            params.push(semester_id);
        }
        
        if (section_id) {
            query += ' AND ssh.section_id = ?';
            params.push(section_id);
        }
        
        if (student_status) {
            query += ' AND ssh.student_status = ?';
            params.push(student_status);
        }
        
        if (search) {
            query += ' AND (sm.full_name LIKE ? OR sm.admission_number LIKE ? OR sm.roll_number LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        query += ' ORDER BY sm.admission_number';
        
        const [students] = await promisePool.query(query, params);
        
        // Calculate statistics
        const statistics = {
            total: students.length,
            boys: students.filter(s => s.gender === 'Male').length,
            girls: students.filter(s => s.gender === 'Female').length,
            on_roll: students.filter(s => s.student_status === 'In Roll').length,
            detained: students.filter(s => s.student_status === 'Detained').length,
            left: students.filter(s => s.student_status === 'Left').length
        };
        
        res.json({
            status: 'success',
            message: 'Students retrieved successfully',
            data: {
                students,
                statistics
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

// ========================================
// TAB 4: REGULATION/BATCH MAPPING
// ========================================

// Get students for mapping
router.get('/mapping/students', async (req, res) => {
    try {
        const { programme_id, branch_id, batch_id, semester_id, student_status } = req.query;
        
        let query = `
            SELECT 
                sm.student_id,
                sm.roll_number,
                sm.full_name,
                ssh.semester_history_id,
                ssh.batch_id,
                ssh.regulation_id,
                b.batch_name,
                r.regulation_name
            FROM student_master sm
            INNER JOIN student_semester_history ssh ON sm.student_id = ssh.student_id
            LEFT JOIN batch_master b ON ssh.batch_id = b.batch_id
            LEFT JOIN regulation_master r ON ssh.regulation_id = r.regulation_id
            WHERE sm.is_active = 1
        `;
        
        const params = [];
        
        if (programme_id) {
            query += ' AND ssh.programme_id = ?';
            params.push(programme_id);
        }
        
        if (branch_id) {
            query += ' AND ssh.branch_id = ?';
            params.push(branch_id);
        }
        
        if (batch_id) {
            query += ' AND ssh.batch_id = ?';
            params.push(batch_id);
        }
        
        if (semester_id) {
            query += ' AND ssh.semester_id = ?';
            params.push(semester_id);
        }
        
        if (student_status) {
            query += ' AND ssh.student_status = ?';
            params.push(student_status);
        }
        
        query += ' ORDER BY sm.roll_number';
        
        const [students] = await promisePool.query(query, params);
        
        res.json({
            status: 'success',
            data: { students }
        });
        
    } catch (error) {
        console.error('Error fetching students for mapping:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch students',
            error: error.message
        });
    }
});

// Get semester-wise mapping view
router.get('/mapping/semester-view', async (req, res) => {
    try {
        const { programme_id, batch_id, branch_id } = req.query;
        
        let query = `
            SELECT 
                sm.roll_number,
                ssh.semester_id,
                b.batch_name,
                r.regulation_name,
                CONCAT(b.batch_name, '-', r.regulation_name) as mapping
            FROM student_master sm
            INNER JOIN student_semester_history ssh ON sm.student_id = ssh.student_id
            LEFT JOIN batch_master b ON ssh.batch_id = b.batch_id
            LEFT JOIN regulation_master r ON ssh.regulation_id = r.regulation_id
            WHERE sm.is_active = 1
        `;
        
        const params = [];
        
        if (programme_id) {
            query += ' AND ssh.programme_id = ?';
            params.push(programme_id);
        }
        
        if (batch_id) {
            query += ' AND ssh.batch_id = ?';
            params.push(batch_id);
        }
        
        if (branch_id) {
            query += ' AND ssh.branch_id = ?';
            params.push(branch_id);
        }
        
        query += ' ORDER BY sm.roll_number, ssh.semester_id';
        
        const [mappings] = await promisePool.query(query, params);
        
        // Transform into pivot table structure
        const pivotData = {};
        
        mappings.forEach(row => {
            if (!pivotData[row.roll_number]) {
                pivotData[row.roll_number] = {};
            }
            pivotData[row.roll_number][`sem_${row.semester_id}`] = row.mapping;
        });
        
        res.json({
            status: 'success',
            data: { mappings: pivotData }
        });
        
    } catch (error) {
        console.error('Error fetching semester view:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch semester view',
            error: error.message
        });
    }
});

// Update batch/regulation for selected students
router.post('/mapping/update', async (req, res) => {
    try {
        const { student_ids, batch_id, regulation_id, semester_id } = req.body;
        
        if (!student_ids || student_ids.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No students selected'
            });
        }
        
        const connection = await promisePool.getConnection();
        await connection.beginTransaction();
        
        try {
            let updates = [];
            
            if (batch_id) {
                updates.push('batch_id = ?');
            }
            if (regulation_id) {
                updates.push('regulation_id = ?');
            }
            
            if (updates.length === 0) {
                throw new Error('No updates specified');
            }
            
            const params = [];
            if (batch_id) params.push(batch_id);
            if (regulation_id) params.push(regulation_id);
            
            // Add WHERE conditions
            params.push(...student_ids);
            params.push(semester_id);
            
            const query = `
                UPDATE student_semester_history 
                SET ${updates.join(', ')}, updated_by = 'system', updated_at = NOW()
                WHERE student_id IN (${student_ids.map(() => '?').join(',')})
                    AND semester_id = ?
            `;
            
            await connection.query(query, params);
            await connection.commit();
            
            res.json({
                status: 'success',
                message: `Updated ${student_ids.length} students successfully`
            });
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('Error updating mapping:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update mapping',
            error: error.message
        });
    }
});

// ========================================
// TAB 5: PROMOTIONS
// ========================================
// ========================================
// TAB 5: PROMOTIONS
router.get('/promotions/stats', async (req, res) => {
    try {
        const { programme_id, batch_id, branch_id, semester_number } = req.query;

        if (!programme_id || !batch_id || !branch_id || !semester_number) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required parameters'
            });
        }

        const query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN student_status = 'In Roll' THEN 1 ELSE 0 END) as on_roll,
                SUM(CASE WHEN student_status = 'Detained' THEN 1 ELSE 0 END) as detained,
                SUM(CASE WHEN student_status = 'Left' THEN 1 ELSE 0 END) as left_out
            FROM student_semester_history
            WHERE programme_id = ?
            AND batch_id = ?
            AND branch_id = ?
            AND semester_id = ?
            AND student_status IN ('In Roll', 'Detained', 'Left', 'Completed', 'Dropout')
        `;

        const params = [programme_id, batch_id, branch_id, semester_number];

        const [stats] = await promisePool.query(query, params);

        res.json({
            status: 'success',
            data: {
                total: stats[0]?.total || 0,
                on_roll: stats[0]?.on_roll || 0,
                detained: stats[0]?.detained || 0,
                left: stats[0]?.left_out || 0
            }
        });

    } catch (error) {
        console.error('Error fetching promotion statistics:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
});


// ========================================
// PROMOTION SUMMARY (NEW!)
// ========================================
router.post('/promotions/summary', async (req, res) => {
    try {
        const { programme_id, batch_id, branch_id, semester_id } = req.body;

        if (!programme_id || !batch_id || !branch_id || !semester_id) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields'
            });
        }

        // Get students summary for promotion
        const [students] = await promisePool.query(
            `SELECT 
                COUNT(*) as total_students,
                SUM(CASE WHEN student_status = 'In Roll' THEN 1 ELSE 0 END) as in_roll,
                SUM(CASE WHEN student_status = 'Detained' THEN 1 ELSE 0 END) as detained,
                SUM(CASE WHEN student_status = 'Left' THEN 1 ELSE 0 END) as left,
                SUM(CASE WHEN student_status = 'Completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN student_status = 'Dropout' THEN 1 ELSE 0 END) as dropout
            FROM student_semester_history
            WHERE programme_id = ?
            AND batch_id = ?
            AND branch_id = ?
            AND semester_id = ?
            AND student_status IN ('In Roll', 'Detained', 'Left', 'Completed', 'Dropout')
            `,
            [programme_id, batch_id, branch_id, semester_id]
        );

        const summary = students[0];

        res.json({
            status: 'success',
            data: {
                total_students: summary.total_students || 0,
                in_roll: summary.in_roll || 0,
                detained: summary.detained || 0,
                left: summary.left || 0,
                completed: summary.completed || 0,
                dropout: summary.dropout || 0,
                eligible_for_promotion: summary.in_roll || 0 // Only "In Roll" students can be promoted
            }
        });

    } catch (error) {
        console.error('Error getting promotion summary:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to get promotion summary',
            error: error.message
        });
    }
});

// ========================================
// PERFORM PROMOTION
// ========================================
router.post('/promotions/promote', async (req, res) => {

    try {
        const {
            from_programme_id,
            from_batch_id,
            from_branch_id,
            from_semester_id,
            to_programme_id,
            to_batch_id,
            to_branch_id,
            to_semester_id,
            to_regulation_id,
            to_section_id,
            academic_year
        } = req.body;

        const connection = await promisePool.getConnection();
        await connection.beginTransaction();

        try {

            // 1️⃣ Get all "In Roll" students from source semester
            const [students] = await connection.query(
                `SELECT * FROM student_semester_history
                 WHERE programme_id = ?
                   AND batch_id = ?
                   AND branch_id = ?
                   AND semester_id = ?
                   AND student_status IN ('In Roll', 'Detained', 'Left', 'Completed', 'Dropout')`,
                [
                    from_programme_id,
                    from_batch_id,
                    from_branch_id,
                    from_semester_id
                ]
            );

            if (students.length === 0) {
                throw new Error('No students found to promote');
            }

            let promotedCount = 0;

            // 2️⃣ Loop students
            for (const student of students) {

                const finalProgramme = to_programme_id ?? student.programme_id;
                const finalBranch = to_branch_id ?? student.branch_id;
                const finalBatch = to_batch_id ?? student.batch_id;
                const finalRegulation = to_regulation_id ?? student.regulation_id;
                const finalSection = to_section_id ?? student.section_id;

                // 🔍 Duplicate check (FULL SAFE CHECK)
                const [existing] = await connection.query(
                    `SELECT semester_history_id
                     FROM student_semester_history
                     WHERE student_id = ?
                       AND semester_id = ?`,
                    [
                        student.student_id,
                        to_semester_id
                    ]
                );

                if (existing.length > 0) {
                    console.log(`Student ${student.student_id} already promoted. Skipping.`);
                    continue;
                }

                // 3️⃣ UPDATE OLD SEMESTER RECORD TO "Promoted"
                await connection.query(
                    `UPDATE student_semester_history 
                    SET student_status = 'Promoted', 
                        is_promoted = 1, 
                        promotion_date = CURDATE(),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE semester_history_id = ?`,
                    [student.semester_history_id]
                );

                // 4️⃣ INSERT NEW SEMESTER RECORD
                await connection.query(
                    `INSERT INTO student_semester_history (
                        student_id,
                        academic_year,
                        semester_id,
                        programme_id,
                        branch_id,
                        batch_id,
                        regulation_id,
                        section_id,
                        roll_number,
                        student_status,
                        status_date,
                        promoted_from_semester_history_id,
                        is_promoted,
                        promotion_date,
                        created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'In Roll', CURDATE(), ?, 0, NULL, 'system')`,
                    [
                        student.student_id,
                        academic_year,
                        to_semester_id,
                        finalProgramme,
                        finalBranch,
                        finalBatch,
                        finalRegulation,
                        finalSection,
                        student.roll_number,
                        student.semester_history_id
                    ]
                );

                promotedCount++;
            }

            // 🚨 If all already promoted
            if (promotedCount === 0) {
                throw new Error('All students already promoted.');
            }

            // 4️⃣ Insert into promotion log
            await connection.query(
                `INSERT INTO promotion_batch_log (
                    promotion_name,
                    from_programme_id,
                    from_batch_id,
                    from_branch_id,
                    from_semester,
                    to_programme_id,
                    to_batch_id,
                    to_branch_id,
                    to_semester,
                    to_academic_year,
                    to_regulation_id,
                    total_students,
                    promoted_count,
                    skipped_count,
                    executed_by,
                    remarks
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    `Sem-${from_semester_id} to Sem-${to_semester_id}`,
                    from_programme_id,
                    from_batch_id,
                    from_branch_id,
                    from_semester_id,
                    to_programme_id,
                    to_batch_id,
                    to_branch_id,
                    to_semester_id,
                    academic_year,
                    to_regulation_id,
                    students.length,
                    promotedCount,
                    students.length - promotedCount,
                    'system',
                    'Promotion executed successfully'
                ]
            );

            await connection.commit();

            res.json({
                status: 'success',
                message: `Successfully promoted ${promotedCount} students to Semester ${to_semester_id}`,
                data: {
                    total_students: students.length,
                    promoted: promotedCount,
                    skipped: students.length - promotedCount
                }
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error promoting students:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to promote students',
            error: error.message
        });
    }
});


module.exports = { initializeRouter };
