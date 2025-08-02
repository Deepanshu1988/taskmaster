const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_PASSWORD) {
  console.error('❌ Error: Missing required environment variables GMAIL_EMAIL and/or GMAIL_PASSWORD');
  process.exit(1);
}

// Create a single reusable transporter object
let transporter;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  console.log('Creating new SMTP transporter...');
  
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_PASSWORD
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    logger: true,
    debug: true
  });

  // Verify connection configuration
  transporter.verify(function(error) {
    if (error) {
      console.error('❌ SMTP Connection Error:', error);
    } else {
      console.log('✅ SMTP Server is ready to take our messages');
    }
  });

  return transporter;
}

// Test the transporter connection
async function testTransporter() {
  try {
    const testTransporter = getTransporter();
    await testTransporter.verify();
    console.log('✅ SMTP connection verified');
    return true;
  } catch (error) {
    console.error('❌ SMTP verification failed:', error);
    return false;
  }
}

// Send notification email
// In emailService.js, update the sendNotificationEmail function
exports.sendNotificationEmail = async (to, subject, text) => {
  const transporter = getTransporter();
  
  console.log('\n--- Sending Notification Email ---');
  console.log('Using email service:', process.env.GMAIL_EMAIL);
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('Text:', text);
  
  try {
    const mailOptions = {
      from: `"TaskMaster" <${process.env.GMAIL_EMAIL}>`,
      to,
      subject,
      text,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>${subject}</h2>
        <div style="white-space: pre-line;">${text.replace(/\n/g, '<br>')}</div>
        <p style="margin-top: 20px; color: #666; font-size: 0.9em;">
          This is an automated message from TaskMaster. Please do not reply to this email.
        </p>
      </div>`
    };

    console.log('Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return info;
    
  } catch (error) {
    console.error('❌ Failed to send email:', {
      error: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack
    });
    throw error;
  }
};

// Password reset email
exports.sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  const subject = 'Password Reset Request';
  const text = `Hello,\n\n` +
    `You requested a password reset for your TaskMaster account.\n\n` +
    `Please click the following link to reset your password (valid for 1 hour):\n` +
    `${resetUrl}\n\n` +
    `If you didn't request this, please ignore this email.\n\n` +
    `Thank you,\nThe TaskMaster Team`;
  
  return exports.sendNotificationEmail(email, subject, text);
};

// Task reminder email
exports.sendTaskReminderEmail = async (to, task) => {
  const subject = `Task Reminder: ${task.title}`;
  const dueDate = task.due_date ? new Date(task.due_date).toLocaleString() : 'No due date';
  
  const text = `Hello,\n\n` +
    `This is a reminder about your upcoming task.\n\n` +
    `Task: ${task.title}\n` +
    `Description: ${task.description || 'No description'}\n` +
    `Due Date: ${dueDate}\n` +
    `Status: ${task.status || 'Not started'}\n\n` +
    `Please log in to view and update your task.\n\n` +
    `Thank you,\nThe TaskMaster Team`;
    
  return exports.sendNotificationEmail(to, subject, text);
};

// Run test on module load if not in test environment
if (process.env.NODE_ENV !== 'test') {
  testTransporter().then(success => {
    if (!success) {
      console.error('❌ Email service initialization failed. Check your SMTP settings.');
    }
  });
}

// Export for testing
if (process.env.NODE_ENV === 'test') {
  module.exports._test = {
    testTransporter,
    getTransporter: () => transporter
  };
}