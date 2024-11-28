// https://www.npmjs.com/package/zeptomail

// For ES6
//@ts-ignore
//import { SendMailClient } from "zeptomail";

// For CommonJS
const { SendMailClient } = require("zeptomail");

const url = "api.zeptomail.in/";
const token = "Zoho-enczapikey PHtE6r1fQ73o2mIvpEUG5PO5EsH2YN99q79lLgMRuYZAXKMEFk0Dqt8tmzHhqx4rXPIREvWcyo1rs7+Y4OjWIGrkPGlEWmqyqK3sx/VYSPOZsbq6x00ftV0ZckHcU4Hsd9dp1yDQudaX";

// Initialize the SendMailClient
let client = new SendMailClient({ url, token });

// Define your email details
const emailDetails = {
  from: {
    address: '963gurudev@gmail.com', // Replace with a valid sender email address
    name: 'No Reply',
  },
  to: [
    {
      email_address: {
        address: 'satyam8381838689@gmail.com',
        name: 'Kk',
      },
    },
  ],
  subject: 'Test Email',
  htmlbody: '<div><b>Test email sent successfully.</b></div>',
};

// Send the email
client.sendMail(emailDetails)
  .then(response => {
    console.log('Email sent successfully:', response);
  })
  .catch(error => {
    console.error('Error sending email:', error);
  });