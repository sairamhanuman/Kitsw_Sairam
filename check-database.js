// Database connection checker for Railway
const mysql = require('mysql2/promise');

async function checkDatabase() {
    const connection = await mysql.createConnection({
        host: 'switchback.proxy.rlwy.net',
        port: 25051,
        user: 'root',
        password: 'aKeVerCxudubpObrWoxvMaOvHDRgbJZn',
        database: 'railway'
    });

    try {
        console.log('🔍 Checking database structure...');
        
        // Check exam_timetable table structure
        const [examTimetable] = await connection.execute('DESCRIBE exam_timetable');
        console.log('\n📋 exam_timetable table:');
        examTimetable.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key}`);
        });
        
        // Check exam_session_master table structure
        const [examSession] = await connection.execute('DESCRIBE exam_session_master');
        console.log('\n📋 exam_session_master table:');
        examSession.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key}`);
        });
        
        // Check foreign key constraints
        const [constraints] = await connection.execute(`
            SELECT 
                TABLE_NAME,
                COLUMN_NAME,
                CONSTRAINT_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = 'railway' 
            AND TABLE_NAME LIKE 'exam_%'
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `);
        
        console.log('\n🔗 Foreign Key Constraints:');
        constraints.forEach(constraint => {
            console.log(`  - ${constraint.TABLE_NAME}.${constraint.COLUMN_NAME} → ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
        });
        
        // Test a simple query
        const [testQuery] = await connection.execute(`
            SELECT COUNT(*) as count FROM exam_timetable
        `);
        console.log(`\n📊 Exam timetables count: ${testQuery[0].count}`);
        
        // Test exam sessions
        const [sessions] = await connection.execute(`
            SELECT session_id, session_name FROM exam_session_master WHERE is_active = 1
        `);
        console.log('\n📅 Active exam sessions:');
        sessions.forEach(session => {
            console.log(`  - ${session.session_id}: ${session.session_name}`);
        });
        
    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        await connection.end();
    }
}

checkDatabase();
