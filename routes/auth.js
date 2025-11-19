// // backend/routes/auth.js
// const express = require('express');
// const router = express.Router();
// const User = require('../models/User');
// const crypto = require('crypto');
// const jwt = require('jsonwebtoken');
// const { sendSms } = require('../utils/fast2sms');

// const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
// const OTP_TTL_MIN = 5; // OTP validity in minutes

// // helper to generate 6-digit OTP
// function generateOtp() {
//     return Math.floor(100000 + Math.random() * 900000).toString();
// }

// // POST /api/auth/request-otp
// // body: { phone }
// router.post('/request-otp', async (req, res) => {
//     try {
//         const { phone, name , email } = req.body;
//         if (!phone) return res.status(400).json({ message: 'Phone required' });

//         let user = await User.findOne({ phone });
//         if (!user) {
//             user = new User({ phone, name });
//         } else if (name && !user.name) {
//             user.name = name;
//         }

//         // generate OTP and store with expiry
//         const code = generateOtp();
//         const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);
//         user.otp = { code, expiresAt };
//         await user.save();

//         // send OTP via Fast2SMS
//         const msg = `Your verification code is ${code}. It is valid for ${OTP_TTL_MIN} minutes.`;
//         try {
//             await sendSms(phone, msg);
//             // respond without sending the OTP code back (for security)
//             return res.json({ ok: true, message: 'OTP sent' });
//         } catch (smsErr) {
//             // If SMS fails, still respond with error
//             console.error('SMS send failed', smsErr?.message || smsErr);
//             return res.status(500).json({ ok: false, message: 'Failed to send OTP' });
//         }
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// // POST /api/auth/verify-otp
// // body: { phone, code }
// router.post('/verify-otp', async (req, res) => {
//     try {
//         const { phone, code } = req.body;
//         if (!phone || !code) return res.status(400).json({ message: 'Phone and code required' });

//         const user = await User.findOne({ phone });
//         if (!user || !user.otp || !user.otp.code) {
//             return res.status(400).json({ message: 'OTP not requested' });
//         }

//         if (new Date() > new Date(user.otp.expiresAt)) {
//             return res.status(400).json({ message: 'OTP expired' });
//         }

//         if (code !== user.otp.code) {
//             return res.status(400).json({ message: 'Invalid OTP' });
//         }

//         // OTP valid -> clear otp and issue JWT
//         user.otp = undefined;
//         await user.save();

//         const payload = { id: user._id, phone: user.phone };
//         const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });

//         res.json({ ok: true, token, user: { id: user._id, phone: user.phone, name: user.name } });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Server error' });
//     }
// });

// module.exports = router;


// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendSms } = require('../utils/fast2sms');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const OTP_TTL_MIN = 5; // OTP validity in minutes

// ===========================================
// HELPER FUNCTIONS
// ===========================================

// Generate 6-digit OTP
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate phone format (basic validation)
function isValidPhone(phone) {
    // Basic validation - adjust according to your needs
    const phoneRegex = /^[0-9]{10,15}$/;
    return phoneRegex.test(phone);
}

// ===========================================
// AUTHENTICATION MIDDLEWARE
// ===========================================

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        req.userPhone = decoded.phone;
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

// ===========================================
// ROUTES
// ===========================================

/**
 * POST /api/auth/request-otp
 * Request OTP for login/signup
 * Body: { phone: string, name?: string, email?: string }
 */
router.post('/request-otp', async (req, res) => {
    try {
        const { phone, name, email } = req.body;

        // Validate phone
        if (!phone) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        if (!isValidPhone(phone)) {
            return res.status(400).json({ message: 'Invalid phone number format' });
        }

        // Validate email if provided
        if (email && !isValidEmail(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        // Find or create user
        let user = await User.findOne({ phone });
        let isNewUser = false;

        if (!user) {
            // New user - create with provided details
            user = new User({ phone });
            isNewUser = true;

            if (name && name.trim()) {
                user.name = name.trim();
            }
            if (email && email.trim()) {
                user.email = email.trim().toLowerCase();
            }
        } else {
            // Existing user - update only if fields are empty and provided
            if (name && name.trim() && !user.name) {
                user.name = name.trim();
            }
            if (email && email.trim() && !user.email) {
                user.email = email.trim().toLowerCase();
            }
        }

        // Generate OTP
        const code = generateOtp();
        const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);

        user.otp = { code, expiresAt };
        await user.save();

        console.log("code", code)
        // Send OTP via SMS
        const message = `Your verification code is ${code}. Valid for ${OTP_TTL_MIN} minutes. Do not share this code.`;

        try {
            await sendSms(phone, message);

            return res.json({
                ok: true,
                message: 'OTP sent successfully',
                isNewUser,
                expiresIn: OTP_TTL_MIN * 60 // in seconds
            });
        } catch (smsErr) {
            console.error('SMS sending failed:', smsErr?.message || smsErr);

            // Delete the user if this was a new signup and SMS failed
            if (isNewUser) {
                await User.deleteOne({ _id: user._id });
            }

            return res.status(500).json({
                ok: false,
                message: 'Failed to send OTP. Please try again.'
            });
        }
    } catch (err) {
        console.error('Request OTP error:', err);

        // Handle duplicate email error
        if (err.code === 11000 && err.keyPattern?.email) {
            return res.status(400).json({
                message: 'Email already registered with another account'
            });
        }

        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP and login user
 * Body: { phone: string, code: string }
 */
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, code } = req.body;

        // Validate input
        if (!phone || !code) {
            return res.status(400).json({
                message: 'Phone number and OTP code are required'
            });
        }

        if (!isValidPhone(phone)) {
            return res.status(400).json({ message: 'Invalid phone number format' });
        }

        // Find user
        const user = await User.findOne({ phone });

        if (!user) {
            return res.status(404).json({
                message: 'User not found. Please request OTP first.'
            });
        }

        // Check if OTP exists
        if (!user.otp || !user.otp.code) {
            return res.status(400).json({
                message: 'No OTP found. Please request a new one.'
            });
        }

        // Check if OTP is expired
        if (new Date() > new Date(user.otp.expiresAt)) {
            user.otp = undefined;
            await user.save();
            return res.status(400).json({
                message: 'OTP has expired. Please request a new one.'
            });
        }

        // Verify OTP code
        if (code !== user.otp.code) {
            return res.status(400).json({
                message: 'Invalid OTP code. Please try again.'
            });
        }

        // OTP is valid - clear it and update last login
        user.otp = undefined;
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token
        const payload = {
            id: user._id,
            phone: user.phone
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });

        // Prepare user data response
        const userData = user.toProfileJSON();

        return res.json({
            ok: true,
            message: 'Login successful',
            token,
            user: userData
        });
    } catch (err) {
        console.error('Verify OTP error:', err);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});

/**
 * GET /api/auth/me
 * Get current user profile
 * Headers: Authorization: Bearer {token}
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-otp');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const userData = user.toProfileJSON();

        return res.json({
            ok: true,
            user: userData
        });
    } catch (err) {
        console.error('Get user profile error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * PUT /api/auth/update-profile
 * Update user profile (name, email)
 * Headers: Authorization: Bearer {token}
 * Body: { name?: string, email?: string }
 */
router.put('/update-profile', authenticateToken, async (req, res) => {
    try {
        const { name, email } = req.body;

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update fields if provided
        if (name !== undefined && name.trim()) {
            user.name = name.trim();
        }

        if (email !== undefined) {
            if (email.trim() === '') {
                user.email = undefined; // Remove email if empty string
            } else if (isValidEmail(email)) {
                user.email = email.trim().toLowerCase();
            } else {
                return res.status(400).json({ message: 'Invalid email format' });
            }
        }

        await user.save();

        const userData = user.toProfileJSON();

        return res.json({
            ok: true,
            message: 'Profile updated successfully',
            user: userData
        });
    } catch (err) {
        console.error('Update profile error:', err);

        // Handle duplicate email error
        if (err.code === 11000 && err.keyPattern?.email) {
            return res.status(400).json({
                message: 'Email already registered with another account'
            });
        }

        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token deletion mainly)
 * Headers: Authorization: Bearer {token}
 */
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // In a more complex system, you might want to blacklist tokens here
        // For now, just acknowledge the logout (token removal happens client-side)

        return res.json({
            ok: true,
            message: 'Logged out successfully'
        });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * DELETE /api/auth/delete-account
 * Delete user account permanently
 * Headers: Authorization: Bearer {token}
 */
router.delete('/delete-account', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await User.deleteOne({ _id: req.userId });

        return res.json({
            ok: true,
            message: 'Account deleted successfully'
        });
    } catch (err) {
        console.error('Delete account error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ===========================================
// EXPORT
// ===========================================

module.exports = router;