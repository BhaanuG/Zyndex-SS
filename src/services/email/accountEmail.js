import emailjs from '@emailjs/browser';

const ACCOUNT_EMAILJS_PUBLIC_KEY = '-bJnFETgW2sXJu8nq';
const ACCOUNT_EMAILJS_SERVICE_ID = 'service_e7mwsk9';
const ACCOUNT_EMAILJS_TEMPLATE_ID = 'template_q7v3j7b';

export async function sendAccountCreatedEmail({ name, email, role = 'user', createdByAdmin = false }) {
  const safeName = (name || 'Learner').trim() || 'Learner';
  const safeEmail = (email || '').trim();
  const roleLabel = role === 'admin' ? 'Admin' : 'User';
  const creationSource = createdByAdmin ? 'Admin Panel' : 'Self Registration';

  if (!safeEmail) {
    throw new Error('Recipient email is required.');
  }

  return emailjs.send(
    ACCOUNT_EMAILJS_SERVICE_ID,
    ACCOUNT_EMAILJS_TEMPLATE_ID,
    {
      to_email: safeEmail,
      toEmail: safeEmail,
      to: safeEmail,
      recipient_email: safeEmail,
      recipientEmail: safeEmail,
      recipient_mail: safeEmail,
      user_mail: safeEmail,
      mail_to: safeEmail,
      reply_to: safeEmail,
      to_name: safeName,
      recipient_name: safeName,
      recipientName: safeName,
      user_name: safeName,
      user_email: safeEmail,
      email: safeEmail,
      login_email: safeEmail,
      account_role: roleLabel,
      account_type: roleLabel,
      created_by: creationSource,
      subject: 'Welcome to Zyndex',
      message: `Hello ${safeName}, your Zyndex ${roleLabel.toLowerCase()} account has been created successfully. You can now sign in using ${safeEmail}.`,
    },
    ACCOUNT_EMAILJS_PUBLIC_KEY
  );
}
