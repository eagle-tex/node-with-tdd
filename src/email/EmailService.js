const transporter = require('../config/emailTransporter');

const sendAccountActivation = async (email, token) => {
  // await is IMPORTANT on next line: it "forces" to wait for email to be sent
  await transporter.sendMail({
    from: 'My App <info@my-app.com>',
    to: email,
    subject: 'Account Activation',
    html: `Token is ${token}`
  });
};

module.exports = { sendAccountActivation };
