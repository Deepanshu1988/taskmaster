const emailService = require('./utils/emailService');

async function testEmail() {
  try {
    console.log('Sending test email...');
    await emailService.sendNotificationEmail(
      'recipient@example.com', // Replace with your test email
      'Test Email from TaskMaster',
      'This is a test email to verify email service is working.'
    );
    console.log('Test email sent successfully!');
  } catch (error) {
    console.error('Error sending test email:', error);
  }
}

testEmail();
