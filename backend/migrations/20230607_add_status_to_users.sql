-- Add status column to users table with default value 'active'
ALTER TABLE users
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';

-- Create an index on the status column for better query performance
CREATE INDEX idx_user_status ON users(status);

-- Add time tracking table
CREATE TABLE IF NOT EXISTS task_time_tracking (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  user_id INT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  duration INT DEFAULT 0, -- in seconds
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add index for better performance
CREATE INDEX idx_task_time_tracking_task_id ON task_time_tracking(task_id);
CREATE INDEX idx_task_time_tracking_user_id ON task_time_tracking(user_id);

-- Add total_time column to tasks table
ALTER TABLE tasks ADD COLUMN total_time INT DEFAULT 0 COMMENT 'Total tracked time in seconds';

-- Add last_time_tracked column to tasks table
ALTER TABLE tasks ADD COLUMN last_time_tracked DATETIME DEFAULT NULL;
