const express = require('express');
const mongoose = require('mongoose')
const Admin = require('../models/Admin');
const sendVerificationEmail = require('../utils/sendVerificationEmail');
const sendPasswordResetEmail = require('../utils/sendPasswordResetEmail');
const adminAuthenticate = require('../middleware/adminAuthenticate');

const router = express.Router();

// const sendPasswordResetEmail = require('../utils/sendVerificationEmail');


// 📧 Request password reset
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    console.log("Password reset request for:", email);

    try {
        const admin = await Admin.findOne({ email });

        if (!admin) {
            // Don't reveal if email exists or not for security
            return res.status(200).json({
                message: 'If that email exists, a password reset link has been sent.'
            });
        }

        // Check if admin is verified
        if (!admin.isVerified) {
            return res.status(403).json({
                message: 'Please verify your email first.'
            });
        }

        // Generate reset token
        const resetToken = admin.generatePasswordResetToken();
        await admin.save();

        // Send reset email
        await sendPasswordResetEmail(email, resetToken);

        res.status(200).json({
            message: 'Password reset link sent to your email.'
        });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

// 🔑 Reset password with token
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    console.log("Password reset attempt with token");

    try {
        // Validate password
        if (!password || password.length < 6) {
            return res.status(400).json({
                message: 'Password must be at least 6 characters long.'
            });
        }

        // Find admin with valid reset token
        const admin = await Admin.findOne({
            resetPasswordToken: token,
            resetPasswordExpiry: { $gt: Date.now() },
        });

        if (!admin) {
            return res.status(400).json({
                message: 'Invalid or expired reset token.'
            });
        }

        // Update password
        admin.password = password; // Will be hashed by pre-save hook
        admin.resetPasswordToken = undefined;
        admin.resetPasswordExpiry = undefined;
        await admin.save();

        console.log("Password reset successful for:", admin.email);
        res.status(200).json({
            message: 'Password reset successful. You can now login with your new password.'
        });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

// 🔐 Change password (for logged-in admin)
router.put('/change-password', adminAuthenticate, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        // Validate new password
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                message: 'New password must be at least 6 characters long.'
            });
        }

        const admin = await Admin.findById(req.adminId);

        // Verify current password
        const isMatch = await admin.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect.' });
        }

        // Update password
        admin.password = newPassword;
        await admin.save();

        res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

router.post('/auth', async (req, res) => {
    const { email, password } = req.body;
    console.log(req.body)
    const allowedEmails = process.env.ALLOWED_ADMIN_EMAILS.split(',');

    if (!allowedEmails.includes(email)) {
        return res.status(403).json({ message: 'Access denied.' });
    }

    let admin = await Admin.findOne({ email });

    // 🔁 Login flow
    if (admin) {
        const isMatch = await admin.comparePassword(password);
        if (!isMatch) return res.status(400).json({ message: 'Wrong password.' });

        if (!admin.isVerified)
            return res.status(401).json({ message: 'Email not verified.' });

        const token = admin.generateJWT();
        return res.status(200).json({
            message: 'Login successful',
            token,
            admin: { email: admin.email, role: admin.role },
        });
    }

    // 🆕 Register flow
    admin = new Admin({ email, password });
    const verifyToken = admin.generateEmailToken();
    await admin.save();

    await sendVerificationEmail(email, verifyToken);
    res.status(201).json({
        message: 'Registered. Check your email to verify your account.',
        redirectUrl: `${process.env.FRONTEND_URL}api/admin/verify-email/${verifyToken}`
    });
});


// routes/admin.js - Update the verification endpoint
// router.get('/verify-email/:token', async (req, res) => {
//     const { token } = req.params;
//     console.log("Verification token received:", token);

//     try {
//         const admin = await Admin.findOne({
//             verifyToken: token,
//             tokenExpiry: { $gt: Date.now() }, // token still valid
//         });

//         if (!admin) {
//             console.log("Invalid token or token expired");
//             return res.status(400).send('Invalid or expired token');
//         }

//         // Update admin to verified status
//         admin.isVerified = true;
//         admin.verifyToken = undefined;
//         admin.tokenExpiry = undefined;
//         await admin.save();

//         console.log("Email verified successfully for:", admin.email);
//         return res.status(200).send('Email verified successfully! You can now login.');
//     } catch (error) {
//         console.error("Verification error:", error);
//         return res.status(500).send('Server error during verification');
//     }
// });

// REPLACE THE ENTIRE /verify-email/:token ROUTE WITH:
router.get('/verify-email/:token', async (req, res) => {
    const { token } = req.params;
    console.log("Verification token received:", token);

    try {
        const admin = await Admin.findOne({
            verifyToken: token,
            tokenExpiry: { $gt: Date.now() },
        });

        if (!admin) {
            console.log("Invalid token or token expired");
            // Return JSON instead of HTML
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        admin.isVerified = true;
        admin.verifyToken = undefined;
        admin.tokenExpiry = undefined;
        await admin.save();

        console.log("Email verified successfully for:", admin.email);

        // Return JSON response
        return res.status(200).json({
            success: true,
            message: 'Email verified successfully! You can now login.'
        });
    } catch (error) {
        console.error("Verification error:", error);
        return res.status(500).json({
            success: false,
            message: 'Server error during verification'
        });
    }
});


module.exports = router;
