const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendOTP = async (email, otp) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP Code - UniManage',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #4f46e5; text-align: center;">UniManage Verification</h2>
          <p style="font-size: 16px; color: #333;">Hello,</p>
          <p style="font-size: 16px; color: #333;">Your One-Time Password (OTP) for verification is:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${otp}</span>
          </div>
          <p style="font-size: 14px; color: #666;">This code will expire in 5 minutes.</p>
          <p style="font-size: 14px; color: #666;">If you didn't request this, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    if (error.response) {
      console.error('SMTP Response:', error.response);
    }
    return false;
  }
};

const sendAssignmentNotification = async (email, studentName, assignmentDetails) => {
  try {
    const { title, description, dueDate, subjectName } = assignmentDetails;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `New Assignment: ${title} - UniManage`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #4f46e5; text-align: center;">📚 New Assignment Posted</h2>
          <p style="font-size: 16px; color: #333;">Hello ${studentName},</p>
          <p style="font-size: 16px; color: #333;">A new assignment has been posted in <strong>${subjectName}</strong>:</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">${title}</h3>
            <p style="color: #4b5563; margin: 10px 0;">${description || 'No description provided'}</p>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #d1d5db;">
              <p style="color: #6b7280; margin: 5px 0;"><strong>Due Date:</strong> ${new Date(dueDate).toLocaleString()}</p>
            </div>
          </div>
          
          <p style="font-size: 14px; color: #666;">Please log in to UniManage to view the assignment details and submit your work.</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="http://localhost:5173/assignments" style="background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">View Assignment</a>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Assignment notification sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`Error sending assignment notification to ${email}:`, error);
    return false;
  }
};

const sendPasswordResetEmail = async (email, resetLink) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request - UniManage',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #4f46e5; text-align: center;">Password Reset Request</h2>
          <p style="font-size: 16px; color: #333;">Hello,</p>
          <p style="font-size: 16px; color: #333;">You requested a password reset for your UniManage account. Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="font-size: 14px; color: #666;">This link will expire in 1 hour.</p>
          <p style="font-size: 14px; color: #666;">If you didn't request this, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
};

module.exports = { sendOTP, sendAssignmentNotification, sendPasswordResetEmail };
