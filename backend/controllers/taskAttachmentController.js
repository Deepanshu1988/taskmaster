const TaskAttachment = require('../models/taskAttachmentModel');
const Task = require('../models/taskModel');
const fs = require('fs-extra');
const path = require('path');
const { validationResult } = require('express-validator');
const express = require('express');
const router = express.Router({ mergeParams: true });
// Define upload directory path
const UPLOAD_DIR = path.join(process.cwd(), 'public','uploads', 'task-attachments');

// Ensure upload directory exists
fs.ensureDirSync(UPLOAD_DIR);

const taskAttachmentController = {
  // Upload files for a task
  uploadFile: async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log('Uploading file for task ID:', taskId); // Add this line
    
    // Check if task exists
    const task = await Task.findById(taskId);
    console.log('Task found:', task); // Add this line
    
    if (!task) {
      // Clean up any uploaded files
      if (req.files) {
        req.files.forEach(file => {
          if (file.path) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

      // Process each file
      const attachments = await Promise.all(
        req.files.map(async (file) => {
          try {
            return await TaskAttachment.create({
              task_id: taskId,
              user_id: userId,
              file_name: file.originalname,
              file_path: file.path,
              file_size: file.size,
              file_type: file.mimetype
            });
          } catch (error) {
            console.error('Error saving file to database:', error);
            // Clean up the file if database save fails
            if (file.path && fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
            return null;
          }
        })
      );

      // Filter out any null values from failed uploads
      const successfulAttachments = attachments.filter(attachment => attachment !== null);

      if (successfulAttachments.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'Failed to save any files to the database'
        });
      }

      res.status(201).json({
        success: true,
        message: `Successfully uploaded ${successfulAttachments.length} file(s)`,
        data: successfulAttachments
      });

    } catch (error) {
      console.error('Error uploading files:', error);
      
      // Clean up any uploaded files if error occurs
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to upload files',
        error: error.message
      });
    }
  },

  // Get all attachments for a task
  async getTaskAttachments(req, res) {
    try {
      const { taskId } = req.params;
      
      // Verify task exists
      const task = await Task.findById(taskId);
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      const attachments = await TaskAttachment.findByTaskId(taskId);
      
      res.json({
        success: true,
        data: attachments
      });
    } catch (error) {
      console.error('Error fetching attachments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch attachments',
        error: error.message
      });
    }
  },

  // Download a file
  async downloadFile(req, res) {
    try {
      const { attachmentId } = req.params;
      
      const attachment = await TaskAttachment.findById(attachmentId);
      if (!attachment) {
        return res.status(404).json({ success: false, message: 'Attachment not found' });
      }

      const filePath = attachment.file_path;
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      res.download(filePath, attachment.file_name);
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download file',
        error: error.message
      });
    }
  },

  // Delete a file
  async deleteFile(req, res) {
    try {
      const { attachmentId } = req.params;
      const userId = req.user.id;
      
      const attachment = await TaskAttachment.findById(attachmentId);
      if (!attachment) {
        return res.status(404).json({ success: false, message: 'Attachment not found' });
      }

      // Only the uploader or admin can delete
      if (attachment.user_id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Not authorized to delete this file' 
        });
      }

      // Delete file from filesystem
      if (fs.existsSync(attachment.file_path)) {
        fs.unlinkSync(attachment.file_path);
      }

      // Delete from database
      await TaskAttachment.delete(attachmentId);

      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete file',
        error: error.message
      });
    }
  }
};

module.exports = taskAttachmentController;
