const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter with direct SMTP settings
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_PASSWORD
    }
});

// Test the transporter
transporter.verify(function(error, success) {
    if (error) {
        console.error('Error with email configuration:', error);
    } else {
        console.log('Server is ready to take our messages');
    }
});

const getEmailTemplate = (title, message, actionText, actionUrl) => `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4a6fa5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
            .button { 
                display: inline-block; 
                padding: 10px 20px; 
                background-color: #4a6fa5; 
                color: white; 
                text-decoration: none; 
                border-radius: 4px; 
                margin: 15px 0; 
            }
            .footer { 
                margin-top: 20px; 
                padding-top: 10px; 
                border-top: 1px solid #ddd; 
                font-size: 12px; 
                color: #777; 
                text-align: center; 
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h2>${title}</h2>
        </div>
        <div class="content">
            ${message}
            ${actionUrl ? `
                <div style="text-align: center; margin: 25px 0;">
                    <a href="${actionUrl}" class="button">${actionText || 'View Details'}</a>
                </div>
            ` : ''}
            <div class="footer">
                <p>This is an automated message from TaskMaster. Please do not reply to this email.</p>
                <p> ${new Date().getFullYear()} TaskMaster. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
`;

const sendEmail = async (to, subject, html) => {
    try {
        const mailOptions = {
            from: `"TaskMaster" <${process.env.GMAIL_EMAIL}>`,
            to,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        if (error.response) {
            console.error('SMTP Error:', error.response);
        }
        return false;
    }
};

// Notification email
exports.sendNotificationEmail = async (to, title, message, actionText, actionUrl) => {
    const emailHtml = getEmailTemplate(
        title,
        message,
        actionText,
        actionUrl
    );
    
    return sendEmail(to, title, emailHtml);
};

// Password reset email
exports.sendPasswordResetEmail = async (email, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const title = 'Password Reset Request';
    const message = `
        <p>You requested a password reset for your TaskMaster account.</p>
        <p>Click the button below to reset your password (valid for 1 hour):</p>
        <p>If you didn't request this, please ignore this email.</p>
    `;
    
    const emailHtml = getEmailTemplate(
        title,
        message,
        'Reset Password',
        resetUrl
    );
    
    return sendEmail(email, title, emailHtml);
};

// Task reminder email
exports.sendTaskReminderEmail = async (to, task) => {
    const title = `Reminder: ${task.title}`;
    const dueDate = new Date(task.dueDate).toLocaleString();
    const taskUrl = `${process.env.FRONTEND_URL}/tasks/${task.id}`;
    
    const message = `
        <p>This is a reminder for the following task:</p>
        <p><strong>${task.title}</strong></p>
        <p>Due: ${dueDate}</p>
        <p>Priority: ${task.priority}</p>
        <p>Status: ${task.status}</p>
        ${task.description ? `<p>${task.description}</p>` : ''}
    `;
    
    const emailHtml = getEmailTemplate(
        title,
        message,
        'View Task',
        taskUrl
    );
    
    return sendEmail(to, title, emailHtml);
};