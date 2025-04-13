const nodemailer = require("nodemailer");
const { registrationTemplate } = require("./emailTemplate");

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
    const template = await registrationTemplate(options)
    
    try {
        const info = await transporter.sendMail({
            from: '"Principal Grow" <swayangdiptacc@gmail.com>', // sender address
            to: options.receiver,
            subject: "Registration Successful!",
            html: template,
          });
        
          console.log("Message sent: %s", info.messageId);
          return true
    } catch (error) {
        console.error(error);
        return false
    }
}