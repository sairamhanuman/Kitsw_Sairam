/**
 * Database Initialization Module
 * Creates all necessary tables if they don't exist
 */

const tableSchemas = {
    programme_master: `
        CREATE TABLE IF NOT EXISTS programme_master (
            programme_id INT PRIMARY KEY AUTO_INCREMENT,
            programme_code VARCHAR(20) UNIQUE NOT NULL,
            programme_name VARCHAR(200) NOT NULL,
            programme_type ENUM('UG', 'PG', 'Diploma', 'Certificate') NOT NULL,
            duration_years DECIMAL(3,1) NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `,
    
    branch_master: `
        CREATE TABLE IF NOT EXISTS branch_master (
            branch_id INT PRIMARY KEY AUTO_INCREMENT,
            branch_code VARCHAR(20) UNIQUE NOT NULL,
            branch_name VARCHAR(200) NOT NULL,
            programme_id INT,
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (programme_id) REFERENCES programme_master(programme_id)
        )
    `,
    
    batch_master: `
        CREATE TABLE IF NOT EXISTS batch_master (
            batch_id INT PRIMARY KEY AUTO_INCREMENT,
            batch_name VARCHAR(100) NOT NULL,
            start_year INT NOT NULL,
            end_year INT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `,
    
    semester_master: `
        CREATE TABLE IF NOT EXISTS semester_master (
            semester_id INT PRIMARY KEY AUTO_INCREMENT,
            semester_name VARCHAR(50) NOT NULL,
            semester_number INT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `,
    
    regulation_master: `
        CREATE TABLE IF NOT EXISTS regulation_master (
            regulation_id INT PRIMARY KEY AUTO_INCREMENT,
            regulation_name VARCHAR(100) NOT NULL,
            regulation_year INT NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `,
    
    section_master: `
        CREATE TABLE IF NOT EXISTS section_master (
            section_id INT PRIMARY KEY AUTO_INCREMENT,
            section_name VARCHAR(50) NOT NULL,
            capacity INT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `,
    
    exam_session_master: `
        CREATE TABLE IF NOT EXISTS exam_session_master (
            session_id INT PRIMARY KEY AUTO_INCREMENT,
            session_name VARCHAR(100) NOT NULL,
            exam_date DATE,
            session_type VARCHAR(50),
            timings VARCHAR(50),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `,
    
    student_master: `
        CREATE TABLE IF NOT EXISTS student_master (
            student_id INT PRIMARY KEY AUTO_INCREMENT,
            student_name VARCHAR(200) NOT NULL,
            email VARCHAR(200) UNIQUE,
            phone VARCHAR(20),
            batch_id INT,
            branch_id INT,
            section_id INT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (batch_id) REFERENCES batch_master(batch_id),
            FOREIGN KEY (branch_id) REFERENCES branch_master(branch_id),
            FOREIGN KEY (section_id) REFERENCES section_master(section_id)
        )
    `,
    
    staff_master: `
        CREATE TABLE IF NOT EXISTS staff_master (
            staff_id INT PRIMARY KEY AUTO_INCREMENT,
            staff_name VARCHAR(200) NOT NULL,
            email VARCHAR(200) UNIQUE,
            phone VARCHAR(20),
            department VARCHAR(100),
            designation VARCHAR(100),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    `
};

/**
 * Create a single table
 */
async function createTable(pool, tableName, schema) {
    try {
        await pool.query(schema);
        console.log(`✓ Table '${tableName}' created/verified successfully`);
        return true;
    } catch (error) {
        console.error(`✗ Error creating table '${tableName}':`, error.message);
        return false;
    }
}

/**
 * Insert sample data for programmes
 */
async function insertSampleProgrammes(pool) {
    try {
        // Check if table is empty
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM programme_master');
        
        if (rows[0].count === 0) {
            console.log('Inserting sample programme data...');
            
            const sampleProgrammes = [
                ['BTECH', 'Bachelor of Technology', 'UG', 4.0, 'Four-year undergraduate engineering program'],
                ['MTECH', 'Master of Technology', 'PG', 2.0, 'Two-year postgraduate engineering program'],
                ['DIPLOMA', 'Diploma in Engineering', 'Diploma', 3.0, 'Three-year diploma program']
            ];
            
            for (const programme of sampleProgrammes) {
                await pool.query(
                    `INSERT INTO programme_master 
                    (programme_code, programme_name, programme_type, duration_years, description) 
                    VALUES (?, ?, ?, ?, ?)`,
                    programme
                );
            }
            
            console.log('✓ Sample programmes inserted successfully');
        }
    } catch (error) {
        console.error('Error inserting sample programmes:', error.message);
    }
}

/**
 * Insert sample data for branches
 */
async function insertSampleBranches(pool) {
    try {
        // Check if table is empty
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM branch_master');
        
        if (rows[0].count === 0) {
            console.log('Inserting sample branch data...');
            
            // Get BTECH programme_id
            const [programmes] = await pool.query(
                'SELECT programme_id FROM programme_master WHERE programme_code = ?',
                ['BTECH']
            );
            
            if (programmes.length > 0) {
                const btechId = programmes[0].programme_id;
                
                const sampleBranches = [
                    ['CSE', 'Computer Science and Engineering', btechId, 'Computer Science and Engineering department'],
                    ['ECE', 'Electronics and Communication Engineering', btechId, 'Electronics and Communication Engineering department'],
                    ['MECH', 'Mechanical Engineering', btechId, 'Mechanical Engineering department']
                ];
                
                for (const branch of sampleBranches) {
                    await pool.query(
                        `INSERT INTO branch_master 
                        (branch_code, branch_name, programme_id, description) 
                        VALUES (?, ?, ?, ?)`,
                        branch
                    );
                }
                
                console.log('✓ Sample branches inserted successfully');
            }
        }
    } catch (error) {
        console.error('Error inserting sample branches:', error.message);
    }
}

/**
 * Main initialization function
 */
async function initializeDatabase(pool) {
    console.log('\n========================================');
    console.log('Starting Database Initialization...');
    console.log('========================================\n');
    
    try {
        // Create tables in order (respecting foreign key dependencies)
        const tableOrder = [
            'programme_master',
            'branch_master',
            'batch_master',
            'semester_master',
            'regulation_master',
            'section_master',
            'exam_session_master',
            'student_master',
            'staff_master'
        ];
        
        let allTablesCreated = true;
        
        for (const tableName of tableOrder) {
            const created = await createTable(pool, tableName, tableSchemas[tableName]);
            if (!created) {
                allTablesCreated = false;
            }
        }
        
        // Insert sample data if tables were just created
        await insertSampleProgrammes(pool);
        await insertSampleBranches(pool);
        
        console.log('\n========================================');
        if (allTablesCreated) {
            console.log('✓ Database initialization completed successfully!');
        } else {
            console.log('⚠ Database initialization completed with some errors');
        }
        console.log('========================================\n');
        
        return allTablesCreated;
        
    } catch (error) {
        console.error('\n========================================');
        console.error('✗ Database initialization failed:', error.message);
        console.error('========================================\n');
        throw error;
    }
}

module.exports = initializeDatabase;
