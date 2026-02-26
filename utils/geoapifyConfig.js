/**
 * Geoapify Configuration and Validation Utility
 * Helps validate the API key and provides a safe getter.
 */

/**
 * Validate Geoapify API key.
 * @param {string} apiKey
 * @returns {boolean}
 */
const validateGeoapifyKey = (apiKey) => {
    if (!apiKey || typeof apiKey !== "string") return false;
    return apiKey.trim().length > 0;
};

/**
 * Safe getter for frontend exposure.
 * @returns {string}
 */
const getGeoapifyKey = () => {
    const apiKey = process.env.GEOAPIFY_API_KEY;
    return validateGeoapifyKey(apiKey) ? apiKey : "";
};

module.exports = {
    validateGeoapifyKey,
    getGeoapifyKey,
};
