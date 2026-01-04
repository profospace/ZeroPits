const express = require('express');
const mongoose = require('mongoose')
const Admin = require('../models/Admin');
const sendVerificationEmail = require('../utils/sendVerificationEmail');
const sendPasswordResetEmail = require('../utils/sendPasswordResetEmail');
const adminAuthenticate = require('../middleware/adminAuthenticate');

const router = express.Router();

const PERMISSIONS = [
    'create',
    'read',
    'update',
    'delete',
    'manage-admins',
    'manage-sub-admins'
];
router.post('/create-super-admin', async (req, res) => {
    try {
        const { secret, email, password, phone } = req.body;

        // 🔐 Environment-level protection
        if (secret !== process.env.SUPER_ADMIN_SECRET) {
            return res.status(403).json({
                success: false,
                message: 'Invalid secret'
            });
        }

        const existing = await Admin.findOne({ role: 'super-admin' });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Super Admin already exists'
            });
        }

        const superAdmin = new Admin({
            email,
            password,
            phone,
            role: 'super-admin',
            permissions: {
                type: [String],
                permissions: PERMISSIONS, // ✅ array of strings

                default: ['read']
            }
        });

//         console.log('permissions payload:', permissions);
// console.log('permissions[0] type:', typeof permissions[0]);

        await superAdmin.save();

        res.status(201).json({
            success: true,
            message: '✅ Super Admin created successfully'
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});




// 📧 Request password reset
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    console.log("[🔐 FORGOT-PASS] Request received for:", email);

    try {
        const admin = await Admin.findOne({ email });
        console.log("[🔍 DB SEARCH] Admin found?", !!admin);

        if (!admin) {
            console.log("[⚠️ NO USER] Not revealing existence.");
            return res.status(200).json({
                message: 'If that email exists, a password reset link has been sent.'
            });
        }

        if (!admin.isVerified) {
            console.log("[⛔ NOT VERIFIED] Email must be verified.");
            return res.status(403).json({
                message: 'Please verify your email first.'
            });
        }

        console.log("[🔑 GENERATING TOKEN]");
        const resetToken = admin.generatePasswordResetToken();
        await admin.save();
        console.log("[📨 EMAIL] Sending password reset email...");

        await sendPasswordResetEmail(email, resetToken);

        console.log("[✔️ SUCCESS] Password reset email sent.");
        res.status(200).json({
            message: 'Password reset link sent to your email.'
        });
    } catch (error) {
        console.error("[💥 ERROR - FORGOT PASSWORD]", error);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});


// 🔑 Reset password with token
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    console.log("[🔑 RESET-PASS] Token received:", token);

    try {
        if (!password || password.length < 6) {
            console.log("[❌ INVALID PASSWORD]");
            return res.status(400).json({
                message: 'Password must be at least 6 characters long.'
            });
        }

        console.log("[🔍 DB SEARCH] Checking reset token validity...");
        const admin = await Admin.findOne({
            resetPasswordToken: token,
            resetPasswordExpiry: { $gt: Date.now() },
        });

        console.log("[TOKEN VALID?]", !!admin);

        if (!admin) {
            return res.status(400).json({
                message: 'Invalid or expired reset token.'
            });
        }

        console.log("[🔒 UPDATING PASSWORD]");
        admin.password = password;
        admin.resetPasswordToken = undefined;
        admin.resetPasswordExpiry = undefined;
        await admin.save();

        console.log("[✔️ SUCCESS] Password updated for:", admin.email);
        res.status(200).json({
            message: 'Password reset successful. You can now login with your new password.'
        });
    } catch (error) {
        console.error("[💥 ERROR - RESET PASSWORD]", error);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});


// 🔄 LOGIN + AUTO ADMIN REGISTRATION
router.post('/auth', async (req, res) => {
    const { email, password } = req.body;
    console.log("[🆔 AUTH REQUEST]", req.body);

    let admin = await Admin.findOne({ email });
    console.log("[🔍 DB SEARCH] Admin exists?", !!admin);

    // Login flow
    if (admin) {
        console.log("[LOGIN FLOW] Existing admin:", admin.role);

        if (admin.role === 'sub-admin' && !admin.isActive) {
            console.log("[⛔ BLOCKED] Sub-admin inactive");
            return res.status(403).json({
                message: 'Your account has been deactivated. Contact super admin.'
            });
        }

        console.log("[🧪 PASSWORD CHECK]");
        const isMatch = await admin.comparePassword(password);
        console.log("[MATCH?]", isMatch);

        if (!isMatch) return res.status(400).json({ message: 'Wrong password.' });

        if (!admin.isVerified) {
            console.log("[⛔ EMAIL NOT VERIFIED]");
            return res.status(401).json({ message: 'Email not verified.' });
        }

        console.log("[🎫 GENERATING JWT]");
        const token = admin.generateJWT();
        console.log("[✔️ LOGIN SUCCESS] User:", admin.email);

        return res.status(200).json({
            message: 'Login successful',
            token,
            admin: {
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions || []
            }
        });
    }


    // SUPER-ADMIN AUTO REGISTRATION
    const allowedEmails = process.env.ALLOWED_ADMIN_EMAILS.split(',');
    console.log("[🔐 ALLOWED EMAILS]", allowedEmails);

    if (allowedEmails.includes(email)) {
        console.log("[🆕 AUTO SUPER ADMIN REGISTRATION]");

        admin = new Admin({
            email,
            password,
            role: 'super-admin',
            permissions: ['create', 'read', 'update', 'delete'],
            createdBy: null
        });

        const verifyToken = admin.generateEmailToken();
        await admin.save();
        console.log("[📨 EMAIL] Verification email sent");

        await sendVerificationEmail(email, verifyToken);

        return res.status(201).json({
            message: 'Super Admin registered. Check your email to verify your account.',
            redirectUrl: `${process.env.FRONTEND_URL}api/admin/verify-email/${verifyToken}`
        });
    }

    console.log("[⛔ REGISTRATION DENIED] Not in allowed email list");
    return res.status(403).json({
        message: 'Registration denied. Only allowed super admin emails can register.'
    });
});


// 📩 EMAIL VERIFICATION
router.get('/verify-email/:token', async (req, res) => {
    const { token } = req.params;
    console.log("[📧 VERIFY EMAIL] Token:", token);

    try {
        const admin = await Admin.findOne({
            verifyToken: token,
            tokenExpiry: { $gt: Date.now() },
        });

        console.log("[TOKEN VALID?]", !!admin);

        if (!admin) {
            console.log("[❌ INVALID/EXPIRED TOKEN]");
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        admin.isVerified = true;
        admin.verifyToken = undefined;
        admin.tokenExpiry = undefined;
        await admin.save();

        console.log("[✔️ EMAIL VERIFIED] User:", admin.email);

        return res.status(200).json({
            success: true,
            message: 'Email verified successfully! You can now login.'
        });
    } catch (error) {
        console.error("[💥 ERROR - VERIFY EMAIL]", error);
        return res.status(500).json({
            success: false,
            message: 'Server error during verification'
        });
    }
});

module.exports = router;
