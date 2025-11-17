const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// const adminSchema = new mongoose.Schema({
//     email: { type: String, required: true, unique: true },
//     password: { type: String, required: true },
//     isVerified: { type: Boolean, default: false },
//     verifyToken: String,
//     tokenExpiry: Date,

//     resetPasswordToken: String,
//     resetPasswordExpiry: Date,

//     role: { type: String, default: 'admin' },
// });

const adminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verifyToken: String,
    tokenExpiry: Date,

    resetPasswordToken: String,
    resetPasswordExpiry: Date,

    // 🆕 ADD THESE FIELDS
    role: {
        type: String,
        enum: ['super-admin', 'sub-admin'],
        default: 'super-admin'
    },
    permissions: {
        type: [String],
        enum: ['create', 'read', 'update', 'delete'],
        default: ['read'] // Sub-admins get read by default
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null // null for super-admins
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true }); // 🆕 Add timestamps


// 🔒 Hash password before save
adminSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// 🔑 Compare password
adminSchema.methods.comparePassword = async function (plainPassword) {
    return await bcrypt.compare(plainPassword, this.password);
};

// 🔐 Generate email verification token
adminSchema.methods.generateEmailToken = function () {
    const token = crypto.randomBytes(32).toString('hex');
    this.verifyToken = token;
    this.tokenExpiry = Date.now() + 3600000; // 1 hour
    return token;
};

// 🔐 Generate password reset token
adminSchema.methods.generatePasswordResetToken = function () {
    const token = crypto.randomBytes(32).toString('hex');
    this.resetPasswordToken = token;
    this.resetPasswordExpiry = Date.now() + 3600000; // 1 hour
    return token;
};

// 🔏 Generate JWT token
adminSchema.methods.generateJWT = function () {
    return jwt.sign(
        { id: this._id, email: this.email, role: this.role },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );
};

module.exports = mongoose.model('Admin', adminSchema);
