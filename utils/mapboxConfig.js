/**
 * Mapbox Configuration and Validation Utility
 * Handles validation and graceful degradation when Mapbox API token is missing
 */

const ExpressError = require('./ExpressError.js');

/**
 * Validate token exists and is properly formatted
 * @param {string} token - The Mapbox token to validate
 * @returns {boolean} True if token is valid, false otherwise
 */
const validateMapboxToken = (token) => {
    // Token is optional, so empty token is acceptable
    if (!token) {
        return false;
    }
    
    if (typeof token !== 'string' || token.trim() === '') {
        return false;
    }
    
    // Mapbox tokens should start with 'pk.' (public) or 'sk.' (secret)
    if (!token.startsWith('pk.') && !token.startsWith('sk.')) {
        return false;
    }
    
    return true;
};

/**
 * Safe token getter for frontend (returns empty string if invalid)
 * @returns {string} Valid token or empty string
 */
const getMapboxToken = () => {
    const token = process.env.MAP_TOKEN;
    return validateMapboxToken(token) ? token : '';
};

module.exports = {
    validateMapboxToken,
    getMapboxToken
};
