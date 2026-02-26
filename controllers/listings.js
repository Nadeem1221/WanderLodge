const { response } = require("express");
const Listing = require("../models/listing.js");
const ExpressError = require("../utils/ExpressError.js");
const { validateGeoapifyKey } = require("../utils/geoapifyConfig.js");

const geoapifyKey = process.env.GEOAPIFY_API_KEY;
const geoapifyEnabled = validateGeoapifyKey(geoapifyKey);
const GEOAPIFY_ENDPOINT = "https://api.geoapify.com/v1/geocode/search";

const geocodeWithGeoapify = async (query) => {
    if (!geoapifyEnabled) return null;

    const url = `${GEOAPIFY_ENDPOINT}?text=${encodeURIComponent(query)}&limit=1&apiKey=${geoapifyKey}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Geoapify responded with status ${response.status}`);
    }

    const data = await response.json();
    if (data.features && data.features.length > 0) {
        return data.features[0].geometry;
    }
    return null;
};

if (geoapifyEnabled) {
    console.log("Geoapify geocoding configured successfully.");
} else {
    console.warn("WARNING: Geoapify API key not configured. Geocoding features will be disabled. Listings can still be created without location maps.");
}

module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id).populate({
        path: "reviews", populate: {
            path: "author",
        },
    }).populate("owner");
    if (!listing) {
        req.flash("error", "Listing you requested doesn't exist!");
        return res.redirect("/listings");
    }
    console.log(listing);
    res.render("listings/show.ejs", { listing })
};

module.exports.createListing = async (req, res, next) => {
    try {
        // Validate location input
        if (!req.body.listing.location || req.body.listing.location.trim() === "") {
            throw new ExpressError(400, "Location is required to create a listing.");
        }

        let url = req.file.path;
        let filename = req.file.filename;
        const newlisting = new Listing(req.body.listing);
        newlisting.owner = req.user._id;
        newlisting.image = { url, filename };
        newlisting.geometry = null; // Default to null

        // Try to geocode location if Geoapify is available
        if (geoapifyEnabled) {
            try {
                const geometry = await geocodeWithGeoapify(req.body.listing.location);

                if (geometry) {
                    newlisting.geometry = geometry;
                    console.log("✓ Location geocoded successfully via Geoapify");
                } else {
                    // Location not found, but still allow listing creation
                    console.warn("⚠ Location not found in Geoapify, creating listing without coordinates");
                    req.flash("warning", "Listing created, but location coordinates could not be found. Map will not be available.");
                }
            } catch (geoapifyError) {
                console.error("⚠ Geoapify API Error:", geoapifyError.message);
                
                // Don't throw error - just warn the user and create listing without coordinates
                req.flash("warning", "Listing created, but location map is temporarily unavailable. You can still view and edit this listing.");
                console.warn("Creating listing without Geoapify geocoding");
            }
        } else {
            console.warn("Geoapify geocoding is disabled. Creating listing without coordinates.");
            req.flash("info", "Listing created without location map (Geoapify not configured).");
        }

        let saveListing = await newlisting.save();
        console.log(saveListing);
        req.flash("success", "New Listing Created!");
        res.redirect("/listings");
    } catch (error) {
        next(error);
    }
};

module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you requested doesn't exist!");
        return res.redirect("/listings");
    }
    let originalImageUrl = listing.image.url;
    originalImageUrl=originalImageUrl.replace("/upload","/upload/w_250")
    res.render("listings/edit.ejs", { listing,originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
    if (!req.body.listing) {
        throw new ExpressError(400, "Send valid data for listing");
    }
    let { id } = req.params;
    
    try {
        // Update the listing
        let listing = await Listing.findByIdAndUpdate(id, req.body.listing);
        
        // Try to update geometry if location changed and Geoapify is available
        if (geoapifyEnabled && req.body.listing.location) {
            try {
                const geometry = await geocodeWithGeoapify(req.body.listing.location);

                if (geometry) {
                    listing.geometry = geometry;
                    console.log("✓ Location updated with coordinates");
                }
            } catch (geoapifyError) {
                console.warn("⚠ Geoapify error during update:", geoapifyError.message);
                // Don't throw error - let the update continue without coordinates
                req.flash("warning", "Listing updated, but location map could not be updated.");
            }
        }
        
        // Update image if provided
        if (typeof req.file !== "undefined") {
            let url = req.file.path;
            let filename = req.file.filename;
            listing.image = { url, filename };
        }
        
        await listing.save();
        req.flash("success", "Listing Updated!");
        res.redirect(`/listings/${id}`);
    } catch (error) {
        // If something goes wrong, pass to error handler
        throw new ExpressError(500, "Error updating listing. Please try again.");
    }
};

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    const deletedlisting = await Listing.findByIdAndDelete(id);
    console.log(deletedlisting);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
};
