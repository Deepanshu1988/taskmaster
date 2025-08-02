// Load environment variables first
dotenv.config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const requestLogger = require('./middleware/requestLogger');

const app = express();

// Middleware
app.use(cors({
  origin: 'https://taskmaster.dentalguru.software', // Adjust this to match your Angular app's URL
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Make db accessible in routes
app.set('db', db);

// Test DB connection
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Routes
const departmentRoutes = require('./routes/departmentRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');
const uploadsDir = path.join(__dirname, './uploads/task-attachments');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}
app.use('/api/departments', departmentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);

//404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// In development, proxy non-API requests to the Angular dev server
if (process.env.NODE_ENV !== 'production') {
  const { createProxyMiddleware } = require('http-proxy-middleware');
  app.use('/', createProxyMiddleware({
    target: 'http://localhost:3000', // Angular dev server
    changeOrigin: true,
    ws: true,
    logLevel: 'debug'
  }));
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log('Proxying frontend requests to http://localhost:3000');
  }
});