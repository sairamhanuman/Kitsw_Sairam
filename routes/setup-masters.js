// Setup Master Tables Route
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

let promisePool;

function initializeRouter(pool) {
    promisePool = pool;
    return router;
}

// Execute master tables setup
router.post('/setup-masters', async (req, res) => {
    try {
        const sqlPath = path.join(__dirname, '../fix-master-tables.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        // Split SQL into individual statements
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`Executing ${statements.length} SQL statements...`);
        
        for (const statement of statements) {
            if (statement.trim()) {
                await promisePool.query(statement);
                console.log('✅ Executed:', statement.substring(0, 50) + '...');
            }
        }
        
        res.json({
            status: 'success',
            message: 'Master tables fixed and created successfully',
            statementsExecuted: statements.length
        });
    } catch (error) {
        console.error('Error setting up master tables:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to setup master tables',
            error: error.message
        });
    }
});

// Check if tables exist
router.get('/check-tables', async (req, res) => {
    try {
        const tables = ['sessions_master', 'month_year_master', 'exams_naming_master', 'exam_types_master'];
        const results = {};
        
        for (const table of tables) {
            const [rows] = await promisePool.query(
                `SELECT COUNT(*) as count FROM information_schema.tables 
                 WHERE table_schema = DATABASE() AND table_name = ?`,
                [table]
            );
            results[table] = rows[0].count > 0;
        }
        
        res.json({
            status: 'success',
            message: 'Tables checked successfully',
            data: results
        });
    } catch (error) {
        console.error('Error checking tables:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to check tables',
            error: error.message
        });
    }
});

module.exports = { initializeRouter };
