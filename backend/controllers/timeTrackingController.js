const TimeTracking = require('../models/timeTrackingModel');
const { validationResult } = require('express-validator');

const timeTrackingController = {
  // Start tracking time for a task
  async startTracking(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { task_id, notes } = req.body;
      const user_id = req.user.id;

      // Check if user already has an active time entry
      const activeEntry = await TimeTracking.getActiveTimeEntry(user_id);
      if (activeEntry) {
        return res.status(400).json({
          success: false,
          message: 'You already have an active time entry',
          activeEntry
        });
      }

      const timeEntryId = await TimeTracking.startTracking({
        task_id,
        user_id,
        notes
      });

      res.status(201).json({
        success: true,
        message: 'Time tracking started',
        timeEntryId
      });
    } catch (error) {
      console.error('Error starting time tracking:', error);
      res.status(500).json({
        success: false,
        message: 'Error starting time tracking',
        error: error.message
      });
    }
  },

  // Stop tracking time for a task
  async stopTracking(req, res) {
    try {
      const { timeEntryId, notes } = req.body;
      const user_id = req.user.id;

      // Verify the time entry belongs to the user
      const [entries] = await pool.query(
        'SELECT * FROM task_time_tracking WHERE id = ? AND user_id = ?',
        [timeEntryId, user_id]
      );

      if (entries.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Time entry not found or access denied'
        });
      }


      const result = await TimeTracking.stopTracking(timeEntryId, notes);
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Time entry not found or already stopped'
        });
      }

      res.json({
        success: true,
        message: 'Time tracking stopped'
      });
    } catch (error) {
      console.error('Error stopping time tracking:', error);
      res.status(500).json({
        success: false,
        message: 'Error stopping time tracking',
        error: error.message
      });
    }
  },

  // Get time entries for a task
  async getTaskTimeEntries(req, res) {
    try {
      const { taskId } = req.params;
      const entries = await TimeTracking.getTaskTimeEntries(taskId);
      
      // Format the duration for display
      const formattedEntries = entries.map(entry => ({
        ...entry,
        formatted_duration: TimeTracking.formatDuration(entry.duration || 0)
      }));
      
      res.json({
        success: true,
        data: formattedEntries
      });
    } catch (error) {
      console.error('Error getting task time entries:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting task time entries',
        error: error.message
      });
    }
  },

  // Get user's time entries
  async getUserTimeEntries(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const userId = req.user.id;
      
      const entries = await TimeTracking.getUserTimeEntries(userId, { startDate, endDate });
      
      // Format the duration for display
      const formattedEntries = entries.map(entry => ({
        ...entry,
        formatted_duration: TimeTracking.formatDuration(entry.duration || 0)
      }));
      
      res.json({
        success: true,
        data: formattedEntries
      });
    } catch (error) {
      console.error('Error getting user time entries:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting user time entries',
        error: error.message
      });
    }
  },

  // Get active time entry for current user
  async getActiveTimeEntry(req, res) {
    try {
      const userId = req.user.id;
      const activeEntry = await TimeTracking.getActiveTimeEntry(userId);
      
      if (!activeEntry) {
        return res.json({
          success: true,
          data: null,
          message: 'No active time entry'
        });
      }
      
      // Calculate current duration for active entry
      const now = new Date();
      const startTime = new Date(activeEntry.start_time);
      const duration = Math.floor((now - startTime) / 1000);
      
      res.json({
        success: true,
        data: {
          ...activeEntry,
          duration,
          formatted_duration: TimeTracking.formatDuration(duration)
        }
      });
    } catch (error) {
      console.error('Error getting active time entry:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting active time entry',
        error: error.message
      });
    }
  },

  // Get time summary for a task
  async getTaskTimeSummary(req, res) {
    try {
      const { taskId } = req.params;
      const summary = await TimeTracking.getTaskTimeSummary(taskId);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error getting task time summary:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting task time summary',
        error: error.message
      });
    }
  },

  // Delete a time entry
  async deleteTimeEntry(req, res) {
    try {
      const { timeEntryId } = req.params;
      const userId = req.user.id;
      
      // Verify the time entry belongs to the user
      const [entries] = await pool.query(
        'SELECT * FROM task_time_tracking WHERE id = ? AND user_id = ?',
        [timeEntryId, userId]
      );

      if (entries.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Time entry not found or access denied'
        });
      }

      const [result] = await pool.query(
        'DELETE FROM task_time_tracking WHERE id = ?',
        [timeEntryId]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Time entry not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Time entry deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting time entry:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting time entry',
        error: error.message
      });
    }
  }
};

module.exports = timeTrackingController;
