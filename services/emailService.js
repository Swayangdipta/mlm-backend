const nodemailer = require("nodemailer");
const { registrationTemplate, forgotPasswordTemplate } = require("./emailTemplate");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for port 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

exports.sendEmail = async (options) => {    
    const type = options.type || 'registration'
    const template = type === "registration" ?  await registrationTemplate(options) : await forgotPasswordTemplate(options)


    let subject = 'Registration Successful!'
    if (type === 'forgot') {
        subject = 'Password Reset Request'
    } else if (type === 'verification') {
        subject = 'Email Verification'
    } else if (type === 'welcome') {
        subject = 'Welcome to Our Platform!'
    } else if (type === 'transaction') {
        subject = 'Transaction Alert'
    } else if (type === 'withdrawal') {
        subject = 'Withdrawal Request'
    } else if (type === 'deposit') {
        subject = 'Deposit Confirmation'
    }
    
    try {
        const info = await transporter.sendMail({
            from: '"AI Digital Asset Management" <aidigitalassetmanagement@gmail.com>', // sender address
            to: options.receiver,
            subject: subject,
            html: template,
          });
        
          console.log("Message sent: %s", info.messageId);
          return true
    } catch (error) {
        console.error(error);
        return false
    }
}