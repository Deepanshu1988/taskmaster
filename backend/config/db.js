const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'taskmaster',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000, // 10 seconds timeout
  acquireTimeout: 10000, // 10 seconds to get a connection
  timeout: 60000 // 60 seconds idle timeout
});

// Test the connection
pool.getConnection()
  .then(connection => {
    console.log('Successfully connected to the database');
    connection.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err);
    console.log('Please check if MySQL is running and the credentials are correct');
    process.exit(1);
  });

module.exports = pool;
