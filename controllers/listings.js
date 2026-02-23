const { response } = require("express");
const Listing = require("../models/listing.js");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const ExpressError = require("../utils/ExpressError.js");
const { validateMapboxToken } = require("../utils/mapboxConfig.js");

const mapToken = process.env.MAP_TOKEN;
let geocodingClient = null;

// Initialize geocoding client only if token is valid
if (validateMapboxToken(mapToken)) {
    geocodingClient = mbxGeocoding({ accessToken: mapToken });
    console.log("Mapbox API configured successfully.");
} else {
    console.warn("WARNING: Mapbox API token not configured. Geocoding features will be disabled. Listings can still be created without location maps.");
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

        // Try to geocode location if Mapbox token is available
        if (geocodingClient) {
            try {
                let response = await geocodingClient.forwardGeocode({
                    query: req.body.listing.location,
                    limit: 1
                })
                    .send();

                // Validate geocoding response
                if (response.body.features && response.body.features.length > 0) {
                    newlisting.geometry = response.body.features[0].geometry;
                    console.log("✓ Location geocoded successfully");
                } else {
                    // Location not found, but still allow listing creation
                    console.warn("⚠ Location not found in Mapbox, creating listing without coordinates");
                    req.flash("warning", "Listing created, but location coordinates could not be found. Map will not be available.");
                }
            } catch (mapboxError) {
                console.error("⚠ Mapbox API Error:", mapboxError.message);
                
                // Don't throw error - just warn the user and create listing without coordinates
                req.flash("warning", "Listing created, but location map is temporarily unavailable. You can still view and edit this listing.");
                console.warn("Creating listing without Mapbox geocoding");
            }
        } else {
            console.warn("Mapbox geocoding is disabled. Creating listing without coordinates.");
            req.flash("info", "Listing created without location map (Mapbox not configured).");
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
        
        // Try to update geometry if location changed and Mapbox is available
        if (geocodingClient && req.body.listing.location) {
            try {
                let response = await geocodingClient.forwardGeocode({
                    query: req.body.listing.location,
                    limit: 1
                })
                    .send();

                if (response.body.features && response.body.features.length > 0) {
                    listing.geometry = response.body.features[0].geometry;
                    console.log("✓ Location updated with coordinates");
                }
            } catch (mapboxError) {
                console.warn("⚠ Mapbox error during update:", mapboxError.message);
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