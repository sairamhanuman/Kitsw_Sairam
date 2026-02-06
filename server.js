const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const initializeDatabase = require('./db/init');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure multer for photo uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/students/')
    },
    filename: function (req, file, cb) {
        // Use crypto.randomUUID for collision-resistant unique filenames
        const uniqueId = crypto.randomUUID();
        cb(null, 'student-' + uniqueId + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only JPEG, JPG, and PNG images are allowed!'));
    }
});

// MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'engineering_college',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Promisify pool queries
const promisePool = pool.promise();

// Test database connection and initialize tables
(async () => {
    try {
        const connection = await promisePool.getConnection();
        console.log('Database connection successful');
        connection.release();
        
        // Initialize database tables
        await initializeDatabase(promisePool);
    } catch (err) {
        console.error('Error connecting to database:', err.message);
        console.log('Note: Database connection will be required for API endpoints');
    }
})();

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'Engineering College Application API is running',
        timestamp: new Date().toISOString()
    });
});

// Test database endpoint
app.get('/api/db-test', async (req, res) => {
    try {
        const [rows] = await promisePool.query('SELECT 1 + 1 AS result');
        res.json({ 
            status: 'success', 
            message: 'Database connection successful',
            result: rows[0].result
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            message: 'Database connection failed',
            error: error.message
        });
    }
});

// Database diagnostics endpoint - Development only
app.get('/api/diagnostics/tables', async (req, res) => {
    // Only allow in development environment for security
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({
            status: 'error',
            message: 'This endpoint is only available in development mode'
        });
    }
    
    try {
        // Check semester_master table
        const [semesterColumns] = await promisePool.query(
            "SHOW COLUMNS FROM semester_master"
        );
        
        // Check exam_session_master table
        const [examSessionColumns] = await promisePool.query(
            "SHOW COLUMNS FROM exam_session_master"
        );
        
        res.json({
            status: 'success',
            tables: {
                semester_master: semesterColumns,
                exam_session_master: examSessionColumns
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
            code: error.code
        });
    }
});

// API endpoints structure (ready for future implementation)

// Programme Management Routes
const programmeRoutes = require('./routes/programmes')(promisePool);
app.use('/api/programmes', programmeRoutes);

// Branch Management Routes
const branchRoutes = require('./routes/branches')(promisePool);
app.use('/api/branches', branchRoutes);

// Batch Management Routes
const batchRoutes = require('./routes/batches')(promisePool);
app.use('/api/batches', batchRoutes);

// Semester Management Routes
const semesterRoutes = require('./routes/semesters')(promisePool);
app.use('/api/semesters', semesterRoutes);

// Regulation Management Routes
const regulationRoutes = require('./routes/regulations')(promisePool);
app.use('/api/regulations', regulationRoutes);

// Section Management Routes
const sectionRoutes = require('./routes/sections')(promisePool);
app.use('/api/sections', sectionRoutes);

// Exam Session Management Routes
const examSessionRoutes = require('./routes/exam-sessions')(promisePool);
app.use('/api/exam-sessions', examSessionRoutes);

// Student Management Routes
const studentRoutes = require('./routes/students')(promisePool);
app.use('/api/students', studentRoutes);

// Photo upload route for students (must be after students routes initialization)
app.post('/api/students/:id/upload-photo', upload.single('photo'), async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No file uploaded'
            });
        }
        
        // Check if student exists
        const [student] = await promisePool.query(
            'SELECT student_id FROM student_master WHERE student_id = ?',
            [id]
        );
        
        if (student.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Student not found'
            });
        }
        
        // Update student photo URL
        const photoUrl = `/uploads/students/${req.file.filename}`;
        await promisePool.query(
            'UPDATE student_master SET photo_url = ? WHERE student_id = ?',
            [photoUrl, id]
        );
        
        res.json({
            status: 'success',
            message: 'Photo uploaded successfully',
            data: {
                photo_url: photoUrl
            }
        });
    } catch (error) {
        console.error('Error uploading photo:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to upload photo',
            error: error.message
        });
    }
});

// Staff Management Routes
const staffRoutes = require('./routes/staff')(promisePool);
app.use('/api/staff', staffRoutes);

// Course Management
app.get('/api/courses', async (req, res) => {
    res.json({ message: 'Course list endpoint - To be implemented' });
});

// Handle 404 for API routes
app.use('/api', (req, res) => {
    res.status(404).json({ 
        status: 'error',
        message: 'API endpoint not found' 
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ 
        status: 'error',
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Serve index.html for all other routes (SPA support) - MUST BE LAST
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to view the application`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    pool.end(() => {
        console.log('Database pool closed');
        process.exit(0);
    });
});