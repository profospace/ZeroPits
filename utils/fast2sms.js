// backend/utils/fast2sms.js
// Simple wrapper to send OTP using Fast2SMS REST API
const axios = require('axios');

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY; // set in .env

if (!FAST2SMS_API_KEY) {
    console.warn('FAST2SMS_API_KEY not set - OTP sending will fail.');
}

/**
 * sendSms - call Fast2SMS API
 * @param {string} phone - recipient phone number (with country code if required)
 * @param {string} message - text to send
 */
async function sendSms(phone, message) {
    // Fast2SMS expects headers: authorization
    // endpoint example: https://www.fast2sms.com/dev/bulkV2
    // For updated Fast2SMS, use bulkV2 or previous endpoint. Using bulkV2 with JSON body:
    try {
        const url = process.env.OTP_URL;
        const data = {
            route: 'v3',
            sender_id: 'FSTSMS', // optional
            message,
            numbers: phone,
        };

        const res = await axios.post(url, data, {
            headers: {
                authorization: FAST2SMS_API_KEY,
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
        console.log("otp" ,res.data)

        return res.data;
    } catch (err) {
        console.error('Fast2SMS error', err?.response?.data || err.message);
        throw err;
    }
}

module.exports = { sendSms };
