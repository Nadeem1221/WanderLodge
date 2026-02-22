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

        // Try to geocode location if Mapbox token is available
        if (geocodingClient) {
            try {
                let response = await geocodingClient.forwardGeocode({
                    query: req.body.listing.location,
                    limit: 1
                })
                    .send();

                // Validate geocoding response
                if (!response.body.features || response.body.features.length === 0) {
                    throw new ExpressError(400, "Location not found. Please enter a valid location.");
                }

                newlisting.geometry = response.body.features[0].geometry;
            } catch (mapboxError) {
                console.error("Mapbox API Error:", mapboxError.message);
                
                // Handle specific API errors
                if (mapboxError.message.includes("Unauthorized") || mapboxError.message.includes("401")) {
                    throw new ExpressError(500, "Mapbox API authentication failed. Invalid API token configured.");
                } else if (mapboxError.message.includes("Not Found") || mapboxError.message.includes("404")) {
                    throw new ExpressError(400, "Location not found. Please enter a valid location.");
                } else if (mapboxError.message.includes("Invalid token")) {
                    throw new ExpressError(500, "Mapbox API token is invalid. Please contact admin.");
                } else if (mapboxError instanceof ExpressError) {
                    throw mapboxError; // Re-throw ExpressError
                } else {
                    throw new ExpressError(500, "Mapbox geocoding service is unavailable. Please try again later.");
                }
            }
        } else {
            console.warn("Mapbox geocoding is disabled. Creating listing without coordinates.");
            // Create a default/null geometry if no geocoding available
            newlisting.geometry = null;
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
    // Update the listing
    let listing = await Listing.findByIdAndUpdate(id, req.body.listing);
    if (typeof req.file!=="undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename };
        await listing.save();
    }
    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    const deletedlisting = await Listing.findByIdAndDelete(id);
    console.log(deletedlisting);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
};