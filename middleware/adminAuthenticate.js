// middleware/adminAuth.js
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

/**
 * Middleware to verify if the request is from an authenticated admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const adminAuthenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        // Check if token exists and has correct format
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Access denied. No token provided or invalid format.' });
        }

        // Extract the token
        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // console.log("Au", decoded)

            // Find admin by id and ensure they exist
            const admin = await Admin.findById(decoded.id).select('-password');

            if (!admin) {
                return res.status(404).json({ message: 'Admin not found.' });
            }

            // Verify that the admin account is verified
            if (!admin.isVerified) {
                return res.status(403).json({ message: 'Email not verified. Please verify your email first.' });
            }

            // Check if admin role is present
            if (decoded.role !== 'admin') {
                return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
            }

            // Set admin in req object for use in route handlers
            // console.log("admin", admin)
            req.admin = admin;
            req.adminId = decoded.id;

            // Proceed to next middleware or route handler
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired. Please login again.' });
            }

            return res.status(401).json({ message: 'Invalid token.' });
        }
    } catch (error) {
        console.error('Admin auth middleware error:', error);
        return res.status(500).json({ message: 'Server error during authentication.' });
    }
};

module.exports = adminAuthenticate;