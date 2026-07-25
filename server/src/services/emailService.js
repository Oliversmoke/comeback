import nodemailer from 'nodemailer';

let transporter = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT || '587') === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    const { createTestAccount, createTransport, getTestMessageUrl } = await import('nodemailer');
    const testAccount = await createTestAccount();
    transporter = createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('Email: using Ethereal test account —', testAccount.user);
    console.log('Email: preview URL at', getTestMessageUrl);
  }

  return transporter;
};

const getOwner = () => process.env.OWNER_EMAIL || 'admin@localhost';

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const t = await getTransporter();
    const info = await t.sendMail({
      from: `"comeback.AI Backup" <${process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@comeback.ai'}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${subject}`);
    if (info.messageId) {
      const { getTestMessageUrl } = await import('nodemailer');
      if (getTestMessageUrl(info)) {
        console.log('Preview URL:', getTestMessageUrl(info));
      }
    }
    return true;
  } catch (error) {
    console.error('Email send failed:', error.message);
    return false;
  }
};

export const notifyOwner = async (subject, html) => {
  return sendEmail({ to: getOwner(), subject, html });
};

export const notifyNewRegistration = async (user) => {
  const html = `
    <h2>New User Registration</h2>
    <table style="border-collapse:collapse;width:100%;max-width:600px;">
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Email</td><td style="padding:8px;border:1px solid #ddd;">${user.email}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;">Username</td><td style="padding:8px;border:1px solid #ddd;">${user.username}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;">Display Name</td><td style="padding:8px;border:1px solid #ddd;">${user.displayName || user.username}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;">Provider</td><td style="padding:8px;border:1px solid #ddd;">${user.provider || 'local'}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;">Date</td><td style="padding:8px;border:1px solid #ddd;">${new Date().toLocaleString()}</td></tr>
    </table>
  `;
  return notifyOwner(`New User: ${user.email}`, html);
};

export const sendBackupReport = async (data) => {
  const date = new Date().toLocaleDateString();
  const html = `
    <h2>comeback.AI Backup Report — ${date}</h2>
    <pre style="background:#f5f5f5;padding:16px;border-radius:8px;font-size:13px;overflow-x:auto;">${JSON.stringify(data, null, 2)}</pre>
    <p style="color:#666;font-size:12px;">Generated automatically by comeback.AI backup system.</p>
  `;
  return notifyOwner(`Backup Report — ${date}`, html);
};

export const sendLogDump = async (logs) => {
  const date = new Date().toLocaleDateString();
  const logText = logs.map((l) => `[${l.timestamp || new Date().toISOString()}] ${l.level || 'INFO'}: ${l.message}`).join('\n');
  const html = `
    <h2>comeback.AI Activity Logs — ${date}</h2>
    <pre style="background:#1e1e1e;color:#d4d4d4;padding:16px;border-radius:8px;font-size:12px;overflow-x:auto;max-height:600px;">${logText}</pre>
  `;
  return notifyOwner(`Activity Logs — ${date}`, html);
};

export const sendPasswordReset = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
  const html = `
    <h2>Password Reset Request</h2>
    <p>Hello ${user.username},</p>
    <p>Click the link below to reset your password. This link expires in 1 hour.</p>
    <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;margin:16px 0;">Reset Password</a>
    <p style="color:#666;font-size:12px;">If you didn't request this, you can ignore this email.</p>
  `;
  return sendEmail({ to: user.email, subject: 'Password Reset — comeback.AI', html });
};
