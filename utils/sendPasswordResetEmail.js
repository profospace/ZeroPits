// // utils/sendPasswordResetEmail.js
// const nodemailer = require('nodemailer');

// const sendPasswordResetEmail = async (email, resetToken) => {
//     // const transporter = nodemailer.createTransport({
//     //     service: 'gmail', // or your email service
//     //     auth: {
//     //         user: process.env.EMAIL_USER,
//     //         pass: process.env.EMAIL_PASSWORD,
//     //     },
//     // });

//     const transporter = nodemailer.createTransport({
//         host: process.env.EMAIL_HOST, // ✅ not Gmail
//         port: process.env.EMAIL_PORT,                  // ✅ or 587 for TLS
//         secure: process.env.EMAIL_SECURE,               // ✅ true for 465, false for 587
//         auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_PASSWORD,
//         },
//     });

//     const resetUrl = `${process.env.FRONTEND_URL}reset-password/${resetToken}`;

//     const mailOptions = {
//         from: process.env.EMAIL_USER,
//         to: email,
//         subject: 'Password Reset Request',
//         html: `
//             <h2>Password Reset Request</h2>
//             <p>You requested a password reset. Click the link below to reset your password:</p>
//             <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
//             <p>This link will expire in 1 hour.</p>
//             <p>If you didn't request this, please ignore this email.</p>
//         `,
//     };

//     await transporter.sendMail(mailOptions);
// };

// module.exports = sendPasswordResetEmail;

const nodemailer = require('nodemailer');

const sendPasswordResetEmail = async (email, token) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });

    const link = `${process.env.FRONTEND_URL}reset-password/${token}`;

    await transporter.sendMail({
        from: '"Admin Dashboard" <alerts@profospace.in>',
        to: email,
        subject: 'Reset Your Password',
        html: `
            <h2>Password Reset Request</h2>
            <p>Click the link below to reset your password:</p>
            <a href="${link}">${link}</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
        `,
    });
};

module.exports = sendPasswordResetEmail;
