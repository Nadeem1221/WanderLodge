const mapContainer = document.getElementById('map');
const key = typeof geoapifyKey !== 'undefined' ? geoapifyKey : '';

const showError = (message) => {
    console.error(message);
    if (mapContainer) {
        mapContainer.innerHTML = `<div class="alert alert-danger">${message}</div>`;
    }
};

const fetchCoordsFallback = async () => {
    if (!listing || !listing.location) return null;
    try {
        const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(listing.location)}&limit=1&apiKey=${key}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Geoapify fallback status ${res.status}`);
        const data = await res.json();
        if (data.features && data.features.length > 0) {
            return data.features[0].geometry.coordinates; // [lng, lat]
        }
    } catch (err) {
        console.warn('Fallback geocoding failed:', err);
    }
    return null;
};

const init = async () => {
    // Basic guards
    if (!mapContainer) {
        console.warn('Map container not found in DOM.');
        return;
    }
    if (!key || key === 'undefined') {
        showError('Map is not available (Geoapify API key missing). Please contact admin.');
        return;
    }
    if (typeof L === 'undefined') {
        showError('Map library failed to load. Please try again later.');
        return;
    }

    let coords = (listing && listing.geometry && Array.isArray(listing.geometry.coordinates))
        ? listing.geometry.coordinates
        : null;

    // Fallback: geocode on the client if coords missing
    if (!coords || coords.length < 2) {
        coords = await fetchCoordsFallback();
        if (coords) {
            // keep listing.geometry in sync in case other scripts use it
            listing.geometry = { type: 'Point', coordinates: coords };
        }
    }

    if (!coords || coords.length < 2) {
        showError('Map is not available (missing coordinates).');
        return;
    }

    try {
        const [lng, lat] = coords;
        const map = L.map('map').setView([lat, lng], 12);

        L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${key}`, {
            attribution: '© OpenStreetMap contributors, © Geoapify',
            maxZoom: 18,
        }).addTo(map);

        L.marker([lat, lng], { title: listing.title })
            .addTo(map)
            .bindPopup(`<h4>${listing.title}</h4><p>Exact location shared after booking.</p>`)
            .openPopup();
    } catch (error) {
        console.error('Error initializing map:', error);
        showError('Map initialization failed. Please try again later.');
    }
};

init();
