const crypto = require('crypto');

/**
 * Generates a time-based cryptographic token for QR code scanning.
 * The token is valid for a 10-second block.
 * @param {string} secretKey - The secret key used for HMAC generation.
 * @returns {string} The generated HMAC token.
 */
function generateQrToken(secretKey) {
    if (!secretKey) {
        throw new Error('QR Token secret key is not defined.');
    }

    // Get current time in 10-second blocks
    const timeBlock = Math.floor(Date.now() / 10000); // 10000 milliseconds = 10 seconds

    // Create HMAC using SHA256 and the secret key
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(timeBlock.toString()); // Use the time block as the message
    return hmac.digest('hex'); // Return the hexadecimal representation of the hash
}

module.exports = {
    generateQrToken,
};
