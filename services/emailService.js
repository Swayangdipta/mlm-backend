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
      // send mail with defined transport object

    const template = registrationTemplate(options)

    try {
        const info = await transporter.sendMail({
            from: '"Principal Grow" <maddison53@ethereal.email>', // sender address
            to: options.receiver, // list of receivers
            subject: "Registration Successful!", // Subject line
            html: template, // html body
          });
        
          console.log("Message sent: %s", info.messageId);
          return true
    } catch (error) {
        console.error(error);
        return false
    }

}