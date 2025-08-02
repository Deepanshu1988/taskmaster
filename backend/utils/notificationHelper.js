const User  = require('../models/userModel');
const Notification = require('../models/notificationModel');
const emailService = require('./emailService');

/**
 * Sends notifications when a task status or progress changes
 * @param {Object} task - The task object (with oldProgress in metadata if progress changed)
 * @param {string} oldStatus - The previous status of the task
 * @param {Object} updater - The user who made the change
 * @param {string} [comment] - Optional comment about the update
 * @param {boolean} [statusChanged] - Whether the status was changed
 * @param {boolean} [progressChanged] - Whether the progress was changed
 */
async function sendTaskStatusNotification(task, oldStatus, updater, comment = '', statusChanged = true, progressChanged = false) {
  const logPrefix = '[NOTIFICATION]';
  
  console.log(`\n${logPrefix} ======== Starting Notification Process ========`);
  console.log(`${logPrefix} Task ID: ${task?.id}, Title: ${task?.title}`);
  if (statusChanged) {
    console.log(`${logPrefix} Status Change: ${oldStatus} -> ${task?.status}`);
  }
  if (progressChanged && task.oldProgress !== undefined) {
    console.log(`${logPrefix} Progress Change: ${task.oldProgress}% -> ${task.progress}%`);
  }
  console.log(`${logPrefix} Updater: ${updater?.id} (${updater?.role}) - ${updater?.email}`);
  if (comment) {
    console.log(`${logPrefix} Comment: ${comment}`);
  }
  
  try {
    // Validate inputs
    if (!updater || !updater.id) {
      console.error(`${logPrefix} ERROR: Invalid updater object:`, JSON.stringify(updater));
      return { success: false, error: 'Invalid updater' };
    }

    if (!task || !task.id) {
      console.error(`${logPrefix} ERROR: Invalid task object:`, JSON.stringify(task));
      return { success: false, error: 'Invalid task' };
    }

    const notificationRecipients = [];
    
    // If regular user is updating, notify all admins
    if (updater.role !== 'admin' ) {
      console.log(`${logPrefix} Regular user updating - finding all admins`);
      try {
        console.log(`${logPrefix} Fetching all users...`);
        const allUsers = await User.getAllUsers();
        console.log(`${logPrefix} Found ${allUsers?.length || 0} users total`);
        
        const admins = allUsers.filter(user => {
          const isAdmin = user.role === 'admin' && user.id.toString() !== updater.id.toString();
          console.log(`${logPrefix} User ${user.id} (${user.email}): role=${user.role}, isAdmin=${isAdmin}`);
          return isAdmin;
        });
        
        console.log(`${logPrefix} Found ${admins.length} admins to notify`);
        
        admins.forEach(admin => {
          notificationRecipients.push({
            userId: admin.id,
            email: admin.email,
            name: admin.username || 'Admin'
          });
        });
      } catch (error) {
        console.error(`${logPrefix} ERROR in finding admins:`, error);
        return { success: false, error: 'Error finding admins', details: error.message };
      }
    }
    // If admin is updating, notify the assignee (regular user)
    else if (task.assigned_to) {
      console.log(`${logPrefix} Admin updating - notifying assignee ${task.assigned_to}`);
      try {
        const assignee = await User.findById(task.assigned_to);
        if (!assignee) {
          console.error(`${logPrefix} Assignee ${task.assigned_to} not found`);
        } else {
          console.log(`${logPrefix} Found assignee:`, assignee.email);
          if (assignee.id.toString() !== updater.id.toString()) {
            notificationRecipients.push({
              userId: assignee.id,
              email: assignee.email,
              name: assignee.username || 'User'
            });
          } else {
            console.log(`${logPrefix} Assignee is the same as updater, skipping notification`);
          }
        }
      } catch (error) {
        console.error(`${logPrefix} ERROR in finding assignee:`, error);
        return { success: false, error: 'Error finding assignee', details: error.message };
      }
    }

    console.log(`${logPrefix} Final notification recipients:`, notificationRecipients.map(r => r.email));
    
    if (notificationRecipients.length === 0) {
      console.log(`${logPrefix} WARNING: No recipients to notify`);
      return { success: false, error: 'No recipients to notify' };
    }
    
    // Process notifications for all recipients
    const results = [];
    for (const recipient of notificationRecipients) {
      const recipientLog = `${logPrefix} [${recipient.email}]`;
      try {
        console.log(`\n${recipientLog} Processing notification...`);
        
        let notificationMessage = '';
        if (statusChanged && progressChanged) {
          notificationMessage = `Task "${task.title}" status changed from ${oldStatus} to ${task.status} and progress updated from ${task.oldProgress}% to ${task.progress}%`;
        } else if (statusChanged) {
          notificationMessage = `Status of task "${task.title}" was changed from ${oldStatus} to ${task.status}`;
        } else if (progressChanged) {
          notificationMessage = `Progress of task "${task.title}" was updated from ${task.oldProgress}% to ${task.progress}%`;
        }
        
        // Create notification in database
        console.log(`${recipientLog} Creating database notification...`);
        const notification = await Notification.create({
          userId: recipient.userId,
          title: 'Task Status Updated',
          message: notificationMessage,
          type: 'email',
          status: 'unread',
          related_entity: 'task',
          related_entity_id: task.id,
          metadata: {
            old_status: oldStatus,
            new_status: task.status,
            updated_by: updater.id
          }
        });
        console.log(`${recipientLog} Notification created with ID:`, notification?.id);

        // Prepare email
        const emailSubject = `Task Updated: ${task.title}`;
        const emailText = `Hello ${recipient.name || 'there'},\n\n` +
          `The task "${task.title}" has been updated by ${updater.username || 'a user'}.\n\n` +
          `Status changed from: ${oldStatus} to ${task.status}\n` +
          `Task: ${task.title}\n` +
          (task.description ? `Description: ${task.description}\n` : '') +
          (task.due_date ? `Due Date: ${new Date(task.due_date).toLocaleDateString()}\n` : '') +
          //(comment ? `\nUpdate Note: ${comment}\n` : '') +
          `\nYou can view the task for more details.\n\n` +
          `Thank you,\nThe TaskMaster Team`;

        console.log(`${recipientLog} Sending email...`);
        console.log(`${recipientLog} To: ${recipient.email}`);
        console.log(`${recipientLog} Subject: ${emailSubject}`);
        
        // Send email
        const emailResult = await emailService.sendNotificationEmail(
          recipient.email,
          emailSubject,
          emailText
        );
        
        console.log(`${recipientLog} Email sent successfully`);
        results.push({ 
          success: true, 
          recipient: recipient.email,
          notificationId: notification?.id 
        });
      } catch (error) {
        const errorMsg = `Error sending to ${recipient.email}: ${error.message}`;
        console.error(`${recipientLog} ${errorMsg}`, error);
        results.push({ 
          success: false, 
          recipient: recipient.email,
          error: errorMsg 
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`\n${logPrefix} ======== Notification Process Complete ========`);
    console.log(`${logPrefix} Successfully sent ${successCount} of ${results.length} notifications`);
    
    return { 
      success: successCount > 0, 
      results 
    };
  } catch (error) {
    const errorMsg = `Critical error in notification process: ${error.message}`;
    console.error(`${logPrefix} ${errorMsg}`, error);
    return { 
      success: false, 
      error: errorMsg,
      stack: error.stack 
    };
  }
}

module.exports = {
  sendTaskStatusNotification
};
