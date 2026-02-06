const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

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

// Test database connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
        console.log('Note: Database connection will be required for API endpoints');
    } else {
        console.log('Database connection successful');
        connection.release();
    }
});

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

// API endpoints structure (ready for future implementation)

// Programme Management Routes
const programmeRoutes = require('./routes/programmes')(promisePool);
app.use('/api/programmes', programmeRoutes);

// Branch Management
app.get('/api/branches', async (req, res) => {
    res.json({ message: 'Branch list endpoint - To be implemented' });
});

// Batch Management
app.get('/api/batches', async (req, res) => {
    res.json({ message: 'Batch list endpoint - To be implemented' });
});

// Student Management
app.get('/api/students', async (req, res) => {
    res.json({ message: 'Student list endpoint - To be implemented' });
});

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