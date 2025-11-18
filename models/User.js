// // backend/models/User.js
// const mongoose = require('mongoose');

// const UserSchema = new mongoose.Schema({
//     phone: {
//         type: String,
//         required: true,
//         unique: true,
//     },
//     // Optionally store name / metadata
//     name: { type: String },
//     email: { type: String },
//     // otp info (temporary)
//     otp: {
//         code: String,
//         expiresAt: Date,
//     },
//     createdAt: { type: Date, default: Date.now },
// });

// module.exports = mongoose.model('User', UserSchema);


// backend/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true, // Add index for faster queries
    },
    name: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        sparse: true, // Allows multiple null values but unique non-null values
        // Email validation regex
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
    },
    // OTP info (temporary storage)
    otp: {
        code: {
            type: String,
        },
        expiresAt: {
            type: Date,
        },
    },
    // Metadata
    isActive: {
        type: Boolean,
        default: true,
    },
    lastLogin: {
        type: Date,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true, // Prevent updates to createdAt
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true, // Automatically manage createdAt and updatedAt
});

// Update the updatedAt timestamp before saving
UserSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Update lastLogin when user successfully verifies OTP
UserSchema.methods.updateLastLogin = function () {
    this.lastLogin = new Date();
    return this.save();
};

// Method to check if OTP is valid
UserSchema.methods.isOtpValid = function (code) {
    if (!this.otp || !this.otp.code || !this.otp.expiresAt) {
        return false;
    }

    const isExpired = new Date() > new Date(this.otp.expiresAt);
    const isCodeMatch = this.otp.code === code;

    return !isExpired && isCodeMatch;
};

// Method to clear OTP
UserSchema.methods.clearOtp = function () {
    this.otp = undefined;
    return this.save();
};

// Virtual for user's full profile (exclude sensitive data)
UserSchema.methods.toProfileJSON = function () {
    const profile = {
        id: this._id,
        phone: this.phone,
    };

    if (this.name) profile.name = this.name;
    if (this.email) profile.email = this.email;
    if (this.lastLogin) profile.lastLogin = this.lastLogin;

    return profile;
};

// Indexes for better performance
UserSchema.index({ phone: 1 });
UserSchema.index({ email: 1 }, { sparse: true });

module.exports = mongoose.model('User', UserSchema)