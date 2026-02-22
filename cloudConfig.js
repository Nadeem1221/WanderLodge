const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Check if Cloudinary is configured
const cloudinaryConfigured = !!(process.env.CLOUD_NAME && process.env.CLOUD_API_KEY && process.env.CLOUD_API_SECRET);

if (!cloudinaryConfigured) {
    console.warn("WARNING: Cloudinary is not configured. File uploads will fail.");
    console.warn("Please set CLOUD_NAME, CLOUD_API_KEY, and CLOUD_API_SECRET in .env file.");
}

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});
 
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'wanderlust_DEV',
      allowedFormets: ["png","jpg","jpeg"],
    },
  });
  
module.exports = {
    cloudinary,
    storage,
    cloudinaryConfigured
};