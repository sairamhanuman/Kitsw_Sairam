// ========================================
// ELECTIVE MAPPING ROUTES
// File: routes/elective-mapping.js
// ========================================

const express = require('express');
const router = express.Router();

let promisePool;

// Initialize router with DB pool
function initializeRouter(pool) {
    promisePool = pool;
    return router;
}

// ========================================
// GET ELECTIVE SUBJECTS
// ========================================
router.get('/elective-subjects', async (req, res) => {
    try {
        const { semester_id } = req.query;
        let query = `
            SELECT subject_id, syllabus_code, subject_name, subject_type, credits, semester_id
            FROM subject_master
            WHERE is_elective = 1 AND is_active = 1
        `;
        const params = [];
        if (semester_id) {
            query += ` AND semester_id = ?`;
            params.push(semester_id);
        }
        query += ` ORDER BY syllabus_code`;

        const [subjects] = await promisePool.query(query, params);
        res.json({ status: 'success', data: { subjects } });

    } catch (error) {
        console.error('Error fetching elective subjects:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch elective subjects', error: error.message });
    }
});

// ========================================
// GET AVAILABLE STUDENTS (Left Box)
// ========================================
router.get('/available-students', async (req, res) => {
    try {
        const { programme_id, batch_id, branch_id, semester_id, subject_id } = req.query;
        if (!programme_id || !batch_id || !branch_id || !semester_id) {
            return res.status(400).json({ status: 'error', message: 'Programme, Batch, Branch, and Semester are required' });
        }

        const query = `
            SELECT sm.student_id, sm.admission_number, sm.roll_number, sm.full_name, sm.gender, ssh.student_status, ssh.semester_id
            FROM student_master sm
            INNER JOIN student_semester_history ssh ON sm.student_id = ssh.student_id
            WHERE ssh.programme_id = ? AND ssh.batch_id = ? AND ssh.branch_id = ? AND ssh.semester_id = ? AND ssh.student_status = 'On Roll'
            AND sm.student_id NOT IN (
                SELECT student_id FROM student_elective_mapping 
                WHERE subject_id = ? AND semester_id = ? AND is_active = 1
            )
            ORDER BY sm.roll_number
        `;

        const [students] = await promisePool.query(query, [
            programme_id, batch_id, branch_id, semester_id, subject_id || 0, semester_id
        ]);

        res.json({ status: 'success', data: { students, total: students.length } });

    } catch (error) {
        console.error('Error fetching available students:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch available students', error: error.message });
    }
});

// ========================================
// GET MAPPED STUDENTS (Right Box)
// ========================================
router.get('/mapped-students', async (req, res) => {
    try {
        const { programme_id, batch_id, branch_id, semester_id, subject_id } = req.query;
        if (!subject_id) return res.json({ status: 'success', data: { students: [], total: 0 } });

        const query = `
            SELECT sem.mapping_id, sem.student_id, sm.admission_number, sm.roll_number, sm.full_name, sm.gender, sem.mapped_date
            FROM student_elective_mapping sem
            INNER JOIN student_master sm ON sem.student_id = sm.student_id
            WHERE sem.subject_id = ? AND sem.programme_id = ? AND sem.batch_id = ? AND sem.branch_id = ? AND sem.semester_id = ? AND sem.is_active = 1
            ORDER BY sm.roll_number
        `;

        const [students] = await promisePool.query(query, [
            subject_id, programme_id, batch_id, branch_id, semester_id
        ]);

        res.json({ status: 'success', data: { students, total: students.length } });

    } catch (error) {
        console.error('Error fetching mapped students:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch mapped students', error: error.message });
    }
});

// ========================================
// SAVE ELECTIVE CHANGES (ADD + REMOVE)
// ========================================
router.post('/save-changes', async (req, res) => {
    try {
        const {
            students_to_add,
            students_to_remove,
            programme_id,
            batch_id,
            branch_id,
            semester_id,
            subject_id,
            academic_year
        } = req.body;

        if ((!students_to_add || students_to_add.length === 0) && (!students_to_remove || students_to_remove.length === 0)) {
            return res.status(400).json({ status: 'error', message: 'No changes to save' });
        }

        const connection = await promisePool.getConnection();
        try {
            await connection.beginTransaction();
            let added = 0, removed = 0, errors = [];

            // Add students
            if (students_to_add && students_to_add.length > 0) {
                for (const student_id of students_to_add) {
                    try {
                        const [exists] = await connection.query(
                            `SELECT mapping_id FROM student_elective_mapping 
                             WHERE student_id = ? AND subject_id = ? AND semester_id = ? AND is_active = 1`,
                            [student_id, subject_id, semester_id]
                        );
                        if (exists.length > 0) continue;

                        await connection.query(
                            `INSERT INTO student_elective_mapping 
                            (student_id, programme_id, batch_id, branch_id, semester_id, subject_id, academic_year, is_active)
                            VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
                            [student_id, programme_id, batch_id, branch_id, semester_id, subject_id, academic_year || null]
                        );
                        added++;
                    } catch (err) {
                        errors.push({ student_id, error: err.message });
                    }
                }
            }

            // Remove students
            if (students_to_remove && students_to_remove.length > 0) {
                const placeholders = students_to_remove.map(() => '?').join(',');
                const [result] = await connection.query(
                    `UPDATE student_elective_mapping 
                     SET is_active = 0 
                     WHERE student_id IN (${placeholders})
                     AND subject_id = ? AND semester_id = ? AND is_active = 1`,
                    [...students_to_remove, subject_id, semester_id]
                );
                removed = result.affectedRows;
            }

            await connection.commit();
            res.json({ status: 'success', message: 'Changes saved successfully', data: { added, removed, errors } });

        } catch (err) {
            await connection.rollback();
            throw err;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Error saving elective changes:', error);
        res.status(500).json({ status: 'error', message: 'Failed to save elective changes', error: error.message });
    }
});

// ========================================
// GET ELECTIVE MAPPING REPORT
// ========================================
router.get('/report', async (req, res) => {
    try {
        const { programme_id, batch_id, branch_id, semester_id } = req.query;
        const query = `
            SELECT subm.syllabus_code, subm.subject_name, COUNT(sem.student_id) as student_count,
            GROUP_CONCAT(sm.roll_number ORDER BY sm.roll_number SEPARATOR ', ') as students
            FROM subject_master subm
            LEFT JOIN student_elective_mapping sem 
                ON subm.subject_id = sem.subject_id AND sem.is_active = 1
                AND sem.programme_id = ? AND sem.batch_id = ? AND sem.branch_id = ? AND sem.semester_id = ?
            LEFT JOIN student_master sm ON sem.student_id = sm.student_id
            WHERE subm.is_elective = 1 AND subm.is_active = 1
            GROUP BY subm.subject_id, subm.syllabus_code, subm.subject_name
            ORDER BY subm.syllabus_code
        `;

        const [report] = await promisePool.query(query, [programme_id, batch_id, branch_id, semester_id]);
        res.json({ status: 'success', data: { report } });

    } catch (error) {
        console.error('Error generating elective mapping report:', error);
        res.status(500).json({ status: 'error', message: 'Failed to generate report', error: error.message });
    }
});

module.exports = { initializeRouter };
