const express = require('express');
const Admin = require('../models/Admin');
const { adminAuthenticate, requireSuperAdmin } = require('../middleware/adminAuthenticate');
const crypto = require('crypto');

const router = express.Router();

// All routes require super-admin access
router.use(adminAuthenticate, requireSuperAdmin);

// 📋 GET: List all sub-admins
router.get('/', async (req, res) => {
    try {
        const subAdmins = await Admin.find({
            role: 'sub-admin'
        }).select('-password -verifyToken -resetPasswordToken')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: subAdmins.length,
            data: subAdmins
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ➕ POST: Create new sub-admin
router.post('/', async (req, res) => {
    try {
        const { email, permissions } = req.body;

        // Validate email
        if (!email || !email.includes('@')) {
            return res.status(400).json({
                success: false,
                message: 'Valid email is required'
            });
        }

        // Check if email already exists
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Generate random password
        const generatedPassword = crypto.randomBytes(8).toString('hex');

        // Create sub-admin
        const subAdmin = new Admin({
            email,
            password: generatedPassword,
            role: 'sub-admin',
            permissions: permissions || ['read'],
            createdBy: req.adminId,
            isVerified: true // Auto-verify sub-admins
        });

        await subAdmin.save();

        // Return credentials (only time password is visible)
        res.status(201).json({
            success: true,
            message: 'Sub-admin created successfully',
            data: {
                id: subAdmin._id,
                email: subAdmin.email,
                password: generatedPassword, // 🔑 Share password once
                permissions: subAdmin.permissions,
                createdAt: subAdmin.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 🔄 PUT: Update sub-admin permissions
router.put('/:id', async (req, res) => {
    try {
        const { permissions, isActive } = req.body;

        const subAdmin = await Admin.findOne({
            _id: req.params.id,
            role: 'sub-admin'
        });

        if (!subAdmin) {
            return res.status(404).json({
                success: false,
                message: 'Sub-admin not found'
            });
        }

        // Update fields
        if (permissions) subAdmin.permissions = permissions;
        if (typeof isActive === 'boolean') subAdmin.isActive = isActive;

        await subAdmin.save();

        res.json({
            success: true,
            message: 'Sub-admin updated successfully',
            data: {
                id: subAdmin._id,
                email: subAdmin.email,
                permissions: subAdmin.permissions,
                isActive: subAdmin.isActive
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// 🔑 POST: Reset sub-admin password
router.post('/:id/reset-password', async (req, res) => {
    try {
        const subAdmin = await Admin.findOne({
            _id: req.params.id,
            role: 'sub-admin'
        });

        if (!subAdmin) {
            return res.status(404).json({
                success: false,
                message: 'Sub-admin not found'
            });
        }

        // Generate new password
        const newPassword = crypto.randomBytes(8).toString('hex');
        subAdmin.password = newPassword;
        await subAdmin.save();

        res.json({
            success: true,
            message: 'Password reset successfully',
            data: {
                email: subAdmin.email,
                newPassword: newPassword // 🔑 Share new password
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ❌ DELETE: Remove sub-admin
router.delete('/:id', async (req, res) => {
    try {
        const subAdmin = await Admin.findOneAndDelete({
            _id: req.params.id,
            role: 'sub-admin'
        });

        if (!subAdmin) {
            return res.status(404).json({
                success: false,
                message: 'Sub-admin not found'
            });
        }

        res.json({
            success: true,
            message: 'Sub-admin deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;