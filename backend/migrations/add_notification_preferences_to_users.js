// backend/migrations/add_notification_preferences_to_users.js
const pool = require('../config/db');

async function up() {
  try {
    // Check if the column already exists
    const [check] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'notification_preferences'
    `);

    if (check.length === 0) {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN notification_preferences TEXT DEFAULT NULL
      `);
      console.log('Added notification_preferences column to users table');
    } else {
      console.log('notification_preferences column already exists');
    }
  } catch (error) {
    console.error('Error adding notification_preferences column:', error);
    throw error;
  }
}

async function down() {
  try {
    await pool.query(`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS notification_preferences
    `);
    console.log('Dropped notification_preferences column from users table');
  } catch (error) {
    console.error('Error dropping notification_preferences column:', error);
    throw error;
  }
}

module.exports = { up, down };