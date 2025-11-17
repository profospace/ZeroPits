// // utils/sendVerificationEmail.js
// const nodemailer = require('nodemailer');

// const sendVerificationEmail = async (email, token) => {
//     const transporter = nodemailer.createTransport({
//         service: 'Gmail',
//         auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_PASSWORD,
//         },
//     });

//     const link = `${process.env.FRONTEND_URL}api/admin/verify-email/${token}`;

//     await transporter.sendMail({
//         from: '"Admin Dashboard" <noreply@example.com>',
//         to: email,
//         subject: 'Verify your Admin Account',
//         html: `<p>Click to verify: <a href="${link}">${link}</a></p>`,
//     });
// };

// module.exports = sendVerificationEmail;

const nodemailer = require('nodemailer');

const sendVerificationEmail = async (email, token) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST, // ✅ not Gmail
        port: process.env.EMAIL_PORT,                  // ✅ or 587 for TLS
        secure: process.env.EMAIL_SECURE,               // ✅ true for 465, false for 587
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    const link = `${process.env.FRONTEND_URL}api/admin/verify-email/${token}`;

    // await transporter.sendMail({
    //     from: '"Admin Dashboard" <noreply@example.com>',
    //     to: email,
    //     subject: 'Verify your Admin Account',
    //     html: `<p>Click to verify: <a href="${link}">${link}</a></p>`,
    // });
    const check = await transporter.sendMail({
        from: '"Admin Dashboard" <alerts@profospace.in>', // ✅ Use a real, verified sender email
        to: email,
        subject: 'Verify your Admin Account',
        html: `<p>Click to verify: <a href="${link}">${link}</a></p>`,
    });

    console.log("check mail send" , check)
    
};

module.exports = sendVerificationEmail;



// const nodemailer = require('nodemailer');

// const sendVerificationEmail = async (email, token) => {
//     const transporter = nodemailer.createTransport({
//         host: process.env.EMAIL_HOST,
//         port: Number(process.env.EMAIL_PORT),
//         secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
//         auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_PASSWORD,
//         },
//     });

//     const link = `${process.env.FRONTEND_URL}api/admin/verify-email/${token}`;

//     await transporter.sendMail({
//         from: `"Admin Dashboard" <${process.env.EMAIL_USER}>`,
//         to: email,
//         subject: 'Verify your Admin Account',
//         html: `<p>Click to verify: <a href="${link}">${link}</a></p>`,
//     });
// };

// module.exports = sendVerificationEmail;
