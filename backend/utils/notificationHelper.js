const User  = require('../models/userModel');
const Notification = require('../models/notificationModel');
const emailService = require('./emailService');

/**
 * Sends notifications when a task status changes
 * @param {Object} task - The task object
 * @param {string} oldStatus - The previous status of the task
 * @param {Object} updater - The user who made the change
 */
async function sendTaskStatusNotification(task, oldStatus, updater) {
  try {
    console.log('\n--- Starting Notification Process ---');
    console.log('Task ID:', task.id);
    console.log('Task Title:', task.title);
    console.log('Old Status:', oldStatus);
    console.log('New Status:', task.status);
    console.log('Updater ID:', updater?.id);
    console.log('Updater Role:', updater?.role);
    console.log('Updater Email:', updater?.email);
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
        console.log('=== UPDATER OBJECT DEBUG ===');
        console.log('Updater object:', JSON.stringify(updater, null, 2));
        console.log('Updater properties:', Object.keys(updater || {}));
        if (updater) {
          console.log('Updater has username:', 'username' in updater);
          console.log('Updater has name:', 'name' in updater);
          console.log('Updater has first_name/last_name:', 'first_name' in updater || 'last_name' in updater);
          console.log('Updater ID:', updater.id || 'No ID');
        } else {
          console.log('Updater is null or undefined');
        }
        console.log('=== END UPDATER DEBUG ===');
        
        // In the notification processing loop, before sending the email:
        const subject = `Task Status Updated: ${task.title}`;
        
        // Default updater name
        let updaterName = 'System';
        
        // If we have an updater with ID, try to get their details
        if (updater?.id) {
          try {
            const user = await User.findById(updater.id);
            if (user) {
              // Use name if available, otherwise use username, fallback to 'there'
              updaterName = user.name || user.username || 'there';
            }
          } catch (error) {
            console.error('Error fetching user details:', error);
            // If there's an error, use the updater's username if available
            updaterName = updater.username || 'there';
          }
        } else if (updater) {
          // Fallback to direct properties if no ID but we have an updater object
          updaterName = updater.username || updater.name || 'there';
        }
        
        console.log('Final updater name to be used:', updaterName);
        
        // Get progress value, checking both lowercase and uppercase properties
        const progressValue = task.progress ?? task.Progress;
        console.log('Progress value to display:', progressValue);
        
        const message = `
  Task: ${task.title || 'No title'}
  Status changed from: ${oldStatus || 'N/A'} to ${task.status || 'N/A'}
  ${progressValue !== undefined ? `Progress: ${progressValue}%` : ''} 
  Updated by: ${updaterName}
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
