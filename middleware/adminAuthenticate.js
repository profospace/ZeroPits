// // middleware/adminAuth.js
// const jwt = require('jsonwebtoken');
// const Admin = require('../models/Admin');

// /**
//  * Middleware to verify if the request is from an authenticated admin
//  * @param {Object} req - Express request object
//  * @param {Object} res - Express response object
//  * @param {Function} next - Express next middleware function
//  */
// const adminAuthenticate = async (req, res, next) => {
//     try {
//         // Get token from header
//         const authHeader = req.headers.authorization;

//         // Check if token exists and has correct format
//         if (!authHeader || !authHeader.startsWith('Bearer ')) {
//             return res.status(401).json({ message: 'Access denied. No token provided or invalid format.' });
//         }

//         // Extract the token
//         const token = authHeader.split(' ')[1];

//         if (!token) {
//             return res.status(401).json({ message: 'Access denied. No token provided.' });
//         }

//         try {
//             // Verify token
//             const decoded = jwt.verify(token, process.env.JWT_SECRET);
//             // console.log("Au", decoded)

//             // Find admin by id and ensure they exist
//             const admin = await Admin.findById(decoded.id).select('-password');

//             if (!admin) {
//                 return res.status(404).json({ message: 'Admin not found.' });
//             }

//             // Verify that the admin account is verified
//             if (!admin.isVerified) {
//                 return res.status(403).json({ message: 'Email not verified. Please verify your email first.' });
//             }

//             // Check if admin role is present
//             if (decoded.role !== 'admin') {
//                 return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
//             }

//             // Set admin in req object for use in route handlers
//             // console.log("admin", admin)
//             req.admin = admin;
//             req.adminId = decoded.id;

//             // Proceed to next middleware or route handler
//             next();
//         } catch (error) {
//             if (error.name === 'TokenExpiredError') {
//                 return res.status(401).json({ message: 'Token expired. Please login again.' });
//             }

//             return res.status(401).json({ message: 'Invalid token.' });
//         }
//     } catch (error) {
//         console.error('Admin auth middleware error:', error);
//         return res.status(500).json({ message: 'Server error during authentication.' });
//     }
// };

// module.exports = adminAuthenticate;

// 🆕 ADD THIS NEW MIDDLEWARE FILE OR UPDATE EXISTING ONE

const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Existing authentication
const adminAuthenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findById(decoded.id);

        if (!admin || !admin.isActive) {
            return res.status(401).json({ message: 'Invalid or inactive admin' });
        }

        req.adminId = admin._id;
        req.adminRole = admin.role;
        req.adminPermissions = admin.permissions;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// 🆕 ADD THIS - Check if super admin
const requireSuperAdmin = (req, res, next) => {
    if (req.adminRole !== 'super-admin') {
        return res.status(403).json({
            message: 'Access denied. Super admin only.'
        });
    }
    next();
};

// 🆕 ADD THIS - Check specific permission
// const requirePermission = (permission) => {
//     console.log("permission", permission)
//     return (req, res, next) => {
//         if (req.adminRole === 'super-admin') {
//             return next(); // Super admin has all permissions
//         }

//         if (!req.adminPermissions.includes(permission)) {
//             return res.status(403).json({
//                 message: `Access denied. Missing '${permission}' permission.`
//             });
//         }
//         next();
//     };
// };

const requirePermission = (permission) => {
    return (req, res, next) => {
        console.log("permission", permission)
        // Super admin always allowed
        if (req.adminRole == 'super-admin') {
            return next();
        }

        console.log(" req.adminPermissions", req.adminPermissions)
        // FIX 🔥 → Ensure permissions always exists
        const permissions = req.adminPermissions || [];

        if (!permissions.includes(permission)) {
            return res.status(403).json({
                message: `Access denied. Missing '${permission}' permission.`
            });
        }

        next();
    };
};


module.exports = {
    adminAuthenticate,
    requireSuperAdmin,
    requirePermission
};