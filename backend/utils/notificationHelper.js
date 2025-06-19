const User  = require('../models/userModel');
const Notification = require('../models/notificationModel');
const emailService = require('./emailService');
//const userModel = require('../models/userModel');
/**
 * Sends notifications when a task status changes
 * @param {Object} task - The task object
 * @param {string} oldStatus - The previous status of the task
 * @param {Object} updater - The user who made the change
 */
const sendTaskStatusNotification = async (task, oldStatus, updater) => {
  try {
    console.log('\n--- Starting Notification Process ---');
    console.log('Task ID:', task.id);
    console.log('Task Title:', task.title);
    console.log('Old Status:', oldStatus);
    console.log('New Status:', task.status);
    console.log('Updater ID:', updater.id);
    console.log('Updater Role:', updater.role);
    console.log('Updater Email:', updater.email);
    console.log('Task object:', JSON.stringify(task, null, 2));
    console.log('Updater object:', JSON.stringify(updater, null, 2));
    
    if (!updater || !updater.id) {
      console.error('Invalid updater object:', updater);
      return;
    }

    const notificationRecipients = [];
    
    // If regular user is updating, notify all admins
    // Then in the sendTaskStatusNotification function:
// Temporary workaround - get all users and filter for admins
// Then in the sendTaskStatusNotification function:
if (updater.role !== 'admin') {
  console.log('Regular user updating - finding all admins');
  try {
    const admins = await User.getAllUsers();
    console.log('Found admins:', admins);
    
    admins.forEach(admin => {
      if (admin.id.toString() !== updater.id.toString()) {
        notificationRecipients.push({
          userId: admin.id,
          email: admin.email,
          name: admin.username
        });
      }
    });
  } catch (error) {
    console.error('Error finding admins:', error);
  }
}
   // If admin is updating, notify the assignee (regular user)
   else if (task.assigned_to) {
    console.log('Admin updating - notifying assignee');
    try {
      const assignee = await User.findById(task.assigned_to);
      if (assignee && assignee.id.toString() !== updater.id.toString()) {
        notificationRecipients.push({
          userId: assignee.id,
          email: assignee.email,
          name: assignee.username
        });
      }
    } catch (error) {
      console.error('Error finding assignee:', error);
    }
  }
    
    
  console.log('Final notification recipients:', notificationRecipients);
    
    // Process notifications for all recipients
    for (const recipient of notificationRecipients) {

      try {
        // Create notification in database
        await Notification.create({
          userId: recipient.userId,
          title: 'Task Status Updated',
          message: `Status of task "${task.title}" was changed from ${oldStatus} to ${task.status}`,
          type: 'email',
          status: 'unread',
          related_entity: 'task',
          related_entity_id: task.id,
          metadata: {
            old_status: oldStatus,
            new_status: task.status,
            progress: task.progress,
            updated_by: updater.id
          }
        });
        console.log('Task progress:', task.progress, 'Type:', typeof task.progress);
        console.log('Updater object keys:', Object.keys(updater || {}));
        
        // In the notification processing loop, before sending the email:
        const subject = `Task Status Updated: ${task.title}`;
        const message = `
  Task: ${task.title || 'No title'}
  Status changed from: ${oldStatus || 'N/A'} to ${task.status || 'N/A'}
  Progress: ${task.progress != null ? `${task.progress}%` : 'Not specified'}
  Updated by: ${(updater && (updater.username || updater.name)) || 'System User'}
  ${task.description ? `\nDescription: ${task.description}` : ''}
  ${task.due_date ? `\nDue Date: ${new Date(task.due_date).toLocaleDateString()}` : ''}
  ${task.priority ? `\nPriority: ${task.priority}` : ''}
  
  You can view the task for more details.
  
  Thank you,
  The TaskMaster Team
`;

        // Then send the email
await emailService.sendNotificationEmail(recipient.email, subject, message);

        console.log(`Notification sent to ${recipient.email}`);
      } catch (error) {
        console.error(`Error sending notification to ${recipient.email}:`, error);
        // Continue with other recipients even if one fails
      }
    }
  } catch (error) {
    console.error('Error in sendTaskStatusNotification:', error);
    // Don't throw the error as we don't want to fail the main operation
  }
};

module.exports = {
  sendTaskStatusNotification
};
