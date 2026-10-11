import nodemailer from 'nodemailer';
import Mailgen from 'mailgen';

const sendEmail = async (options) => {
  // Create the mail generator
  const mailGenerator = new Mailgen({
    theme: 'default',
    product: {
      name: 'Task Manager',
      link: 'https://taskmanager.com',
    },
  });

  // Get text and HTML content
  const emailTextual = mailGenerator.generatePlaintext(options.mailGenContent);
  const emailHTML = mailGenerator.generate(options.mailGenContent);

  // Prepare transporter with where to send mail
  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_EMAIL_HOST,
    port: process.env.MAILTRAP_EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.MAILTRAP_EMAIL_USER,
      pass: process.env.MAILTRAP_EMAIL_PASS,
    },
  });

  // Set up the mail body
  const mail = {
    from: 'abhinitnobido10@gmail.com',
    to: options.email,
    subject: options.subject,
    text: emailTextual,
    html: emailHTML,
  };

  // send mail using transprter object
  try {
    await transporter.sendMail(mail);
  } catch (error) {
    console.error(
      `Email service failed. Make sure the provided MAILTRAP credentials are correct`
    );
    console.error(`${error}`);
  }
};

// Verification mail structure
const emailVerificationContent = (username, verificationURL) => {
  return {
    body: {
      name: username,
      intro: 'Welcome to the folkss, let us work on some cool shit!',
      action: {
        instructions: 'To verify you email please click the button bellow',
        button: {
          color: '#22BC66',
          text: 'Verify your email',
          link: verificationURL,
        },
      },

      outro: 'Need help? Just reply to this email!',
    },
  };
};

// Reset password structure
const resetPasswordContent = (username, passwordResetURL) => {
  return {
    body: {
      name: username,
      intro:
        'We heard that you forgot your password. Worry not for you have been granted another chance!',
      action: {
        instructions: 'To reset your password please click the button bellow',
        button: {
          color: '#22BC66',
          text: 'Reset Password',
          link: passwordResetURL,
        },
      },

      outro: 'Need help? Just reply to this email!',
    },
  };
};

export { emailVerificationContent, resetPasswordContent, sendEmail };
